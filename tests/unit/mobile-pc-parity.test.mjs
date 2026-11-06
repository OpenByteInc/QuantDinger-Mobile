import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  applyStrategyRuntimeConfigToCode,
  buildScriptCodeWithParamValues,
  extractScriptParamsFromCode,
  extractStrategyRuntimeConfigFromCode,
  extractStrategyRuntimeContractFromCode,
  sanitizeRuntimeConfigForSource
} from '../../src/utils/strategyRuntimeSource.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('watchlist picker distinguishes the runtime selection from watchlist membership', () => {
  const source = read('../../src/components/SymbolPicker.vue')
  const api = read('../../src/api/index.js')
  assert.match(source, /teleport="body"/)
  assert.match(source, /this\.autoAdd && !this\.isInWatchlist/)
  assert.match(source, /return Boolean\(this\.selectedSymbol\)/)
  assert.doesNotMatch(source, /return current \|\| this\.isInWatchlist\(item\)/)
  assert.match(source, /await showConfirmDialog/)
  assert.match(source, /watchlist\.remove_confirm/)
  assert.match(source, /groupWatchlistAssets\(supported\)/)
  assert.match(source, /limit: 60/)
  assert.match(source, /watchlistPayload\(item\)/)
  assert.match(api, /\/api\/market\/assets\/search/)
  assert.doesNotMatch(api, /\/api\/market\/symbols\/search/)
})

test('market home loads each data region independently and shows global indices', () => {
  const source = read('../../src/views/v2/StrategyHub.vue')
  const api = read('../../src/api/index.js')
  assert.match(source, /loadStrategies\(\)/)
  assert.match(source, /loadPortfolio\(\)/)
  assert.match(source, /loadWatchlist\(\)/)
  assert.match(source, /loadGlobalIndices\(\)/)
  assert.doesNotMatch(source, /Promise\.allSettled/)
  assert.match(source, /qd-mobile-global-indices/)
  assert.match(api, /\/api\/global-market\/overview/)
})

test('market home paginates the complete watchlist instead of truncating it', () => {
  const source = read('../../src/views/v2/StrategyHub.vue')
  assert.match(source, /const WATCHLIST_PAGE_SIZE = 20/)
  assert.match(source, /watchlistPageCount/)
  assert.match(source, /slice\(start, start \+ WATCHLIST_PAGE_SIZE\)/)
  assert.doesNotMatch(source, /watchlist\.value\.slice\(0, 3\)/)
})

test('mobile quick trade requests and renders the shared order-book contract', () => {
  const api = read('../../src/api/index.js')
  const panel = read('../../src/components/ChartTradePanel.vue')
  assert.match(api, /getOrderBook/)
  assert.match(api, /\/api\/quick-trade\/order-book/)
  assert.match(panel, /refreshOrderBook/)
  assert.match(panel, /orderBookBidShare/)
  assert.match(panel, /chart_trade\.liquidity_title/)
  assert.match(panel, /class="liquidity-status"/)
  assert.match(panel, /v-if="orderBookError \|\| orderBookUsingRestFallback"/)
  assert.doesNotMatch(panel, /class="pressure-cat/)
  assert.match(panel, /linear-gradient\(90deg,var\(--v2-green\) 0 50%,var\(--v2-red\) 50% 100%\)/)
  assert.doesNotMatch(panel, /\.inline-activity\{border-top:6px/)
})

test('strategy runtime target updates instrument, product, exchange and timeframe safely', () => {
  const source = `INSTRUMENT = "Crypto:BTC/USDT@okx:swap"
TIMEFRAME = "1h"
exchange_id = "okx"
context.allow_leverage(5)
context.subscribe(INSTRUMENT, frequency="1h")
context.get_history(INSTRUMENT, "1h", 200)`
  const contract = extractStrategyRuntimeContractFromCode(source)
  assert.equal(contract.hasInstrument, true)
  assert.equal(contract.hasProduct, true)
  assert.equal(contract.hasTimeframe, true)
  assert.equal(contract.hasExchange, true)

  const updated = applyStrategyRuntimeConfigToCode(source, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    market_type: 'spot',
    exchange_id: 'binance',
    timeframe: '15m'
  })
  const config = extractStrategyRuntimeConfigFromCode(updated)
  assert.deepEqual(config, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    market_type: 'spot',
    exchange_id: 'binance',
    timeframe: '15m'
  })
  assert.match(updated, /# runtime_product_leverage: context\.allow_leverage\(5\)/)
  assert.match(updated, /frequency="15m"/)
  assert.match(updated, /get_history\(INSTRUMENT, "15m", 200\)/)
})

test('strategy form exposes the runtime target without mutating it before save', () => {
  const source = read('../../src/views/trading/CreateStrategy.vue')
  assert.match(source, /runtimeDirty/)
  assert.match(source, /persistRuntimeSource/)
  assert.match(source, /await this\.persistRuntimeSource\(\)/)
  assert.match(source, /scriptSourceApi\.update/)
  assert.match(source, /auto-add="false"/)
})

test('mobile strategy parameters use the desktop parser and source writeback contract', () => {
  const code = `FAST = ctx.param("fast_period", 20, min=1, max=200, step=1)
TARGET = ctx.param("target_pct", 0.95, min=0, max=1, step=0.01)
# @strategy stopLossPct: 0.02`
  const contract = extractScriptParamsFromCode(code)
  assert.deepEqual(contract.params.map(item => [item.name, item.type, item.default]), [
    ['fast_period', 'integer', 20],
    ['target_pct', 'percent', 0.95],
    ['stopLossPct', 'percent', 0.02]
  ])
  const updated = buildScriptCodeWithParamValues(code, contract.params, {
    fast_period: 30,
    target_pct: 0.8,
    stopLossPct: 0.03
  })
  assert.match(updated, /ctx\.param\("fast_period", 30\)/)
  assert.match(updated, /ctx\.param\("target_pct", 0\.8\)/)
  assert.match(updated, /@strategy stopLossPct: 0\.03/)
  assert.deepEqual(
    sanitizeRuntimeConfigForSource({ strategy_family: 'grid', executor_type: 'grid', custom: 1 }, 'GRID_TEMPLATE_VERSION = 7'),
    { custom: 1 }
  )

  const source = read('../../src/views/trading/CreateStrategy.vue')
  assert.match(source, /extractScriptParamsFromCode/)
  assert.match(source, /sourceParameterValues\(\)/)
  assert.match(source, /metadata\.script_template_params/)
  assert.match(source, /lastRunConfig\.script_template_params/)
  assert.match(source, /applySourceDefinitionChanges/)
  assert.match(source, /buildScriptCodeWithParamValues/)
  assert.match(source, /Promise\.all\(\[\s*scriptSourceApi\.getDetail\(id\),\s*scriptSourceApi\.compile\(id\)/)
})

test('mobile parity translations merge into existing strategy copy instead of replacing it', () => {
  const source = read('../../src/locales/index.js')
  assert.match(source, /mergeLocale\(result, expandKeys\(strategyRuntime\[locale\]\)\)/)
  assert.match(source, /mergeLocale\(result, expandKeys\(mobileParity\[locale\]\)\)/)
  assert.doesNotMatch(source, /\.\.\.expandKeys\(mobileParity/)
})

test('authenticated mobile users cannot remain on a blank login route', () => {
  const source = read('../../src/router/index.js')
  assert.match(source, /to\.name === 'Login' && userStore\.isLoggedIn/)
  assert.match(source, /redirect\.startsWith\('\/'\) && !redirect\.startsWith\('\/\/'\)/)
})
