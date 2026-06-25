import type { AnalysisResult, DisplayAnalysis, ScenarioInput } from "./schemas";

const UNKNOWN = "待确认";

function asList(value: string | undefined, fallback: string[]) {
  return value?.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean) ?? fallback;
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function score(value: number) {
  return Math.min(Math.max(value, 1), 5);
}

function priority(index: number): "P0" | "P1" | "P2" {
  if (index < 2) return "P0";
  if (index < 4) return "P1";
  return "P2";
}

function riskLevel(text: string): "低" | "中" | "高" {
  return /高风险|高金额|审批|合规|删除|调账|合同|人工确认|人工审批/.test(text) ? "高" : "中";
}

function displayTags(tags: string[]) {
  return tags.map((tag) => tag === "不使用AI/RPA" ? "规则/工作流/人工" : tag);
}

function inferDomain(input: ScenarioInput) {
  return input.analysisScope === "enterprise" ? "企业级业务流程" : input.analysisScope === "domain" ? "业务域流程" : "具体业务流程";
}

function firstOrUnknown(items: string[]) {
  return items[0] || UNKNOWN;
}

export function displayAnalysisToResult(display: DisplayAnalysis, input: ScenarioInput): AnalysisResult {
  const targetProcess = display.processFlow.map((step) => ({
    stepNo: step.stepNo,
    name: step.name,
    executor: step.executor || UNKNOWN,
    technology: displayTags(step.tags),
    input: step.input || UNKNOWN,
    output: step.output || UNKNOWN,
    normalPath: step.normalPath || UNKNOWN,
    exceptionPath: step.exceptionPath || UNKNOWN,
    humanGate: step.humanGate || UNKNOWN,
  }));

  const manualRequired = targetProcess
    .filter((step) => /人工|审批|确认|复核|高风险|合规|删除|调账|合同/.test(`${step.technology.join(" ")} ${step.humanGate}`))
    .map((step) => `${step.name}：${step.humanGate}`);

  const aiSuitable = display.conclusion.ai.suitable ? unique(display.conclusion.ai.tasks) : [];
  const rpaSuitable = display.conclusion.rpa.suitable ? unique(display.conclusion.rpa.tasks) : [];
  const apiSuitable = targetProcess.filter((step) => step.technology.includes("API")).map((step) => `${step.name}：${step.input} → ${step.output}`);
  const rulesSuitable = targetProcess.filter((step) => step.technology.includes("规则")).map((step) => step.name);
  const workflowSuitable = targetProcess.filter((step) => step.technology.includes("工作流")).map((step) => step.name);

  const actors = asList(input.actors, unique(targetProcess.map((step) => step.executor)));
  const businessObjects = asList(input.businessObjects, unique([
    ...display.contextDataFlow.contextNodes.map((node) => node.dataObject),
    ...display.contextDataFlow.resultNodes.map((node) => node.resultObject),
  ]));
  const triggers = asList(input.triggers, unique(display.contextDataFlow.contextNodes.map((node) => node.trigger)));
  const expectedResults = asList(input.targetResultsAndDestinations, unique(display.contextDataFlow.resultNodes.map((node) => node.resultObject)));

  return {
    analysisMeta: {
      analysisMode: input.analysisMode,
      analysisScope: input.analysisScope ?? "single",
      generatedAt: new Date().toISOString(),
      confidence: 0.78,
      overallConclusion: display.conclusion.summary,
    },
    opportunityPortfolio: targetProcess.map((step, index) => ({
      scenarioId: `S${index + 1}`,
      scenarioName: step.name,
      businessArea: inferDomain(input),
      problem: step.exceptionPath,
      targetValue: step.output,
      candidateTechnologies: step.technology,
      businessValue: score(4),
      feasibility: score(step.technology.includes("API") || step.technology.includes("规则") ? 4 : 3),
      risk: score(riskLevel(`${step.humanGate} ${step.exceptionPath}`) === "高" ? 4 : 3),
      priority: priority(index),
      recommendation: `${step.normalPath}；${step.humanGate}`,
    })),
    scenarioUnderstanding: {
      scenarioName: input.scenarioName,
      businessDomain: inferDomain(input),
      businessGoals: asList(input.businessGoal, [display.conclusion.summary]),
      actors,
      businessObjects,
      triggers,
      boundaries: asList(input.constraints, ["高风险、高金额、删除、审批、合同与合规结论保留人工控制"]),
      expectedResults,
    },
    informationCompleteness: {
      knownFacts: [
        `分析主题或业务范围：${input.scenarioName}`,
        `业务背景与分析诉求：${input.scenarioDescription}`,
        `模型识别的处理逻辑：${display.contextDataFlow.processing}`,
      ],
      assumptions: [
        input.systemsAndRelations ? `系统关系：${input.systemsAndRelations}` : "系统、字段、权限和接口可用性需要在实施前确认",
        input.inputDataAndSources ? `输入数据来源：${input.inputDataAndSources}` : "输入数据来源需要进一步确认",
      ],
      openQuestions: [
        "关键字段、业务主键和状态口径是否已经统一？",
        "哪些写入、审批或对外反馈动作必须人工确认？",
        "现有系统是否提供稳定 API，还是只能通过页面、文件或人工交接获取？",
      ],
    },
    businessLayers: {
      l1Goals: [{
        goal: display.conclusion.summary,
        metric: "处理周期、人工耗时、异常闭环率、准确率与审计完整性",
        boundary: "不自动越权执行高风险决策",
      }],
      l2Scenario: {
        role: firstOrUnknown(actors),
        trigger: firstOrUnknown(triggers),
        object: firstOrUnknown(businessObjects),
        target: firstOrUnknown(expectedResults),
        scope: input.scenarioDescription,
      },
      l3Process: targetProcess.map((step) => ({
        stepNo: step.stepNo,
        name: step.name,
        input: step.input,
        output: step.output,
        branch: step.normalPath,
        exception: step.exceptionPath,
        manualControl: step.humanGate,
      })),
      l4Tasks: targetProcess.map((step) => ({
        taskId: `T${step.stepNo}`,
        taskName: step.name,
        purpose: step.normalPath,
        input: step.input,
        output: step.output,
        owner: step.executor,
      })),
      l5AtomicActions: targetProcess.flatMap((step) => [
        { actionId: `A${step.stepNo}-1`, taskId: `T${step.stepNo}`, actionName: `接收${step.input}`, operationType: "读取/接收", targetObject: step.input },
        { actionId: `A${step.stepNo}-2`, taskId: `T${step.stepNo}`, actionName: step.name, operationType: "处理/判断", targetObject: firstOrUnknown(businessObjects) },
        { actionId: `A${step.stepNo}-3`, taskId: `T${step.stepNo}`, actionName: `输出${step.output}`, operationType: "输出/流转", targetObject: step.output },
      ]),
    },
    dataClosedLoop: {
      dataSources: display.contextDataFlow.contextNodes.map((node) => ({
        dataObject: node.dataObject,
        sourceSystem: node.sourceSystem,
        sourceLocation: node.sourceLocation,
        provider: node.sourceSystem || UNKNOWN,
        trigger: node.trigger,
        acquisitionMethod: node.acquisitionMethod,
        format: "由来源系统实际数据格式确定",
        keyFields: ["业务唯一标识", "状态", "时间", "责任人"],
        qualityRequirements: ["来源可追溯", "字段完整", "权限受控", "口径一致"],
      })),
      dataFlows: display.contextDataFlow.dataFlows.map((flow) => ({
        stepNo: flow.stepNo,
        dataObject: flow.dataObject,
        inputSource: flow.inputSource,
        processAction: flow.processAction,
        intermediateResult: display.contextDataFlow.processing,
        storage: flow.storage,
        outputResult: flow.outputResult,
        nextDestination: flow.nextDestination,
      })),
      resultDestinations: display.contextDataFlow.resultNodes.map((node) => ({
        resultObject: node.resultObject,
        targetSystem: node.targetSystem,
        targetLocation: node.targetLocation,
        writebackMethod: "优先使用稳定 API；无 API 时再评估受控工作流、RPA 或人工回填",
        stateChange: node.stateChange,
        downstreamConsumer: node.downstreamConsumer,
        retentionAndAudit: "保留输入摘要、处理记录、人工确认和写回回执",
        failureHandling: "有限重试；失败保持原状态并转人工处理",
      })),
    },
    currentProblems: targetProcess.map((step) => ({
      processStep: step.name,
      problemType: "流程改造机会",
      problem: step.exceptionPath,
      businessImpact: step.output,
      severity: riskLevel(`${step.humanGate} ${step.exceptionPath}`),
    })),
    taskTechnologyMappings: targetProcess.map((step, index) => ({
      taskId: `T${step.stepNo}`,
      taskName: step.name,
      taskType: "流程节点",
      currentMode: "以用户输入和模型识别结果为准",
      recommendedMode: step.technology,
      aiRole: step.technology.includes("AI") ? "用于理解、分类、摘要、生成草稿、异常解释或辅助判断" : "不建议在该节点使用 AI",
      rpaRole: step.technology.includes("RPA") ? "用于无稳定 API、界面路径固定且可审计的重复操作" : "不建议在该节点使用 RPA",
      apiRole: step.technology.includes("API") ? "优先通过稳定接口读取或写回数据" : "接口可用性待确认",
      pythonSqlRole: step.technology.includes("规则") ? "用于结构化校验、清洗、匹配和确定性计算" : "按需使用",
      workflowRole: step.technology.includes("工作流") ? "编排节点、状态、重试、通知和人工接管" : "按需编排",
      agentRole: "仅在动态、多系统调查且固定流程无法覆盖时再评估，不强行使用 Agent",
      humanReview: step.humanGate,
      rationale: `${step.name}的输入为${step.input}，输出为${step.output}，适合按标签中的技术组合改造。`,
      prerequisites: ["确认来源系统、字段、权限和接口可用性", "设置失败重试、审计留痕和人工接管"],
      riskLevel: riskLevel(step.humanGate),
      priority: priority(index),
    })),
    targetProcess,
    technologySummary: {
      aiSuitable,
      rpaSuitable,
      apiSuitable,
      rulesSuitable,
      pythonSqlSuitable: rulesSuitable,
      workflowSuitable,
      manualRequired: manualRequired.length ? manualRequired : ["高风险、高金额、删除、审批、合同与合规结论必须人工确认"],
    },
    agentDesign: {
      necessary: false,
      maturityLevel: "M1",
      rationale: "当前输出重点是拆解业务流程并映射 AI/RPA/API/规则/工作流，只有动态跨系统调查场景才进一步评估 Agent。",
      responsibilities: aiSuitable,
      callableTools: apiSuitable,
      fixedWorkflowParts: workflowSuitable,
      boundaries: ["不替代人工审批", "不自动执行高风险写入", "不输出不可追溯的合规结论"],
      exitConditions: ["低置信度", "关键数据缺失", "涉及高风险决策", "系统写入失败"],
    },
    governance: [
      { risk: "自动化越权或误写", control: "权限分级、幂等写入、人工确认和审计留痕", owner: "业务负责人", auditEvidence: "审批记录、接口回执、任务日志" },
      { risk: "模型输出不稳定", control: "结构化输出校验、低置信度转人工、关键结论引用证据", owner: "流程负责人", auditEvidence: "模型输出摘要、证据链、人工复核记录" },
      { risk: "数据口径不一致", control: "统一业务主键、字段字典和质量校验规则", owner: "数据负责人", auditEvidence: "字段映射、校验报告、异常处理记录" },
    ],
    implementationRoadmap: [
      {
        phase: "阶段 1：流程与数据确认",
        goal: "确认业务边界、字段、系统接口和人工控制点",
        scope: [input.scenarioName],
        deliverables: ["流程节点清单", "数据字段清单", "风险与人工接管规则"],
        dependencies: ["业务负责人确认", "系统权限确认"],
        acceptanceCriteria: ["流程节点可复核", "输入输出可追踪", "高风险节点有人控机制"],
      },
      {
        phase: "阶段 2：自动化试点",
        goal: "优先落地低风险、高重复、规则清晰的节点",
        scope: targetProcess.slice(0, 3).map((step) => step.name),
        deliverables: ["试点流程", "异常队列", "审计日志"],
        dependencies: ["接口或 RPA 通道", "测试数据"],
        acceptanceCriteria: ["结果可渲染", "异常可接管", "日志可追溯"],
      },
    ],
    valueAssessment: {
      businessValue: 4,
      standardization: 3,
      dataMaturity: 3,
      technicalFeasibility: 3,
      riskControllability: 4,
      reusability: 3,
      overallScore: display.conclusion.canTransform ? 76 : 52,
      conclusion: display.conclusion.canTransform ? "可以进入 AI/RPA/API/规则/工作流组合改造评估。" : "暂不建议直接自动化，需先补齐流程、数据或风险控制条件。",
    },
  };
}
