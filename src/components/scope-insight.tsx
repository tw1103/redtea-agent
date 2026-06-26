import type { AnalysisResult } from "@/lib/schemas";

function scoreWidth(score: number) {
  return `${Math.min(Math.max(score, 1), 5) * 20}%`;
}

function Pill({ children }: { children: string }) {
  return <span className="scope-pill">{children}</span>;
}

function OpportunityCard({ opportunity }: { opportunity: AnalysisResult["opportunityPortfolio"][number] }) {
  return (
    <article className="scope-opportunity-card">
      <div className="scope-opportunity-head">
        <span className={`priority ${opportunity.priority.toLowerCase()}`}>{opportunity.priority}</span>
        <h4>{opportunity.scenarioName}</h4>
      </div>
      <p>{opportunity.problem}</p>
      <div className="scope-tags">{opportunity.candidateTechnologies.slice(0, 5).map((item) => <Pill key={item}>{item}</Pill>)}</div>
      <div className="score-bars">
        <div><span>价值</span><i><b style={{ width: scoreWidth(opportunity.businessValue) }} /></i></div>
        <div><span>可行</span><i><b style={{ width: scoreWidth(opportunity.feasibility) }} /></i></div>
        <div><span>风险</span><i><b style={{ width: scoreWidth(6 - opportunity.risk) }} /></i></div>
      </div>
    </article>
  );
}

function OpportunityTable({ items }: { items: AnalysisResult["opportunityPortfolio"] }) {
  return (
    <div className="table-wrap opportunity-table">
      <table>
        <thead><tr><th>场景</th><th>业务域</th><th>推荐技术</th><th>价值</th><th>可行</th><th>风险</th><th>优先级</th></tr></thead>
        <tbody>
          {items.slice(0, 8).map((item) => (
            <tr key={item.scenarioId}>
              <td><b>{item.scenarioName}</b><br /><span className="muted">{item.problem}</span></td>
              <td>{item.businessArea}</td>
              <td><div className="scope-tags">{item.candidateTechnologies.slice(0, 4).map((tech) => <Pill key={tech}>{tech}</Pill>)}</div></td>
              <td>{item.businessValue}/5</td>
              <td>{item.feasibility}/5</td>
              <td>{item.risk}/5</td>
              <td><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoadmapMini({ result }: { result: AnalysisResult }) {
  return (
    <div className="scope-roadmap">
      {result.implementationRoadmap.slice(0, 3).map((phase, index) => (
        <article key={phase.phase}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h4>{phase.phase}</h4>
            <p>{phase.goal}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function SingleScenario({ result }: { result: AnalysisResult }) {
  return (
    <section className="section scope-section single" id="scope-insight">
      <div className="scope-header">
        <div>
          <h3>02 · 深挖摘要</h3>
          <p className="muted">聚焦一个明确场景，输出可进入实施评审的改造方案。</p>
        </div>
        <div className="scope-focus"><Pill>流程节点</Pill><Pill>技术映射</Pill><Pill>人工控制</Pill></div>
      </div>
      <div className="single-focus-grid">
        <article><div className="mini-title">当前场景</div><h4>{result.scenarioUnderstanding.scenarioName}</h4><p>{result.businessLayers.l2Scenario.scope}</p></article>
        <article><div className="mini-title">优先切入点</div><h4>{result.targetProcess[0]?.name ?? "待确认"}</h4><p>{result.targetProcess[0]?.normalPath ?? result.analysisMeta.overallConclusion}</p></article>
        <article><div className="mini-title">人工控制边界</div><h4>{result.technologySummary.manualRequired[0] ?? "待确认"}</h4><p>高风险、高金额、调账、删除、合同审批和合规结论必须保留人工控制。</p></article>
      </div>
    </section>
  );
}

function BusinessDomain({ result }: { result: AnalysisResult }) {
  const opportunities = result.opportunityPortfolio.slice(0, 6);
  return (
    <section className="section scope-section domain" id="scope-insight">
      <div className="scope-header">
        <div>
          <h3>02 · 场景机会清单</h3>
          <p className="muted">业务域盘点用于发现和排序，不直接把每个场景拆到实施细节。</p>
        </div>
        <div className="scope-focus"><Pill>价值排序</Pill><Pill>可行性判断</Pill><Pill>推荐深挖场景</Pill></div>
      </div>
      <div className="opportunity-grid">{opportunities.slice(0, 3).map((opportunity) => <OpportunityCard key={opportunity.scenarioId} opportunity={opportunity} />)}</div>
      <OpportunityTable items={opportunities} />
    </section>
  );
}

function EnterprisePlan({ result }: { result: AnalysisResult }) {
  const topAreas = result.opportunityPortfolio.slice(0, 4);
  return (
    <section className="section scope-section enterprise" id="scope-insight">
      <div className="scope-header">
        <div>
          <h3>02 · 企业机会地图</h3>
          <p className="muted">企业机会规划用于选方向、定节奏和规划共性能力，不直接下钻到按钮、字段或具体 API。</p>
        </div>
        <div className="scope-focus"><Pill>重点业务域</Pill><Pill>共性能力</Pill><Pill>建设路线图</Pill></div>
      </div>
      <div className="enterprise-map">
        {topAreas.map((item) => (
          <article key={item.scenarioId}>
            <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
            <h4>{item.businessArea}</h4>
            <p>{item.scenarioName}</p>
            <div className="scope-tags">{item.candidateTechnologies.slice(0, 4).map((tech) => <Pill key={tech}>{tech}</Pill>)}</div>
          </article>
        ))}
      </div>
      <div className="enterprise-roadmap">
        <div>
          <div className="mini-title">建设路线</div>
          <h4>先选重点业务域，再做场景盘点，最后进入单场景实施设计</h4>
        </div>
        <RoadmapMini result={result} />
      </div>
    </section>
  );
}

export function ScopeInsight({ result }: { result: AnalysisResult }) {
  if (result.analysisMeta.analysisScope === "enterprise") return <EnterprisePlan result={result} />;
  if (result.analysisMeta.analysisScope === "domain") return <BusinessDomain result={result} />;
  return <SingleScenario result={result} />;
}
