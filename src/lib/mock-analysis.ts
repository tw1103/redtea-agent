import type { AnalysisResult, ScenarioInput } from "./schemas";
import { createIndustryMockAnalysis, isFinancialReconciliation } from "./industry-mock-analysis";

export function createMockAnalysis(input: ScenarioInput): AnalysisResult {
  if (!isFinancialReconciliation(input)) return createIndustryMockAnalysis(input);
  const name = input.scenarioName || "银行流水与 ERP 账簿对账";
  return {
    analysisMeta: { analysisMode: input.analysisMode, analysisScope: input.analysisScope ?? "domain", generatedAt: new Date().toISOString(), confidence: 0.86, overallConclusion: "建议先把财务运营中的候选自动化场景按价值、可行性和风险排序，再优先深化对账闭环。固定主链路使用工作流编排 RPA、ERP API、Python/SQL 精确匹配与人工审批；AI 仅辅助复杂差异解释，Agent 仅用于异常跨系统调查。" },
    opportunityPortfolio: [
      { scenarioId: "S1", scenarioName: "银行流水自动采集", businessArea: "财务运营", problem: "人工登录网银并重复下载", targetValue: "减少重复劳动并保证采集完整", candidateTechnologies: ["RPA", "规则", "工作流"], businessValue: 4, feasibility: 4, risk: 3, priority: "P0", recommendation: "无 API 时使用受控 RPA，保留下载校验和人工接管" },
      { scenarioId: "S2", scenarioName: "账务数据精确匹配", businessArea: "财务核算", problem: "人工匹配耗时且规则难复用", targetValue: "提升自动匹配率和可复算性", candidateTechnologies: ["Python/SQL", "规则引擎"], businessValue: 5, feasibility: 5, risk: 2, priority: "P0", recommendation: "优先落地确定性规则，不使用大模型做金额核算" },
      { scenarioId: "S3", scenarioName: "复杂差异调查", businessArea: "财务运营", problem: "异常项需跨订单与应收系统调查", targetValue: "缩短差异定位时间", candidateTechnologies: ["AI", "API", "Agent（条件式）", "人工"], businessValue: 4, feasibility: 3, risk: 4, priority: "P1", recommendation: "先做只读调查助手，最终结论和调账必须人工确认" },
      { scenarioId: "S4", scenarioName: "对账结果闭环与审计", businessArea: "财务治理", problem: "手工回填易重复且证据分散", targetValue: "形成幂等写回、审批和审计闭环", candidateTechnologies: ["API", "工作流", "人工审批"], businessValue: 5, feasibility: 4, risk: 4, priority: "P0", recommendation: "以批次号和业务键保证幂等，失败保持原账务状态" }
    ],
    scenarioUnderstanding: { scenarioName: name, businessDomain: "财务管理 / 银企对账", businessGoals: ["缩短月结对账周期", "提升自动匹配率与差异可追溯性", "降低重复下载和人工核对"], actors: ["财务会计", "财务主管", "系统管理员"], businessObjects: ["银行流水", "ERP 总账分录", "差异处理任务"], triggers: ["月末关账日", "财务人员手动发起"], boundaries: ["不自动调账", "不代替合规与会计判断", "仅处理授权账户与期间"], expectedResults: ["ERP 对账状态", "差异任务", "可审计对账报告"] },
    informationCompleteness: { knownFacts: ["银行无 API，需从网银下载流水", "ERP 提供 API", "调账必须经财务主管审批"], assumptions: ["网银页面与下载格式在试点期保持稳定", "订单及应收记录可通过受控只读接口查询"], openQuestions: ["ERP API 的幂等键与限流策略", "银行流水文件加密和保留期限", "异常调查可访问的订单系统范围"] },
    businessLayers: {
      l1Goals: [{ goal: "提高对账效率与准确性", metric: "自动匹配率≥85%，对账周期缩短50%", boundary: "不自动生成或审批调账凭证" }],
      l2Scenario: { role: "财务会计", trigger: "月末或按需发起", object: "银行流水与 ERP 账簿", target: "形成已匹配、待调查与待审批结果", scope: "授权账户、指定会计期间" },
      l3Process: [
        { stepNo: 1, name: "获取数据", input: "账户、日期范围", output: "银行流水与 ERP 分录", branch: "文件已存在则校验后复用", exception: "登录、下载或接口失败进入重试", manualControl: "连续失败转人工" },
        { stepNo: 2, name: "标准化与匹配", input: "两侧原始数据", output: "匹配结果与差异集", branch: "一对一/一对多规则", exception: "字段缺失进入质量队列", manualControl: "阈值外差异人工复核" },
        { stepNo: 3, name: "调查并写回", input: "差异集", output: "差异原因、ERP 状态与报告", branch: "复杂项查询订单/应收", exception: "证据冲突或系统不可用", manualControl: "调账及高金额项主管审批" },
      ],
      l4Tasks: [
        { taskId: "T1", taskName: "采集银行流水", purpose: "获得完整银行侧数据", input: "账户与期间", output: "经校验流水文件", owner: "财务运营" },
        { taskId: "T2", taskName: "获取 ERP 分录", purpose: "获得账簿侧数据", input: "账套与期间", output: "ERP 分录数据集", owner: "财务系统" },
        { taskId: "T3", taskName: "精确匹配与差异分类", purpose: "识别一致项和异常项", input: "标准化数据", output: "匹配结果与差异", owner: "对账工作流" },
        { taskId: "T4", taskName: "异常调查与审批", purpose: "形成可解释处置建议", input: "差异及业务证据", output: "调查结论与审批记录", owner: "会计/主管" },
      ],
      l5AtomicActions: [
        { actionId: "A1", taskId: "T1", actionName: "登录网银并选择账户日期", operationType: "RPA 页面操作", targetObject: "网银查询页" },
        { actionId: "A2", taskId: "T1", actionName: "下载并校验文件大小、行数和哈希", operationType: "RPA+规则", targetObject: "流水文件" },
        { actionId: "A3", taskId: "T2", actionName: "按期间调用 ERP 只读接口", operationType: "API", targetObject: "总账分录" },
        { actionId: "A4", taskId: "T3", actionName: "标准化字段并按金额日期精确匹配", operationType: "Python/SQL", targetObject: "对账数据集" },
        { actionId: "A5", taskId: "T4", actionName: "复核证据并审批调账", operationType: "人工", targetObject: "差异处理任务" },
      ],
    },
    dataClosedLoop: {
      dataSources: [
        { dataObject: "银行流水", sourceSystem: "企业网银", sourceLocation: "账户交易查询/流水下载页面", provider: "开户银行", trigger: "月末工作流", acquisitionMethod: "RPA 登录、选账户和日期、下载并校验", format: "CSV/XLSX（待确认）", keyFields: ["交易日期", "金额", "借贷方向", "摘要", "银行流水号"], qualityRequirements: ["期间完整", "无重复行", "下载哈希留痕"] },
        { dataObject: "总账分录", sourceSystem: "ERP", sourceLocation: "总账只读 API（路径待确认）", provider: "财务系统", trigger: "流水校验通过后", acquisitionMethod: "受控服务账号调用 API", format: "JSON", keyFields: ["凭证号", "过账日期", "金额", "科目", "业务单号"], qualityRequirements: ["分页完整", "账套和期间一致"] },
      ],
      dataFlows: [
        { stepNo: 1, dataObject: "原始对账数据", inputSource: "网银页面 + ERP API", processAction: "获取、校验、字段映射", intermediateResult: "标准化暂存集", storage: "运行期加密临时目录，任务结束清理", outputResult: "可匹配数据集", nextDestination: "匹配引擎" },
        { stepNo: 2, dataObject: "匹配与差异", inputSource: "标准化数据集", processAction: "Python/SQL 金额日期匹配、规则分类；AI 辅助解释复杂文本", intermediateResult: "匹配批次与差异证据", storage: "任务级临时存储", outputResult: "匹配项、差异项、建议原因", nextDestination: "人工复核队列" },
        { stepNo: 3, dataObject: "复核结果", inputSource: "会计/主管审批", processAction: "幂等写回与报告生成", intermediateResult: "写回回执", storage: "审计日志", outputResult: "ERP 对账状态、差异任务、报告", nextDestination: "月结流程与财务主管" },
      ],
      resultDestinations: [
        { resultObject: "对账结果", targetSystem: "ERP", targetLocation: "对账状态字段或结果表（待确认）", writebackMethod: "ERP API，批次号+业务键幂等写入", stateChange: "未对账→已匹配/待处理/已复核", downstreamConsumer: "月结流程、财务会计", retentionAndAudit: "保留输入摘要、规则版本、审批和接口回执", failureHandling: "指数退避重试；重复写入拦截；失败转人工" },
        { resultObject: "差异任务与报告", targetSystem: "ERP/任务平台/文档目录", targetLocation: "差异任务队列与受控报告目录", writebackMethod: "API 创建任务并生成文件", stateChange: "差异发现→待调查→待审批→关闭", downstreamConsumer: "会计、财务主管、审计", retentionAndAudit: "按财务档案策略保留，访问留痕", failureHandling: "写入失败保留待办，不改变原账务状态" },
      ],
    },
    currentProblems: [
      { processStep: "数据获取", problemType: "重复劳动/系统割裂", problem: "人工切换网银与 ERP 下载数据", businessImpact: "耗时且易漏选账户或日期", severity: "高" },
      { processStep: "差异调查", problemType: "等待/知识分散", problem: "需跨订单、应收系统逐项查证", businessImpact: "月结延迟，结论难复用", severity: "高" },
      { processStep: "结果登记", problemType: "错误/审计风险", problem: "手工回填可能重复或状态不一致", businessImpact: "审计证据不完整", severity: "中" },
    ],
    taskTechnologyMappings: [
      { taskId: "T1", taskName: "采集银行流水", taskType: "稳定页面操作", currentMode: "人工下载", recommendedMode: ["RPA", "规则", "工作流"], aiRole: "不适用", rpaRole: "登录、选账户期间、下载", apiRole: "银行无 API", pythonSqlRole: "校验文件结构", workflowRole: "调度、重试、转人工", agentRole: "不需要，路径固定", humanReview: "连续失败或验证码转人工", rationale: "无 API 且步骤可枚举", prerequisites: ["页面稳定性验证", "凭证托管", "失败截图脱敏"], riskLevel: "中", priority: "P0" },
      { taskId: "T2", taskName: "获取 ERP 分录", taskType: "结构化查询", currentMode: "人工导出", recommendedMode: ["API", "工作流"], aiRole: "不适用", rpaRole: "不推荐，已有 API", apiRole: "分页读取分录", pythonSqlRole: "合并与类型校验", workflowRole: "限流重试", agentRole: "不需要", humanReview: "授权与抽样核验", rationale: "稳定 API 优先于界面自动化", prerequisites: ["API 权限", "限流与错误码约定"], riskLevel: "低", priority: "P0" },
      { taskId: "T3", taskName: "精确匹配与差异分类", taskType: "确定性计算", currentMode: "表格公式/人工", recommendedMode: ["Python/SQL", "规则引擎"], aiRole: "仅辅助解释非结构化摘要，不做金额核算", rpaRole: "不适用", apiRole: "读取输入、写回结果", pythonSqlRole: "标准化、一对多匹配、精确计算", workflowRole: "串联批次状态", agentRole: "不需要", humanReview: "阈值外与冲突项复核", rationale: "精确规则不得交给大模型", prerequisites: ["字段映射", "匹配规则版本化"], riskLevel: "中", priority: "P0" },
      { taskId: "T4", taskName: "异常调查与审批", taskType: "动态调查/高风险决策", currentMode: "人工跨系统查询", recommendedMode: ["Agent（条件式）", "AI", "API", "人工审批"], aiRole: "归纳证据、生成差异解释草稿", rpaRole: "仅无接口时受控只读查询", apiRole: "查询订单和应收证据", pythonSqlRole: "重算与交叉核验", workflowRole: "审批与状态机", agentRole: "对复杂异常动态选择查询工具", humanReview: "主管审批调账，低置信度立即转人工", rationale: "异常路径难完全枚举且需多工具，但最终决策高风险", prerequisites: ["只读工具白名单", "置信度阈值", "审计日志"], riskLevel: "高", priority: "P1" },
    ],
    targetProcess: [
      { stepNo: 1, name: "自动采集并校验", executor: "工作流/RPA/API", technology: ["RPA", "API", "规则"], input: "账户、账套、期间", output: "完整原始数据", normalPath: "校验通过进入标准化", exceptionPath: "重试后转人工并保留截图/错误码", humanGate: "凭证异常或数据缺口" },
      { stepNo: 2, name: "标准化与精确匹配", executor: "匹配服务", technology: ["Python/SQL", "规则引擎"], input: "银行与 ERP 数据", output: "匹配及差异集", normalPath: "匹配项待批次确认", exceptionPath: "字段异常进入质量队列", humanGate: "高金额或规则冲突" },
      { stepNo: 3, name: "差异调查、审批与写回", executor: "会计/可选调查 Agent/主管", technology: ["AI", "Agent（条件式）", "API", "人工"], input: "差异与证据", output: "审批结论、ERP 状态、报告", normalPath: "幂等写回并通知下游", exceptionPath: "证据冲突、低置信度或写回失败转人工", humanGate: "所有调账、对外承诺和高风险结论" },
    ],
    technologySummary: { aiSuitable: ["差异摘要归纳", "解释草稿生成"], rpaSuitable: ["无 API 网银流水下载与结果校验"], apiSuitable: ["ERP 分录读取与对账结果写回"], rulesSuitable: ["字段完整性、金额阈值、状态路由"], pythonSqlSuitable: ["数据标准化、去重、一对多精确匹配"], workflowSuitable: ["采集—匹配—复核—写回确定性主链路"], manualRequired: ["调账审批", "证据冲突", "高金额与低置信度异常"] },
    agentDesign: { necessary: false, maturityLevel: "M1", rationale: "主流程固定，不应强行 Agent 化；仅当异常调查需跨 ERP、订单、应收系统动态选择工具且异常量足够大时，才试点受控调查 Agent。", responsibilities: ["汇总异常上下文", "按证据缺口选择只读查询", "形成可追溯调查建议"], callableTools: ["ERP 只读查询", "订单只读查询", "应收只读查询", "规则复算"], fixedWorkflowParts: ["数据采集", "精确匹配", "审批", "幂等写回"], boundaries: ["不得调账", "不得删除或修改原始凭证", "不得绕过审批", "只访问授权期间和账户"], exitConditions: ["置信度低于阈值", "证据冲突", "工具连续失败", "超出金额或权限边界", "用户要求人工接管"] },
    governance: [
      { risk: "网银凭证泄露", control: "企业凭证库托管、最小权限、禁止日志记录", owner: "安全管理员", auditEvidence: "凭证调用记录与轮换记录" },
      { risk: "重复或错误写回", control: "批次号+业务键幂等、写前校验、可重试不改原账", owner: "ERP 管理员", auditEvidence: "请求摘要、响应码、写回回执" },
      { risk: "模型越权给出账务结论", control: "工具白名单、强制人工审批、低置信度退出", owner: "财务主管", auditEvidence: "模型建议、证据引用与审批链" },
      { risk: "自动化失败无人处理", control: "超时重试、失败截图脱敏、任务队列和人工接管 SLA", owner: "财务运营", auditEvidence: "重试次数、故障任务和接管记录" },
    ],
    implementationRoadmap: [
      { phase: "阶段一：数据与规则试点", goal: "跑通只读采集和离线匹配", scope: ["单一银行账户", "单一账套", "不写回"], deliverables: ["字段字典", "RPA 采集", "匹配规则", "基线报告"], dependencies: ["测试账号", "ERP 沙箱 API"], acceptanceCriteria: ["采集完整率≥99%", "规则结果可复算", "零自动写账"] },
      { phase: "阶段二：闭环与治理", goal: "形成审批、幂等写回和审计闭环", scope: ["差异任务", "ERP 状态写回", "人工审批"], deliverables: ["工作流", "审批表单", "审计看板"], dependencies: ["幂等接口", "档案策略"], acceptanceCriteria: ["重复写入为0", "异常100%可追溯", "人工可随时接管"] },
      { phase: "阶段三：受控智能调查", goal: "验证复杂异常调查价值", scope: ["只读多系统查询", "AI 解释", "小流量灰度"], deliverables: ["调查助手", "评估集", "退出机制"], dependencies: ["工具白名单", "历史标注样本"], acceptanceCriteria: ["建议采纳率达目标", "高风险项100%人工审批", "无越权调用"] },
    ],
    valueAssessment: { businessValue: 5, standardization: 4, dataMaturity: 3, technicalFeasibility: 4, riskControllability: 4, reusability: 4, overallScore: 80, conclusion: "适合从确定性采集与匹配切入，先建立数据和治理闭环，再以指标决定是否引入异常调查 Agent。" },
  };
}
