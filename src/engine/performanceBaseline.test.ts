import { describe, expect, it } from 'vitest'
import { runPerformanceBaseline } from './performanceBaseline'

describe('performance baseline', () => {
  it('在大规模节点与事件下输出吞吐与帧率基线', () => {
    const result = runPerformanceBaseline({
      nodeCount: 320,
      edgeFanout: 3,
      eventCount: 24,
      ticks: 90,
      fixedQps: 12000,
    })

    expect(result.nodeCount).toBe(320)
    expect(result.edgeCount).toBeGreaterThan(0)
    expect(result.eventCount).toBe(24)
    expect(result.avgTickMs).toBeGreaterThan(0)
    expect(result.p95TickMs).toBeGreaterThan(0)
    expect(result.throughputTicksPerSecond).toBeGreaterThan(8)
    expect(result.estimatedFps).toBeGreaterThan(8)
    expect(result.avgTickMs).toBeLessThan(120)
    expect(result.p95TickMs).toBeLessThan(150)
  })
})

