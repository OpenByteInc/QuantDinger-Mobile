export function maskEmail(value) {
  const text = String(value || '').trim()
  const at = text.lastIndexOf('@')
  if (at <= 0) return '******'
  const local = text.slice(0, at)
  const domain = text.slice(at + 1)
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, Math.min(6, local.length)))}@${domain}`
}
