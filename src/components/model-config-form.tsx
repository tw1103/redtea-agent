"use client";

import { useEffect, useState } from "react";

type ModelProvider = "openai" | "deepseek";
type ConfigStatus = {
  configured: boolean;
  source: "session" | "environment" | "none";
  model: string;
  provider: ModelProvider;
  baseUrl?: string;
  proxyUrl?: string;
};

const DEFAULT_MODELS: Record<ModelProvider, string> = {
  openai: "gpt-5.4-mini",
  deepseek: "deepseek-v4-flash",
};

const DEFAULT_BASE_URLS: Record<ModelProvider, string> = {
  openai: "",
  deepseek: "https://api.deepseek.com",
};

export function ModelConfigForm() {
  const [status, setStatus] = useState<ConfigStatus>();
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [model, setModel] = useState(DEFAULT_MODELS.openai);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URLS.openai);
  const [proxyUrl, setProxyUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/model-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.success) {
          setStatus(data);
          setModel(data.model);
          setProvider(data.provider || "openai");
          setBaseUrl(data.baseUrl || DEFAULT_BASE_URLS[data.provider as ModelProvider] || "");
          setProxyUrl(data.proxyUrl || "");
        }
      })
      .catch(() => { if (active) setError("无法读取当前配置状态"); });
    return () => { active = false; };
  }, []);

  function changeProvider(nextProvider: ModelProvider) {
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider]);
    setBaseUrl(DEFAULT_BASE_URLS[nextProvider]);
    setProxyUrl("");
    setError("");
    setMessage("");
    setTestResult("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage(""); setTestResult("");
    try {
      const response = await fetch("/api/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, provider, baseUrl: baseUrl.trim(), proxyUrl: proxyUrl.trim() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || "保存失败");
      setApiKey("");
      setStatus(data);
      setMessage("配置已保存，后续分析将使用实时模型。重启服务后需重新配置。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function clear() {
    setLoading(true); setError(""); setMessage(""); setTestResult("");
    try {
      const response = await fetch("/api/model-config", { method: "DELETE" });
      const data = await response.json();
      if (!data.success) throw new Error("清除失败");
      setApiKey("");
      setStatus(data);
      setModel(data.model);
      setProvider(data.provider || "openai");
      setBaseUrl(data.baseUrl || DEFAULT_BASE_URLS[data.provider as ModelProvider] || "");
      setProxyUrl(data.proxyUrl || "");
      setMessage(data.source === "environment" ? "会话配置已清除，将使用服务器环境变量。" : "会话配置已清除，将恢复 Mock 演示模式。");
    } catch {
      setError("清除配置失败");
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    setTesting(true); setError(""); setMessage(""); setTestResult("");
    try {
      const response = await fetch("/api/model-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, provider, baseUrl: baseUrl.trim(), proxyUrl: proxyUrl.trim() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || "模型连接测试失败");
      setTestResult(data.message || "模型连接测试通过");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "模型连接测试失败");
    } finally {
      setTesting(false);
    }
  }

  const sourceText = status?.source === "session" ? "当前会话配置" : status?.source === "environment" ? "服务器环境变量" : "未配置（Mock 模式）";
  const providerName = provider === "deepseek" ? "DeepSeek" : "OpenAI";

  return <section className="settings-card">
    <div className="config-status">
      <div><span className={`status-dot ${status?.configured ? "on" : "off"}`} />{status ? sourceText : "正在读取状态…"}</div>
      {status?.configured && <span className="badge">{status.provider === "deepseek" ? "DeepSeek" : "OpenAI"} · {status.model}</span>}
    </div>
    <form onSubmit={save}>
      <div className="field">
        <label htmlFor="model-provider">模型服务商</label>
        <select id="model-provider" value={provider} onChange={(event) => changeProvider(event.target.value as ModelProvider)}>
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
        </select>
        <div className="hint">服务商决定后端调用的接口协议和地址，必须与 API Key 匹配。</div>
      </div>
      <div className="field">
        <label htmlFor="api-key">{providerName} API Key</label>
        <input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={provider === "deepseek" ? "sk-...（DeepSeek）" : "sk-...（OpenAI）"} autoComplete="off" minLength={20} maxLength={500} required />
        <div className="hint">保存后不再回显。Key 仅保存在当前服务进程内存中，不写入浏览器存储或项目文件。</div>
      </div>
      <div className="field">
        <label htmlFor="model-name">模型名称</label>
        <input id="model-name" value={model} onChange={(event) => setModel(event.target.value)} placeholder={DEFAULT_MODELS[provider]} maxLength={100} required />
        <div className="hint">DeepSeek 默认使用 deepseek-v4-flash；OpenAI 请填写账号有权使用的 Responses API 模型。</div>
      </div>
      <div className="field">
        <label htmlFor="base-url">OpenAI 兼容 base_url</label>
        <input id="base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={DEFAULT_BASE_URLS[provider] || "使用服务商默认地址"} maxLength={300} />
        <div className="hint">DeepSeek OpenAI 兼容地址为 https://api.deepseek.com；如果公司网络需要代理或网关，可填写可访问的 OpenAI 兼容地址。</div>
      </div>
      <div className="field">
        <label htmlFor="proxy-url">代理地址（可选）</label>
        <input id="proxy-url" value={proxyUrl} onChange={(event) => setProxyUrl(event.target.value)} placeholder="例如：http://127.0.0.1:7890" maxLength={300} />
        <div className="hint">当浏览器能访问文档、但服务端提示无法连接模型时，通常需要在这里填写本机或公司网络代理地址。</div>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {testResult && <div className="settings-success" role="status">{testResult}</div>}
      {message && <div className="settings-success" role="status">{message}</div>}
      <div className="settings-actions">
        <button className="button primary" type="submit" disabled={loading || !apiKey.trim()}>{loading ? "正在保存…" : "保存并启用实时分析"}</button>
        <button className="button" type="button" onClick={testConnection} disabled={loading || testing || (!apiKey.trim() && !status?.configured)}>{testing ? "正在测试…" : "测试模型连接"}</button>
        <button className="button" type="button" onClick={clear} disabled={loading || status?.source !== "session"}>清除会话配置</button>
      </div>
    </form>
    <div className="security-note"><b>安全说明</b><ul><li>服务端不会记录或返回完整 API Key。</li><li>配置有效期最长 12 小时，服务重启后立即失效。</li><li>远程部署时必须使用 HTTPS；多实例部署建议接入企业密钥管理服务。</li></ul></div>
  </section>;
}
