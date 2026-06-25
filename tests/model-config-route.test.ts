import { afterEach, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/model-config/route";

afterEach(() => { delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; delete process.env.HTTP_PROXY; delete process.env.HTTPS_PROXY; });
describe("模型配置接口", () => {
  it("按会话保存状态且绝不回显 API Key", async () => {
    const apiKey = "sk-test-session-key-1234567890";
    const save = await POST(new Request("http://localhost/api/model-config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey, model: "gpt-test-mini" }) }));
    const saveText = await save.text();
    expect(save.status).toBe(200); expect(saveText).not.toContain(apiKey);
    const cookie = save.headers.get("set-cookie")?.split(";")[0]; expect(cookie).toBeTruthy();
    const current = await GET(new Request("http://localhost/api/model-config", { headers: { cookie: cookie || "" } }));
    expect(await current.json()).toEqual({ success: true, configured: true, source: "session", model: "gpt-test-mini", provider: "openai" });
    const cleared = await DELETE(new Request("http://localhost/api/model-config", { method: "DELETE", headers: { cookie: cookie || "" } }));
    expect((await cleared.json()).configured).toBe(false);
  });
  it("拒绝无效配置", async () => { const response = await POST(new Request("http://localhost/api/model-config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: "short", model: "bad model" }) })); expect(response.status).toBe(400); });
  it("保存 DeepSeek 服务商配置", async () => {
    const response = await POST(new Request("http://localhost/api/model-config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: "sk-test-deepseek-key-1234567890", model: "deepseek-v4-flash", provider: "deepseek", baseUrl: "https://api.deepseek.com", proxyUrl: "http://127.0.0.1:7890" }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, provider: "deepseek", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", proxyUrl: "http://127.0.0.1:7890" });
  });
});
