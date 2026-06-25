import Link from "next/link";
import { ModelConfigForm } from "@/components/model-config-form";

export default function SettingsPage() {
  return <main className="settings-page"><div className="settings-shell"><div className="settings-back"><Link href="/">← 返回场景分析</Link></div><header><div className="eyebrow">MODEL CONFIGURATION</div><h1>模型配置</h1><p>为当前浏览器会话配置 OpenAI 或 DeepSeek API Key 和模型。</p></header><ModelConfigForm /></div></main>;
}
