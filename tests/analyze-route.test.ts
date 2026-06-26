import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai", () => ({
  AnalysisParseError: class extends Error {},
  AnalysisServiceError: class extends Error {},
  analyzeWithOpenAI: vi.fn().mockRejectedValue(new Error("upstream")),
}));

import { POST } from "@/app/api/analyze/route";

const valid = { analysisMode: "quick", analysisScope: "single", scenarioName: "客户投诉处理流程", scenarioDescription: "分析客户投诉处理流程" };
const req = (body: unknown) => new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe("分析接口", () => {
  it("非法输入返回 400", async () => expect((await POST(req({ ...valid, scenarioName: "" }))).status).toBe(400));

  it("未配置模型时返回配置提示", async () => {
    const res = await POST(req(valid));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: { code: "MODEL_NOT_CONFIGURED", message: "请先在模型配置页面填写并保存 API Key" } });
  });

  it("模型异常返回统一错误结构", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const res = await POST(req(valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: { code: "ANALYSIS_FAILED", message: "分析服务暂时不可用，请稍后重试" } });
  });
});
