import type { AnalysisResult } from "@/lib/schemas";
import { DataTable } from "./ui/data-table";
export function BusinessLayerView({ data }: { data: AnalysisResult["businessLayers"] }) { return <>
  <div className="layer"><div className="layer-label">L1 · 业务目标</div>{data.l1Goals.map(x=><div key={x.goal}><b>{x.goal}</b><div className="muted">指标：{x.metric} · 边界：{x.boundary}</div></div>)}</div>
  <div className="layer"><div className="layer-label">L2 · 业务场景</div><b>{data.l2Scenario.role}</b> 在 {data.l2Scenario.trigger} 处理 {data.l2Scenario.object}，目标是 {data.l2Scenario.target}<div className="muted">范围：{data.l2Scenario.scope}</div></div>
  <div className="layer"><div className="layer-label">L3 · 业务流程</div><DataTable headers={["步骤","输入","输出","分支","异常","人工控制"]} rows={data.l3Process.map(x=>[`${x.stepNo}. ${x.name}`,x.input,x.output,x.branch,x.exception,x.manualControl])}/></div>
  <div className="layer"><div className="layer-label">L4 · 业务任务</div><DataTable headers={["任务","目的","输入","输出","负责人"]} rows={data.l4Tasks.map(x=>[`${x.taskId} · ${x.taskName}`,x.purpose,x.input,x.output,x.owner])}/></div>
  <div className="layer"><div className="layer-label">L5 · 原子动作</div><DataTable headers={["动作","关联任务","操作类型","目标对象"]} rows={data.l5AtomicActions.map(x=>[`${x.actionId} · ${x.actionName}`,x.taskId,x.operationType,x.targetObject])}/></div>
  </>; }
