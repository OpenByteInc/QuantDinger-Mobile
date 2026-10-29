import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import {
  brokerCurrency,
  DIRECT_OPENAPI_BROKER_IDS,
  HK_STOCK_BROKER_IDS,
  STOCK_BROKER_IDS,
  US_STOCK_BROKER_IDS
} from '../../src/constants/exchanges.js'
import strategyMessages from '../../src/locales/strategy-runtime.js'
import { translateStrategyRuntimeMessage } from '../../src/utils/strategyLogs.js'
import { apiErrorMessage } from '../../src/utils/apiError.js'

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('Tiger and Webull are recognized as stock brokers with market currencies', () => {
  assert.deepEqual(STOCK_BROKER_IDS, ['alpaca', 'ibkr', 'tiger', 'webull'])
  assert.deepEqual(DIRECT_OPENAPI_BROKER_IDS, ['tiger', 'webull'])
  assert.equal(US_STOCK_BROKER_IDS.has('tiger'), true)
  assert.equal(US_STOCK_BROKER_IDS.has('webull'), true)
  assert.equal(HK_STOCK_BROKER_IDS.has('tiger'), true)
  assert.equal(HK_STOCK_BROKER_IDS.has('webull'), false)
  assert.equal(brokerCurrency('tiger', 'USStock'), 'USD')
  assert.equal(brokerCurrency('tiger', 'HKStock'), 'HKD')
})

test('mobile broker API covers connection, account, positions, orders and trading', () => {
  const api = source('src/api/index.js')
  for (const endpoint of ['accounts', 'status', 'connect', 'disconnect', 'account', 'positions', 'orders', 'fills']) {
    assert.match(api, new RegExp(`${endpoint}:.*brokerRequest`, 's'))
  }
  assert.match(api, /placeOrder:.*'order'/s)
  assert.match(api, /cancelOrder:.*`order\/\$\{encodeURIComponent\(orderId\)\}`/s)
})

test('broker error envelopes retain their localizable error key', () => {
  assert.equal(apiErrorMessage({ success: false, error: 'brokerAccounts.notConnected' }), 'brokerAccounts.notConnected')
})

test('mobile account and quick-trade screens use the direct broker contract', () => {
  const form = source('src/views/profile/CredentialForm.vue')
  const detail = source('src/views/profile/CredentialDetail.vue')
  const panel = source('src/components/StockTradePanel.vue')
  assert.match(form, /brokerApi\.connect/)
  assert.match(form, /private_key/)
  assert.match(form, /app_secret/)
  for (const method of ['account', 'positions', 'orders', 'fills']) assert.match(detail, new RegExp(`brokerApi\.${method}`))
  assert.match(panel, /brokerApi\.placeOrder/)
  assert.match(panel, /brokerApi\.cancelOrder/)
  assert.match(panel, /HK_STOCK_BROKER_IDS/)
})

test('desktop-created stock strategies remain selectable and actionable on mobile', () => {
  const create = source('src/views/trading/CreateStrategy.vue')
  const detail = source('src/views/trading/StrategyDetail.vue')
  assert.match(create, /\['alpaca', 'ibkr', 'tiger', 'webull'\]/)
  assert.match(create, /marketCategory === 'HKStock'.*exchange === 'tiger'/s)
  assert.match(create, /\['Crypto', 'USStock', 'HKStock'\]/)
  assert.match(detail, /runtimeErrorText/)
  assert.match(detail, /strategyApi\.stop/)
  assert.match(detail, /activeTab = 'logs'/)
})

test('research intelligence and cross-asset brief use collapsible mobile cards', () => {
  const report = source('src/components/ProfessionalAnalysisReport.vue')
  assert.match(report, /research_intelligence/)
  assert.match(report, /research_brief/)
  assert.match(report, /van-collapse-item.*broker_mobile\.researchBrief/)
  assert.match(report, /van-collapse-item.*broker_mobile\.researchIntelligence/)
  assert.match(report, /missing_required_capabilities/)
  assert.match(report, /missing_optional_capabilities/)
})

test('Tiger and Webull runtime failures are localized like existing brokers', () => {
  const translate = (key, params = {}) => {
    let value = strategyMessages['en-US'][key] || key
    for (const [name, replacement] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(replacement))
    return value
  }
  for (const broker of ['Tiger', 'Webull']) {
    const raw = `${broker} order failed: insufficient buying power`
    const localized = translateStrategyRuntimeMessage(raw, translate)
    assert.notEqual(localized, raw)
    assert.match(localized, /balance|margin/i)
  }
})
