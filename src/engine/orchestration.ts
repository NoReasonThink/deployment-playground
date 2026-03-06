import type { ActiveEvent, EventOrchestrationPlan, EventTemplate } from '../types'
import { createEventInstance } from './events'

export interface RuntimeOrchestrationPlan extends EventOrchestrationPlan {
  enabled: boolean
  serialCursor: number
}

function withinWindow(plan: RuntimeOrchestrationPlan, tick: number) {
  return tick >= plan.startTick && tick <= plan.endTick
}

function resolveTemplate(templateId: string, templates: EventTemplate[]) {
  return templates.find((item) => item.id === templateId)
}

export function executeOrchestrationTick(
  plans: RuntimeOrchestrationPlan[],
  tick: number,
  templates: EventTemplate[],
) {
  const generated: ActiveEvent[] = []
  const logs: string[] = []
  const nextPlans = plans.map((plan) => {
    if (!plan.enabled || plan.eventIds.length === 0 || !withinWindow(plan, tick)) {
      return plan
    }
    if (Math.random() > plan.probability) {
      return plan
    }
    if (plan.mode === 'parallel') {
      for (const eventId of plan.eventIds) {
        const template = resolveTemplate(eventId, templates)
        if (!template) {
          continue
        }
        generated.push(createEventInstance(template))
        logs.push(`编排注入：${plan.name} -> ${template.name}`)
      }
      return plan
    }
    const cursor = plan.serialCursor % plan.eventIds.length
    const template = resolveTemplate(plan.eventIds[cursor], templates)
    if (template) {
      generated.push(createEventInstance(template))
      logs.push(`编排注入：${plan.name} -> ${template.name}`)
    }
    return {
      ...plan,
      serialCursor: cursor + 1,
    }
  })
  return {
    nextPlans,
    generated,
    logs,
  }
}

