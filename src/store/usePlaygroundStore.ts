import type { Edge } from '@xyflow/react'
import { create } from 'zustand'
import type { ActiveEvent, PlaygroundNode, ScenarioDefinition, SchedulerState, SimulationMetrics } from '../types'

interface CanvasStateLayer {
  nodes: PlaygroundNode[]
  edges: Edge[]
  selectedScenarioId: ScenarioDefinition['id']
}

interface SimulationStateLayer {
  scheduler: SchedulerState
  metrics: SimulationMetrics
  activeEvents: ActiveEvent[]
}

interface MonitorStateLayer {
  bottlenecks: string[]
  eventLogs: string[]
}

interface ScenarioStateLayer {
  unlockedScenarioIds: string[]
}

interface PlaygroundStoreState {
  canvas: CanvasStateLayer
  simulation: SimulationStateLayer
  monitor: MonitorStateLayer
  scenario: ScenarioStateLayer
  setCanvasLayer: (payload: Partial<CanvasStateLayer>) => void
  setSimulationLayer: (payload: Partial<SimulationStateLayer>) => void
  setMonitorLayer: (payload: Partial<MonitorStateLayer>) => void
  setScenarioLayer: (payload: Partial<ScenarioStateLayer>) => void
}

const defaultMetrics: SimulationMetrics = {
  qps: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  errorRate: 0,
  availability: 100,
}

const defaultScheduler: SchedulerState = {
  tick: 0,
  speed: 1,
  running: false,
}

export const usePlaygroundStore = create<PlaygroundStoreState>((set) => ({
  canvas: {
    nodes: [],
    edges: [],
    selectedScenarioId: 'starter-ha-web',
  },
  simulation: {
    scheduler: defaultScheduler,
    metrics: defaultMetrics,
    activeEvents: [],
  },
  monitor: {
    bottlenecks: [],
    eventLogs: [],
  },
  scenario: {
    unlockedScenarioIds: [],
  },
  setCanvasLayer: (payload) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        ...payload,
      },
    })),
  setSimulationLayer: (payload) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        ...payload,
      },
    })),
  setMonitorLayer: (payload) =>
    set((state) => ({
      monitor: {
        ...state.monitor,
        ...payload,
      },
    })),
  setScenarioLayer: (payload) =>
    set((state) => ({
      scenario: {
        ...state.scenario,
        ...payload,
      },
    })),
}))

