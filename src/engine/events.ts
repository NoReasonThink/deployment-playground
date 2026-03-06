import type { ActiveEvent, EventTemplate, NodeKind } from '../types'

function isTargetMatch(targetKinds: NodeKind[] | undefined, kind: NodeKind) {
  if (!targetKinds || targetKinds.length === 0) {
    return true
  }
  return targetKinds.includes(kind)
}

export function createEventInstance(template: EventTemplate): ActiveEvent {
  return {
    ...template,
    instanceId: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    remainingTicks: template.durationTicks,
    startedAt: Date.now(),
  }
}

export function reduceActiveEvents(events: ActiveEvent[]) {
  const expired: ActiveEvent[] = []
  const next = events
    .map((event) => ({ ...event, remainingTicks: event.remainingTicks - 1 }))
    .filter((event) => {
      const alive = event.remainingTicks > 0
      if (!alive) {
        expired.push(event)
      }
      return alive
    })
  return { next, expired }
}

export function resolveEventEffects(events: ActiveEvent[], kind: NodeKind) {
  const matched = events.filter((event) => isTargetMatch(event.targetKinds, kind))
  const globalQpsEvents = events.filter((event) => !event.targetKinds || event.targetKinds.length === 0)
  const qpsMultiplier = globalQpsEvents.reduce((acc, event) => acc * event.qpsMultiplier, 1)
  const capacityMultiplier = matched.reduce((acc, event) => acc * event.capacityMultiplier, 1)
  const latencyDeltaMs = matched.reduce((acc, event) => acc + event.latencyDeltaMs, 0)
  return {
    qpsMultiplier,
    capacityMultiplier,
    latencyDeltaMs,
  }
}
