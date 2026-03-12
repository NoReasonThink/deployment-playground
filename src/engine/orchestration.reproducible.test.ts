import { describe, expect, it } from 'vitest'
import { eventTemplates } from '../data/events'
import { createSeededRandom, hashSeed } from './random'
import { executeOrchestrationTick, type RuntimeOrchestrationPlan } from './orchestration'

function runWithSeed(seed: string) {
  const random = createSeededRandom(hashSeed(seed))
  let plans: RuntimeOrchestrationPlan[] = [
    {
      id: 'plan-1',
      name: '回放计划',
      mode: 'serial',
      eventIds: ['traffic-spike', 'canary-regression', 'manual-scale-delay'],
      probability: 0.72,
      startTick: 1,
      endTick: 8,
      enabled: true,
      serialCursor: 0,
    },
  ]
  const generatedIds: string[] = []
  const logs: string[] = []
  for (let tick = 1; tick <= 8; tick += 1) {
    const result = executeOrchestrationTick(plans, tick, eventTemplates, random)
    plans = result.nextPlans
    generatedIds.push(...result.generated.map((item) => item.id))
    logs.push(...result.logs)
  }
  return { generatedIds, logs }
}

describe('orchestration reproducible', () => {
  it('同一故障种子下编排注入序列可重复', () => {
    const first = runWithSeed('training-seed-001')
    const second = runWithSeed('training-seed-001')
    const third = runWithSeed('training-seed-002')

    expect(first.generatedIds).toEqual(second.generatedIds)
    expect(first.logs).toEqual(second.logs)
    expect(first.generatedIds).not.toEqual(third.generatedIds)
  })
})

