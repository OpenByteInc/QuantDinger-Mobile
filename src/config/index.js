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

export const resolveServerUrl = () => DEFAULT_SERVER_URL

// Public H5 origin for invitation and external sharing links.
export const PUBLIC_WEB_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_WEB_BASE_URL) ||
  'https://m.quantdinger.com'

export const DEFAULT_THEME = 'dark'
