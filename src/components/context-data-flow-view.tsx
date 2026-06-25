import type { AnalysisResult } from "@/lib/schemas";

export function ContextDataFlowView({ data }: { data: AnalysisResult["dataClosedLoop"] }) {
  const consumers = [...new Set(data.resultDestinations.map((item) => item.downstreamConsumer))];
  return <>
    <h4 className="diagram-title">上下文对接流程</h4>
    <div className="mindmap-scroll">
      <div className="mindmap-chain context-mindmap" aria-label="上下文对接链路脑图">
        <div className="mindmap-center">
          <span>上下文对接</span>
          <b>来源 · 获取 · 处理 · 结果 · 下游</b>
        </div>
        <div className="mindmap-chain-unit"><div className="mindmap-link" aria-hidden="true" />
          <article className="mindmap-node context-topic">
            <div className="mindmap-node-head"><span>01</span><h4>来源系统 / 数据对象</h4></div>
            <div className="mindmap-leaves">
              {data.dataSources.map((item) => <div key={`${item.dataObject}-${item.sourceSystem}`}><b>{item.dataObject}</b><span>{item.sourceSystem} · {item.sourceLocation}</span></div>)}
            </div>
          </article></div>
        <div className="mindmap-chain-unit"><div className="mindmap-link" aria-hidden="true" />
          <article className="mindmap-node context-topic">
            <div className="mindmap-node-head"><span>02</span><h4>获取与触发</h4></div>
            <div className="mindmap-leaves">
              {data.dataSources.map((item) => <div key={`${item.dataObject}-acquire`}><b>{item.acquisitionMethod}</b><span>{item.trigger}</span></div>)}
            </div>
          </article></div>
        <div className="mindmap-chain-unit"><div className="mindmap-link" aria-hidden="true" />
          <article className="mindmap-node context-topic">
            <div className="mindmap-node-head"><span>03</span><h4>规则 / AI / 自动化处理</h4></div>
            <div className="mindmap-leaves">
              <div><b>处理动作</b><span>清洗、判断、分析、暂存与审计留痕</span></div>
              <div className="human"><b>异常接管</b><span>缺字段、权限或口径异常时人工确认</span></div>
            </div>
          </article></div>
        <div className="mindmap-chain-unit"><div className="mindmap-link" aria-hidden="true" />
          <article className="mindmap-node context-topic">
            <div className="mindmap-node-head"><span>04</span><h4>结果落点</h4></div>
            <div className="mindmap-leaves">
              {data.resultDestinations.map((item) => <div key={`${item.resultObject}-${item.targetSystem}`}><b>{item.resultObject}</b><span>{item.targetSystem} · {item.targetLocation} · {item.stateChange}</span></div>)}
            </div>
          </article></div>
        <div className="mindmap-chain-unit"><div className="mindmap-link" aria-hidden="true" />
          <article className="mindmap-node context-topic">
            <div className="mindmap-node-head"><span>05</span><h4>下游使用</h4></div>
            <div className="mindmap-leaves">
              {consumers.map((item) => <div key={item}><b>{item}</b><span>接收结果并进入后续业务</span></div>)}
            </div>
          </article></div>
      </div>
    </div>
    <h4 className="diagram-title">数据流转流程</h4>
    <div className="data-lineage-scroll" aria-label="数据流转总图">
      <div className="data-lineage-map">
        <div className="data-object-node data-lineage-root">
          <span>DATA</span>
          <b>数据流转总链路</b>
        </div>
        {data.dataFlows.map((item) => <div className="data-lineage-unit" key={item.stepNo}>
          <div className="lineage-connector" aria-hidden="true" />
          <article className="lineage-group">
            <div className="data-object-node">
              <span>{item.stepNo}</span>
              <b>{item.dataObject}</b>
            </div>
            <div className="lineage-step"><b>输入来源</b><span>{item.inputSource}</span></div>
            <div className="lineage-step"><b>处理动作</b><span>{item.processAction}</span></div>
            <div className="lineage-step"><b>暂存 / 留痕</b><span>{item.storage}</span></div>
            <div className="lineage-step"><b>输出与落点</b><span>{item.outputResult} · {item.nextDestination}</span></div>
          </article>
        </div>)}
      </div>
    </div>
  </>;
}
