export const OFFICIAL_SERVER_URL = 'https://api.quantdinger.com'

const webOrigin =
  typeof window !== 'undefined' &&
  window.location &&
  /^https?:$/i.test(window.location.protocol)
    ? window.location.origin
    : ''

export const DEFAULT_SERVER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_SERVER_URL) ||
  webOrigin ||
  OFFICIAL_SERVER_URL

const normalizeServerUrl = (value) => String(value || '').trim().replace(/\/$/, '')

const isOfficialServerUrl = (value) => {
  const normalized = normalizeServerUrl(value).toLowerCase()
  return normalized === OFFICIAL_SERVER_URL.toLowerCase()
}

const isOfficialWebOrigin = (value) => {
  const hostname = (() => {
    try {
      return new URL(value).hostname.toLowerCase()
    } catch (_) {
      return ''
    }
  })()
  return hostname === 'm.quantdinger.com' || hostname === 'app.quantdinger.com'
}

export const shouldResetSavedServerUrl = (savedUrl) =>
  Boolean(webOrigin) && !isOfficialWebOrigin(webOrigin) && isOfficialServerUrl(savedUrl)

export const resolveServerUrl = (savedUrl) => {
  const normalizedSavedUrl = normalizeServerUrl(savedUrl)
  if (shouldResetSavedServerUrl(normalizedSavedUrl)) {
    return normalizeServerUrl(webOrigin)
  }
  if (normalizedSavedUrl && !shouldResetSavedServerUrl(normalizedSavedUrl)) {
    return normalizedSavedUrl
  }
  return normalizeServerUrl(DEFAULT_SERVER_URL)
}

/** 邀请注册等对外分享的 H5 根地址（勿用 capacitor localhost / file 源） */
export const PUBLIC_WEB_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_WEB_BASE_URL) ||
  'https://m.quantdinger.com'

export const DEFAULT_THEME = 'dark'
