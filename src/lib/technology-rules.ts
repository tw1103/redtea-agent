export type TaskSignals = { hasStableApi?: boolean; deterministicRules?: boolean; fixedWorkflow?: boolean; highRiskWrite?: boolean; noApi?: boolean; stableUi?: boolean; dynamicPath?: boolean; multipleTools?: boolean };
export function selectTechnologies(s: TaskSignals) {
  const modes: string[] = [];
  if (s.hasStableApi) modes.push("API"); else if (s.noApi && s.stableUi) modes.push("RPA");
  if (s.deterministicRules) modes.push("规则引擎");
  if (s.fixedWorkflow) modes.push("工作流");
  if (s.dynamicPath && s.multipleTools) modes.push("Agent");
  if (s.highRiskWrite) modes.push("人工审批");
  return { modes, recommendAi: !s.deterministicRules, recommendAgent: Boolean(s.dynamicPath && s.multipleTools && !s.fixedWorkflow), humanRequired: Boolean(s.highRiskWrite) };
}
