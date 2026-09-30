import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import referralRewards from '../../src/locales/referral-rewards.js'

const pageSource = await readFile(new URL('../../src/views/profile/Referral.vue', import.meta.url), 'utf8')
const apiSource = await readFile(new URL('../../src/api/index.js', import.meta.url), 'utf8')
const localeSource = await readFile(new URL('../../src/locales/index.js', import.meta.url), 'utf8')

test('mobile referral activity exposes the reward summary and withdrawal API', () => {
  assert.match(apiSource, /getReferralRewards/)
  assert.match(apiSource, /\/api\/billing\/referral-rewards/)
  assert.match(apiSource, /createReferralWithdrawal/)
  assert.match(apiSource, /\/api\/billing\/referral-rewards\/withdrawals/)
  assert.match(apiSource, /invalid_withdrawal_address: 'referral_rewards\.invalidAddress'/)
  assert.match(pageSource, /billingApi\.getReferralRewards/)
  assert.match(pageSource, /billingApi\.createReferralWithdrawal/)
})

test('reward-only UI is gated and contains three mobile record tabs', () => {
  assert.match(pageSource, /v-if="reward\.enabled"/)
  assert.match(pageSource, /activeTab === 'referrals'/)
  assert.match(pageSource, /activeTab === 'rewards'/)
  assert.match(pageSource, /activeTab === 'withdrawals'/)
  assert.match(pageSource, /referral_rewards\.referralsTab/)
  assert.match(pageSource, /referral_rewards\.rewardsTab/)
  assert.match(pageSource, /referral_rewards\.withdrawalsTab/)
})

test('withdrawal choices are derived from enabled backend channels', () => {
  assert.match(pageSource, /new Set\(this\.reward\.channels/)
  assert.match(pageSource, /channel\.currency === this\.withdrawal\.currency/)
  assert.match(pageSource, /this\.reward\.channels\.find/)
  assert.match(pageSource, /minimum_withdrawal/)
  assert.match(pageSource, /available_balance/)
})

test('referral reward translations are registered and complete for all mobile locales', () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']
  const englishKeys = Object.keys(referralRewards['en-US']).sort()
  for (const locale of locales) {
    assert.deepEqual(Object.keys(referralRewards[locale]).sort(), englishKeys)
    for (const key of englishKeys) assert.ok(String(referralRewards[locale][key]).trim(), `${locale}.${key}`)
    assert.match(localeSource, new RegExp(`referral_rewards: referralRewards\\['${locale}'\\]`))
  }
})
