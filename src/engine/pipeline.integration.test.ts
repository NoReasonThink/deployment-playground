import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { scenarios } from '../data/scenarios'
import type { ActiveEvent, PlaygroundNode } from '../types'
import { validateConnection } from './connectionRules'
import { evaluateScenario, updateScenarioProgress } from './scenarioProgress'
import { computeScoreCard } from './scoring'
import { simulateTick } from './simulate'
import { computeQps } from './traffic'

function cloneNodes(nodes: PlaygroundNode[]) {
  return nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } }))
}

function cloneEdges(edges: Edge[]) {
  return edges.map((edge) => ({ ...edge }))
}

describe('topology to simulation integration', () => {
  it('支持拓扑编辑后完成一次仿真、评分与进度更新', () => {
    const scenario = scenarios.find((item) => item.id === 'ecommerce-flash-sale') ?? scenarios[0]
    const nodes = cloneNodes(scenario.nodes)
    const edges = cloneEdges(scenario.edges)
    const extraConnection = { source: 'svc-inv', target: 'mq-1', sourceHandle: null, targetHandle: null }
    const validation = validateConnection(nodes, edges, extraConnection)

    expect(validation.valid).toBe(true)

    const editedEdges = [
      ...edges,
      {
        id: `e-int-${extraConnection.source}-${extraConnection.target}`,
        source: extraConnection.source,
        target: extraConnection.target,
      },
    ]
    const runtimeQps = computeQps('step', scenario.fixedQps, 22)
    const simulation = simulateTick(nodes, editedEdges, scenario.sourceNodeId, runtimeQps, [])
    const scoreCard = computeScoreCard(
      simulation.nextNodes,
      simulation.snapshot.metrics,
      [],
      scenario.scoreWeights,
    )
    const evaluation = evaluateScenario(scenario, simulation.snapshot.metrics, scoreCard)
    const progress = updateScenarioProgress({}, scenario.id, evaluation, scoreCard, 'integration', 22)

    expect(simulation.snapshot.metrics.qps).toBeGreaterThan(0)
    expect(simulation.snapshot.metrics.p95LatencyMs).toBeGreaterThan(0)
    expect(simulation.nextNodes.some((node) => node.data.qps > 0)).toBe(true)
    expect(scoreCard.total).toBeGreaterThan(0)
    expect(progress[scenario.id]).toBeDefined()
    expect(progress[scenario.id]?.bestScore).toBe(scoreCard.total)
  })

  it('阻止非法连线并在故障事件下体现指标劣化', () => {
    const scenario = scenarios.find((item) => item.id === 'starter-ha-web') ?? scenarios[0]
    const nodes = cloneNodes(scenario.nodes)
    const edges = cloneEdges(scenario.edges)
    const invalidConnection = { source: 'db-1', target: 'cdn-1', sourceHandle: null, targetHandle: null }
    const invalid = validateConnection(nodes, edges, invalidConnection)
    const chaosEvents: ActiveEvent[] = [
      {
        id: 'stress-1',
        name: '高延迟网络',
        category: 'network',
        description: 'network chaos',
        qpsMultiplier: 1,
        capacityMultiplier: 0.6,
        latencyDeltaMs: 120,
        durationTicks: 5,
        instanceId: 'stress-1-1',
        remainingTicks: 5,
        startedAt: 1,
      },
      {
        id: 'stress-2',
        name: '鉴权故障',
        category: 'security',
        description: 'security chaos',
        qpsMultiplier: 1,
        capacityMultiplier: 0.8,
        latencyDeltaMs: 40,
        durationTicks: 5,
        instanceId: 'stress-2-1',
        remainingTicks: 5,
        startedAt: 1,
      },
    ]
    const baseline = simulateTick(nodes, edges, scenario.sourceNodeId, scenario.fixedQps, [])
    const underChaos = simulateTick(nodes, edges, scenario.sourceNodeId, scenario.fixedQps, chaosEvents)

    expect(invalid.valid).toBe(false)
    expect(underChaos.snapshot.metrics.p95LatencyMs).toBeGreaterThan(baseline.snapshot.metrics.p95LatencyMs)
    expect(underChaos.snapshot.metrics.errorRate).toBeGreaterThanOrEqual(baseline.snapshot.metrics.errorRate)
  })
})
