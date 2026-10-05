import assert from 'node:assert/strict'
import test from 'node:test'

import messages from '../../src/locales/strategy-runtime.js'
import { translateStrategyRuntimeMessage } from '../../src/utils/strategyLogs.js'

const render = (locale, message) => translateStrategyRuntimeMessage(message, (key, params = {}) => {
  let value = messages[locale][key] || key
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
})

test('localizes invalid Binance symbols without implying an exchange submission', () => {
  const raw = 'Leverage or margin-mode setup failed for XAUT/USDT: Binance margin mode setup failed: Binance HTTP 400: {"code":-1121,"msg":"Invalid symbol."}'
  for (const locale of Object.keys(messages)) {
    const localized = render(locale, raw)
    assert.notEqual(localized, raw)
    assert.match(localized, /XAUT\/USDT/)
  }
  assert.match(render('zh-CN', raw), /订单未提交/)
})

test('localizes queued orders and position-mode requirements', () => {
  const queued = 'Order queued: open_long XAUT/USDT quantity=0.2294 pending_id=154712 client_order_id=test'
  assert.match(render('zh-CN', queued), /本地执行队列/)
  assert.match(render('en-US', queued), /not yet confirmed by the exchange/)

  const modeError = 'strategyV2.dualDirectionHedgeModeRequired:binance_one_way_mode'
  assert.match(render('zh-CN', modeError), /双向持仓模式/)
  assert.match(render('en-US', modeError), /Hedge Mode/)
})

test('localizes common exchange failures while keeping raw details separate', () => {
  const examples = [
    [
      'Auto-stopped (position_sync_binance): Binance HTTP 401: {"code":-2015,"msg":"Invalid API-key, IP, or permissions for action"}',
      /自动停止/
    ],
    [
      'Exchange order failed (gate BTC/USDT close_short): Gate HTTP 400: {"label":"MARKET_PRICE_TOO_DEVIATED","message":"price deviates too much"}',
      /价格保护/
    ],
    [
      'Exchange order failed (gate BTC/USDT open_short): Gate HTTP 400: {"label":"INSUFFICIENT_AVAILABLE","message":"margin 950 while available 800"}',
      /余额或保证金不足/
    ]
  ]
  for (const [raw, expected] of examples) {
    const localized = render('zh-CN', raw)
    assert.notEqual(localized, raw)
    assert.match(localized, expected)
  }

  const structured = {
    category: 'order_size',
    exchange: 'okx',
    context: 'okx BTC/USDT open_long'
  }
  const localized = translateStrategyRuntimeMessage(
    'future backend wording',
    (key, params = {}) => {
      let value = messages['en-US'][key] || key
      for (const [name, replacement] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(replacement))
      return value
    },
    structured
  )
  assert.match(localized, /quantity or precision/)
})
