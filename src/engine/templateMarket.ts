import type { TopologyTemplate } from '../types'

export const userTemplateStorageKey = 'deploy-playground:user-templates:v1'

function normalizeTemplates(items: TopologyTemplate[]) {
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, 40)
}

export function readUserTemplates() {
  try {
    const raw = window.localStorage.getItem(userTemplateStorageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as TopologyTemplate[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return normalizeTemplates(parsed)
  } catch {
    return []
  }
}

function persistUserTemplates(items: TopologyTemplate[]) {
  window.localStorage.setItem(userTemplateStorageKey, JSON.stringify(normalizeTemplates(items)))
}

export function saveUserTemplate(template: TopologyTemplate) {
  const current = readUserTemplates()
  const merged = [template, ...current.filter((item) => item.id !== template.id)]
  const next = normalizeTemplates(merged)
  persistUserTemplates(next)
  return next
}

export function removeUserTemplate(templateId: string) {
  const current = readUserTemplates()
  const next = normalizeTemplates(current.filter((item) => item.id !== templateId))
  persistUserTemplates(next)
  return next
}

