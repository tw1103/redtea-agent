import { describe, expect, it } from "vitest";
import { analysisResultToMarkdown } from "@/lib/markdown-export";
import { displayAnalysisToResult } from "@/lib/display-analysis-adapter";
import type { DisplayAnalysis, ScenarioInput } from "@/lib/schemas";

const input: ScenarioInput = {
  analysisMode: "deep",
  analysisScope: "single",
  scenarioName: "客户投诉处理流程",
  scenarioDescription: "分析客户投诉受理、分类、处理和关闭流程",
};

const display: DisplayAnalysis = {
  conclusion: {
    canTransform: true,
    summary: "该流程适合使用规则、工作流、AI 分类和人工复核组合改造。",
    ai: { suitable: true, tasks: ["投诉内容分类", "处理建议生成"] },
    rpa: { suitable: false, tasks: [] },
  },
  processFlow: [
    { stepNo: 1, name: "接收投诉", executor: "客服系统", tags: ["API"], input: "投诉单", output: "受理记录", normalPath: "创建受理记录", exceptionPath: "信息缺失转人工补充", humanGate: "客户身份不明确时人工确认" },
    { stepNo: 2, name: "分类判断", executor: "服务团队", tags: ["AI", "规则"], input: "投诉内容", output: "分类结果", normalPath: "按规则和模型完成分类", exceptionPath: "低置信度转人工", humanGate: "高风险投诉人工复核" },
    { stepNo: 3, name: "关闭归档", executor: "工作流", tags: ["工作流", "人工"], input: "处理结果", output: "归档记录", normalPath: "通知客户并归档", exceptionPath: "客户不认可转升级处理", humanGate: "关闭前人工确认" },
  ],
  contextDataFlow: {
    contextNodes: [{ dataObject: "投诉单", sourceSystem: "客服系统", sourceLocation: "工单模块", acquisitionMethod: "API", trigger: "客户提交投诉" }],
    processing: "清洗投诉内容、分类、分派和留痕",
    resultNodes: [{ resultObject: "处理记录", targetSystem: "客服系统", targetLocation: "工单详情", stateChange: "已关闭", downstreamConsumer: "客服主管" }],
    dataFlows: [{ stepNo: 1, dataObject: "投诉单", inputSource: "客服系统", processAction: "分类与分派", storage: "工单日志", outputResult: "处理记录", nextDestination: "客服系统" }],
  },
};

const md = analysisResultToMarkdown(displayAnalysisToResult(display, input));

describe("Markdown 导出", () => {
  it("包含三个核心结果章节", () => {
    expect(md).toContain("## 1. 改造结论");
    expect(md).toContain("## 2. 可改造业务流程图");
    expect(md).toContain("## 3. 上下文对接与数据流转");
    expect(md).not.toContain("## 4.");
  });

  it("包含 AI、RPA 和 Mermaid 流程图", () => {
    expect(md).toContain("AI 改造");
    expect(md).toContain("RPA 改造");
    expect(md.match(/```mermaid/g)?.length).toBeGreaterThanOrEqual(3);
    expect(md).toContain("落点：");
  });
});
