"use client";
import { useState } from "react";
import { ScenarioInputSchema, type AnalysisResult, type AnalyzeResponse, type ScenarioInput } from "@/lib/schemas";
import { AnalysisResultView } from "./analysis-result";

const base: ScenarioInput = { analysisMode: "quick", analysisScope: "domain", scenarioName: "", scenarioDescription: "" };
const fields: Array<{ key: keyof ScenarioInput; label: string; placeholder: string; minMode: 0|1|2; rows?: number }> = [
  { key:"scenarioName",label:"分析主题或业务范围",placeholder:"例如：客户服务、供应链运营、合同管理",minMode:0 },
  { key:"scenarioDescription",label:"业务背景与分析诉求",placeholder:"可以描述一个流程，也可以描述部门现状、业务目标或希望盘点的机会",minMode:0,rows:3 },
  { key:"organizationContext",label:"组织与业务背景",placeholder:"行业、组织规模、部门职责、服务对象和战略重点",minMode:1,rows:2 },
  { key:"businessGoal",label:"当前业务目标",placeholder:"希望改善的指标和业务结果",minMode:1 },
  { key:"actors",label:"参与角色",placeholder:"执行、负责、审批和使用结果的角色",minMode:1 },
  { key:"businessObjects",label:"业务对象",placeholder:"实际处理的数据、单据、合同或工单",minMode:1 },
  { key:"triggers",label:"触发条件",placeholder:"何时、因为什么事件开始",minMode:1 },
  { key:"currentProcess",label:"当前流程",placeholder:"从开始到结束的步骤、分支和异常",minMode:1,rows:3 },
  { key:"inputDataAndSources",label:"输入数据与来源",placeholder:"系统、模块、页面、文件、字段或接口",minMode:1,rows:2 },
  { key:"businessRules",label:"业务规则",placeholder:"判断、计算、匹配和审批规则",minMode:2,rows:2 },
  { key:"systemsAndRelations",label:"涉及系统及其关系",placeholder:"来源、处理、审批、结果系统及接口情况",minMode:2,rows:2 },
  { key:"targetResultsAndDestinations",label:"目标结果与结果落点",placeholder:"写到哪个系统、模块、表、目录或消息渠道",minMode:2,rows:2 },
  { key:"painPoints",label:"当前痛点",placeholder:"重复劳动、等待、错误、风险或系统割裂",minMode:1,rows:2 },
  { key:"constraints",label:"约束条件",placeholder:"时效、安全、接口、隐私、成本和组织约束",minMode:2,rows:2 },
  { key:"governanceRequirements",label:"风险、权限与审批要求",placeholder:"读写权限、审批、留痕、幂等、回滚和人工接管",minMode:2,rows:2 },
];
const modeRank = { quick: 0, standard: 1, deep: 2 } as const;

export function ScenarioForm() {
  const [form, setForm] = useState<ScenarioInput>(base); const [result,setResult]=useState<AnalysisResult>(); const [responseMode,setResponseMode]=useState<"live"|"mock">(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const update = (key:keyof ScenarioInput,value:string) => setForm((x)=>({...x,[key]:value}));
  async function submit(e:React.FormEvent){e.preventDefault();setError("");const parsed=ScenarioInputSchema.safeParse(form);if(!parsed.success){setError(parsed.error.issues[0]?.message||"请检查输入");return}setLoading(true);try{const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)});const data:AnalyzeResponse=await res.json();if(!data.success)throw new Error(data.error.message);setResult(data.result);setResponseMode(data.mode);setTimeout(()=>document.getElementById("analysis-result")?.scrollIntoView({behavior:"smooth",block:"start"}),20)}catch(err){setError(err instanceof Error?err.message:"分析失败，请稍后重试")}finally{setLoading(false)}}
  return <>
    <form className="panel form-panel" onSubmit={submit} noValidate><h2 className="panel-title">描述分析范围</h2><div className="hint">既可以深挖单个流程，也可以盘点业务域或企业级改造机会。</div>
      <div className="mini-title">分析范围</div><div className="mode-tabs" aria-label="分析范围">{(["single","domain","enterprise"] as const).map((scope,i)=><button type="button" key={scope} className={`mode-button ${form.analysisScope===scope?"active":""}`} onClick={()=>setForm(x=>({...x,analysisScope:scope}))}>{["单场景深挖","业务域盘点","企业机会规划"][i]}</button>)}</div>
      <div className="mini-title">分析深度</div>
      <div className="mode-tabs" aria-label="分析模式">{(["quick","standard","deep"] as const).map((mode,i)=><button type="button" key={mode} className={`mode-button ${form.analysisMode===mode?"active":""}`} onClick={()=>setForm(x=>({...x,analysisMode:mode}))}>{["快速分析","标准分析","深度设计"][i]}</button>)}</div>
      {fields.filter(f=>f.minMode<=modeRank[form.analysisMode]).map((field)=><div className="field" key={field.key}><label htmlFor={field.key}>{field.label}{field.minMode===0&&<span className="required"> *</span>}</label>{field.rows?<textarea id={field.key} rows={field.rows} value={String(form[field.key]||"")} onChange={e=>update(field.key,e.target.value)} placeholder={field.placeholder} maxLength={4000}/>:<input id={field.key} value={String(form[field.key]||"")} onChange={e=>update(field.key,e.target.value)} placeholder={field.placeholder} maxLength={field.key==="scenarioName"?120:4000}/>}</div>)}
      {error&&<div className="error" role="alert">{error}</div>}
      <div className="actions"><button className="button" type="button" onClick={()=>{setForm(base);setResult(undefined);setError("")}}>清空</button><button className="button primary" type="submit" disabled={loading}>{loading?"正在拆解…":"生成场景拆解方案"}</button></div>
    </form>
    <section className="panel result-panel" id="analysis-result" aria-live="polite">{loading?<div className="loading"><div className="spinner"/><h2>正在拆解业务并映射技术</h2><p className="muted">正在识别候选场景、拆分任务，并判断 RPA、AI、API、规则、工作流与人工的适用边界。</p></div>:result&&responseMode?<AnalysisResultView result={result} mode={responseMode}/>:<div className="empty"><div className="empty-mark">◇</div><h2>先把业务拆清楚，再决定每一部分用什么技术</h2><p className="muted">输入部门、业务域、企业目标或具体流程，获得任务级 RPA / AI 适用性与落地蓝图。</p><div className="empty-grid">{["业务域与目标理解","场景机会识别与排序","L1–L5 任务拆解","RPA 适用步骤","AI 适用任务与边界","API / 规则 / 工作流 / 人工"].map(x=><div className="empty-item" key={x}>{x}</div>)}</div></div>}</section>
  </>;
}
