import type { AnalysisResult } from "./schemas";

const clean = (value: string) => value.replace(/[\[\]{}"`|]/g, " ").replace(/\s+/g, " ").trim();
const bullets = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join("\n") : "- 无";

export function analysisResultToMarkdown(r: AnalysisResult) {
  const aiPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((name) => name === "AI" || name.includes("大模型"))) || r.targetProcess.some((step) => step.technology.includes("AI"));
  const rpaPossible = r.taskTechnologyMappings.some((item) => item.recommendedMode.some((name) => name.includes("RPA"))) || r.targetProcess.some((step) => step.technology.some((name) => name.includes("RPA")));
  const processNodes = r.targetProcess.map((step) => {
    const labels = [step.technology.some((name) => name.includes("RPA")) ? "RPA" : "", step.technology.includes("AI") ? "AI" : ""].filter(Boolean);
    return `  P${step.stepNo}["${step.stepNo}. ${clean(step.name)}<br/>${labels.length ? labels.join(" + ") : "不使用 AI/RPA"}<br/>人工关口：${clean(step.humanGate)}"]`;
  }).join("\n");
  const processEdges = r.targetProcess.slice(0, -1).map((step, index) => `  P${step.stepNo} --> P${r.targetProcess[index + 1].stepNo}`).join("\n");
  const sources = r.dataClosedLoop.dataSources.map((item, index) => `  S${index}["来源：${clean(item.dataObject)}<br/>${clean(item.sourceSystem)}"] --> ACQ["获取与触发"]`).join("\n");
  const destinations = r.dataClosedLoop.resultDestinations.map((item, index) => `  PROC --> D${index}["落点：${clean(item.resultObject)}<br/>${clean(item.targetSystem)}"] --> C${index}["下游：${clean(item.downstreamConsumer)}"]`).join("\n");
  const dataRows = r.dataClosedLoop.dataFlows.map((item) => `  F${item.stepNo}A["${clean(item.inputSource)}"] --> F${item.stepNo}B["${clean(item.processAction)}"] --> F${item.stepNo}C["${clean(item.outputResult)}"] --> F${item.stepNo}D["${clean(item.nextDestination)}"]`).join("\n");
  return `# ${r.scenarioUnderstanding.scenarioName}场景拆解方案

## 1. 改造结论

- **AI 改造：** ${aiPossible ? "适合部分流程节点" : "当前不适合"}
- **RPA 改造：** ${rpaPossible ? "适合部分流程节点" : "当前不适合或需进一步确认"}

${r.analysisMeta.overallConclusion}

### AI 适用任务
${bullets(aiPossible ? r.technologySummary.aiSuitable : [])}

### RPA 适用任务
${bullets(rpaPossible ? r.technologySummary.rpaSuitable : [])}

## 2. 可改造业务流程图

\`\`\`mermaid
flowchart LR
${processNodes}
${processEdges}
\`\`\`

## 3. 上下文对接与数据流转

### 上下文对接流程

\`\`\`mermaid
flowchart LR
${sources}
  ACQ --> PROC["规则 / AI / 自动化处理"]
${destinations}
\`\`\`

### 数据流转流程

\`\`\`mermaid
flowchart LR
${dataRows}
\`\`\`
`;
}
