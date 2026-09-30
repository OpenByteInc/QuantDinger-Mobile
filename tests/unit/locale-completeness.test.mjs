import assert from 'node:assert/strict'
import test from 'node:test'
import enUS from '../../src/locales/en-US.js'
import zhCN from '../../src/locales/zh-CN.js'
import zhTW from '../../src/locales/zh-TW.js'
import jaJP from '../../src/locales/ja-JP.js'
import koKR from '../../src/locales/ko-KR.js'
import completeness from '../../src/locales/completeness.js'
import appearance from '../../src/locales/appearance.js'
import professionalReport from '../../src/locales/professional-report.js'
import v2 from '../../src/locales/v2.js'
import audit from '../../src/locales/audit.js'
import accountUi from '../../src/locales/account-ui.js'
import profileDetail from '../../src/locales/profile-detail.js'
import aiChat from '../../src/locales/ai-chat.js'
import eventRadar from '../../src/locales/event-radar.js'
import strategyRuntime from '../../src/locales/strategy-runtime.js'
import liveDetail from '../../src/locales/live-detail.js'
import referralRewards from '../../src/locales/referral-rewards.js'

const locales = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']

const flatten = (value, prefix = '', target = {}) => {
  Object.entries(value || {}).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, target)
    else target[path] = child
  })
  return target
}

const baseLocales = { 'zh-CN': zhCN, 'zh-TW': zhTW, 'en-US': enUS, 'ja-JP': jaJP, 'ko-KR': koKR }
const modules = { appearance, professionalReport, v2, audit, accountUi, profileDetail, aiChat, eventRadar, strategyRuntime, liveDetail, referralRewards }

test('all base locales cover every English key', () => {
  const expected = Object.keys(flatten(enUS))
  locales.forEach((locale) => {
    const actual = { ...flatten(baseLocales[locale]), ...completeness[locale] }
    const missing = expected.filter((key) => !(key in actual))
    assert.deepEqual(missing, [], `${locale} is missing: ${missing.join(', ')}`)
  })
})

test('all modular locale bundles have matching keys', () => {
  Object.entries(modules).forEach(([name, bundle]) => {
    const expected = Object.keys(flatten(bundle['en-US']))
    locales.forEach((locale) => {
      const actual = flatten(bundle[locale])
      const missing = expected.filter((key) => !(key in actual))
      assert.deepEqual(missing, [], `${name}/${locale} is missing: ${missing.join(', ')}`)
    })
  })
})
