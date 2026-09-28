import test from 'node:test'
import assert from 'node:assert/strict'
import ExchangeKlineWs, { resolveStreamConfig, parseGateSpotBar } from '../../src/utils/exchangeWs.js'
import { mergeStreamBar, streamIsFresh } from '../../src/utils/chartStream.js'

const bar = (timestamp, close = 100) => ({ timestamp, open: 100, high: 105, low: 95, close, volume: 12 })

test('stream updates replace the open candle, append the next candle, and reject stale or invalid updates', () => {
  const rows = [bar(60000)]
  assert.equal(mergeStreamBar(rows, bar(60000, 102), '1m'), 'updated')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].close, 102)
  assert.equal(mergeStreamBar(rows, bar(120000), '1m'), 'appended')
  assert.equal(mergeStreamBar(rows, bar(60000), '1m'), 'ignored')
  assert.equal(mergeStreamBar(rows, { ...bar(120000), volume: NaN }, '1m'), 'ignored')
  assert.equal(mergeStreamBar(rows, bar(300000), '1m'), 'gap')
  assert.equal(rows.length, 2)
})

test('stalled streams become eligible for same-venue REST refresh', () => {
  assert.equal(streamIsFresh(0, 10000), false)
  assert.equal(streamIsFresh(1000, 15999), true)
  assert.equal(streamIsFresh(1000, 16000), false)
})

test('derivative streams never silently use a spot or another exchange endpoint', () => {
  assert.match(resolveStreamConfig('binance', 'swap').buildUrl('BTC/USDT', '1h'), /^wss:\/\/fstream.binance.com\/ws\/btcusdt@kline_1h$/)
  assert.match(resolveStreamConfig('bybit', 'swap').buildUrl(), /\/linear$/)
  assert.match(resolveStreamConfig('bybit', 'spot').buildUrl(), /\/spot$/)
  assert.match(resolveStreamConfig('gate', 'swap').buildUrl(), /\/usdt$/)
  const messages=[]
  resolveStreamConfig('okx', 'swap').subscribe({send:value=>messages.push(JSON.parse(value))},'BTC/USDT','1H')
  assert.equal(messages[0].args[0].instId,'BTC-USDT-SWAP')
  assert.equal(resolveStreamConfig('htx', 'spot'), null)
  assert.ok(resolveStreamConfig('Gate.io', 'spot'))
})

test('Gate spot volume uses the base amount rather than quote turnover', () => {
  const row = parseGateSpotBar({ channel: 'spot.candlesticks', event: 'update', result: { t: '1790000000', o: '780', h: '790', l: '770', c: '785', v: '785000', a: '1000', w: false } })
  assert.equal(row.volume, 1000)
  assert.equal(row.timestamp, 1790000000000)
})

test('Gate perpetual batches select the latest candle and keep REST contract-volume units',()=>{
  const config=resolveStreamConfig('gate','swap')
  const row=config.parseBar({channel:'futures.candlesticks',event:'update',result:[{t:1790000060,o:'100',h:'105',l:'95',c:'102',v:'2000',a:'200000'},{t:1790000000,o:'99',h:'105',l:'95',c:'100',v:'4000'}]})
  assert.equal(row.volume,2000)
  assert.equal(row.timestamp,1790000060000)
})

test('subscription data, stale connection callbacks and timeouts are isolated', () => {
  const originals = Object.fromEntries(['WebSocket', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'].map(key => [key, globalThis[key]]))
  const timers = new Map(), sockets = []
  let timerId = 0, errors = 0
  class Socket {
    static OPEN = 1
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this) }
    send(value) { this.sent.push(JSON.parse(value)) }
    close() { this.readyState = 3 }
    open() { this.readyState = 1; this.onopen() }
  }
  const client = new ExchangeKlineWs(), ticks = []
  try {
    globalThis.WebSocket = Socket
    globalThis.setTimeout = globalThis.setInterval = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id }
    globalThis.clearTimeout = globalThis.clearInterval = id => timers.delete(id)
    const callbacks = { onTick: value => ticks.push(value), onError: () => errors++ }
    client.connect('BTC/USDT', '1H', callbacks, 'bybit', 'swap')
    sockets[0].open()
    assert.deepEqual(sockets[0].sent[0], { op: 'subscribe', args: ['kline.60.BTCUSDT'] })
    const staleMessage = sockets[0].onmessage
    const message = { data: JSON.stringify({ topic: 'kline.60.BTCUSDT', data: [{ start: 60000, open: '100', high: '105', low: '95', close: '103', volume: '12' }] }) }
    staleMessage(message)
    assert.equal(ticks.length, 1)
    assert.equal(ticks[0].close, 103)
    client.connect('ETH/USDT', '15m', callbacks, 'binance', 'swap')
    staleMessage(message)
    assert.equal(ticks.length, 1)
    assert.equal(sockets[0].readyState, 3)
    assert.match(sockets[1].url, /ethusdt@kline_15m$/)
    const timeout = [...timers.values()].find(timer => timer.ms === 8000)
    timeout.fn()
    assert.equal(errors, 1)
    assert.equal(client.isConnected(), false)
    assert.equal(timers.size, 0)
    client.connect('BTC/USDT', '1m', callbacks, 'htx', 'swap')
    assert.equal(errors, 2)
    assert.equal(sockets.length, 2)
  } finally {
    client.disconnect()
    Object.assign(globalThis, originals)
  }
})
