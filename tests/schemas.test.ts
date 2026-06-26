import { describe, expect, it } from "vitest";
import { AnalysisResultSchema, ScenarioInputSchema } from "@/lib/schemas";

const valid = {
  analysisMode: "quick" as const,
  analysisScope: "single" as const,
  scenarioName: "客户投诉处理流程",
  scenarioDescription: "分析客户投诉从受理到关闭的业务流程",
};

describe("数据 Schema", () => {
  it("接受合法输入", () => expect(ScenarioInputSchema.safeParse(valid).success).toBe(true));

  it("拒绝空场景名称", () => expect(ScenarioInputSchema.safeParse({ ...valid, scenarioName: "  " }).success).toBe(false));

  it("拒绝超长输入", () => expect(ScenarioInputSchema.safeParse({ ...valid, scenarioDescription: "a".repeat(20001) }).success).toBe(false));

  it("拒绝不完整的模型结果", () => expect(AnalysisResultSchema.safeParse({ analysisMeta: { analysisMode: "quick" } }).success).toBe(false));
});
