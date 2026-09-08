export const PROFESSIONAL_REPORT_SCHEMA = 'professional_report_v1'
export const PROFESSIONAL_ENVELOPE_SCHEMA = 'professional_analysis_envelope_v1'

export function professionalReportArtifact(value) {
  if (!value || typeof value !== 'object') return null
  const candidate = value.report || value.professional_report || value
  if (!candidate || typeof candidate !== 'object') return null
  const schema = candidate.schema_version
  if (schema === PROFESSIONAL_REPORT_SCHEMA) return candidate
  if (schema === '1.0' && candidate.instrument && candidate.decision_profile) return candidate
  return null
}

export function professionalReportEnvelope(value) {
  if (!value || typeof value !== 'object') return null
  const payload = value.code !== undefined && value.data && typeof value.data === 'object'
    ? value.data
    : value
  const report = professionalReportArtifact(payload)
  if (!report) return null
  return {
    schema_version: PROFESSIONAL_ENVELOPE_SCHEMA,
    report,
    runtime: payload.runtime || {
      memory_id: payload.memory_id,
      analysis_time_ms: payload.analysis_time_ms,
      llm_time_ms: payload.llm_time_ms,
      data_collection_time_ms: payload.data_collection_time_ms
    },
    billing: payload.billing || null
  }
}

export function reportInstrument(value) {
  return professionalReportArtifact(value)?.instrument || {}
}

export function reportDecisionProfile(value) {
  return professionalReportArtifact(value)?.decision_profile || {}
}

export function reportObservation(value, metrics) {
  const report = professionalReportArtifact(value)
  const rows = report?.evidence_snapshot?.observations
  if (!Array.isArray(rows)) return null
  const wanted = (Array.isArray(metrics) ? metrics : [metrics]).map((item) => String(item || '').toLowerCase())
  return rows.find((item) => wanted.includes(String(item?.metric || '').toLowerCase())) || null
}

export function reportCurrentPrice(value) {
  return reportObservation(value, ['quote.price', 'current_price'])?.value ?? null
}

export function reportChangePercent(value) {
  return reportObservation(value, ['quote.changePercent', 'change_24h'])?.value ?? null
}

export function reportRiskReward(value) {
  const report = professionalReportArtifact(value)
  const plan = report?.risk_plan || {}
  return plan.net_risk_reward ?? plan.gross_risk_reward ?? null
}

export function reportHasRiskRewardWarning(value) {
  const report = professionalReportArtifact(value)
  if (String(report?.decision_profile?.decision || '').toUpperCase() === 'HOLD') return false
  const plan = report?.risk_plan || {}
  const ratio = reportRiskReward(report)
  const warnings = Array.isArray(plan.warnings) ? plan.warnings : []
  return warnings.includes('net_risk_reward_below_one') || (
    ratio !== null && ratio !== '' && Number.isFinite(Number(ratio)) && Number(ratio) < 1
  )
}
