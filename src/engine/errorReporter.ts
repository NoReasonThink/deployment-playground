export interface ErrorReportRecord {
  id: string
  message: string
  source: string
  stack?: string
  createdAt: number
}

const errorReportStorageKey = 'deploy-playground:error-reports:v1'

function readErrorReports() {
  try {
    const raw = window.localStorage.getItem(errorReportStorageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as ErrorReportRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeErrorReports(records: ErrorReportRecord[]) {
  try {
    window.localStorage.setItem(errorReportStorageKey, JSON.stringify(records.slice(0, 30)))
  } catch {
    return
  }
}

export function captureError(error: unknown, source: string) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  const record: ErrorReportRecord = {
    id: `err-${Date.now()}`,
    message,
    source,
    stack,
    createdAt: Date.now(),
  }
  const current = readErrorReports()
  writeErrorReports([record, ...current])
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    captureError(event.error ?? event.message, 'window.error')
  })
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, 'window.unhandledrejection')
  })
}

