import { describe, expect, it } from 'vitest'
import { buildNodeData } from '../data/catalog'
import type { PlaygroundNode } from '../types'
import { createDebugStateSnapshot, nextReplayFrame, summarizeProfilerSamples } from './debugTools'

function makeNode(id: string, utilization: number, queueDepth: number): PlaygroundNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      ...buildNodeData('service'),
      label: id,
      utilization,
      queueDepth,
    },
  }
}

describe('debug tools', () => {
  it('生成内部状态快照并提取热点节点', () => {
    const snapshot = createDebugStateSnapshot({
      name: 'debug-a',
      tick: 8,
      scheduler: { tick: 8, speed: 2, running: false },
      metrics: { qps: 3200, p95LatencyMs: 180, p99LatencyMs: 260, errorRate: 1.2, availability: 99.1 },
      bottlenecks: ['A'],
      eventLogs: ['注入事件：X'],
      activeEvents: [],
      nodes: [makeNode('n1', 0.8, 20), makeNode('n2', 1.35, 120)],
      edgeCount: 3,
    })

    expect(snapshot.name).toBe('debug-a')
    expect(snapshot.topology.nodeCount).toBe(2)
    expect(snapshot.hotNodes[0].label).toBe('n2')
  })

  it('汇总性能样本输出平均值与 P95', () => {
    const summary = summarizeProfilerSamples([10, 20, 25, 15, 12, 14, 18, 30, 22, 16])

    expect(summary.sampleCount).toBe(10)
    expect(summary.avgTickMs).toBeGreaterThan(0)
    expect(summary.p95TickMs).toBeGreaterThanOrEqual(summary.avgTickMs)
    expect(summary.throughputTicksPerSecond).toBeGreaterThan(0)
  })

  it('按批次推进事件回放游标', () => {
    const source = ['a', 'b', 'c', 'd']
    const first = nextReplayFrame(source, 0, [], 2)
    const second = nextReplayFrame(source, first.nextCursor, first.lines, 2)

    expect(first.lines).toEqual(['a', 'b'])
    expect(first.done).toBe(false)
    expect(second.lines).toEqual(['a', 'b', 'c', 'd'])
    expect(second.done).toBe(true)
  })
})

