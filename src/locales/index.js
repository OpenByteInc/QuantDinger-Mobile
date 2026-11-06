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
import strategyRuntime from './strategy-runtime'
import liveDetail from './live-detail'
import appearance from './appearance'
import completeness from './completeness'
import referralRewards from './referral-rewards'
import exchangeAccountErrors from './exchange-account-errors'
import brokerMobile, { brokerAccountMessages } from './broker-mobile'
import mobileParity from './mobile-parity'
import strategyLaunch from './strategy-launch'
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

const withExchangeAccountErrors = (base, locale) => mergeLocale(
  mergeLocale(base, expandKeys(exchangeAccountErrors[locale])),
  expandKeys(brokerAccountMessages[locale])
)

const buildLocale = (base, locale) => {
  let result = withExchangeAccountErrors(base, locale)
  result = mergeLocale(result, {
    professional_report: professionalReport[locale],
    broker_mobile: brokerMobile[locale],
    v2: v2[locale],
    audit: audit[locale],
    account_ui: accountUi[locale],
    profile_detail: profileDetail[locale],
    referral_rewards: referralRewards[locale],
    live_detail: liveDetail[locale],
    appearance: appearance[locale],
    ai_chat: { ...aiChat['en-US'], ...aiChat[locale] }
  })
  result = mergeLocale(result, expandKeys(strategyRuntime[locale]))
  result = mergeLocale(result, expandKeys(mobileParity[locale]))
  return mergeLocale(result, expandKeys(strategyLaunch[locale]))
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': buildLocale(zhCN, 'zh-CN'),
    'zh-TW': buildLocale(mergeLocale(zhTW, expandKeys(completeness['zh-TW'])), 'zh-TW'),
    'en-US': buildLocale(enUS, 'en-US'),
    'ja-JP': buildLocale(mergeLocale(jaJP, expandKeys(completeness['ja-JP'])), 'ja-JP'),
    'ko-KR': buildLocale(mergeLocale(koKR, expandKeys(completeness['ko-KR'])), 'ko-KR')
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
