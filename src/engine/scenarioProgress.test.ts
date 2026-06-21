import { describe, expect, it } from 'vitest'
import { scenarios } from '../data/scenarios'
import { isScenarioUnlocked } from './scenarioProgress'

describe('scenario unlocks', () => {
  it('unlocks every scenario by default for open practice', () => {
    const locked = scenarios.filter((scenario) => !isScenarioUnlocked(scenario, {}))

    expect(locked).toEqual([])
  })
})
