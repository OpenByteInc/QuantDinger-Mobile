export const PROFESSIONAL_REPORT_SCHEMA = 'professional_report_v1'
export const PROFESSIONAL_ENVELOPE_SCHEMA = 'professional_analysis_envelope_v1'

const EVIDENCE_METADATA_FIELDS = new Set(['currency', 'source', 'period_end', 'period_start', 'latest_date', 'date', 'period_type', 'timestamp', 'time', 'method', 'kind', 'name', 'description', 'category', 'scope', 'symbol', 'security_type', 'isin'])
const EVIDENCE_PERCENT_FIELDS = new Set(['change_percent', 'revenue_growth', 'profit_margin', 'operating_margin', 'gross_margin', 'dividend_yield', 'roe', 'holding_ratio_pct', 'holding_change_pct_1d', 'short_percent_of_float_pct', 'nearest_atm_implied_volatility_pct', 'open_interest_change_24h', 'volume_change_24h', 'funding_rate'])
const EVIDENCE_MONEY_FIELDS = new Set(['market_cap', 'enterprise_value', 'total_revenue', 'revenue', 'gross_profit', 'operating_income', 'net_income', 'operating_cash_flow', 'financing_cash_flow', 'capital_expenditure', 'free_cash_flow', 'total_assets', 'total_liabilities', 'total_equity', 'current_assets', 'current_liabilities', 'cash', 'debt', 'volume_24h', 'open_interest', 'exchange_netflow', 'stablecoin_netflow', 'holding_market_value_hkd'])
const EVIDENCE_PRICE_FIELDS = new Set(['price', 'current_price', 'previous_close', 'open', 'high', 'low', 'close', 'support', 'resistance', 'swing_low', 'swing_high', 'pivot', 'bb_lower', 'bb_middle', 'bb_upper', 'suggested_stop_loss', 'suggested_take_profit', 'target_price_median_hkd', 'target_price_median_usd', 'target_price_mean_usd', 'target_price_low_usd', 'target_price_high_usd', 'target_price_low_hkd', 'target_price_high_hkd'])
const EVIDENCE_SHARE_FIELDS = new Set(['shares_outstanding', 'shares_short', 'shares_short_prior_month', 'holding_change_shares_1d', 'holding_shares'])
const EVIDENCE_CURRENCY_CODES = new Set(['USD', 'HKD', 'CNY', 'CNH', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'KRW', 'USDT', 'USDC', 'BTC', 'ETH'])

const normalizeEvidenceToken = value => String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9%]+/g, '_').replace(/^_+|_+$/g, '')
const evidenceMetricLeaf = metric => normalizeEvidenceToken(String(metric || '').split('.').pop())
const localeNumber = (value, locale, minimumFractionDigits, maximumFractionDigits) => new Intl.NumberFormat(locale || undefined, { minimumFractionDigits, maximumFractionDigits, useGrouping: true }).format(value)
const decimalProfile = value => {
  const absolute = Math.abs(value)
  if (absolute !== 0 && absolute < 0.01) return [0, 8]
  if (absolute < 1) return [0, 6]
  if (absolute < 100) return [0, 4]
  return [0, 2]
}
const priceProfile = value => Math.abs(value) < 1 ? [2, 6] : [2, 4]
const percentProfile = value => {
  const absolute = Math.abs(value)
  if (absolute !== 0 && absolute < 0.01) return [0, 6]
  if (absolute < 1) return [0, 4]
  return [0, 2]
}
const compactEvidenceNumber = (value, locale) => {
  const scale = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([threshold]) => Math.abs(value) >= threshold)
  if (!scale) return localeNumber(value, locale, ...decimalProfile(value))
  return `${localeNumber(value / scale[0], locale, 0, 2)}${scale[1]}`
}
const currencyCode = (unit, currency) => {
  const explicit = String(currency || '').trim().toUpperCase()
  if (explicit) return explicit
  const rawUnit = String(unit || '').trim().toUpperCase()
  return EVIDENCE_CURRENCY_CODES.has(rawUnit) ? rawUnit : ''
}

export function formatEvidenceObservation(item, options = {}) {
  const rawValue = item?.value
  const numericValue = typeof rawValue === 'number' ? rawValue : typeof rawValue === 'string' && rawValue.trim() !== '' ? Number(rawValue) : NaN
  if (!Number.isFinite(numericValue)) return null
  const locale = options.locale
  const shareLabel = options.shareLabel || 'shares'
  const countLabel = options.countLabel || 'items'
  const bpsLabel = options.bpsLabel || 'bps'
  const leaf = evidenceMetricLeaf(item?.metric)
  const unit = normalizeEvidenceToken(item?.unit)
  const currency = currencyCode(item?.unit, item?.currency)
  const exactNumber = localeNumber(numericValue, locale, 0, 8)
  if (EVIDENCE_METADATA_FIELDS.has(leaf)) return { display: exactNumber, exact: exactNumber, compacted: false }
  if (/(^|\.)rsi(\.|$)/i.test(String(item?.metric || ''))) {
    const display = localeNumber(numericValue, locale, ...decimalProfile(numericValue))
    return { display, exact: exactNumber, compacted: false }
  }
  if (unit === 'percent' || unit === 'percentage' || unit === 'pct' || unit === '%' || EVIDENCE_PERCENT_FIELDS.has(leaf) || leaf.endsWith('_pct')) {
    const number = localeNumber(numericValue, locale, ...percentProfile(numericValue))
    return { display: `${number}%`, exact: `${exactNumber}%`, compacted: false }
  }
  if (unit === 'bps' || unit === 'basis_points') {
    const number = localeNumber(numericValue, locale, 0, 2)
    return { display: `${number} ${bpsLabel}`, exact: `${exactNumber} ${bpsLabel}`, compacted: false }
  }
  if (unit === 'currency_per_share' || ['eps', 'book_value'].includes(leaf)) {
    const number = localeNumber(numericValue, locale, Math.abs(numericValue) >= 1 ? 2 : 0, Math.abs(numericValue) < 0.01 ? 6 : 3)
    const suffix = currency ? `${currency}/${shareLabel}` : shareLabel
    return { display: `${number} ${suffix}`, exact: `${exactNumber} ${suffix}`, compacted: false }
  }
  if (['multiple', 'ratio'].includes(unit) || leaf.endsWith('_ratio') || ['pe_ratio', 'pb_ratio', 'current_ratio', 'quick_ratio', 'debt_to_equity', 'beta'].includes(leaf)) {
    const number = localeNumber(numericValue, locale, 0, 3)
    return { display: `${number}×`, exact: `${exactNumber}×`, compacted: false }
  }
  if (['share', 'shares'].includes(unit) || EVIDENCE_SHARE_FIELDS.has(leaf)) {
    const displayNumber = compactEvidenceNumber(numericValue, locale)
    return { display: `${displayNumber} ${shareLabel}`, exact: `${exactNumber} ${shareLabel}`, compacted: displayNumber !== exactNumber }
  }
  if (['count', 'items'].includes(unit) || leaf.endsWith('_count') || leaf === 'bar_count') {
    const displayNumber = Math.abs(numericValue) >= 10000 ? compactEvidenceNumber(numericValue, locale) : localeNumber(numericValue, locale, 0, 0)
    return { display: `${displayNumber} ${countLabel}`, exact: `${exactNumber} ${countLabel}`, compacted: displayNumber !== exactNumber }
  }
  const unitIsCurrency = Boolean(currency) && unit === currency.toLowerCase()
  const isPrice = EVIDENCE_PRICE_FIELDS.has(leaf)
  const isMoney = EVIDENCE_MONEY_FIELDS.has(leaf) || unitIsCurrency || unit === 'currency'
  if (isPrice || isMoney) {
    const displayNumber = isMoney && !isPrice && Math.abs(numericValue) >= 1000 ? compactEvidenceNumber(numericValue, locale) : localeNumber(numericValue, locale, ...(isPrice ? priceProfile(numericValue) : decimalProfile(numericValue)))
    const rawUnit = String(item?.unit || '').trim()
    const amountUnit = !currency && !['', 'currency', 'price', 'decimal'].includes(unit) ? rawUnit : ''
    const suffix = currency ? ` ${currency}` : amountUnit ? ` ${amountUnit}` : ''
    return { display: `${displayNumber}${suffix}`, exact: `${exactNumber}${suffix}`, compacted: displayNumber !== exactNumber }
  }
  const display = localeNumber(numericValue, locale, ...decimalProfile(numericValue))
  return { display, exact: exactNumber, compacted: false }
}

export function evidenceProviderTokens(value) {
  const unique = [...new Set(String(value || '').split('+').map(item => normalizeEvidenceToken(item)).filter(Boolean))]
  return unique.includes('yfinance_statements') ? unique.filter(item => item !== 'yfinance') : unique
}

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
