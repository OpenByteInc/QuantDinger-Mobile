import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import enUS from '../../src/locales/en-US.js'
import jaJP from '../../src/locales/ja-JP.js'
import koKR from '../../src/locales/ko-KR.js'
import zhCN from '../../src/locales/zh-CN.js'
import zhTW from '../../src/locales/zh-TW.js'

const locales = { 'en-US': enUS, 'ja-JP': jaJP, 'ko-KR': koKR, 'zh-CN': zhCN, 'zh-TW': zhTW }
const keys = [
  'pay_method_title',
  'pay_method_desc',
  'pay_card_stripe',
  'pay_method_usdt_title',
  'pay_method_usdt_desc',
  'pay_method_usdc_title',
  'pay_method_usdc_desc',
  'pay_method_card_title',
  'pay_method_card_desc',
  'pay_no_method',
  'pay_crypto_title',
  'pay_crypto_desc',
  'pay_no_chains_currency',
  'pay_stripe_success',
  'pay_stripe_popup_blocked',
  'pay_stripe_cancelled',
  'pay_loading_plans',
  'pay_load_failed',
  'pay_no_plans',
  'pay_choose_plan',
  'plan_monthly_name',
  'plan_monthly_desc',
  'plan_yearly_name',
  'plan_yearly_desc',
  'plan_lifetime_name',
  'plan_lifetime_desc'
]
const placeholders = value => Array.from(value.matchAll(/\{([^}]+)\}/g), match => match[1]).sort()

test('mobile payment flow is translated in every supported locale', () => {
  for (const [locale, messages] of Object.entries(locales)) {
    for (const key of keys) {
      const value = messages.profile[key]
      assert.equal(typeof value, 'string', `${locale} is missing profile.${key}`)
      assert.ok(value.trim(), `${locale}.profile.${key} must not be empty`)
      assert.deepEqual(placeholders(value), placeholders(enUS.profile[key]), `${locale}.profile.${key} must preserve placeholders`)
    }
  }
})

test('mobile Stripe checkout preserves the current page', () => {
  const source = readFileSync(new URL('../../src/views/profile/Credits.vue', import.meta.url), 'utf8')
  assert.match(source, /window\.open\('about:blank', '_blank'\)/)
  assert.match(source, /checkoutWindow\.location\.replace\(res\.data\.checkout_url\)/)
  assert.match(source, /Browser\.open\(\{ url: res\.data\.checkout_url/)
  assert.match(source, /window\.addEventListener\('focus', this\.handlePaymentResume\)/)
  assert.match(source, /browserFinished/)
  assert.doesNotMatch(source, /window\.location\.assign\(res\.data\.checkout_url\)/)
  assert.doesNotMatch(source, /__billing_audit/)
})
