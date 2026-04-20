export const DEFAULT_SERVER_URL = 'https://api.quantdinger.com'

/** 邀请注册等对外分享的 H5 根地址（勿用 capacitor localhost / file 源） */
export const PUBLIC_WEB_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_WEB_BASE_URL) ||
  'https://m.quantdinger.com'

export const DEFAULT_THEME = 'dark'
