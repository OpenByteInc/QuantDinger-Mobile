import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const chartView=readFileSync(new URL('../../src/views/indicator/Chart.vue',import.meta.url),'utf8')
const marketChart=readFileSync(new URL('../../src/components/MarketChart.vue',import.meta.url),'utf8')
const tradePanel=readFileSync(new URL('../../src/components/ChartTradePanel.vue',import.meta.url),'utf8')
const stores=readFileSync(new URL('../../src/stores/index.js',import.meta.url),'utf8')

test('indicator chart avoids repeated full previews while the stream is healthy',()=>{
  assert.doesNotMatch(chartView,/Date\.now\(\)-lastPreview/)
  assert.match(chartView,/if\(!healthy\)requestRecovery\(\)/)
  assert.match(chartView,/if\(bar\.isClosed\)void loadChart\(true\)/)
  assert.match(chartView,/silent&&nextContext===activeChartRequestContext/)
})

test('indicator chart warms from fast candles and suppresses transient empty-data toasts',()=>{
  assert.match(chartView,/warmBaseChart\(\)/)
  assert.match(chartView,/readChartSnapshot\(snapshotContext\(\)\)/)
  assert.match(chartView,/localStorage\.getItem\(CHART_SNAPSHOT_KEY\)/)
  assert.match(chartView,/quickTradeStore\.exchangeId/)
  assert.match(chartView,/suppressErrorToast:true/)
  assert.match(chartView,/!chartData\.value\?\.candles\?\.length/)
  assert.match(tradePanel,/quickTradeStore\.setExchangeId\(exchangeId\)/)
  assert.match(stores,/quick_trade_exchange_id/)
})

test('derived price charts update price data without rebuilding indicators on every tick',()=>{
  assert.match(marketChart,/usesDerivedPriceBars\(props\.chartType\)\)refreshPriceData\(\)/)
  assert.match(marketChart,/priceFrame=requestAnimationFrame/)
  assert.doesNotMatch(marketChart,/usesDerivedPriceBars\(props\.chartType\)\)render\(\)/)
})

test('order book uses a live stream with lightweight REST fallback independent from account polling',()=>{
  assert.match(tradePanel,/connectOrderBookStream\(\)/)
  assert.match(tradePanel,/orderBookUsingRestFallback=true/)
  assert.match(tradePanel,/orderBookTimer=window\.setInterval\([^;]+,2000\)/)
  assert.match(tradePanel,/pollTimer=window\.setInterval\([^;]+,10000\)/)
  const refreshBody=tradePanel.match(/async refreshTradeData\(\) \{([\s\S]*?)\n    \},\n    async refreshOrderBook/)?.[1]||''
  assert.doesNotMatch(refreshBody,/this\.refreshOrderBook\(\)/)
  assert.match(tradePanel,/updateStoreIfChanged\('positions'/)
  assert.match(tradePanel,/transition:width \.32s ease-out/)
})

test('quick trade renders a compact side-by-side five-level order book',()=>{
  assert.match(tradePanel,/orderBookAskRows/)
  assert.match(tradePanel,/orderBookBidRows/)
  assert.match(tradePanel,/class="depth-mid"/)
  assert.match(tradePanel,/class="depth-columns"/)
  assert.match(tradePanel,/slice\(0,5\)/)
  assert.match(tradePanel,/Math\.sqrt\(size\/this\.orderBookDepthMax\)/)
  assert.match(tradePanel,/chart_trade\.sell/)
  assert.match(tradePanel,/chart_trade\.buy/)
})
