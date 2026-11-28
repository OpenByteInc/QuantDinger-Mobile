import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { mergeStreamBar, reconcileChartSnapshot } from '../../src/utils/chartStream.js'

const chart = fs.readFileSync(new URL('../../src/views/indicator/Chart.vue', import.meta.url), 'utf8')
const candle = (timestamp, close = 100) => ({ timestamp, open: 100, high: Math.max(close, 100), low: 90, close, volume: 10 })

test('slow chart snapshots preserve all new candles and the latest tick while repairing history', () => {
  const rows = reconcileChartSnapshot([candle(60000, 110), candle(120000, 111)],
    [candle(60000), candle(120000), candle(180000, 115), candle(240000, 120)], candle(240000, 121))
  assert.deepEqual(rows.map(row => row.close), [110, 111, 115, 121])
  assert.deepEqual(rows.map(row => row.timestamp), [60000, 120000, 180000, 240000])
})

test('new candles refresh indicators without close flags and close/append do not double refresh', () => {
  let callbacks
  const loads = []
  const context = vm.createContext({
    stopStream() {}, pageActive: true, document: { hidden: false }, form: { market: 'Crypto', symbol: 'BTC/USDT', timeframe: '1m' },
    selectedInstrumentId: { value: '' }, streamGeneration: 1, lastScheduledClosedBar: 0,
    ExchangeKlineWs: class { connect(_symbol, _timeframe, handlers) { callbacks = handlers; return true } },
    chartData: { value: { candles: [candle(60000)] } }, updated: { value: 0 },
    mergeStreamBar, clearStreamFallback() {}, scheduleChartBar() {}, loadChart: (...args) => loads.push(args),
    setTimeout: () => 1
  })
  vm.runInContext(chart.slice(chart.indexOf('function startStream(){'), chart.indexOf('function requestRecovery()')) + '\nthis.start = startStream', context)
  context.start()
  callbacks.onTick(candle(120000))
  assert.deepEqual(loads, [[true, true]])
  callbacks.onTick({ ...candle(120000, 105), isClosed: true })
  callbacks.onTick(candle(180000))
  callbacks.onTick(candle(180000, 110))
  callbacks.onTick(candle(60000, 90))
  assert.equal(context.pendingBar.timestamp, 180000)
  assert.equal(context.pendingBar.close, 110)
  assert.equal(loads.length, 2)
})

test('a close received during preview computation queues one follow-up instead of losing the signal refresh', async () => {
  let respond
  const queued = []; const applied = []
  const context = vm.createContext({
    chartContextSignature: () => 'same', snapshotContext: () => 'same', displayedChartContext: { value: 'same' },
    chartData: { value: { candles: [candle(60000), candle(120000, 120)] } }, chartRefreshing: { value: false },
    loading: { value: false }, error: { value: '' }, request: 0, activeChartRequestContext: '',
    queuedChartLoad: false, queuedChartLoadSilent: true,
    form: { indicatorId: 1, market: 'Crypto', params: {} }, parameters: { value: [] }, selectedInstrumentId: { value: '' },
    indicatorApi: { previewChart: () => new Promise(resolve => { respond = resolve }) },
    pendingBar: candle(120000, 121), lastTick: Number.MAX_SAFE_INTEGER, reconcileChartSnapshot,
    toCandles: rows => rows, applyChartData: data => applied.push(data), queueMicrotask: callback => queued.push(callback)
  })
  vm.runInContext(chart.slice(chart.indexOf('async function loadChart('), chart.indexOf('async function selectIndicator(')) + '\nthis.load = loadChart', context)
  const first = context.load(true)
  await context.load(true, true)
  await context.load(true, true)
  respond({ data: { candles: [candle(60000, 110)] } })
  await first
  assert.equal(queued.length, 1)
  assert.deepEqual(Array.from(applied[0].candles, row => row.close), [110, 121])
})

test('replacing the chart cancels the old pending animation frame', () => {
  const cancelled = []
  const context = vm.createContext({ chartFrame: 7, pendingChartBar: candle(60000), cancelAnimationFrame: id => cancelled.push(id) })
  const start = chart.indexOf('function clearScheduledChartBar()')
  const end = chart.indexOf('\nfunction flushChartBar()', start)
  vm.runInContext(chart.slice(start, end) + '\nclearScheduledChartBar()', context)
  assert.deepEqual(cancelled, [7])
  assert.equal(context.pendingChartBar, null)
  assert.equal(context.chartFrame, null)
  assert.match(chart, /function applyChartData[^]*?clearScheduledChartBar\(\)/)
})

test('background account refresh stays ready, but a failed balance read blocks trading', async () => {
  const source = fs.readFileSync(new URL('../../src/components/ChartTradePanel.vue', import.meta.url), 'utf8')
  const method = source.slice(source.indexOf('    async refreshTradeData()'), source.indexOf('    orderBookFeedContext()'))
  let resolveBalance; let rejectBalance
  const context = vm.createContext({ quickTradeApi: {
    getBalance: () => new Promise((resolve, reject) => { resolveBalance = resolve; rejectBalance = reject }),
    getHistory: async () => ({ data: [] }), getPosition: async () => ({ data: [] })
  }, balanceIssue: () => '' })
  const component = vm.runInContext(`({${method}})`, context)
  const state = { selectedCredentialId: 1, selectedCredential: {}, isCrypto: true, marketType: 'spot', normalizedSymbol: 'BTC/USDT',
    contextKey: JSON.stringify([1, 'spot', 'BTC/USDT', '', '', '']), requestId: 0, balanceReady: true,
    updateStoreIfChanged() {}, pruneMarketOrderConfirmations() {}, $t: key => key }
  let pending = component.refreshTradeData.call(state)
  assert.equal(state.balanceReady, true)
  resolveBalance({ data: { available: 100 } }); await pending
  assert.equal(state.balanceReady, true)
  pending = component.refreshTradeData.call(state)
  rejectBalance(new Error('offline')); await pending
  assert.equal(state.balanceReady, false)
  pending = component.refreshTradeData.call(state)
  assert.equal(state.balanceReady, false)
  resolveBalance({ data: { available: 100 } }); await pending
  assert.equal(state.balanceReady, true)
})
