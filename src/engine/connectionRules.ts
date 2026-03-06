import type { Connection } from '@xyflow/react'
import type { PlaygroundEdge, PlaygroundNode, NodeKind } from '../types'

const allowedTargets: Record<NodeKind, NodeKind[]> = {
  cdn: ['waf', 'load-balancer', 'api-gateway'],
  waf: ['load-balancer', 'api-gateway', 'rate-limiter'],
  'load-balancer': ['api-gateway', 'web', 'service', 'service-mesh', 'rate-limiter'],
  'api-gateway': ['rate-limiter', 'service-mesh', 'web', 'service'],
  'rate-limiter': ['service-mesh', 'web', 'service'],
  'circuit-breaker': ['service', 'database', 'redis', 'mq', 'search'],
  'service-mesh': ['web', 'service', 'circuit-breaker', 'observability'],
  observability: [],
  tracing: [],
  iam: [],
  web: ['service', 'circuit-breaker', 'redis', 'database', 'mq', 'object-storage'],
  service: ['service', 'circuit-breaker', 'redis', 'database', 'mq', 'search', 'object-storage'],
  redis: [],
  mq: ['service', 'search', 'observability'],
  database: [],
  'object-storage': [],
  search: [],
}

function hasPath(from: string, target: string, edges: PlaygroundEdge[]) {
  const visited = new Set<string>()
  const stack = [from]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === target) {
      return true
    }
    if (visited.has(current)) {
      continue
    }
    visited.add(current)
    for (const edge of edges) {
      if (edge.source === current) {
        stack.push(edge.target)
      }
    }
  }
  return false
}

export function validateConnection(
  nodes: PlaygroundNode[],
  edges: PlaygroundEdge[],
  connection: Connection,
) {
  if (!connection.source || !connection.target) {
    return { valid: false, reason: '连接缺少源或目标节点。' }
  }
  if (connection.source === connection.target) {
    return { valid: false, reason: '不允许节点连接到自身。' }
  }
  if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
    return { valid: false, reason: '相同方向的连线已存在。' }
  }
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: '连接的节点不存在。' }
  }
  const allowed = allowedTargets[sourceNode.data.kind] ?? []
  if (!allowed.includes(targetNode.data.kind)) {
    return {
      valid: false,
      reason: `${sourceNode.data.label} 不能直接连接到 ${targetNode.data.label}。`,
    }
  }
  const nextEdges = [
    ...edges,
    {
      id: `check-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
    },
  ]
  if (hasPath(connection.target, connection.source, nextEdges)) {
    return { valid: false, reason: '该连线会形成环路。' }
  }
  return { valid: true, reason: '连线已创建。' }
}
