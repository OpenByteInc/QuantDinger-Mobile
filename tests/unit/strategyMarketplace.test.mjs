import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('mobile strategy market uses the same compatibility filter contract', () => {
  const source = read('src/views/market/index.vue')
  for (const parameter of ['market', 'market_type', 'binding_mode', 'strategy_type', 'direction_mode', 'leverage']) {
    assert.match(source, new RegExp(`${parameter}`))
  }
  assert.doesNotMatch(source, /key: 'timeframe'/)
  assert.match(source, /activeStrategyFilterCount/)
})

test('mobile strategy marketplace exposes execution and confirmation cadence', () => {
  const list = read('src/views/market/index.vue')
  const detail = read('src/views/market/Detail.vue')
  for (const field of ['execution_mode', 'execution_frequency', 'confirmation_frequencies']) {
    assert.match(list + detail, new RegExp(field))
  }
  assert.match(list + detail, /marketplace_contract/)
})

test('mobile strategy adaptation checks compatibility and preserves the backtest gate', () => {
  const detail = read('src/views/market/Detail.vue')
  const api = read('src/api/index.js')
  const create = read('src/views/trading/CreateStrategy.vue')

  assert.match(api, /\/compatibility/)
  assert.match(api, /\/adapt/)
  assert.match(detail, /adaptationResult\?\.compatible/)
  assert.match(create, /requiresBacktest/)
  assert.match(create, /adaptation_backtest_required/)
})
