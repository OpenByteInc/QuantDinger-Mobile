import { Capacitor } from '@capacitor/core'

export const OFFICIAL_SERVER_URL = 'https://api.quantdinger.com'

const isNativeRuntime =
  typeof Capacitor !== 'undefined' &&
  typeof Capacitor.isNativePlatform === 'function' &&
  Capacitor.isNativePlatform()

const normalizeServerUrl = (value) => String(value || '').trim().replace(/\/$/, '')

const getWebOrigin = () => {
  if (isNativeRuntime || typeof window === 'undefined' || !window.location) {
    return ''
  }
  return /^https?:$/i.test(window.location.protocol) ? window.location.origin : ''
}

const webOrigin = getWebOrigin()

export const DEFAULT_SERVER_URL =
  normalizeServerUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_SERVER_URL) ||
      (isNativeRuntime ? OFFICIAL_SERVER_URL : webOrigin) ||
      OFFICIAL_SERVER_URL
  )

const isOfficialServerUrl = (value) =>
  normalizeServerUrl(value).toLowerCase() === OFFICIAL_SERVER_URL.toLowerCase()

const isOfficialWebOrigin = (value) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'm.quantdinger.com' || hostname === 'app.quantdinger.com'
  } catch (_) {
    return false
  }
}

const isLocalRuntimeUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
  } catch (_) {
    return false
  }
}

export const shouldResetSavedServerUrl = (savedUrl) =>
  Boolean(webOrigin) && !isOfficialWebOrigin(webOrigin) && isOfficialServerUrl(savedUrl)

export const resolveServerUrl = (savedUrl) => {
  const normalizedSavedUrl = normalizeServerUrl(savedUrl)
  if (isNativeRuntime && isLocalRuntimeUrl(normalizedSavedUrl)) {
    return DEFAULT_SERVER_URL
  }
  if (shouldResetSavedServerUrl(normalizedSavedUrl)) {
    return normalizeServerUrl(webOrigin)
  }
  return normalizedSavedUrl || DEFAULT_SERVER_URL
}

// Public H5 origin for invitation and external sharing links.
export const PUBLIC_WEB_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_WEB_BASE_URL) ||
  'https://m.quantdinger.com'

export const DEFAULT_THEME = 'dark'
