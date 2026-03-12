export const nodeParameterBounds = {
  capacity: { min: 100, max: 50000, defaultValue: 3000 },
  baseLatencyMs: { min: 1, max: 2000, defaultValue: 30 },
  replicas: { min: 1, max: 8, defaultValue: 1 },
} as const

export const simulationPrecisionBoundary = {
  p95BudgetMs: 500,
  p99BudgetMs: 900,
  errorBudgetPercent: 12,
  availabilityBudgetPercent: 98,
}

export const largeSceneGuardrail = {
  nodeCountWarning: 180,
  eventWindowMax: 24,
}

export const scoreTerminology = {
  performance: '吞吐与时延综合能力',
  stability: '错误率与可用性稳定程度',
  cost: '单位吞吐下的资源成本水平',
  recoverability: '故障期间退化与恢复能力',
  security: '鉴权、限流与策略防护能力',
}

