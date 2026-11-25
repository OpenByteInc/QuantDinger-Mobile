import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('recommended is the default for both assets and is sent unchanged to the backend', async () => {
  const source = read('src/views/market/index.vue')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'result =')
  const requests = []
  const scope = { ASSET_TYPES: { INDICATOR: 'indicator', SCRIPT_TEMPLATE: 'script_template' },
    marketApi: { getIndicators: async params => { requests.push(params); return { data: { items: [], total: 0 } } } } }
  vm.runInNewContext(script, scope)
  const options = scope.result
  const instance = { $t: key => key }
  for (const [key, fn] of Object.entries(options.methods)) instance[key] = fn.bind(instance)
  Object.assign(instance, options.data.call(instance))
  for (const assetType of ['indicator', 'script_template']) {
    instance.assetType = assetType
    instance.isStrategyAsset = assetType === 'script_template'
    instance.sort = instance.defaultSortFor(assetType)
    await instance.loadPage()
    assert.equal(requests.at(-1).sort_by, 'recommended')
    const choices = options.computed.sortColumns.call(instance).map(item => item.value)
    assert.ok(choices.includes('recommended'))
    assert.ok(choices.includes('hot'))
    if (instance.isStrategyAsset) assert.ok(choices.includes('score'))
  }
  instance.sort = 'score'
  await instance.loadPage()
  assert.equal(requests.at(-1).sort_by, 'score')
})

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
  assert.doesNotMatch(detail, /source_controlled/)
  assert.match(detail, /hasStrategyContractMetadata/)
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
