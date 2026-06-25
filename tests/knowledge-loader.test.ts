import { describe, expect, it } from "vitest";
import { loadKnowledge } from "@/lib/knowledge-loader";

describe("知识库加载", () => {
  it("通用提示不注入财务对账案例，避免跨行业分析被带偏", async () => {
    const knowledge = await loadKnowledge();
    expect(knowledge).not.toContain("财务对账案例");
    expect(knowledge).not.toContain("银行流水");
  });
});
