import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisResultSchema, DisplayAnalysisSchema, type AnalysisResult, type ScenarioInput } from "./schemas";
import { loadKnowledge } from "./knowledge-loader";
import { buildPrompt } from "./build-prompt";
import { displayAnalysisToResult } from "./display-analysis-adapter";
import type { ModelProvider } from "./session-model-config";

export class AnalysisParseError extends Error {}

export class AnalysisServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

type AnalyzeOptions = {
  apiKey?: string;
  model?: string;
  provider?: ModelProvider;
  baseUrl?: string;
  proxyUrl?: string;
};

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const DeepSeekApiResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
    }).optional(),
  })).min(1),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRecord(value: unknown, key: string) {
  if (!isRecord(value)) return undefined;
  if (!isRecord(value[key])) return undefined;
  return value[key];
}

function readArray(value: unknown, key: string) {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key] as unknown[];
}

function readString(value: unknown, key: string, fallback = "待确认") {
  if (!isRecord(value)) return fallback;
  const item = value[key];
  return typeof item === "string" && item.trim() ? item.trim() : fallback;
}

function readBoolean(value: unknown, key: string, fallback = true) {
  if (!isRecord(value)) return fallback;
  return typeof value[key] === "boolean" ? value[key] : fallback;
}

function readStringArray(value: unknown, key: string) {
  if (!isRecord(value)) return [];
  const item = value[key];
  if (!Array.isArray(item)) return [];
  return item.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizedTags(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  const allowed = new Set(["AI", "RPA", "API", "规则", "工作流", "人工", "不使用AI/RPA"]);
  const tags = raw
    .map((tag) => typeof tag === "string" ? tag.replace(/\s+/g, "") : "")
    .map((tag) => tag === "不使用AI或RPA" || tag === "不使用AI/RPA" ? "不使用AI/RPA" : tag)
    .filter((tag): tag is "AI" | "RPA" | "API" | "规则" | "工作流" | "人工" | "不使用AI/RPA" => allowed.has(tag));
  return tags.length ? tags : ["人工"];
}

function stepNumber(value: unknown, fallback: number) {
  if (!isRecord(value)) return fallback;
  const raw = value.stepNo;
  return typeof raw === "number" && Number.isInteger(raw) ? raw : fallback;
}

function processFromUnknown(resultJson: unknown, input: ScenarioInput) {
  const candidates = [
    readArray(resultJson, "processFlow"),
    readArray(resultJson, "targetProcess"),
    readArray(readRecord(readRecord(resultJson, "businessLayers"), "l3Process"), "l3Process"),
  ].find((items) => items.length > 0) ?? [];

  if (candidates.length) {
    return candidates.map((item, index) => {
      const tech = isRecord(item) ? item.technology ?? item.tags ?? item.recommendedMode : undefined;
      return {
        stepNo: stepNumber(item, index + 1),
        name: readString(item, "name", readString(item, "taskName", `流程节点 ${index + 1}`)),
        executor: readString(item, "executor", readString(item, "owner", "业务人员")),
        tags: normalizedTags(tech),
        input: readString(item, "input"),
        output: readString(item, "output"),
        normalPath: readString(item, "normalPath", readString(item, "branch", "按标准流程处理")),
        exceptionPath: readString(item, "exceptionPath", readString(item, "exception", "异常转人工确认")),
        humanGate: readString(item, "humanGate", readString(item, "manualControl", "高风险或低置信度时人工确认")),
      };
    });
  }

  return [
    {
      stepNo: 1,
      name: "接收业务输入",
      executor: "业务人员或来源系统",
      tags: ["工作流", "人工"] as const,
      input: input.scenarioDescription,
      output: "待处理业务任务",
      normalPath: "接收并登记业务输入",
      exceptionPath: "输入缺失或口径不清时退回补充",
      humanGate: "业务范围不清或涉及高风险事项时人工确认",
    },
    {
      stepNo: 2,
      name: "规则判断与智能辅助",
      executor: "业务系统或处理人员",
      tags: ["AI", "规则", "工作流"] as const,
      input: "待处理业务任务",
      output: "处理建议与异常清单",
      normalPath: "按规则处理结构化信息，AI 辅助理解非结构化内容",
      exceptionPath: "低置信度或规则冲突时转人工复核",
      humanGate: "涉及审批、删除、合规结论或对外承诺时人工确认",
    },
    {
      stepNo: 3,
      name: "结果回写与闭环",
      executor: "目标系统或业务负责人",
      tags: ["API", "工作流", "人工"] as const,
      input: "处理建议与异常清单",
      output: "业务结果、状态变更与审计记录",
      normalPath: "优先通过 API 写回结果并留痕",
      exceptionPath: "写回失败时保持原状态并转人工处理",
      humanGate: "最终审批、关键状态变更和高风险写入由人工确认",
    },
  ];
}

function coerceDisplayAnalysis(resultJson: unknown, input: ScenarioInput): AnalysisResult {
  const conclusion = readRecord(resultJson, "conclusion");
  const analysisMeta = readRecord(resultJson, "analysisMeta");
  const technologySummary = readRecord(resultJson, "technologySummary");
  const dataClosedLoop = readRecord(resultJson, "dataClosedLoop");
  const contextDataFlow = readRecord(resultJson, "contextDataFlow");
  const ai = readRecord(conclusion, "ai");
  const rpa = readRecord(conclusion, "rpa");

  const processFlow = processFromUnknown(resultJson, input);
  const dataSources = readArray(dataClosedLoop, "dataSources");
  const dataFlows = readArray(dataClosedLoop, "dataFlows");
  const resultDestinations = readArray(dataClosedLoop, "resultDestinations");

  const display = DisplayAnalysisSchema.parse({
    conclusion: {
      canTransform: readBoolean(conclusion, "canTransform", true),
      summary: readString(conclusion, "summary", readString(analysisMeta, "overallConclusion", `围绕“${input.scenarioName}”可进行流程拆解，并按 AI、RPA、API、规则、工作流与人工控制点进行技术映射。`)),
      ai: { suitable: readBoolean(ai, "suitable", true), tasks: readStringArray(ai, "tasks").concat(readStringArray(technologySummary, "aiSuitable")) },
      rpa: { suitable: readBoolean(rpa, "suitable", true), tasks: readStringArray(rpa, "tasks").concat(readStringArray(technologySummary, "rpaSuitable")) },
    },
    processFlow,
    contextDataFlow: {
      contextNodes: readArray(contextDataFlow, "contextNodes").length ? readArray(contextDataFlow, "contextNodes") : dataSources.map((node, index) => ({
        dataObject: readString(node, "dataObject", `输入数据 ${index + 1}`),
        sourceSystem: readString(node, "sourceSystem"),
        sourceLocation: readString(node, "sourceLocation"),
        acquisitionMethod: readString(node, "acquisitionMethod"),
        trigger: readString(node, "trigger"),
      })).concat(dataSources.length ? [] : [{
        dataObject: input.businessObjects || input.scenarioName,
        sourceSystem: input.systemsAndRelations || "来源系统待确认",
        sourceLocation: input.inputDataAndSources || "来源位置待确认",
        acquisitionMethod: "优先 API；无 API 时再评估文件、RPA 或人工提交",
        trigger: input.triggers || "业务事件触发",
      }]),
      processing: readString(contextDataFlow, "processing", "按流程节点进行规则处理、AI 辅助、自动化执行与人工确认"),
      resultNodes: readArray(contextDataFlow, "resultNodes").length ? readArray(contextDataFlow, "resultNodes") : resultDestinations.map((node, index) => ({
        resultObject: readString(node, "resultObject", `输出结果 ${index + 1}`),
        targetSystem: readString(node, "targetSystem"),
        targetLocation: readString(node, "targetLocation"),
        stateChange: readString(node, "stateChange"),
        downstreamConsumer: readString(node, "downstreamConsumer"),
      })).concat(resultDestinations.length ? [] : [{
        resultObject: input.targetResultsAndDestinations || "业务处理结果",
        targetSystem: input.systemsAndRelations || "目标系统待确认",
        targetLocation: "结果落点待确认",
        stateChange: "由待处理变为已处理/待复核/异常",
        downstreamConsumer: "业务负责人或下游流程",
      }]),
      dataFlows: readArray(contextDataFlow, "dataFlows").length ? readArray(contextDataFlow, "dataFlows") : dataFlows.map((flow, index) => ({
        stepNo: stepNumber(flow, index + 1),
        dataObject: readString(flow, "dataObject", `流转数据 ${index + 1}`),
        inputSource: readString(flow, "inputSource"),
        processAction: readString(flow, "processAction"),
        storage: readString(flow, "storage"),
        outputResult: readString(flow, "outputResult"),
        nextDestination: readString(flow, "nextDestination"),
      })).concat(dataFlows.length ? [] : [{
        stepNo: 1,
        dataObject: input.businessObjects || input.scenarioName,
        inputSource: input.inputDataAndSources || "输入来源待确认",
        processAction: "按流程节点处理并形成可追溯结果",
        storage: "过程记录与审计日志",
        outputResult: input.targetResultsAndDestinations || "业务处理结果",
        nextDestination: "目标系统或人工复核队列",
      }]),
    },
  });
  return displayAnalysisToResult(display, input);
}

function parseAnalysisResult(resultJson: unknown, input: ScenarioInput): AnalysisResult {
  const display = DisplayAnalysisSchema.safeParse(resultJson);
  if (display.success) return displayAnalysisToResult(display.data, input);

  const direct = AnalysisResultSchema.safeParse(resultJson);
  if (direct.success) return direct.data;

  if (isRecord(resultJson)) return coerceDisplayAnalysis(resultJson, input);

  throw new AnalysisParseError("模型返回内容未按页面结构输出，请重试或更换模型");
}

function modelName(provider: ModelProvider, configuredModel?: string) {
  if (configuredModel) return configuredModel;
  return provider === "deepseek" ? "deepseek-v4-flash" : process.env.OPENAI_MODEL || "gpt-5.4-mini";
}

function deepSeekEndpoint(baseUrl?: string) {
  const normalized = (baseUrl || DEFAULT_DEEPSEEK_BASE_URL).trim().replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) return normalized;
  return `${normalized}/chat/completions`;
}

function normalizeConnectionError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
}

function connectionErrorMessage(provider: ModelProvider, error: unknown) {
  const serviceName = provider === "deepseek" ? "DeepSeek" : "OpenAI";
  const cause = error instanceof Error && "cause" in error ? error.cause : undefined;
  const causeCode = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  if (causeCode === "EACCES") {
    return `当前服务端运行环境禁止访问 ${serviceName}，请放行 Node.js 出站 HTTPS，或在模型配置页填写可用代理地址`;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return `连接 ${serviceName} 超时，请检查网络、代理或 API 地址设置`;
  }
  return `无法连接 ${serviceName} 模型服务，请检查当前服务器网络、代理或 API 地址设置`;
}

async function requestOptions(proxyUrl?: string): Promise<RequestInit> {
  if (!proxyUrl) return {};
  const { ProxyAgent } = await import("undici");
  return { dispatcher: new ProxyAgent(proxyUrl) } as RequestInit;
}

function normalizeServiceError(error: unknown, provider: ModelProvider): never {
  if (error instanceof AnalysisParseError || error instanceof AnalysisServiceError) throw error;
  if (error instanceof OpenAI.APIConnectionError || normalizeConnectionError(error)) {
    throw new AnalysisServiceError(502, "MODEL_CONNECTION_FAILED", connectionErrorMessage(provider, error));
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      throw new AnalysisServiceError(401, "MODEL_AUTH_FAILED", `${provider === "deepseek" ? "DeepSeek" : "OpenAI"} API Key 无效或没有调用权限，请在模型配置中重新填写`);
    }
    if (error.status === 404) {
      throw new AnalysisServiceError(400, "MODEL_NOT_FOUND", "模型名称不存在、当前账号无权使用，或所选服务商不匹配");
    }
    if (error.status === 429) {
      throw new AnalysisServiceError(429, "MODEL_RATE_LIMITED", "模型额度不足或请求过于频繁，请检查余额后稍后重试");
    }
    throw new AnalysisServiceError(502, "MODEL_UPSTREAM_ERROR", `模型服务请求失败（HTTP ${error.status || "未知"}），请检查服务商、模型和 API 地址配置`);
  }
  throw new AnalysisServiceError(500, "ANALYSIS_FAILED", "分析服务暂时不可用，请稍后重试");
}

function throwByStatus(status: number): never {
  if (status === 401 || status === 403) {
    throw new AnalysisServiceError(401, "MODEL_AUTH_FAILED", "DeepSeek API Key 无效或没有调用权限，请在模型配置中重新填写");
  }
  if (status === 404) {
    throw new AnalysisServiceError(400, "MODEL_NOT_FOUND", "模型名称不存在、当前账号无权使用，或 API 地址不是 OpenAI 兼容的 chat/completions 接口");
  }
  if (status === 429) {
    throw new AnalysisServiceError(429, "MODEL_RATE_LIMITED", "模型额度不足或请求过于频繁，请检查余额后稍后重试");
  }
  throw new AnalysisServiceError(502, "MODEL_UPSTREAM_ERROR", `DeepSeek 请求失败（HTTP ${status}），请检查模型、额度和 API 地址配置`);
}

async function analyzeWithDeepSeek(prompt: string, input: ScenarioInput, options: Required<Pick<AnalyzeOptions, "apiKey">> & Pick<AnalyzeOptions, "model" | "baseUrl" | "proxyUrl">) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const proxyOptions = await requestOptions(options.proxyUrl);
    const response = await fetch(deepSeekEndpoint(options.baseUrl), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName("deepseek", options.model),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        stream: false,
      }),
      signal: controller.signal,
      ...proxyOptions,
    });

    if (!response.ok) throwByStatus(response.status);

    const apiJson: unknown = await response.json();
    const apiParsed = DeepSeekApiResponseSchema.safeParse(apiJson);
    if (!apiParsed.success) throw new AnalysisParseError("模型返回格式不符合 OpenAI 兼容接口结构");

    const content = apiParsed.data.choices[0]?.message?.content;
    if (!content) throw new AnalysisParseError("模型未返回内容");

    let resultJson: unknown;
    try {
      resultJson = JSON.parse(content);
    } catch {
      throw new AnalysisParseError("模型未返回有效 JSON");
    }

    return parseAnalysisResult(resultJson, input);
  } finally {
    clearTimeout(timeout);
  }
}

export async function testModelConnection(options: AnalyzeOptions): Promise<void> {
  const provider = options.provider || "openai";
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AnalysisServiceError(400, "MODEL_NOT_CONFIGURED", "请先填写并保存 API Key，或在当前表单中输入 API Key 后测试");

  try {
    if (provider === "deepseek") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const proxyOptions = await requestOptions(options.proxyUrl);
        const response = await fetch(deepSeekEndpoint(options.baseUrl), {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName("deepseek", options.model),
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
            stream: false,
          }),
          signal: controller.signal,
          ...proxyOptions,
        });
        if (!response.ok) throwByStatus(response.status);
        await response.arrayBuffer();
        return;
      } finally {
        clearTimeout(timeout);
      }
    }

    const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
    await client.responses.create({
      model: modelName("openai", options.model),
      input: "ping",
      max_output_tokens: 1,
    });
  } catch (error) {
    normalizeServiceError(error, provider);
  }
}

export async function analyzeWithOpenAI(input: ScenarioInput, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const provider = options.provider || "openai";
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AnalysisServiceError(400, "MODEL_NOT_CONFIGURED", "请先在模型配置页填写 API Key");

  const prompt = buildPrompt(input, await loadKnowledge());

  try {
    if (provider === "deepseek") {
      return await analyzeWithDeepSeek(prompt, input, { apiKey, model: options.model, baseUrl: options.baseUrl, proxyUrl: options.proxyUrl });
    }

    const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });
    const response = await client.responses.parse({
      model: modelName("openai", options.model),
      input: [{ role: "user", content: prompt }],
      text: { format: zodTextFormat(AnalysisResultSchema, "enterprise_agent_analysis") },
    });
    if (!response.output_parsed) throw new AnalysisParseError("模型未返回可解析的结构化方案");
    const parsed = AnalysisResultSchema.safeParse(response.output_parsed);
    if (!parsed.success) throw new AnalysisParseError("模型输出未通过结构校验");
    return parsed.data;
  } catch (error) {
    normalizeServiceError(error, provider);
  }
}
