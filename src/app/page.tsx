import { ScenarioForm } from "@/components/scenario-form";
import Link from "next/link";
export default function Home() {
  return <main>
    <header className="hero"><div className="shell"><div className="eyebrow">BUSINESS SCENARIO DECOMPOSITION AGENT</div><h1>业务场景拆解 Agent</h1><p className="subtitle">拆业务、拆任务，判断 RPA、AI、API、规则、工作流与人工如何组合</p><div className="hero-row"><p className="boundary">Agent 是分析顾问，不是默认实施方案；本工具不直接执行高风险业务操作。</p><Link className="settings-link" href="/settings">配置模型 API Key →</Link></div></div></header>
    <div className="shell workspace"><ScenarioForm /></div>
    <footer className="shell footer">业务场景拆解 Agent · 本地会话不持久化输入</footer>
  </main>;
}
