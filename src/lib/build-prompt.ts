import type { ScenarioInput } from "./schemas";
import { SYSTEM_PROMPT } from "@/prompts/system-prompt";

const scopeGuidance = {
  single: [
    "用户选择的是“单场景深挖”：只围绕一个明确业务流程展开，不要发散成企业级机会清单。",
    "processFlow 要体现端到端主链路、异常路径和人工控制点。",
    "conclusion.summary 要直接回答该单场景是否适合 AI/RPA/API/规则/工作流组合改造。",
  ],
  domain: [
    "用户选择的是“业务域盘点”：先把业务域中的多个候选自动化场景在脑中排序，再选择最值得优先深化的场景输出 processFlow。",
    "conclusion.summary 必须说明：该业务域中应优先改造哪类场景，以及为什么。",
    "processFlow 可以是优先场景的代表性流程，但节点命名要能体现业务域盘点后的优先链路，不要只写泛泛流程。",
  ],
  enterprise: [
    "用户选择的是“企业机会规划”：从企业目标、跨部门价值链和规模化复用角度识别机会组合，再选择一个优先场景输出 processFlow。",
    "conclusion.summary 必须说明企业级机会组合、优先推进方向和阶段化落地策略。",
    "重点输出企业业务域地图、机会组合、共性能力、投资优先级和阶段路线，不要下钻到按钮、字段、具体 API 或页面写回。",
    "processFlow 只作为高层价值链示意，节点命名应是业务域或跨部门能力，不要写具体系统操作步骤。",
  ],
} satisfies Record<NonNullable<ScenarioInput["analysisScope"]>, string[]>;

const modeGuidance = {
  single: {
    quick: "当前层级是“快速分析”：只基于核心描述给出高层判断，流程节点保持简洁。",
    standard: "当前层级是“标准分析”：结合流程、角色、数据和系统，输出较完整的节点与数据流。",
    deep: "当前层级是“深度设计”：必须关注业务规则、异常路径、权限、审计、人工控制和落地前置条件。",
  },
  domain: {
    quick: "当前层级是“快速盘点”：快速识别业务域中的候选机会类型，并选择一个优先方向展开。",
    standard: "当前层级是“标准盘点”：结合职责、流程、痛点、数据和系统，输出更清晰的候选机会排序逻辑。",
    deep: "当前层级是“机会排序”：重点比较候选场景的价值、可行性、风险和优先级，再深化首选场景。",
  },
  enterprise: {
    quick: "当前层级是“机会初筛”：从企业目标中识别高潜机会方向，不要过度细化实施细节。",
    standard: "当前层级是“规划评估”：结合部门、价值链、痛点和数据基础，形成可推进的机会组合。",
    deep: "当前层级是“路线图设计”：必须体现阶段化路线、试点选择、治理边界和规模化复用条件。",
  },
} satisfies Record<NonNullable<ScenarioInput["analysisScope"]>, Record<ScenarioInput["analysisMode"], string>>;

export function buildPrompt(input: ScenarioInput, knowledge: string) {
  const scope = input.analysisScope ?? "single";
  return `${SYSTEM_PROMPT}

# 当前分析范围要求
${scopeGuidance[scope].map((item) => `- ${item}`).join("\n")}
- ${modeGuidance[scope][input.analysisMode]}
- 最终仍然只输出下面的 DisplayAnalysis JSON，页面会根据 analysisScope 自动展示差异化模块。
- 如果是业务域盘点或企业机会规划，必须先在 summary、processFlow 节点命名和 contextDataFlow 中体现“候选机会筛选后的优先链路”，不要输出与单场景深挖完全相同的泛化内容。

# 页面展示所需 JSON 结构
请优先按下面的 DisplayAnalysis JSON 结构输出。不要输出旧版大结构，不要输出 Markdown，不要在 JSON 外添加解释。

{
  "conclusion": {
    "canTransform": true,
    "summary": "一句话说明当前分析范围下是否适合 AI/RPA 改造，以及总体策略",
    "ai": { "suitable": true, "tasks": ["适合 AI 的节点或任务"] },
    "rpa": { "suitable": true, "tasks": ["适合 RPA 的节点或任务"] }
  },
  "processFlow": [
    {
      "stepNo": 1,
      "name": "流程节点名称",
      "executor": "执行角色或系统",
      "tags": ["AI", "RPA", "API", "规则", "工作流", "人工"],
      "input": "节点输入",
      "output": "节点输出",
      "normalPath": "正常路径",
      "exceptionPath": "异常路径",
      "humanGate": "必须人工确认或接管的条件，没有则写待确认"
    }
  ],
  "contextDataFlow": {
    "contextNodes": [
      {
        "dataObject": "数据对象",
        "sourceSystem": "来源系统",
        "sourceLocation": "来源位置",
        "acquisitionMethod": "获取方式，优先 API，其次文件/人工/RPA",
        "trigger": "触发条件"
      }
    ],
    "processing": "业务处理、规则、AI 或自动化处理说明",
    "resultNodes": [
      {
        "resultObject": "结果对象",
        "targetSystem": "目标系统",
        "targetLocation": "目标位置",
        "stateChange": "状态变化",
        "downstreamConsumer": "下游使用方"
      }
    ],
    "dataFlows": [
      {
        "stepNo": 1,
        "dataObject": "流转数据对象",
        "inputSource": "输入来源",
        "processAction": "处理动作",
        "storage": "暂存或留痕位置",
        "outputResult": "输出结果",
        "nextDestination": "下一落点"
      }
    ]
  }
}

字段要求：
- tags 只能从 AI、RPA、API、规则、工作流、人工、不使用AI/RPA 中选择。
- processFlow 至少 3 个节点，必须覆盖从输入、处理到输出闭环。
- contextNodes、resultNodes、dataFlows 至少各 1 条。
- 不要把固定流程强行写成 Agent；稳定 API 优先于 RPA；高风险审批、删除、合同、合规结论必须人工控制。

# 本地知识库
${knowledge}

# 用户场景输入
${JSON.stringify(input, null, 2)}`;
}
