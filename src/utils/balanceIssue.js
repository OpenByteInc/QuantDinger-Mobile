export function balanceIssue(data, marketType = 'swap') {
  if (!data || typeof data !== 'object') return null
  const activeLeg = data[marketType] && typeof data[marketType] === 'object' ? data[marketType] : {}
  const message = data.error || activeLeg.error || ''
  const hintKey = data.error_hint_key || activeLeg.error_hint_key || ''
  if (!message && !hintKey) return null
  return {
    message: String(message || ''),
    hintKey: String(hintKey || ''),
    requestIp: String(data.request_ip || activeLeg.request_ip || '')
  }
}

export function localizedBalanceIssue(issue, translate, hasTranslation) {
  if (!issue) return ''
  if (issue.hintKey && hasTranslation(issue.hintKey)) return translate(issue.hintKey)
  return issue.message || translate('audit.loadFailed')
}
