import { NextResponse } from "next/server";
import { z } from "zod";
import { testModelConnection, AnalysisServiceError } from "@/lib/openai";
import { getSessionModelConfig, type ModelProvider } from "@/lib/session-model-config";

export const runtime = "nodejs";

const TestConfigSchema = z.object({
  apiKey: z.string().trim().min(20).max(500).optional().or(z.literal("")),
  model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  provider: z.enum(["openai", "deepseek"]).optional(),
  baseUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  proxyUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
});

function environmentProvider(): ModelProvider {
  return process.env.MODEL_PROVIDER === "deepseek" ? "deepseek" : "openai";
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "请求内容无效");
  }

  const parsed = TestConfigSchema.safeParse(body);
  if (!parsed.success) return fail(400, "INVALID_CONFIG", parsed.error.issues[0]?.message || "测试配置无效");

  const session = getSessionModelConfig(request);
  const provider = parsed.data.provider || session?.provider || environmentProvider();

  try {
    await testModelConnection({
      apiKey: parsed.data.apiKey || session?.apiKey || process.env.OPENAI_API_KEY,
      model: parsed.data.model || session?.model || process.env.OPENAI_MODEL,
      provider,
      baseUrl: parsed.data.baseUrl || session?.baseUrl || process.env.MODEL_BASE_URL,
      proxyUrl: parsed.data.proxyUrl || session?.proxyUrl || process.env.HTTPS_PROXY || process.env.HTTP_PROXY,
    });
    return NextResponse.json({ success: true, message: "模型连接测试通过" });
  } catch (error) {
    if (error instanceof AnalysisServiceError) return fail(error.status, error.code, error.message);
    return fail(500, "MODEL_TEST_FAILED", "模型连接测试失败，请检查网络、代理或配置");
  }
}
