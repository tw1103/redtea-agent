import { describe, expect, it } from "vitest";
import { DisplayAnalysisSchema, AnalysisResultSchema } from "@/lib/schemas";
import { displayAnalysisToResult } from "@/lib/display-analysis-adapter";

const display = {
  conclusion: {
    canTransform: true,
    summary: "客户投诉处理流程适合用 AI 做诉求识别与摘要，用工作流和 API 做分派与回写，RPA 仅在无接口系统中补位。",
    ai: { suitable: true, tasks: ["投诉文本分类", "情绪识别", "回复草稿"] },
    rpa: { suitable: true, tasks: ["无接口工单系统的信息录入"] },
  },
  processFlow: [
    { stepNo: 1, name: "接收投诉", executor: "客服渠道", tags: ["API", "工作流"], input: "客户投诉内容", output: "投诉工单", normalPath: "进入分类", exceptionPath: "信息缺失转人工补充", humanGate: "敏感投诉人工接管" },
    { stepNo: 2, name: "识别诉求并分派", executor: "AI/规则服务", tags: ["AI", "规则", "工作流"], input: "投诉工单", output: "分类和责任部门", normalPath: "自动分派", exceptionPath: "低置信度转人工", humanGate: "低置信度或重大投诉人工确认" },
    { stepNo: 3, name: "处理并回写结果", executor: "责任部门/工单系统", tags: ["API", "人工"], input: "处理意见", output: "闭环工单", normalPath: "回写并通知客户", exceptionPath: "接口失败转人工", humanGate: "赔付或对外承诺必须人工审批" },
  ],
  contextDataFlow: {
    contextNodes: [{ dataObject: "客户投诉", sourceSystem: "客服系统", sourceLocation: "在线客服/电话记录", acquisitionMethod: "API 获取", trigger: "客户提交投诉" }],
    processing: "规则校验后由 AI 识别诉求、情绪和摘要，再由工作流分派。",
    resultNodes: [{ resultObject: "处理结果", targetSystem: "工单系统", targetLocation: "工单状态和处理记录", stateChange: "待处理→处理中→已关闭", downstreamConsumer: "客服主管和客户" }],
    dataFlows: [{ stepNo: 1, dataObject: "投诉工单", inputSource: "客服系统", processAction: "分类、分派、处理回写", storage: "工单审计日志", outputResult: "闭环结果", nextDestination: "工单系统和客户通知" }],
  },
};

describe("页面展示结构适配", () => {
  it("DisplayAnalysis 可以转换为页面当前使用的 AnalysisResult", () => {
    const parsed = DisplayAnalysisSchema.parse(display);
    const result = displayAnalysisToResult(parsed, { analysisMode: "standard", analysisScope: "single", scenarioName: "客户投诉处理", scenarioDescription: "客服处理客户投诉" });
    expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    expect(result.scenarioUnderstanding.scenarioName).toBe("客户投诉处理");
    expect(result.targetProcess.some((step) => step.technology.includes("AI"))).toBe(true);
    expect(result.dataClosedLoop.dataSources[0].sourceSystem).toBe("客服系统");
    expect(JSON.stringify(result)).not.toContain("银行流水");
  });
});
