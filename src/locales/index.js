import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import zhTW from './zh-TW'
import enUS from './en-US'
import jaJP from './ja-JP'
import koKR from './ko-KR'
import {
  Locale as VantLocale
} from 'vant'
import vantEnUS from 'vant/es/locale/lang/en-US'
import vantZhCN from 'vant/es/locale/lang/zh-CN'
import vantZhTW from 'vant/es/locale/lang/zh-TW'
import vantJaJP from 'vant/es/locale/lang/ja-JP'
import vantKoKR from 'vant/es/locale/lang/ko-KR'

export const SUPPORTED_LOCALES = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' }
]

const STORAGE_KEY = 'locale'

const detectInitialLocale = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.some((l) => l.value === saved)) {
    return saved
  }
  return 'en-US'
}

export const initialLocale = detectInitialLocale()

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'en-US': enUS,
    'ja-JP': jaJP,
    'ko-KR': koKR
  }
})

const applyVantLocale = (locale) => {
  if (locale === 'en-US') VantLocale.use('en-US', vantEnUS)
  else if (locale === 'zh-TW') VantLocale.use('zh-TW', vantZhTW)
  else if (locale === 'ja-JP') VantLocale.use('ja-JP', vantJaJP)
  else if (locale === 'ko-KR') VantLocale.use('ko-KR', vantKoKR)
  else VantLocale.use('zh-CN', vantZhCN)
}

applyVantLocale(initialLocale)

export const setLocale = (lang) => {
  if (!SUPPORTED_LOCALES.some((l) => l.value === lang)) return
  i18n.global.locale.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.setAttribute('lang', lang)
  applyVantLocale(lang)
}

export const getLocale = () => i18n.global.locale.value

export const t = (key, params) => i18n.global.t(key, params)

export default i18n
