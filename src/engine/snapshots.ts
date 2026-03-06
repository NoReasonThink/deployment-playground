import type { ArchitectureSnapshot } from '../types'

export const snapshotStorageKey = 'deploy-playground:architecture-snapshots:v1'
const snapshotExportVersion = 1

function sortSnapshots(items: ArchitectureSnapshot[]) {
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

function normalizeSnapshots(items: ArchitectureSnapshot[]) {
  return sortSnapshots(items).slice(0, 30)
}

export function readSnapshots() {
  try {
    const raw = window.localStorage.getItem(snapshotStorageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as ArchitectureSnapshot[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return sortSnapshots(parsed)
  } catch {
    return []
  }
}

function persistSnapshots(items: ArchitectureSnapshot[]) {
  window.localStorage.setItem(snapshotStorageKey, JSON.stringify(normalizeSnapshots(items)))
}

export function saveSnapshot(snapshot: ArchitectureSnapshot) {
  const current = readSnapshots()
  const merged = [snapshot, ...current.filter((item) => item.id !== snapshot.id)]
  persistSnapshots(merged)
  return normalizeSnapshots(merged)
}

export function removeSnapshot(snapshotId: string) {
  const current = readSnapshots()
  const next = current.filter((item) => item.id !== snapshotId)
  persistSnapshots(next)
  return normalizeSnapshots(next)
}

export function mergeSnapshots(incoming: ArchitectureSnapshot[]) {
  const current = readSnapshots()
  const map = new Map<string, ArchitectureSnapshot>()
  for (const item of current) {
    map.set(item.id, item)
  }
  for (const item of incoming) {
    map.set(item.id, item)
  }
  const merged = normalizeSnapshots([...map.values()])
  persistSnapshots(merged)
  return merged
}

export function buildSnapshotsExportContent(snapshots: ArchitectureSnapshot[]) {
  return JSON.stringify(
    {
      type: 'deploy-playground-snapshots',
      version: snapshotExportVersion,
      exportedAt: Date.now(),
      snapshots: normalizeSnapshots(snapshots),
    },
    null,
    2,
  )
}

export function parseSnapshotsImportContent(content: string) {
  try {
    const parsed = JSON.parse(content) as {
      type?: string
      version?: number
      snapshots?: ArchitectureSnapshot[]
    }
    if (parsed.type !== 'deploy-playground-snapshots' || parsed.version !== snapshotExportVersion) {
      return { snapshots: [], valid: false as const }
    }
    if (!Array.isArray(parsed.snapshots)) {
      return { snapshots: [], valid: false as const }
    }
    return { snapshots: normalizeSnapshots(parsed.snapshots), valid: true as const }
  } catch {
    return { snapshots: [], valid: false as const }
  }
}
