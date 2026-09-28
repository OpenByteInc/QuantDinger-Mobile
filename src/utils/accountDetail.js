export function accountNumber(value, digits = 6, locale = 'en-US') {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString(locale, {maximumFractionDigits: digits})
}

export function canCancelAccountOrder(order) {
  return Boolean(order?.id) && ['new','accepted','pending_new','partially_filled','accepted_for_bidding'].includes(String(order.status).toLowerCase())
}

export function snapshotIssue(data) {
  const warnings = Array.isArray(data?.warnings) ? data.warnings.filter(Boolean) : []
  return [...new Set([data?.error, ...warnings].filter(Boolean))].map(String)
}

export function accountPrice(value,locale='en-US') { return Number(value)>0?accountNumber(value,6,locale):'—' }
