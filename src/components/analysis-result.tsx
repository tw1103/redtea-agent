import type { AnalysisResult } from "@/lib/schemas";
import { ExportActions } from "./export-actions";
import { ProcessFlowView } from "./process-flow-view";
import { ContextDataFlowView } from "./context-data-flow-view";

const nav = [["conclusion", "改造结论"], ["process", "流程节点图"], ["context-data", "上下文与数据流"]];
const ShortList = ({ items }: { items: string[] }) => <ul className="list compact-list">{items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>;

export function AnalysisResultView({ result: r, mode }: { result: AnalysisResult; mode: "live" | "mock" }) {
  const aiPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((modeName) => modeName === "AI" || modeName.includes("大模型"))) || r.targetProcess.some((step) => step.technology.some((name) => name === "AI"));
  const rpaPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((modeName) => modeName.includes("RPA"))) || r.targetProcess.some((step) => step.technology.some((name) => name.includes("RPA")));
  const overall = aiPossible || rpaPossible;
  return <>
    <div className="result-head"><div><div><span className={`badge ${mode === "mock" ? "mock" : ""}`}>{mode === "mock" ? "演示模式" : "实时分析"}</span></div><h2>{r.scenarioUnderstanding.scenarioName}</h2><div className="muted">{r.scenarioUnderstanding.businessDomain} · {new Date(r.analysisMeta.generatedAt).toLocaleString("zh-CN")}</div></div><ExportActions result={r}/></div>
    <nav className="anchor-nav" aria-label="结果章节">{nav.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
    <section className="section" id="conclusion">
      <h3>01 · 改造结论</h3>
      <div className={`decision-banner ${overall ? "yes" : "no"}`}><span>{overall ? "可以改造" : "暂不建议改造"}</span>{overall ? "当前业务流程存在可用 AI 或 RPA 优化的节点。" : "当前信息未识别出适合 AI 或 RPA 的明确节点。"}</div>
      <div className="decision-grid">
        <article className={`decision-card ${aiPossible ? "yes" : "no"}`}><div className="decision-icon">{aiPossible ? "✓" : "—"}</div><div><div className="mini-title">AI 改造</div><h4>{aiPossible ? "适合部分节点" : "当前不适合"}</h4><ShortList items={aiPossible ? r.technologySummary.aiSuitable : ["未发现需要非结构化理解、分类或生成的任务"]}/></div></article>
        <article className={`decision-card ${rpaPossible ? "yes" : "no"}`}><div className="decision-icon">{rpaPossible ? "✓" : "—"}</div><div><div className="mini-title">RPA 改造</div><h4>{rpaPossible ? "适合部分节点" : "当前不适合或需确认"}</h4><ShortList items={rpaPossible ? r.technologySummary.rpaSuitable : ["已有 API 或尚未确认存在稳定、重复的界面操作"]}/></div></article>
      </div>
      <p className="concise-conclusion">{r.analysisMeta.overallConclusion}</p>
    </section>
    <section className="section" id="process">
      <div className="section-title-row"><div><h3>02 · 可改造业务流程图</h3><p className="muted">每个节点只标注 AI、RPA 或“不使用 AI/RPA”；红色区域为人工控制点。</p></div></div>
      <div id="process-diagram-export" className="diagram-export-area"><ProcessFlowView steps={r.targetProcess}/></div>
    </section>
    <section className="section" id="context-data">
      <div className="section-title-row"><h3>03 · 上下文对接与数据流转</h3></div>
      <div id="context-data-diagram-export" className="diagram-export-area"><ContextDataFlowView data={r.dataClosedLoop}/></div>
    </section>
  </>;
}
