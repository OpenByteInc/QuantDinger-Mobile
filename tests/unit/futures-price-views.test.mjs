import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { formatFuturesPrice, futuresPriceDecimals } from '../../src/utils/futuresPricePrecision.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
function options(path) {
  const script = read(path).match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'component =')
  const scope = { formatFuturesPrice, SymbolPicker: {}, QuantCat: {}, ResearchChart: {} }
  runInNewContext(script, scope)
  return scope.component
}

const instruments = [
  ['6AZ26', 0.66549999, '0.66550'],
  ['6JZ26', 0.0066555, '0.0066555'],
  ['6EZ26', 1.05355, '1.05355'],
  ['MESZ26', 7314, '7,314.00']
]

test('AI quote header, report price and history use the contract identity', () => {
  const hub = options('src/views/ai-hub/index.vue').methods
  const report = options('src/components/ProfessionalAnalysisReport.vue').methods
  const history = options('src/views/ai-analysis/History.vue').methods
  for (const [symbol, price, expected] of instruments) {
    const view = { context: { market: 'Futures', symbol }, instrument: { market: 'Futures', symbol }, $i18n: { locale: 'en-US' } }
    assert.equal(hub.formatMarketPrice.call(view, price), expected)
    assert.equal(report.formatPrice.call(view, price), expected)
    assert.equal(history.formatNumber.call(view, price, 'Futures', symbol), expected)
  }
  assert.match(read('src/views/ai-analysis/History.vue'), /formatNumber\(item.price, item.market, item.symbol\)/)
  const view = { instrument: { market: 'Futures', canonical_symbol: '6JZ26' }, $i18n: { locale: 'de-DE' } }
  assert.equal(report.formatPrice.call(view, 0.0066555), '0,0066555')
})

test('watchlist and chart header retain futures precision and legacy fallbacks', () => {
  const watchlist = read('src/views/v2/StrategyHub.vue')
  const code = watchlist.match(/function formatPrice\(value, market, symbol\) \{[\s\S]*?\n\}/)[0]
  const scope = { formatFuturesPrice, locale: { value: 'en-US' } }
  runInNewContext(`${code}\nformatter = formatPrice`, scope)
  assert.match(watchlist, /formatPrice\(item.price, item.market, item.symbol\)/)
  const chart = read('src/views/indicator/Chart.vue')
  const priceFunction = chart.match(/^const price=(.+)$/m)[1]
  for (const [symbol, price, expected] of instruments) {
    assert.equal(scope.formatter(price, 'Futures', symbol), expected)
    const chartScope = { ...scope, form: { market: 'Futures', symbol } }
    runInNewContext(`formatter = ${priceFunction}`, chartScope)
    assert.equal(chartScope.formatter(price), expected)
    assert.equal(chartScope.formatter(null), '—')
  }
  assert.equal(scope.formatter(0.123456, 'Crypto', 'BTC/USDT'), '0.123456')
  assert.equal(scope.formatter(65.75, 'HKStock', '03690'), '65.75')
  assert.equal(scope.formatter(null, 'Futures', '6AZ26'), '—')
  assert.equal(scope.formatter(0.12345678, 'Futures', 'UNKNOWNZ26'), '0.123457')
})

test('chart axes reset contract precision on symbol changes and account quotes carry symbol', () => {
  const chart = read('src/components/MarketChart.vue')
  assert.match(read('src/views/indicator/Chart.vue'), /:market="form.market" :symbol="form.symbol"/)
  assert.match(chart, /setPriceVolumePrecision\(futuresPriceDecimals\(props.market,props.symbol\)\?\?2,chart.getPriceVolumePrecision\(\).volume\)/)
  assert.match(chart, /watch\(\(\)=>\[props.data,props.market,props.symbol,props.main,props.lower\],render/)
  assert.match(read('src/views/profile/CredentialDetail.vue'), /accountPrice\(value,locale.value,row.market,row.symbol\)/)
})

test('the chart render resets price precision while preserving volume precision', () => {
  const code = read('src/components/MarketChart.vue').match(/function render\(\)\{[\s\S]*?\n\}/)[0]
  let precision = { price: 2, volume: 4 }
  const scope = {
    futuresPriceDecimals,
    props: { market: 'Futures', symbol: '6JZ26', data: null },
    chart: {
      getPriceVolumePrecision: () => precision,
      setPriceVolumePrecision: (price, volume) => { precision = { price, volume } },
      removeIndicator() {},
      applyNewData() {}
    },
    toCandles: () => [], buildPriceChartData: () => [], captureChartViewport: () => null,
    renderVersion: 0, customPanes: [], overlays: []
  }
  runInNewContext(`${code}\nrender()`, scope)
  assert.deepEqual(precision, { price: 7, volume: 4 })
  for (const [market, symbol, expected] of [
    ['Futures', '6AZ26', 5], ['Futures', 'MNQZ26', 2],
    ['Futures', 'UNKNOWNZ26', 2], ['USStock', 'MSFT', 2], ['Crypto', 'BTC/USDT', 2]
  ]) {
    Object.assign(scope.props, { market, symbol })
    runInNewContext('render()', scope)
    assert.deepEqual(precision, { price: expected, volume: 4 })
  }
})
