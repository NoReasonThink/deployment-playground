import type { Edge } from '@xyflow/react'
import type { PlaygroundNode, ScenarioDefinition } from '../types'

export const draftStorageKey = 'deploy-playground:draft:v1'

export interface DraftState {
  savedAt: number
  scenarioId: ScenarioDefinition['id']
  fixedQps: number
  nodes: PlaygroundNode[]
  edges: Edge[]
}

export function readDraftState() {
  try {
    const raw = window.localStorage.getItem(draftStorageKey)
    if (!raw) {
      return undefined
    }
    const parsed = JSON.parse(raw) as DraftState
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export function saveDraftState(draft: DraftState) {
  try {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraftState() {
  try {
    window.localStorage.removeItem(draftStorageKey)
  } catch {
    return
  }
}
