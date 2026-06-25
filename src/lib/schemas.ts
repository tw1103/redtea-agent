import { z } from "zod";

const text = (max = 4000) => z.string().trim().max(max);
export const AnalysisModeSchema = z.enum(["quick", "standard", "deep"]);
export const AnalysisScopeSchema = z.enum(["single", "domain", "enterprise"]);
export const ScenarioInputSchema = z.object({
  analysisMode: AnalysisModeSchema,
  analysisScope: AnalysisScopeSchema.optional(),
  scenarioName: text(120).min(1, "请输入分析主题或业务范围"),
  scenarioDescription: text(4000).min(1, "请输入业务背景、目标或需要分析的问题"),
  organizationContext: text().optional(),
  businessGoal: text().optional(), actors: text().optional(), businessObjects: text().optional(), triggers: text().optional(),
  currentProcess: text().optional(), inputDataAndSources: text().optional(), businessRules: text().optional(), systemsAndRelations: text().optional(),
  targetResultsAndDestinations: text().optional(), painPoints: text().optional(), constraints: text().optional(), governanceRequirements: text().optional(),
}).superRefine((value, ctx) => {
  const total = Object.values(value).filter((v): v is string => typeof v === "string").reduce((n, v) => n + v.length, 0);
  if (total > 20000) ctx.addIssue({ code: "custom", message: "输入总长度不能超过 20000 字", path: ["scenarioDescription"] });
});

const str = z.string(); const strings = z.array(str); const score = z.number().min(1).max(5);

export const DisplayAnalysisSchema = z.object({
  conclusion: z.object({
    canTransform: z.boolean(),
    summary: str,
    ai: z.object({ suitable: z.boolean(), tasks: strings }),
    rpa: z.object({ suitable: z.boolean(), tasks: strings }),
  }),
  processFlow: z.array(z.object({
    stepNo: z.number().int(),
    name: str,
    executor: str,
    tags: z.array(z.enum(["AI", "RPA", "API", "规则", "工作流", "人工", "不使用AI/RPA"])),
    input: str,
    output: str,
    normalPath: str,
    exceptionPath: str,
    humanGate: str,
  })).min(1),
  contextDataFlow: z.object({
    contextNodes: z.array(z.object({
      dataObject: str,
      sourceSystem: str,
      sourceLocation: str,
      acquisitionMethod: str,
      trigger: str,
    })).min(1),
    processing: str,
    resultNodes: z.array(z.object({
      resultObject: str,
      targetSystem: str,
      targetLocation: str,
      stateChange: str,
      downstreamConsumer: str,
    })).min(1),
    dataFlows: z.array(z.object({
      stepNo: z.number().int(),
      dataObject: str,
      inputSource: str,
      processAction: str,
      storage: str,
      outputResult: str,
      nextDestination: str,
    })).min(1),
  }),
});

export const AnalysisResultSchema = z.object({
  analysisMeta: z.object({ analysisMode: AnalysisModeSchema, analysisScope: AnalysisScopeSchema, generatedAt: str, confidence: z.number().min(0).max(1), overallConclusion: str }),
  opportunityPortfolio: z.array(z.object({ scenarioId: str, scenarioName: str, businessArea: str, problem: str, targetValue: str, candidateTechnologies: strings, businessValue: score, feasibility: score, risk: score, priority: z.enum(["P0", "P1", "P2"]), recommendation: str })),
  scenarioUnderstanding: z.object({ scenarioName: str, businessDomain: str, businessGoals: strings, actors: strings, businessObjects: strings, triggers: strings, boundaries: strings, expectedResults: strings }),
  informationCompleteness: z.object({ knownFacts: strings, assumptions: strings, openQuestions: strings }),
  businessLayers: z.object({
    l1Goals: z.array(z.object({ goal: str, metric: str, boundary: str })),
    l2Scenario: z.object({ role: str, trigger: str, object: str, target: str, scope: str }),
    l3Process: z.array(z.object({ stepNo: z.number().int(), name: str, input: str, output: str, branch: str, exception: str, manualControl: str })),
    l4Tasks: z.array(z.object({ taskId: str, taskName: str, purpose: str, input: str, output: str, owner: str })),
    l5AtomicActions: z.array(z.object({ actionId: str, taskId: str, actionName: str, operationType: str, targetObject: str })),
  }),
  dataClosedLoop: z.object({
    dataSources: z.array(z.object({ dataObject: str, sourceSystem: str, sourceLocation: str, provider: str, trigger: str, acquisitionMethod: str, format: str, keyFields: strings, qualityRequirements: strings })),
    dataFlows: z.array(z.object({ stepNo: z.number().int(), dataObject: str, inputSource: str, processAction: str, intermediateResult: str, storage: str, outputResult: str, nextDestination: str })),
    resultDestinations: z.array(z.object({ resultObject: str, targetSystem: str, targetLocation: str, writebackMethod: str, stateChange: str, downstreamConsumer: str, retentionAndAudit: str, failureHandling: str })),
  }),
  currentProblems: z.array(z.object({ processStep: str, problemType: str, problem: str, businessImpact: str, severity: z.enum(["低", "中", "高"]) })),
  taskTechnologyMappings: z.array(z.object({ taskId: str, taskName: str, taskType: str, currentMode: str, recommendedMode: strings, aiRole: str, rpaRole: str, apiRole: str, pythonSqlRole: str, workflowRole: str, agentRole: str, humanReview: str, rationale: str, prerequisites: strings, riskLevel: z.enum(["低", "中", "高"]), priority: z.enum(["P0", "P1", "P2"]) })),
  targetProcess: z.array(z.object({ stepNo: z.number().int(), name: str, executor: str, technology: strings, input: str, output: str, normalPath: str, exceptionPath: str, humanGate: str })),
  technologySummary: z.object({ aiSuitable: strings, rpaSuitable: strings, apiSuitable: strings, rulesSuitable: strings, pythonSqlSuitable: strings, workflowSuitable: strings, manualRequired: strings }),
  agentDesign: z.object({ necessary: z.boolean(), maturityLevel: z.enum(["M0", "M1", "M2", "M3", "M4"]), rationale: str, responsibilities: strings, callableTools: strings, fixedWorkflowParts: strings, boundaries: strings, exitConditions: strings }),
  governance: z.array(z.object({ risk: str, control: str, owner: str, auditEvidence: str })),
  implementationRoadmap: z.array(z.object({ phase: str, goal: str, scope: strings, deliverables: strings, dependencies: strings, acceptanceCriteria: strings })),
  valueAssessment: z.object({ businessValue: score, standardization: score, dataMaturity: score, technicalFeasibility: score, riskControllability: score, reusability: score, overallScore: z.number().min(0).max(100), conclusion: str }),
});

export type ScenarioInput = z.infer<typeof ScenarioInputSchema>;
export type DisplayAnalysis = z.infer<typeof DisplayAnalysisSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalyzeResponse = { success: true; mode: "live" | "mock"; result: AnalysisResult } | { success: false; error: { code: string; message: string } };
