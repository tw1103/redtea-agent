import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionModelConfig, readSessionId, removeSessionModelConfig, saveSessionModelConfig, sessionCookie, type ModelProvider } from "@/lib/session-model-config";

export const runtime = "nodejs";
const ConfigSchema = z.object({
  apiKey: z.string().trim().min(20, "API Key 长度不正确").max(500),
  model: z.string().trim().min(1, "请输入模型名称").max(100).regex(/^[a-zA-Z0-9._-]+$/, "模型名称格式不正确"),
  provider: z.enum(["openai", "deepseek"]).default("openai"),
  baseUrl: z.string().trim().url("API 地址格式不正确").max(300).optional().or(z.literal("")),
  proxyUrl: z.string().trim().url("代理地址格式不正确").max(300).optional().or(z.literal("")),
});
const environmentProvider = (): ModelProvider => process.env.MODEL_PROVIDER === "deepseek" ? "deepseek" : "openai";
const environmentBaseUrl = () => process.env.MODEL_BASE_URL || undefined;
const environmentProxyUrl = () => process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined;
const status = (request: Request) => {
  const session = getSessionModelConfig(request);
  if (session) return { configured: true, source: "session" as const, model: session.model, provider: session.provider, baseUrl: session.baseUrl, proxyUrl: session.proxyUrl };
  if (process.env.OPENAI_API_KEY) return { configured: true, source: "environment" as const, model: process.env.OPENAI_MODEL || "gpt-5.4-mini", provider: environmentProvider(), baseUrl: environmentBaseUrl(), proxyUrl: environmentProxyUrl() };
  return { configured: false, source: "none" as const, model: process.env.OPENAI_MODEL || "gpt-5.4-mini", provider: environmentProvider(), baseUrl: environmentBaseUrl(), proxyUrl: environmentProxyUrl() };
};

export async function GET(request: Request) { return NextResponse.json({ success: true, ...status(request) }); }

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: { code: "INVALID_JSON", message: "请求内容无效" } }, { status: 400 }); }
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_CONFIG", message: parsed.error.issues[0]?.message || "配置无效" } }, { status: 400 });
  const sessionId = readSessionId(request) || randomUUID();
  const config = { ...parsed.data, baseUrl: parsed.data.baseUrl || undefined, proxyUrl: parsed.data.proxyUrl || undefined };
  saveSessionModelConfig(sessionId, config);
  const response = NextResponse.json({ success: true, configured: true, source: "session", model: config.model, provider: config.provider, baseUrl: config.baseUrl, proxyUrl: config.proxyUrl });
  response.cookies.set(sessionCookie.name, sessionId, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: sessionCookie.maxAge });
  return response;
}

export async function DELETE(request: Request) {
  removeSessionModelConfig(request);
  const response = NextResponse.json({ success: true, configured: Boolean(process.env.OPENAI_API_KEY), source: process.env.OPENAI_API_KEY ? "environment" : "none", model: process.env.OPENAI_MODEL || "gpt-5.4-mini", provider: environmentProvider(), baseUrl: environmentBaseUrl(), proxyUrl: environmentProxyUrl() });
  response.cookies.set(sessionCookie.name, "", { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 0 });
  return response;
}
