"use client";

import { useState } from "react";
import { ScenarioInputSchema, type AnalysisResult, type AnalyzeResponse, type ScenarioInput } from "@/lib/schemas";
import { AnalysisResultView } from "./analysis-result";

type AnalysisScope = NonNullable<ScenarioInput["analysisScope"]>;
type AnalysisMode = ScenarioInput["analysisMode"];
type FieldConfig = {
  key: keyof ScenarioInput;
  label: string;
  placeholder: string;
  minMode: 0 | 1 | 2;
  rows?: number;
};

const base: ScenarioInput = { analysisMode: "quick", analysisScope: "domain", scenarioName: "", scenarioDescription: "" };

const scopeOptions: Record<AnalysisScope, { label: string; helper: string; modeLabels: Record<AnalysisMode, string> }> = {
  single: {
    label: "单场景深挖",
    helper: "适合已经明确的单一流程：重点输出流程节点、AI/RPA 适用点、异常路径和人工控制边界。",
    modeLabels: { quick: "快速分析", standard: "标准分析", deep: "深度设计" },
  },
  domain: {
    label: "业务域盘点",
    helper: "适合一个部门或业务域：先识别候选机会，再选择优先场景展开流程和数据链路。",
    modeLabels: { quick: "快速盘点", standard: "标准盘点", deep: "机会排序" },
  },
  enterprise: {
    label: "企业机会规划",
    helper: "适合企业级目标：从跨部门价值链中规划机会组合、优先级和阶段化落地路线。",
    modeLabels: { quick: "机会初筛", standard: "规划评估", deep: "路线图设计" },
  },
};

const fieldsByScope: Record<AnalysisScope, FieldConfig[]> = {
  single: [
    { key: "scenarioName", label: "场景名称", placeholder: "例如：合同审批流程、客户投诉处理流程、采购付款申请", minMode: 0 },
    { key: "scenarioDescription", label: "业务背景与分析诉求", placeholder: "描述这个流程为什么要分析，希望解决什么问题，当前大致如何运转", minMode: 0, rows: 3 },
    { key: "currentProcess", label: "当前流程步骤", placeholder: "从开始到结束列出关键步骤、分支和异常路径", minMode: 1, rows: 3 },
    { key: "actors", label: "参与角色", placeholder: "执行人、审批人、业务负责人、系统使用方、结果使用方", minMode: 1 },
    { key: "inputDataAndSources", label: "输入数据与来源", placeholder: "来源系统、页面、文件、字段、接口或人工录入信息", minMode: 1, rows: 2 },
    { key: "targetResultsAndDestinations", label: "输出结果与落点", placeholder: "最终生成什么结果，写入哪个系统、页面、表单、目录或消息渠道", minMode: 1, rows: 2 },
    { key: "businessRules", label: "业务规则", placeholder: "判断、计算、匹配、分派、审批和异常处理规则", minMode: 2, rows: 2 },
    { key: "systemsAndRelations", label: "涉及系统及关系", placeholder: "来源系统、处理系统、审批系统、结果系统，以及是否有 API", minMode: 2, rows: 2 },
    { key: "governanceRequirements", label: "风险、权限与人工控制", placeholder: "哪些动作必须审批、复核、留痕、幂等、回滚或人工接管", minMode: 2, rows: 2 },
  ],
  domain: [
    { key: "scenarioName", label: "业务域 / 部门名称", placeholder: "例如：财务共享中心、客服中心、供应链运营、人力资源服务", minMode: 0 },
    { key: "scenarioDescription", label: "业务域现状与盘点诉求", placeholder: "描述该业务域的职责、主要工作、希望盘点哪些自动化或 AI 改造机会", minMode: 0, rows: 3 },
    { key: "organizationContext", label: "部门职责与服务对象", placeholder: "部门负责什么、服务哪些内部/外部对象、上下游有哪些团队", minMode: 1, rows: 2 },
    { key: "businessGoal", label: "盘点目标", placeholder: "例如：降本、提效、减少差错、提升响应速度、沉淀标准流程", minMode: 1 },
    { key: "currentProcess", label: "主要业务流程清单", placeholder: "列出该业务域下的主要流程或高频工作，不需要写得特别细", minMode: 1, rows: 3 },
    { key: "painPoints", label: "当前痛点", placeholder: "重复劳动、等待、人工搬运、差错、系统割裂、口径不一致、风险高发点", minMode: 1, rows: 2 },
    { key: "inputDataAndSources", label: "核心数据和系统来源", placeholder: "该业务域常用的系统、表单、文件、字段、报表或接口", minMode: 1, rows: 2 },
    { key: "systemsAndRelations", label: "系统现状与集成条件", placeholder: "是否有 API、是否只能页面操作、是否跨系统、是否有数据孤岛", minMode: 2, rows: 2 },
    { key: "constraints", label: "优先级和约束条件", placeholder: "周期、成本、人力、合规、安全、组织协同、上线窗口等限制", minMode: 2, rows: 2 },
    { key: "governanceRequirements", label: "风险与合规要求", placeholder: "审批、权限、留痕、审计、数据安全、人工接管要求", minMode: 2, rows: 2 },
  ],
  enterprise: [
    { key: "scenarioName", label: "企业级目标或规划主题", placeholder: "例如：集团降本增效、共享服务中心升级、端到端流程数字化", minMode: 0 },
    { key: "scenarioDescription", label: "企业背景与规划诉求", placeholder: "描述企业当前阶段、希望通过 AI/RPA/API/工作流解决什么经营或管理问题", minMode: 0, rows: 3 },
    { key: "businessGoal", label: "企业级目标", placeholder: "例如：降本、增效、提升客户体验、缩短交付周期、统一管理口径", minMode: 1 },
    { key: "organizationContext", label: "涉及部门与组织背景", placeholder: "涉及哪些部门、区域、子公司、共享中心或外部伙伴", minMode: 1, rows: 2 },
    { key: "businessObjects", label: "核心业务对象 / 价值链", placeholder: "例如：客户、订单、合同、供应商、员工、项目、资金、库存", minMode: 1 },
    { key: "currentProcess", label: "关键价值链或核心流程", placeholder: "描述跨部门链路，例如从商机到回款、从采购到付款、从需求到交付", minMode: 1, rows: 3 },
    { key: "painPoints", label: "企业级痛点", placeholder: "跨部门协同慢、系统割裂、数据口径不一、审批链长、成本高、风险不可视", minMode: 1, rows: 2 },
    { key: "systemsAndRelations", label: "关键系统和数据基础", placeholder: "ERP、CRM、OA、财务、人事、数据平台、接口、主数据、报表等现状", minMode: 2, rows: 2 },
    { key: "constraints", label: "预算、周期和组织约束", placeholder: "实施周期、预算、人力、权限、合规、IT 排期、区域差异、变更管理", minMode: 2, rows: 2 },
    { key: "targetResultsAndDestinations", label: "期望规划产出", placeholder: "希望得到机会地图、优先级、试点场景、阶段路线图或治理机制", minMode: 2, rows: 2 },
    { key: "governanceRequirements", label: "治理和风险要求", placeholder: "高风险动作、合规结论、审批权限、审计留痕、数据安全和人工控制原则", minMode: 2, rows: 2 },
  ],
};

const modeRank = { quick: 0, standard: 1, deep: 2 } as const;
const modeOrder: AnalysisMode[] = ["quick", "standard", "deep"];
const scopeOrder: AnalysisScope[] = ["single", "domain", "enterprise"];

function emptyValue(value: ScenarioInput[keyof ScenarioInput]) {
  return typeof value === "string" ? value : "";
}

export function ScenarioForm() {
  const [form, setForm] = useState<ScenarioInput>(base);
  const [result, setResult] = useState<AnalysisResult>();
  const [responseMode, setResponseMode] = useState<"live">();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scope = form.analysisScope ?? "domain";
  const activeScope = scopeOptions[scope];
  const activeFields = fieldsByScope[scope].filter((field) => field.minMode <= modeRank[form.analysisMode]);

  const update = (key: keyof ScenarioInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const visiblePayload = () => {
    const payload: ScenarioInput = {
      analysisMode: form.analysisMode,
      analysisScope: scope,
      scenarioName: form.scenarioName,
      scenarioDescription: form.scenarioDescription,
    };
    for (const field of activeFields) {
      if (field.key !== "analysisMode" && field.key !== "analysisScope" && field.key !== "scenarioName" && field.key !== "scenarioDescription") {
        const value = form[field.key];
        if (typeof value === "string" && value.trim()) payload[field.key] = value;
      }
    }
    return payload;
  };
  const changeScope = (nextScope: AnalysisScope) => {
    setForm((current) => ({ ...current, analysisScope: nextScope }));
    setResult(undefined);
    setResponseMode(undefined);
    setError("");
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = ScenarioInputSchema.safeParse(visiblePayload());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "请检查输入");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data: AnalyzeResponse = await response.json();
      if (!data.success) throw new Error(data.error.message);
      setResult(data.result);
      setResponseMode(data.mode);
      setTimeout(() => document.getElementById("analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <form className="panel form-panel" onSubmit={submit} noValidate>
      <h2 className="panel-title">{activeScope.label}</h2>
      <div className="mode-tabs scope-tabs" aria-label="分析入口">
        {scopeOrder.map((item) => (
          <button type="button" key={item} className={`mode-button ${scope === item ? "active" : ""}`} onClick={() => changeScope(item)}>
            {scopeOptions[item].label}
          </button>
        ))}
      </div>
      <div className="scope-helper">{activeScope.helper}</div>

      <div className="mode-tabs" aria-label="分析层级">
        {modeOrder.map((mode) => (
          <button type="button" key={mode} className={`mode-button ${form.analysisMode === mode ? "active" : ""}`} onClick={() => setForm((current) => ({ ...current, analysisMode: mode }))}>
            {activeScope.modeLabels[mode]}
          </button>
        ))}
      </div>

      {activeFields.map((field) => (
        <div className="field" key={`${scope}-${field.key}`}>
          <label htmlFor={field.key}>{field.label}{field.minMode === 0 && <span className="required"> *</span>}</label>
          {field.rows ? (
            <textarea id={field.key} rows={field.rows} value={emptyValue(form[field.key])} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} maxLength={4000} />
          ) : (
            <input id={field.key} value={emptyValue(form[field.key])} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} maxLength={field.key === "scenarioName" ? 120 : 4000} />
          )}
        </div>
      ))}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="actions">
        <button className="button" type="button" onClick={() => { setForm(base); setResult(undefined); setResponseMode(undefined); setError(""); }}>清空</button>
        <button className="button primary" type="submit" disabled={loading}>{loading ? "正在拆解…" : "生成场景拆解方案"}</button>
      </div>
    </form>

    <section className="panel result-panel" id="analysis-result" aria-live="polite">
      {loading ? (
        <div className="loading"><div className="spinner" /><h2>正在拆解业务并映射技术</h2><p className="muted">正在根据当前入口识别候选机会、拆分任务，并判断 RPA、AI、API、规则、工作流与人工的适用边界。</p></div>
      ) : result && responseMode ? (
        <AnalysisResultView result={result} mode={responseMode} />
      ) : (
        <div className="empty"><div className="empty-mark">◇</div><h2>先选分析入口，再补充对应业务信息</h2><p className="muted">单场景适合深挖流程，业务域适合盘点机会，企业规划适合形成机会组合和路线图。</p><div className="empty-grid">{["单场景流程拆解", "业务域机会盘点", "企业级机会规划", "RPA 适用步骤", "AI 适用任务与边界", "API / 规则 / 工作流 / 人工"].map((item) => <div className="empty-item" key={item}>{item}</div>)}</div></div>
      )}
    </section>
  </>;
}
