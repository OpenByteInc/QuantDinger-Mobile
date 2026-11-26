import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { computed, defineComponent, reactive } from 'vue'
import messages from '../../src/locales/forthright.js'

function setupState () {
  const source = readFileSync(new URL('../../src/views/trading/CreateStrategy.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'component =')
  const scope = { defineComponent, SymbolPicker: {}, useCredentialsStore: () => ({ items: [] }) }
  runInNewContext(script, scope)
  const options = scope.component
  const state = reactive({ ...options.data(), $t: key => key })
  for (const [key, method] of Object.entries(options.methods)) state[key] = method.bind(state)
  for (const [key, getter] of Object.entries(options.computed)) {
    const value = computed(() => getter.call(state))
    Object.defineProperty(state, key, { get: () => value.value })
  }
  return state
}

test('market computed values update without enabling futures live deployment', () => {
  const state = setupState()
  for (const [market, symbol, currency, live] of [
    ['USStock', 'AAPL', 'USD', true], ['HKStock', '00700.HK', 'HKD', true],
    ['CNStock', '600000', 'CNY', false], ['Futures', 'MESZ26', '', false]
  ]) {
    state.manifest = { markets: [market], universe: { instruments: [{ market, symbol }] } }
    assert.equal(state.marketCategory, market)
    assert.equal(state.capitalCurrency, currency)
    assert.equal(state.supportsLive, live)
    assert.equal(state.requiresDirectionMode, market === 'Futures')
    assert.equal(state.requiresHedgeAccount, false)
  }
})

test('crypto hedge requirements remain tied to swap contracts and direction', () => {
  const state = setupState()
  state.manifest = { markets: ['Crypto'], universe: { instruments: [{ market: 'Crypto', symbol: 'BTC/USDT', market_type: 'swap' }] } }
  state.form.directionMode = 'both'
  assert.equal(state.capitalCurrency, 'USDT')
  assert.equal(state.requiresDirectionMode, true)
  assert.equal(state.requiresHedgeAccount, true)
  state.form.directionMode = 'long_only'
  assert.equal(state.requiresHedgeAccount, false)
  state.manifest.universe.instruments[0].market_type = 'spot'
  assert.equal(state.requiresDirectionMode, false)
})

test('trading credential field labels remain available in all locales', () => {
  for (const labels of Object.values(messages)) {
    assert.ok(labels['brokerAccounts.forthright.tradingCredentialLabel'])
  }
  const form = readFileSync(new URL('../../src/views/profile/CredentialForm.vue', import.meta.url), 'utf8')
  assert.ok(form.includes("$t('brokerAccounts.forthright.tradingCredentialLabel')"))
  assert.ok(form.includes('type="password"'))
})
