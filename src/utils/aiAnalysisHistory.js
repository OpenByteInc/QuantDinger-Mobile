import { professionalReportEnvelope } from './professionalReport.js'

export function parseFullResult(raw) {
  if (raw == null) return null
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  return value.data && typeof value.data === 'object' ? value.data : value
}

/**
 * History is a read boundary, not a reconstruction engine. Only a persisted
 * professional_report_v1 artifact is renderable; legacy rows must be regenerated.
 */
export function buildHistoryResultPayload(item) {
  if (!item || typeof item !== 'object') return null
  const full = parseFullResult(item.full_result)
  const envelope = professionalReportEnvelope(full)
  if (!envelope) return null
  return {
    ...envelope,
    runtime: {
      ...(envelope.runtime || {}),
      memory_id: item.id ?? envelope.runtime?.memory_id
    }
  }
}
