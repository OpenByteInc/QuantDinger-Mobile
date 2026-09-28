export function apiErrorMessage(body) {
  const details = body?.data?.errors || body?.errors
  const flatten = (value, path = '') => {
    if (Array.isArray(value)) return value.flatMap(item => flatten(item, path))
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => flatten(item, ['json', 'body', 'query'].includes(key) ? path : [path, key].filter(Boolean).join('.')))
    return typeof value === 'string' ? [`${path ? `${path}: ` : ''}${value}`] : []
  }
  const messages = flatten(details)
  return messages.length ? messages.join('; ') : body?.msg || body?.message || ''
}
