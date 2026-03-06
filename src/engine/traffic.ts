import type { TrafficPattern } from '../types'

export function computeQps(pattern: TrafficPattern, baseQps: number, tick: number) {
  if (pattern === 'constant') {
    return baseQps
  }
  if (pattern === 'sine') {
    const wave = Math.sin((tick / 18) * Math.PI * 2)
    return Math.max(0, baseQps * (1 + wave * 0.35))
  }
  if (pattern === 'step') {
    const stage = Math.floor(tick / 10) % 4
    const factors = [0.75, 1, 1.25, 1.45]
    return baseQps * factors[stage]
  }
  const phase = tick % 20
  return phase < 3 ? baseQps * 1.8 : baseQps * 0.9
}
