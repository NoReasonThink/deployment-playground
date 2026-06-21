import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ComponentLogo } from './componentIcons'
import type { PlaygroundNode } from '../types'

export function PlaygroundFlowNode({ data, selected }: NodeProps<PlaygroundNode>) {
  const status = String(data.status)

  return (
    <div className={`playground-flow-node playground-flow-node--${status} ${selected ? 'is-selected' : ''}`}>
      <Handle className="playground-flow-node__handle playground-flow-node__handle--target" type="target" position={Position.Left} />
      <div className="playground-flow-node__main">
        <ComponentLogo kind={data.kind} size="lg" />
        <div className="playground-flow-node__text">
          <strong>{data.label}</strong>
          <span>{data.kind}</span>
        </div>
      </div>
      <div className="playground-flow-node__metrics">
        <span>{Math.round(data.utilization)}% util</span>
        <span>{data.replicas}x</span>
      </div>
      <Handle className="playground-flow-node__handle playground-flow-node__handle--source" type="source" position={Position.Right} />
    </div>
  )
}
