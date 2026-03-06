import type { PlaygroundNode } from '../types'

export type HeatmapMetric = 'cpu' | 'memory' | 'bandwidthMbps' | 'queueDepth' | 'poolUtilization'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, '0')
}

function mixColor(from: [number, number, number], to: [number, number, number], t: number) {
  return `#${toHex(lerp(from[0], to[0], t))}${toHex(lerp(from[1], to[1], t))}${toHex(lerp(from[2], to[2], t))}`
}

export function normalizeHeat(value: number, metric: HeatmapMetric) {
  if (metric === 'bandwidthMbps') {
    return clamp(Math.log10(1 + value) / 4, 0, 1)
  }
  if (metric === 'queueDepth') {
    return clamp(Math.log10(1 + value) / 3.5, 0, 1)
  }
  return clamp(value / 100, 0, 1)
}

export function heatColor(t: number) {
  const green: [number, number, number] = [34, 197, 94]
  const yellow: [number, number, number] = [234, 179, 8]
  const red: [number, number, number] = [239, 68, 68]
  if (t <= 0.5) {
    return mixColor(green, yellow, t / 0.5)
  }
  return mixColor(yellow, red, (t - 0.5) / 0.5)
}

export function applyHeatmapStyle(nodes: PlaygroundNode[], metric: HeatmapMetric) {
  return nodes.map((node) => {
    const value = Number(node.data[metric] ?? 0)
    const t = normalizeHeat(value, metric)
    const color = heatColor(t)
    return {
      ...node,
      style: {
        ...node.style,
        boxShadow: `0 0 0 3px ${color}33`,
      },
      data: {
        ...node.data,
      },
    }
  })
}

