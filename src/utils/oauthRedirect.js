import { Capacitor } from '@capacitor/core'

const NATIVE_OAUTH_REDIRECT = 'com.quantdinger.mobile://login'

export function getOAuthRedirectUri() {
  if (!Capacitor.isNativePlatform()) {
    return `${window.location.origin}${window.location.pathname}`
  }
  return localStorage.getItem('oauthRedirectUri')?.trim() || NATIVE_OAUTH_REDIRECT
}

export function parseOAuthReturnUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const noHash = url.split('#')[0]
    const qIndex = noHash.indexOf('?')
    const search = qIndex >= 0 ? noHash.slice(qIndex + 1) : ''
    const params = new URLSearchParams(search)
    const oauth_token = params.get('oauth_token')
    const oauth_error = params.get('oauth_error')
    if (oauth_token || oauth_error) return { oauth_token, oauth_error }
  } catch (_) {
    /* fall through */
  }
  const t = url.match(/[?&#]oauth_token=([^&#]+)/)
  const e = url.match(/[?&#]oauth_error=([^&#]+)/)
  if (!t && !e) return null
  return {
    oauth_token: t ? decodeURIComponent(t[1]) : undefined,
    oauth_error: e ? decodeURIComponent(e[1]) : undefined
  }
}
