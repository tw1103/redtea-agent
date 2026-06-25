import { NextResponse } from "next/server";
import { ScenarioInputSchema } from "@/lib/schemas";
import { createMockAnalysis } from "@/lib/mock-analysis";
import { AnalysisParseError, AnalysisServiceError, analyzeWithOpenAI } from "@/lib/openai";
import { getSessionModelConfig } from "@/lib/session-model-config";

export const runtime = "nodejs";
function fail(status: number, code: string, message: string) { return NextResponse.json({ success: false, error: { code, message } }, { status }); }

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "INVALID_JSON", "请求内容不是有效的 JSON"); }
  const input = ScenarioInputSchema.safeParse(body);
  if (!input.success) return fail(400, "INVALID_INPUT", input.error.issues[0]?.message || "输入不完整");
  const sessionConfig = getSessionModelConfig(request);
  const apiKey = sessionConfig?.apiKey || process.env.OPENAI_API_KEY;
  const useMock = (!sessionConfig && process.env.USE_MOCK_ANALYSIS === "true") || !apiKey;
  if (useMock) return NextResponse.json({ success: true, mode: "mock", result: createMockAnalysis(input.data) });
  try {
    const result = await analyzeWithOpenAI(input.data, {
      apiKey,
      model: sessionConfig?.model || process.env.OPENAI_MODEL,
      provider: sessionConfig?.provider || (process.env.MODEL_PROVIDER === "deepseek" ? "deepseek" : "openai"),
      baseUrl: sessionConfig?.baseUrl || process.env.MODEL_BASE_URL,
      proxyUrl: sessionConfig?.proxyUrl || process.env.HTTPS_PROXY || process.env.HTTP_PROXY,
    });
    return NextResponse.json({ success: true, mode: "live", result });
  } catch (error) {
    if (error instanceof AnalysisParseError) return fail(422, "MODEL_OUTPUT_INVALID", "模型返回的内容不符合方案结构，请重试或更换模型");
    if (error instanceof AnalysisServiceError) return fail(error.status, error.code, error.message);
    return fail(500, "ANALYSIS_FAILED", "分析服务暂时不可用，请稍后重试");
  }
}
