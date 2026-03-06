import type { ActiveEvent, PlaygroundNode, SchedulerState, SimulationMetrics } from '../types'

export const debugSnapshotStorageKey = 'deploy-playground:debug-snapshots:v1'

export interface DebugStateSnapshot {
  id: string
  name: string
  createdAt: number
  tick: number
  schedulerSpeed: SchedulerState['speed']
  running: boolean
  metrics: SimulationMetrics
  bottlenecks: string[]
  eventLogs: string[]
  activeEventNames: string[]
  topology: {
    nodeCount: number
    edgeCount: number
  }
  hotNodes: Array<{
    id: string
    label: string
    utilization: number
    queueDepth: number
  }>
}

export interface ProfilerSummary {
  sampleCount: number
  avgTickMs: number
  p95TickMs: number
  throughputTicksPerSecond: number
  estimatedFps: number
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export function createDebugStateSnapshot(input: {
  name: string
  tick: number
  scheduler: SchedulerState
  metrics: SimulationMetrics
  bottlenecks: string[]
  eventLogs: string[]
  activeEvents: ActiveEvent[]
  nodes: PlaygroundNode[]
  edgeCount: number
}): DebugStateSnapshot {
  const hotNodes = [...input.nodes]
    .sort((a, b) => b.data.utilization + b.data.queueDepth * 0.002 - (a.data.utilization + a.data.queueDepth * 0.002))
    .slice(0, 5)
    .map((node) => ({
      id: node.id,
      label: node.data.label,
      utilization: round(node.data.utilization * 100, 1),
      queueDepth: round(node.data.queueDepth, 1),
    }))
  return {
    id: `debug-${Date.now()}`,
    name: input.name,
    createdAt: Date.now(),
    tick: input.tick,
    schedulerSpeed: input.scheduler.speed,
    running: input.scheduler.running,
    metrics: { ...input.metrics },
    bottlenecks: [...input.bottlenecks],
    eventLogs: [...input.eventLogs].slice(0, 24),
    activeEventNames: input.activeEvents.map((event) => event.name).slice(0, 24),
    topology: {
      nodeCount: input.nodes.length,
      edgeCount: input.edgeCount,
    },
    hotNodes,
  }
}

export function readDebugSnapshots() {
  try {
    const raw = window.localStorage.getItem(debugSnapshotStorageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as DebugStateSnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDebugSnapshot(snapshot: DebugStateSnapshot) {
  const current = readDebugSnapshots()
  const next = [snapshot, ...current].slice(0, 20)
  try {
    window.localStorage.setItem(debugSnapshotStorageKey, JSON.stringify(next))
  } catch {
    return current
  }
  return next
}

export function removeDebugSnapshot(snapshotId: string) {
  const current = readDebugSnapshots()
  const next = current.filter((item) => item.id !== snapshotId)
  try {
    window.localStorage.setItem(debugSnapshotStorageKey, JSON.stringify(next))
  } catch {
    return current
  }
  return next
}

export function summarizeProfilerSamples(samples: number[]): ProfilerSummary {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      avgTickMs: 0,
      p95TickMs: 0,
      throughputTicksPerSecond: 0,
      estimatedFps: 0,
    }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const p95Index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1))
  const total = samples.reduce((sum, value) => sum + value, 0)
  const avg = total / samples.length
  const throughput = avg > 0 ? 1000 / avg : 0
  return {
    sampleCount: samples.length,
    avgTickMs: round(avg),
    p95TickMs: round(sorted[p95Index] ?? 0),
    throughputTicksPerSecond: round(throughput),
    estimatedFps: round(throughput),
  }
}

export function nextReplayFrame(
  sourceLogs: string[],
  cursor: number,
  displayed: string[],
  batchSize = 1,
) {
  const safeBatch = Math.max(1, batchSize)
  const nextSlice = sourceLogs.slice(cursor, cursor + safeBatch)
  const nextCursor = cursor + nextSlice.length
  return {
    nextCursor,
    done: nextCursor >= sourceLogs.length,
    lines: [...displayed, ...nextSlice].slice(-24),
  }
}

