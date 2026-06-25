import type { AnalysisResult } from "@/lib/schemas";
import { DataTable } from "./ui/data-table";
export function DataFlowView({ data }: { data: AnalysisResult["dataClosedLoop"] }) { return <>
  <div className="chain">{["来源","获取","处理","暂存","人工控制","写回","状态变化","下游流程"].map((x,i)=><span key={x}>{i>0&&"→ "}<b>{x}</b></span>)}</div>
  <h4>数据源清单</h4><DataTable headers={["数据对象","来源系统与位置","提供方 / 触发","获取方式","格式 / 关键字段","质量要求"]} rows={data.dataSources.map(x=>[x.dataObject,<span key="source"><b>{x.sourceSystem}</b><br/>{x.sourceLocation}</span>,`${x.provider} / ${x.trigger}`,x.acquisitionMethod,`${x.format} / ${x.keyFields.join("、")}`,x.qualityRequirements.join("；")])}/>
  <h4>数据流转</h4><DataTable headers={["步骤","数据对象 / 输入","处理动作","中间结果 / 暂存","输出 / 下一落点"]} rows={data.dataFlows.map(x=>[String(x.stepNo),`${x.dataObject} / ${x.inputSource}`,x.processAction,`${x.intermediateResult} / ${x.storage}`,`${x.outputResult} / ${x.nextDestination}`])}/>
  <h4>结果落点</h4><DataTable headers={["结果对象","目标系统与位置","写回 / 状态变化","下游消费者","保留与审计","失败处理"]} rows={data.resultDestinations.map(x=>[x.resultObject,`${x.targetSystem} / ${x.targetLocation}`,`${x.writebackMethod} / ${x.stateChange}`,x.downstreamConsumer,x.retentionAndAudit,x.failureHandling])}/>
  </>; }
