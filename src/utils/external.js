import { Capacitor } from '@capacitor/core'

export function openExternal(url) {
  if (!url) return
  try {
    if (Capacitor.isNativePlatform?.()) {
      window.open(url, '_system')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch (e) {
    try { window.location.href = url } catch {}
  }
}
