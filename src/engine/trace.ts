import type { Edge } from '@xyflow/react'
import type { PlaygroundNode } from '../types'

export interface TraceSegment {
  id: string
  from: string
  to: string
  latencyMs: number
  qps: number
  score: number
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function findSource(nodes: PlaygroundNode[], edges: Edge[]) {
  if (nodes.length === 0) {
    return ''
  }
  const incoming = new Map<string, number>()
  for (const node of nodes) {
    incoming.set(node.id, 0)
  }
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  }
  const root = nodes.find((node) => (incoming.get(node.id) ?? 0) === 0)
  return root?.id ?? nodes[0].id
}

export function buildTraceSegments(nodes: PlaygroundNode[], edges: Edge[]) {
  const sourceId = findSource(nodes, edges)
  if (!sourceId) {
    return []
  }
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, [])
    }
    outgoing.get(edge.source)!.push(edge.target)
  }
  const queue: Array<{ id: string; acc: number }> = [{ id: sourceId, acc: 0 }]
  const segments: TraceSegment[] = []
  const seen = new Map<string, number>()
  while (queue.length > 0) {
    const current = queue.shift()!
    const hit = (seen.get(current.id) ?? 0) + 1
    seen.set(current.id, hit)
    if (hit > nodes.length * 2) {
      continue
    }
    const sourceNode = nodeMap.get(current.id)
    if (!sourceNode) {
      continue
    }
    const targets = outgoing.get(current.id) ?? []
    for (const targetId of targets) {
      const targetNode = nodeMap.get(targetId)
      if (!targetNode) {
        continue
      }
      const segmentLatency =
        sourceNode.data.baseLatencyMs * (1 + sourceNode.data.utilization * 0.6) +
        targetNode.data.baseLatencyMs * (1 + targetNode.data.utilization * 0.4)
      const qps = Math.min(sourceNode.data.qps, targetNode.data.qps)
      const score = segmentLatency * (1 + qps / 6000)
      segments.push({
        id: `${sourceNode.id}->${targetNode.id}`,
        from: sourceNode.data.label,
        to: targetNode.data.label,
        latencyMs: round(segmentLatency),
        qps: round(qps),
        score: round(score),
      })
      queue.push({ id: targetId, acc: current.acc + segmentLatency })
    }
  }
  return segments
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

