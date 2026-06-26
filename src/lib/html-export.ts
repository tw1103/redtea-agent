import type { AnalysisResult } from "./schemas";

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const safeText = (value: string) => escapeHtml(value || "待确认");

const list = (items: string[]) => items.length
  ? `<ul>${items.slice(0, 6).map((item) => `<li>${safeText(item)}</li>`).join("")}</ul>`
  : "<ul><li>暂无明确内容</li></ul>";

function techBadges(items: string[]) {
  const tags = items.filter((name) => /AI|RPA|API|规则|人工|工作流/.test(name));
  return (tags.length ? tags : ["不使用 AI/RPA"]).map((name) => `<span class="tag">${safeText(name.includes("RPA") ? "RPA" : name === "AI" || name.includes("大模型") ? "AI" : name)}</span>`).join("");
}

function processChain(result: AnalysisResult) {
  return `<div class="chain">
    <div class="center"><small>业务流程改造</small><b>AI / RPA / API / 规则 / 人工</b></div>
    ${result.targetProcess.map((step) => `<div class="link"></div><article class="node">
      <h4><span>${step.stepNo}</span>${safeText(step.name)}</h4>
      <p>${safeText(step.executor)}</p>
      <div class="tags">${techBadges(step.technology)}</div>
      <div class="leaf"><b>输入</b><span>${safeText(step.input)}</span></div>
      <div class="leaf"><b>输出</b><span>${safeText(step.output)}</span></div>
      <div class="leaf human"><b>人工关口</b><span>${safeText(step.humanGate)}</span></div>
    </article>`).join("")}
  </div>`;
}

function contextChain(result: AnalysisResult) {
  const data = result.dataClosedLoop;
  const consumers = [...new Set(data.resultDestinations.map((item) => item.downstreamConsumer))];
  const blocks = [
    {
      index: "01",
      title: "来源系统 / 数据对象",
      leaves: data.dataSources.map((item) => [item.dataObject, `${item.sourceSystem} · ${item.sourceLocation}`]),
    },
    {
      index: "02",
      title: "获取与触发",
      leaves: data.dataSources.map((item) => [item.acquisitionMethod, item.trigger]),
    },
    {
      index: "03",
      title: "规则 / AI / 自动化处理",
      leaves: [["处理动作", "清洗、判断、分析、暂存与审计留痕"], ["异常接管", "缺字段、权限或口径异常时人工确认"]],
    },
    {
      index: "04",
      title: "结果落点",
      leaves: data.resultDestinations.map((item) => [item.resultObject, `${item.targetSystem} · ${item.targetLocation} · ${item.stateChange}`]),
    },
    {
      index: "05",
      title: "下游使用",
      leaves: consumers.map((item) => [item, "接收结果并进入后续业务"]),
    },
  ];
  return `<div class="chain">
    <div class="center"><small>上下文对接</small><b>来源 · 获取 · 处理 · 结果 · 下游</b></div>
    ${blocks.map((block) => `<div class="link"></div><article class="node">
      <h4><span>${block.index}</span>${safeText(block.title)}</h4>
      ${block.leaves.map(([title, body]) => `<div class="leaf"><b>${safeText(title)}</b><span>${safeText(body)}</span></div>`).join("")}
    </article>`).join("")}
  </div>`;
}

function dataLineage(result: AnalysisResult) {
  return `<div class="chain data-chain">
    <div class="center"><small>DATA</small><b>数据流转总链路</b></div>
    ${result.dataClosedLoop.dataFlows.map((flow) => `<div class="link"></div><article class="node wide">
      <h4><span>${flow.stepNo}</span>${safeText(flow.dataObject)}</h4>
      <div class="leaf"><b>输入来源</b><span>${safeText(flow.inputSource)}</span></div>
      <div class="leaf"><b>处理动作</b><span>${safeText(flow.processAction)}</span></div>
      <div class="leaf"><b>暂存 / 留痕</b><span>${safeText(flow.storage)}</span></div>
      <div class="leaf"><b>输出与落点</b><span>${safeText(flow.outputResult)} · ${safeText(flow.nextDestination)}</span></div>
    </article>`).join("")}
  </div>`;
}

function scopeTitle(scope: AnalysisResult["analysisMeta"]["analysisScope"]) {
  if (scope === "enterprise") return "企业机会规划";
  if (scope === "domain") return "业务域盘点";
  return "单场景深挖";
}

function scopeInsight(result: AnalysisResult) {
  const scope = result.analysisMeta.analysisScope;
  if (scope === "single") {
    const firstStep = result.targetProcess[0];
    return `<div class="scope-grid">
      <article class="card"><h3>当前深挖对象</h3><p>${safeText(result.businessLayers.l2Scenario.scope)}</p></article>
      <article class="card"><h3>改造切入点</h3><p>${safeText(firstStep ? `${firstStep.name}：${firstStep.normalPath}` : result.analysisMeta.overallConclusion)}</p></article>
      <article class="card"><h3>人工控制边界</h3><p>${safeText(result.technologySummary.manualRequired[0] || "高风险、高金额、调账、删除、合同审批和合规结论必须保留人工控制。")}</p></article>
    </div>`;
  }
  const opportunities = result.opportunityPortfolio.slice(0, scope === "enterprise" ? 4 : 3);
  return `<div class="scope-grid">${opportunities.map((item) => `<article class="card opportunity">
    <div><span class="priority">${safeText(item.priority)}</span><h3>${safeText(item.scenarioName)}</h3></div>
    <p>${safeText(item.problem)}</p>
    <p><b>目标价值：</b>${safeText(item.targetValue)}</p>
    <p><b>建议：</b>${safeText(item.recommendation)}</p>
  </article>`).join("")}</div>${scope === "enterprise" ? `<div class="roadmap">${result.implementationRoadmap.slice(0, 3).map((phase, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${safeText(phase.phase)}</h3><p>${safeText(phase.goal)}</p></div></article>`).join("")}</div>` : ""}`;
}

export function analysisResultToHtml(result: AnalysisResult) {
  const aiPossible = result.taskTechnologyMappings.some((item) => item.recommendedMode.some((name) => name === "AI" || name.includes("大模型"))) || result.targetProcess.some((step) => step.technology.includes("AI"));
  const rpaPossible = result.taskTechnologyMappings.some((item) => item.recommendedMode.some((name) => name.includes("RPA"))) || result.targetProcess.some((step) => step.technology.some((name) => name.includes("RPA")));
  const isEnterprise = result.analysisMeta.analysisScope === "enterprise";
  const processSection = isEnterprise ? "" : `<section class="section"><h2>03 · ${result.analysisMeta.analysisScope === "domain" ? "推荐深化场景流程" : "可改造业务流程图"}</h2><div class="scroll">${processChain(result)}</div></section>`;
  const contextSection = isEnterprise ? "" : `<section class="section"><h2>04 · ${result.analysisMeta.analysisScope === "domain" ? "推荐场景数据链路" : "上下文对接与数据流转"}</h2><h3>上下文对接流程</h3><div class="scroll">${contextChain(result)}</div><h3 style="margin-top:22px">数据流转流程</h3><div class="scroll">${dataLineage(result)}</div></section>`;
  const nextStepTitle = isEnterprise ? "03 · 建议下一步" : result.analysisMeta.analysisScope === "domain" ? "05 · 建议下一步" : "05 · 建议下一步";
  const nextSteps = isEnterprise
    ? ["选择 1-2 个重点业务域进入业务域盘点。", "明确数据底座、知识库、权限、审计与流程编排等共性能力。", "确定试点节奏、预算边界和治理负责人。"]
    : result.analysisMeta.analysisScope === "domain"
      ? ["从 P0 场景中选择一个进入单场景深挖。", "补充系统、字段、规则、异常样本和人工控制要求。", "评估 API 优先、RPA 兜底、AI 辅助的组合方式。"]
      : ["补充接口、字段、权限、样本和异常场景。", "确认人工审批、留痕、幂等和回滚机制。", "进入原型验证或实施评审。"];
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeText(result.scenarioUnderstanding.scenarioName)} - 业务场景拆解方案</title>
  <style>
    :root{color-scheme:light;--bg:#f6faff;--panel:rgba(255,255,255,.94);--primary:#2563eb;--secondary:#06b6d4;--accent:#14b8a6;--line:#d8e6f7;--text:#102033;--muted:#64748b;--soft:#eff6ff;--soft-2:#ecfeff}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.65;background-image:radial-gradient(circle at 14% 12%,rgba(37,99,235,.14),transparent 28%),radial-gradient(circle at 82% 2%,rgba(6,182,212,.16),transparent 24%),repeating-linear-gradient(0deg,transparent 0,transparent 39px,rgba(37,99,235,.045) 40px),repeating-linear-gradient(90deg,transparent 0,transparent 39px,rgba(6,182,212,.045) 40px)}
    main{width:min(1440px,calc(100% - 44px));margin:auto;padding:32px 0 54px}.hero,.section{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 20px 55px rgba(37,99,235,.12);backdrop-filter:blur(8px)}
    .hero{padding:28px;margin-bottom:20px}.eyebrow{color:var(--secondary);font-size:12px;font-weight:800;letter-spacing:.16em}h1{margin:5px 0;font-size:30px;color:var(--primary)}h2{margin:0 0 14px;font-size:22px;color:var(--text)}h3{margin:0 0 10px;font-size:18px;color:var(--text)}.muted,p,li{color:var(--muted)}
    .section{padding:24px;margin:18px 0}.decision{display:inline-flex;border:1px solid rgba(37,99,235,.24);border-radius:999px;padding:6px 12px;background:linear-gradient(135deg,rgba(37,99,235,.1),rgba(6,182,212,.12));color:var(--primary);font-weight:800}.grid,.scope-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.scope-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.card{border:1px solid var(--line);border-radius:14px;padding:16px;background:linear-gradient(180deg,#fff,var(--soft))}
    .scroll{overflow-x:auto;padding:12px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(239,246,255,.7))}.chain{display:flex;align-items:center;min-width:max-content;padding:18px}.center{display:grid;place-items:center;text-align:center;width:230px;min-width:230px;min-height:140px;border:1px solid rgba(37,99,235,.28);border-radius:999px;padding:20px;background:linear-gradient(135deg,#ffffff,var(--soft-2));box-shadow:0 12px 30px rgba(37,99,235,.12)}.center small{color:var(--muted);font-weight:800;letter-spacing:.12em}.center b{font-size:16px;color:var(--primary)}
    .link{position:relative;width:56px;min-width:56px;height:1px;background:rgba(37,99,235,.35)}.link:after{content:"";position:absolute;right:0;top:-4px;width:9px;height:9px;border-top:1.5px solid rgba(37,99,235,.58);border-right:1.5px solid rgba(37,99,235,.58);transform:rotate(45deg)}
    .node{width:292px;min-width:292px;min-height:150px;border:1px solid rgba(37,99,235,.22);border-radius:16px;padding:14px;background:linear-gradient(180deg,#ffffff,#f8fbff);box-shadow:0 14px 32px rgba(15,23,42,.08)}.node.wide{width:360px;min-width:360px}.node h4{display:flex;gap:9px;align-items:center;margin:0 0 8px;color:var(--text)}.node h4 span{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:rgba(37,99,235,.1);color:var(--primary)}
    .tag{display:inline-flex;border:1px solid rgba(6,182,212,.26);border-radius:999px;padding:2px 7px;margin:2px;background:rgba(6,182,212,.08);color:#0f766e;font-size:12px}.leaf{border-left:2px solid rgba(6,182,212,.36);border-radius:8px;padding:7px 9px;margin-top:8px;background:rgba(239,246,255,.75)}.leaf.human{border-left-color:rgba(244,63,94,.45);background:rgba(255,241,242,.72)}.leaf b{display:block;font-size:12px;color:var(--text)}.leaf span{display:block;color:var(--muted);font-size:12px}
    .scope-note{display:inline-flex;border:1px solid rgba(37,99,235,.18);border-radius:999px;padding:4px 10px;background:#eff6ff;color:var(--primary);font-size:12px;font-weight:800}.opportunity h3{display:inline;margin-left:8px}.priority{display:inline-grid;min-width:34px;height:28px;place-items:center;border-radius:999px;background:#ccfbf1;color:#0f766e;font-size:12px;font-weight:900}.roadmap{display:grid;gap:10px;margin-top:14px}.roadmap article{display:grid;grid-template-columns:42px 1fr;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff}.roadmap span{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:#dbeafe;color:var(--primary);font-weight:900}
    @media(max-width:760px){main{width:min(100% - 24px,1440px)}.grid,.scope-grid{grid-template-columns:1fr}.chain{padding:10px}.section{padding:16px}}
  </style>
</head>
<body>
  <main>
    <section class="hero"><div class="eyebrow">BUSINESS SCENARIO DECOMPOSITION AGENT</div><h1>${safeText(result.scenarioUnderstanding.scenarioName)}</h1><p>${safeText(result.scenarioUnderstanding.businessDomain)} · ${safeText(new Date(result.analysisMeta.generatedAt).toLocaleString("zh-CN"))}</p></section>
    <section class="section"><h2>01 · 改造结论</h2><span class="decision">${aiPossible || rpaPossible ? "可以改造" : "暂不建议改造"}</span><p>${safeText(result.analysisMeta.overallConclusion)}</p><div class="grid"><div class="card"><h3>AI 改造</h3>${list(aiPossible ? result.technologySummary.aiSuitable : ["当前未识别出明确 AI 节点"])}</div><div class="card"><h3>RPA 改造</h3>${list(rpaPossible ? result.technologySummary.rpaSuitable : ["当前未识别出明确 RPA 节点"])}</div></div></section>
    <section class="section"><h2>02 · ${safeText(scopeTitle(result.analysisMeta.analysisScope))}</h2>${scopeInsight(result)}</section>
    ${processSection}
    ${contextSection}
    <section class="section"><h2>${safeText(nextStepTitle)}</h2><div class="grid">${nextSteps.map((item, index) => `<div class="card"><h3>${index + 1}</h3><p>${safeText(item)}</p></div>`).join("")}</div></section>
  </main>
</body>
</html>`;
}
