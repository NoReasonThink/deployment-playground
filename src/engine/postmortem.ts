import type { ActiveEvent, PlaygroundNode, SimulationMetrics } from '../types'
import type { ScoreCard } from './scoring'

export interface PostmortemReport {
  summary: string
  rootCauses: string[]
  improvements: string[]
  architectureAdjustments: string[]
}

function topBusyNodes(nodes: PlaygroundNode[]) {
  return [...nodes]
    .sort((a, b) => b.data.utilization - a.data.utilization)
    .slice(0, 2)
    .map((node) => node.data.label)
}

export function generatePostmortemReport(
  scenarioName: string,
  metrics: SimulationMetrics,
  bottlenecks: string[],
  scoreCard: ScoreCard,
  activeEvents: ActiveEvent[],
  nodes: PlaygroundNode[],
): PostmortemReport {
  const hotNodes = topBusyNodes(nodes)
  const rootCauses: string[] = []
  const improvements: string[] = []
  const architectureAdjustments: string[] = []

  if (bottlenecks.length > 0) {
    rootCauses.push(`核心瓶颈集中在：${bottlenecks.join('；')}`)
  }
  if (metrics.p99LatencyMs > 220) {
    rootCauses.push(`尾延迟偏高（P99 ${metrics.p99LatencyMs}ms），疑似下游排队与重试叠加`)
  }
  if (metrics.errorRate > 4) {
    rootCauses.push(`错误率 ${metrics.errorRate}% 超过稳定阈值，存在降级或熔断传播`)
  }
  if (activeEvents.length > 0) {
    rootCauses.push(`演练期间叠加 ${activeEvents.length} 个事件，放大了波峰时段抖动`)
  }
  if (scoreCard.breakdown.cost < 60) {
    rootCauses.push(`成本子分偏低（${scoreCard.breakdown.cost}），资源利用效率不足`)
  }

  improvements.push('优先收敛最热链路节点的队列深度与重试退避，降低排队放大效应')
  if (hotNodes.length > 0) {
    improvements.push(`重点治理热点节点：${hotNodes.join('、')}，提高容量冗余或提前扩容阈值`)
  }
  improvements.push('将故障编排窗口与流量脉冲错峰，减少事件叠加造成的连锁退化')
  if (scoreCard.breakdown.security < 70) {
    improvements.push('补齐安全链路守护，增加 IAM/WAF 前置校验并压缩鉴权失败重试')
  }

  architectureAdjustments.push('在入口层增加分层限流配额，区分核心交易流量与背景流量')
  architectureAdjustments.push('为关键服务加入双活或至少双副本策略，缩短故障恢复时间')
  architectureAdjustments.push('将审计/观测链路异步化，避免写入背压反向拖慢主业务链路')
  if (scoreCard.breakdown.cost < 70) {
    architectureAdjustments.push('提升缓存与对象存储命中率，减少数据库高成本查询占比')
  }

  const summary = `${scenarioName} 当前总分 ${scoreCard.total}（${scoreCard.grade}，${'★'.repeat(scoreCard.star)}${'☆'.repeat(5 - scoreCard.star)}），` +
    `可用性 ${metrics.availability}%、P99 ${metrics.p99LatencyMs}ms、错误率 ${metrics.errorRate}%。`

  return {
    summary,
    rootCauses: rootCauses.slice(0, 4),
    improvements: improvements.slice(0, 4),
    architectureAdjustments: architectureAdjustments.slice(0, 4),
  }
}

