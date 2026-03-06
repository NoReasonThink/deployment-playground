import { describe, expect, it } from 'vitest'
import { computeDomainMetrics, computeLifecycle, computeResources } from './models'

describe('computeLifecycle', () => {
  it('在相同负载下核心应用节点重试压力更高', () => {
    const service = computeLifecycle(0.9, 40, 'service')
    const redis = computeLifecycle(0.9, 40, 'redis')

    expect(service.retriesPerMin).toBeGreaterThan(redis.retriesPerMin)
    expect(service.successRate).toBeLessThanOrEqual(100)
    expect(service.successRate).toBeGreaterThanOrEqual(8)
  })

  it('高负载会触发超时与失败并被限制在边界内', () => {
    const lifecycle = computeLifecycle(2.5, 400, 'database')

    expect(lifecycle.timeoutRate).toBeLessThanOrEqual(78)
    expect(lifecycle.failureRate).toBeLessThanOrEqual(92)
    expect(lifecycle.successRate).toBeGreaterThanOrEqual(8)
  })
})

describe('computeResources', () => {
  it('计算资源指标并正确执行上限限制', () => {
    const metrics = computeResources(1_000_000, 3, 500, 'search')

    expect(metrics.cpu).toBe(100)
    expect(metrics.memory).toBe(100)
    expect(metrics.bandwidthMbps).toBe(32000)
    expect(metrics.iops).toBe(150000)
    expect(metrics.queueDepth).toBeLessThanOrEqual(9000)
    expect(metrics.poolUtilization).toBeLessThanOrEqual(100)
  })
})

describe('computeDomainMetrics', () => {
  it('数据库节点会生成复制延迟与一致性窗口指标', () => {
    const metrics = computeDomainMetrics('database', 0.92, 120, 45, 1800)

    expect(metrics.replicaLagMs).toBeGreaterThan(0)
    expect(metrics.consistencyWindowMs).toBeGreaterThan(0)
    expect(metrics.backlog).toBe(0)
    expect(metrics.indexingLagMs).toBe(0)
  })

  it('搜索节点会生成索引与分片负载指标', () => {
    const metrics = computeDomainMetrics('search', 0.88, 260, 32, 3000)

    expect(metrics.indexingLagMs).toBeGreaterThan(0)
    expect(metrics.shardLoad).toBeGreaterThan(0)
    expect(metrics.replicaLagMs).toBe(0)
    expect(metrics.backlog).toBe(0)
  })
})

