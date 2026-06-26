import type { AnalysisResult } from "@/lib/schemas";
import { ExportActions } from "./export-actions";
import { ProcessFlowView } from "./process-flow-view";
import { ContextDataFlowView } from "./context-data-flow-view";
import { ScopeInsight } from "./scope-insight";

const scopeLabels = {
  single: "单场景深挖",
  domain: "业务域盘点",
  enterprise: "企业机会规划",
} as const;

const ShortList = ({ items }: { items: string[] }) => <ul className="list compact-list">{items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>;

function resultNav(scope: AnalysisResult["analysisMeta"]["analysisScope"]) {
  if (scope === "enterprise") return [["conclusion", "规划结论"], ["scope-insight", "机会地图"], ["next-step", "下一步"]] as const;
  if (scope === "domain") return [["conclusion", "盘点结论"], ["scope-insight", "机会清单"], ["process", "推荐场景"], ["context-data", "数据链路"], ["next-step", "下一步"]] as const;
  return [["conclusion", "改造结论"], ["scope-insight", "深挖摘要"], ["process", "流程节点图"], ["context-data", "上下文与数据流"], ["next-step", "下一步"]] as const;
}

function ConclusionSection({ result: r }: { result: AnalysisResult }) {
  const aiPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((modeName) => modeName === "AI" || modeName.includes("大模型"))) || r.targetProcess.some((step) => step.technology.some((name) => name === "AI"));
  const rpaPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((modeName) => modeName.includes("RPA"))) || r.targetProcess.some((step) => step.technology.some((name) => name.includes("RPA")));
  const overall = aiPossible || rpaPossible;
  const scope = r.analysisMeta.analysisScope;
  const title = scope === "enterprise" ? "01 · 规划结论" : scope === "domain" ? "01 · 盘点结论" : "01 · 改造结论";
  const decision = scope === "enterprise" ? "建议规划" : scope === "domain" ? "建议盘点深化" : overall ? "可以改造" : "暂不建议改造";
  const summary = scope === "enterprise"
    ? "当前输入适合形成企业级机会组合与阶段路线。"
    : scope === "domain"
      ? "当前业务域适合先进行候选场景识别和优先级排序。"
      : overall
        ? "当前业务流程存在可用 AI 或 RPA 优化的节点。"
        : "当前信息未识别出适合 AI 或 RPA 的明确节点。";

  return (
    <section className="section" id="conclusion">
      <h3>{title}</h3>
      <div className={`decision-banner ${overall || scope !== "single" ? "yes" : "no"}`}><span>{decision}</span>{summary}</div>
      {scope === "single" ? (
        <div className="decision-grid">
          <article className={`decision-card ${aiPossible ? "yes" : "no"}`}><div className="decision-icon">{aiPossible ? "✓" : "—"}</div><div><div className="mini-title">AI 改造</div><h4>{aiPossible ? "适合部分节点" : "当前不适合"}</h4><ShortList items={aiPossible ? r.technologySummary.aiSuitable : ["未发现需要非结构化理解、分类或生成的任务"]} /></div></article>
          <article className={`decision-card ${rpaPossible ? "yes" : "no"}`}><div className="decision-icon">{rpaPossible ? "✓" : "—"}</div><div><div className="mini-title">RPA 改造</div><h4>{rpaPossible ? "适合部分节点" : "当前不适合或需确认"}</h4><ShortList items={rpaPossible ? r.technologySummary.rpaSuitable : ["已有 API 或尚未确认存在稳定、重复的界面操作"]} /></div></article>
        </div>
      ) : null}
      <p className="concise-conclusion">{r.analysisMeta.overallConclusion}</p>
    </section>
  );
}

function RecommendedProcessSection({ result }: { result: AnalysisResult }) {
  const scope = result.analysisMeta.analysisScope;
  if (scope === "enterprise") return null;
  return (
    <section className="section" id="process">
      <div className="section-title-row">
        <div>
          <h3>{scope === "domain" ? "03 · 推荐深化场景流程" : "03 · 可改造业务流程图"}</h3>
          <p className="muted">{scope === "domain" ? "这里只展开优先推荐场景，不把业务域内所有场景都拆到实施细节。" : "每个节点标注 AI、RPA、API、规则、工作流或人工控制点。"}</p>
        </div>
      </div>
      <div id="process-diagram-export" className="diagram-export-area"><ProcessFlowView steps={result.targetProcess} /></div>
    </section>
  );
}

function ContextSection({ result }: { result: AnalysisResult }) {
  if (result.analysisMeta.analysisScope === "enterprise") return null;
  return (
    <section className="section" id="context-data">
      <div className="section-title-row"><h3>{result.analysisMeta.analysisScope === "domain" ? "04 · 推荐场景数据链路" : "04 · 上下文对接与数据流转"}</h3></div>
      <div id="context-data-diagram-export" className="diagram-export-area"><ContextDataFlowView data={result.dataClosedLoop} /></div>
    </section>
  );
}

function NextStepSection({ result }: { result: AnalysisResult }) {
  const scope = result.analysisMeta.analysisScope;
  const next = scope === "enterprise"
    ? ["选择 1-2 个重点业务域进入业务域盘点。", "明确企业级共性能力：数据底座、知识库、权限、审计与流程编排。", "确定试点节奏、预算边界和治理负责人。"]
    : scope === "domain"
      ? ["从 P0 场景中选择一个进入单场景深挖。", "补充该场景的系统、字段、规则、异常样本和人工控制要求。", "评估 API 优先、RPA 兜底、AI 辅助的组合方式。"]
      : ["补充接口、字段、权限、样本和异常场景。", "确认人工审批、留痕、幂等和回滚机制。", "进入原型验证或实施评审。"];
  return (
    <section className="section next-step-section" id="next-step">
      <h3>{scope === "enterprise" ? "03 · 建议下一步" : scope === "domain" ? "05 · 建议下一步" : "05 · 建议下一步"}</h3>
      <div className="next-step-grid">{next.map((item, index) => <article key={item}><span>{index + 1}</span><p>{item}</p></article>)}</div>
    </section>
  );
}

export function AnalysisResultView({ result, mode }: { result: AnalysisResult; mode: "live" }) {
  const nav = resultNav(result.analysisMeta.analysisScope);
  return <>
    <div className="result-head"><div><div><span className="badge">{mode === "live" ? "实时分析" : "实时分析"}</span></div><h2>{result.scenarioUnderstanding.scenarioName}</h2><div className="muted">{scopeLabels[result.analysisMeta.analysisScope]} · {result.scenarioUnderstanding.businessDomain} · {new Date(result.analysisMeta.generatedAt).toLocaleString("zh-CN")}</div></div><ExportActions result={result} /></div>
    <nav className="anchor-nav" aria-label="结果章节">{nav.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
    <ConclusionSection result={result} />
    <ScopeInsight result={result} />
    <RecommendedProcessSection result={result} />
    <ContextSection result={result} />
    <NextStepSection result={result} />
  </>;
}
