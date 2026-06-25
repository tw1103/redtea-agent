import type { AnalysisResult } from "@/lib/schemas";

function technologyClass(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("rpa")) return "rpa";
  if (normalized === "ai" || normalized.includes("大模型")) return "ai";
  if (normalized.includes("人工")) return "human";
  if (normalized.includes("api")) return "api";
  if (normalized.includes("规则") || normalized.includes("python") || normalized.includes("sql")) return "rule";
  return "workflow";
}

function mainTechnologies(technology: string[]) {
  return technology.filter((name) => name.includes("RPA") || name === "AI" || name.includes("大模型") || name.includes("API") || name.includes("规则"));
}

export function ProcessFlowView({ steps }: { steps: AnalysisResult["targetProcess"] }) {
  return <>
    <div className="flow-legend" aria-label="技术图例">
      {["RPA", "AI", "不使用 AI/RPA", "人工关口"].map((name) => <span className={`flow-tech ${name.includes("不使用") ? "none" : technologyClass(name)}`} key={name}>{name}</span>)}
    </div>
    <div className="mindmap-scroll">
      <div className="mindmap-chain process-mindmap" aria-label="可改造业务流程链路脑图">
        <div className="mindmap-center">
          <span>业务流程改造</span>
          <b>AI / RPA / API / 规则 / 人工</b>
        </div>
        {steps.map((step) => {
          const techs = mainTechnologies(step.technology);
          return <div className="mindmap-chain-unit" key={step.stepNo}>
            <div className="mindmap-link" aria-hidden="true" />
            <article className="mindmap-node process-topic">
                <div className="mindmap-node-head"><span>{step.stepNo}</span><h4>{step.name}</h4></div>
                <small className="mindmap-subtitle">{step.executor}</small>
                <div className="process-techs compact">
                  {techs.length ? techs.map((name) => <span className={`flow-tech ${technologyClass(name)}`} key={name}>{name.includes("RPA") ? "RPA" : name.includes("AI") || name.includes("大模型") ? "AI" : name.includes("API") ? "API" : "规则"}</span>) : <span className="flow-tech none">不使用 AI/RPA</span>}
                </div>
                <div className="mindmap-leaves">
                  <div><b>输入</b><span>{step.input}</span></div>
                  <div><b>输出</b><span>{step.output}</span></div>
                  <div className="human"><b>人工关口</b><span>{step.humanGate}</span></div>
                </div>
              </article>
          </div>;
        })}
      </div>
    </div>
    <details className="detail-disclosure">
      <summary>查看各节点输入输出、正常路径和异常路径</summary>
      <div className="process-detail-grid">
        {steps.map((step) => <article className="process-detail-card" key={step.stepNo}>
          <h4>{step.stepNo}. {step.name}</h4>
          <p><b>输入：</b>{step.input}</p>
          <p><b>输出：</b>{step.output}</p>
          <p><b>正常：</b>{step.normalPath}</p>
          <p><b>异常：</b>{step.exceptionPath}</p>
        </article>)}
      </div>
    </details>
  </>;
}
