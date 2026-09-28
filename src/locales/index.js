import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import zhTW from './zh-TW'
import enUS from './en-US'
import jaJP from './ja-JP'
import koKR from './ko-KR'
import professionalReport from './professional-report'
import v2 from './v2'
import audit from './audit'
import accountUi from './account-ui'
import profileDetail from './profile-detail'
import aiChat from './ai-chat'
import eventRadar from './event-radar'
import strategyRuntime from './strategy-runtime'
import liveDetail from './live-detail'
import appearance from './appearance'
import completeness from './completeness'
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

const expandKeys = (messages) => {
  const result = {}
  for (const [key, value] of Object.entries(messages)) {
    const parts = key.split('.')
    let target = result
    for (const part of parts.slice(0, -1)) target = target[part] ||= {}
    target[parts.at(-1)] = value
  }
  return result
}

const mergeLocale = (base, addition) => {
  const result = { ...base }
  for (const [key, value] of Object.entries(addition || {})) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeLocale(base?.[key] || {}, value)
      : value
  }
  return result
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': { ...zhCN, professional_report: professionalReport['zh-CN'], v2: v2['zh-CN'], audit: audit['zh-CN'], account_ui: accountUi['zh-CN'], profile_detail: profileDetail['zh-CN'], live_detail: liveDetail['zh-CN'], appearance: appearance['zh-CN'], ...expandKeys(eventRadar['zh-CN']), ...expandKeys(strategyRuntime['zh-CN']), ai_chat: {...aiChat['en-US'],...aiChat['zh-CN']} },
    'zh-TW': { ...mergeLocale(zhTW, expandKeys(completeness['zh-TW'])), professional_report: professionalReport['zh-TW'], v2: v2['zh-TW'], audit: audit['zh-TW'], account_ui: accountUi['zh-TW'], profile_detail: profileDetail['zh-TW'], live_detail: liveDetail['zh-TW'], appearance: appearance['zh-TW'], ...expandKeys(eventRadar['zh-TW']), ...expandKeys(strategyRuntime['zh-TW']), ai_chat: {...aiChat['en-US'],...aiChat['zh-TW']} },
    'en-US': { ...enUS, professional_report: professionalReport['en-US'], v2: v2['en-US'], audit: audit['en-US'], account_ui: accountUi['en-US'], profile_detail: profileDetail['en-US'], live_detail: liveDetail['en-US'], appearance: appearance['en-US'], ...expandKeys(eventRadar['en-US']), ...expandKeys(strategyRuntime['en-US']), ai_chat: {...aiChat['en-US'],...aiChat['en-US']} },
    'ja-JP': { ...mergeLocale(jaJP, expandKeys(completeness['ja-JP'])), professional_report: professionalReport['ja-JP'], v2: v2['ja-JP'], audit: audit['ja-JP'], account_ui: accountUi['ja-JP'], profile_detail: profileDetail['ja-JP'], live_detail: liveDetail['ja-JP'], appearance: appearance['ja-JP'], ...expandKeys(eventRadar['ja-JP']), ...expandKeys(strategyRuntime['ja-JP']), ai_chat: {...aiChat['en-US'],...aiChat['ja-JP']} },
    'ko-KR': { ...mergeLocale(koKR, expandKeys(completeness['ko-KR'])), professional_report: professionalReport['ko-KR'], v2: v2['ko-KR'], audit: audit['ko-KR'], account_ui: accountUi['ko-KR'], profile_detail: profileDetail['ko-KR'], live_detail: liveDetail['ko-KR'], appearance: appearance['ko-KR'], ...expandKeys(eventRadar['ko-KR']), ...expandKeys(strategyRuntime['ko-KR']), ai_chat: {...aiChat['en-US'],...aiChat['ko-KR']} }
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
