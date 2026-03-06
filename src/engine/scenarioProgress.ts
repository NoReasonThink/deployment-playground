import type {
  ScenarioDefinition,
  ScenarioGoal,
  ScenarioProgress,
  ScenarioProgressEntry,
  SimulationMetrics,
} from '../types'
import type { ScoreCard } from './scoring'

export const scenarioProgressStorageKey = 'deploy-playground:scenario-progress:v1'

export interface GoalResult {
  goal: ScenarioGoal
  actual: number
  passed: boolean
}

export interface ScenarioEvaluation {
  goalResults: GoalResult[]
  goalPassRate: number
  passed: boolean
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function metricValue(metric: ScenarioGoal['metric'], metrics: SimulationMetrics, scoreCard: ScoreCard) {
  switch (metric) {
    case 'qps':
      return metrics.qps
    case 'p95LatencyMs':
      return metrics.p95LatencyMs
    case 'p99LatencyMs':
      return metrics.p99LatencyMs
    case 'errorRate':
      return metrics.errorRate
    case 'availability':
      return metrics.availability
    case 'estimatedCost':
      return scoreCard.estimatedCost
    case 'totalScore':
      return scoreCard.total
    case 'star':
      return scoreCard.star
    default:
      return 0
  }
}

function goalPassed(goal: ScenarioGoal, actual: number) {
  if (goal.operator === 'gte') {
    return actual >= goal.target
  }
  return actual <= goal.target
}

export function evaluateScenario(
  scenario: ScenarioDefinition,
  metrics: SimulationMetrics,
  scoreCard: ScoreCard,
): ScenarioEvaluation {
  const goalResults = scenario.goals.map((goal) => {
    const actual = round(metricValue(goal.metric, metrics, scoreCard), 2)
    return {
      goal,
      actual,
      passed: goalPassed(goal, actual),
    }
  })
  const goalPassRate =
    goalResults.length > 0
      ? round(goalResults.filter((item) => item.passed).length / goalResults.length, 3)
      : 1
  const passCriteriaOk =
    scoreCard.total >= scenario.passCriteria.minScore &&
    scoreCard.star >= scenario.passCriteria.minStars &&
    metrics.errorRate <= scenario.passCriteria.maxErrorRate &&
    metrics.availability >= scenario.passCriteria.minAvailability
  return {
    goalResults,
    goalPassRate,
    passed: passCriteriaOk && goalPassRate >= 0.6,
  }
}

export function isScenarioUnlocked(scenario: ScenarioDefinition, progress: ScenarioProgress) {
  if (scenario.unlockRule.prerequisiteScenarioIds.length === 0) {
    return true
  }
  return scenario.unlockRule.prerequisiteScenarioIds.every((id) => {
    const entry = progress[id]
    if (!entry) {
      return false
    }
    return entry.passed && entry.bestStars >= scenario.unlockRule.minStars
  })
}

function isEntryChanged(a: ScenarioProgressEntry | undefined, b: ScenarioProgressEntry) {
  if (!a) {
    return true
  }
  return (
    a.bestScore !== b.bestScore ||
    a.bestStars !== b.bestStars ||
    a.passed !== b.passed ||
    a.lastReport !== b.lastReport ||
    a.lastTick !== b.lastTick
  )
}

export function updateScenarioProgress(
  progress: ScenarioProgress,
  scenarioId: ScenarioDefinition['id'],
  evaluation: ScenarioEvaluation,
  scoreCard: ScoreCard,
  reportSummary: string,
  tick: number,
): ScenarioProgress {
  const current = progress[scenarioId]
  const nextBestScore = round(Math.max(current?.bestScore ?? 0, scoreCard.total), 1)
  const nextBestStars = Math.max(current?.bestStars ?? 0, scoreCard.star)
  const nextPassed = Boolean(current?.passed || evaluation.passed)
  const shouldRecord =
    nextBestScore !== (current?.bestScore ?? 0) ||
    nextBestStars !== (current?.bestStars ?? 0) ||
    nextPassed !== (current?.passed ?? false)
  if (!shouldRecord && current) {
    return progress
  }
  const nextEntry: ScenarioProgressEntry = {
    bestScore: nextBestScore,
    bestStars: nextBestStars,
    passed: nextPassed,
    lastReport: reportSummary,
    lastTick: tick,
  }
  if (!isEntryChanged(current, nextEntry)) {
    return progress
  }
  return {
    ...progress,
    [scenarioId]: nextEntry,
  }
}

export function readScenarioProgress() {
  try {
    const raw = window.localStorage.getItem(scenarioProgressStorageKey)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as ScenarioProgress
    return parsed ?? {}
  } catch {
    return {}
  }
}

export function saveScenarioProgress(progress: ScenarioProgress) {
  try {
    window.localStorage.setItem(scenarioProgressStorageKey, JSON.stringify(progress))
  } catch {
    return
  }
}
