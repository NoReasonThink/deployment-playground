import { describe, expect, it, vi } from 'vitest'
import type { ActiveEvent, EventTemplate } from '../types'
import { createEventInstance, reduceActiveEvents, resolveEventEffects } from './events'

describe('createEventInstance', () => {
  it('根据模板创建运行时事件实例', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123)
    const template: EventTemplate = {
      id: 'event-hot-key',
      name: '热点 Key',
      category: 'traffic',
      description: '热点流量',
      qpsMultiplier: 1.4,
      capacityMultiplier: 0.9,
      latencyDeltaMs: 20,
      durationTicks: 6,
    }

    const instance = createEventInstance(template)

    expect(instance.instanceId).toBe('event-hot-key-123456-123')
    expect(instance.remainingTicks).toBe(6)
    expect(instance.startedAt).toBe(123456)

    nowSpy.mockRestore()
    randomSpy.mockRestore()
  })
})

describe('reduceActiveEvents', () => {
  it('按 tick 衰减并分离过期事件', () => {
    const events: ActiveEvent[] = [
      {
        id: 'e1',
        name: 'A',
        category: 'network',
        description: 'A',
        qpsMultiplier: 1,
        capacityMultiplier: 1,
        latencyDeltaMs: 10,
        durationTicks: 3,
        instanceId: 'e1-1',
        remainingTicks: 1,
        startedAt: 1,
      },
      {
        id: 'e2',
        name: 'B',
        category: 'security',
        description: 'B',
        qpsMultiplier: 1,
        capacityMultiplier: 0.8,
        latencyDeltaMs: 18,
        durationTicks: 4,
        targetKinds: ['service'],
        instanceId: 'e2-1',
        remainingTicks: 2,
        startedAt: 1,
      },
    ]

    const result = reduceActiveEvents(events)

    expect(result.expired).toHaveLength(1)
    expect(result.expired[0].id).toBe('e1')
    expect(result.next).toHaveLength(1)
    expect(result.next[0].id).toBe('e2')
    expect(result.next[0].remainingTicks).toBe(1)
  })
})

describe('resolveEventEffects', () => {
  it('全局事件影响 QPS，目标事件影响容量和时延', () => {
    const events: ActiveEvent[] = [
      {
        id: 'g1',
        name: '全局突发',
        category: 'traffic',
        description: 'global',
        qpsMultiplier: 1.5,
        capacityMultiplier: 1,
        latencyDeltaMs: 0,
        durationTicks: 3,
        instanceId: 'g1-1',
        remainingTicks: 3,
        startedAt: 1,
      },
      {
        id: 's1',
        name: '服务退化',
        category: 'application',
        description: 'service only',
        qpsMultiplier: 0.8,
        capacityMultiplier: 0.7,
        latencyDeltaMs: 22,
        durationTicks: 3,
        targetKinds: ['service'],
        instanceId: 's1-1',
        remainingTicks: 3,
        startedAt: 1,
      },
    ]

    const onService = resolveEventEffects(events, 'service')
    const onRedis = resolveEventEffects(events, 'redis')

    expect(onService.qpsMultiplier).toBe(1.5)
    expect(onService.capacityMultiplier).toBe(0.7)
    expect(onService.latencyDeltaMs).toBe(22)

    expect(onRedis.qpsMultiplier).toBe(1.5)
    expect(onRedis.capacityMultiplier).toBe(1)
    expect(onRedis.latencyDeltaMs).toBe(0)
  })
})

