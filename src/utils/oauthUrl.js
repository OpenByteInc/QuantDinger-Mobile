export function buildOAuthStartUrl({ baseUrl = '', webOrigin = '', provider, redirectUri }) {
  const root = String(baseUrl || webOrigin || '').trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(root)) {
    throw new Error('OAuth requires an absolute HTTP(S) origin')
  }
  const url = new URL(`${root}/api/auth/oauth/${encodeURIComponent(provider)}`)
  url.searchParams.set('redirect', redirectUri)
  return url.toString()
}
