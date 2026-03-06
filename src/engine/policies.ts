import type { NodeKind } from '../types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function applyRateLimiter(kind: NodeKind, utilization: number, incomingQps: number) {
  if (kind !== 'rate-limiter') {
    return { allowedQps: incomingQps, throttledRate: 0 }
  }
  const throttledRate = clamp((utilization - 0.7) * 85 + incomingQps / 8000, 0, 95)
  const allowedQps = incomingQps * (1 - throttledRate / 100)
  return {
    allowedQps,
    throttledRate,
  }
}

export function applyCircuitBreaker(kind: NodeKind, utilization: number, timeoutRate: number, failureRate: number) {
  if (kind !== 'circuit-breaker') {
    return { circuitOpen: false, degradedRate: 0, retryBackoffMs: 0 }
  }
  const pressure = clamp(utilization * 55 + timeoutRate * 0.9 + failureRate * 0.5, 0, 100)
  const circuitOpen = pressure > 78
  const degradedRate = clamp((pressure - 55) * 1.3, 0, 90)
  const retryBackoffMs = circuitOpen ? clamp(200 + pressure * 8, 200, 2000) : clamp(pressure * 6, 0, 1200)
  return {
    circuitOpen,
    degradedRate,
    retryBackoffMs,
  }
}

export function applyFailover(kind: NodeKind, circuitOpen: boolean, degradedRate: number) {
  if (kind !== 'load-balancer' && kind !== 'api-gateway') {
    return { failoverRate: 0 }
  }
  const failoverRate = circuitOpen ? clamp(18 + degradedRate * 0.35, 0, 70) : clamp(degradedRate * 0.12, 0, 30)
  return {
    failoverRate,
  }
}

