import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function setupPicker(watchlistApi = {}) {
  const source = readFileSync(new URL('../../src/components/SymbolPicker.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[^\n]+$/gm, '').replace('export default', 'component =')
  const timers = new Map()
  let nextTimer = 0
  const scope = {
    watchlistApi, credentialsApi: { list: async () => ({ data: [] }) },
    isSupportedMarketSymbol: () => true,
    groupWatchlistAssets: items => items.map(item => ({ item })),
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout(id) { timers.delete(id) }
  }
  runInNewContext(script, scope)
  const options = scope.component
  const state = { ...options.data.call({ defaultMarket: 'USStock' }), onlyCrypto: false }
  for (const [key, method] of Object.entries(options.methods)) state[key] = method.bind(state)
  return { state, timers }
}

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('clearing a futures search returns the catalog refresh completion', async () => {
  const request = deferred()
  const { state } = setupPicker({ search: () => request.promise })
  state.searchMarketInner = 'Futures'
  state.futuresCatalog = Promise.resolve()
  const completion = state.debouncedSearch('')
  assert.equal(typeof completion?.then, 'function')
  assert.equal(state.searching, true)
  await Promise.resolve()
  request.resolve({ data: [{ market: 'Futures', symbol: 'MESZ26' }] })
  await completion
  assert.equal(state.hotList[0].symbol, 'MESZ26')
  assert.equal(state.searching, false)
})

test('a failed catalog refresh settles and clears loading without an unhandled rejection', async () => {
  const { state } = setupPicker({ futuresProducts: async () => { throw new Error('offline') } })
  state.searchMarketInner = 'Futures'
  await state.debouncedSearch('')
  assert.equal(state.searching, false)
  assert.equal(state.hotList.length, 0)
  assert.equal(state.futuresCatalog, null)
})

test('clearing input invalidates an in-flight stock search', async () => {
  const request = deferred()
  const { state } = setupPicker({ search: () => request.promise })
  const completion = state.doSearch('AAPL')
  assert.equal(state.searching, true)
  state.debouncedSearch('')
  request.resolve({ data: [{ symbol: 'AAPL' }] })
  await completion
  assert.equal(state.searchResults.length, 0)
  assert.equal(state.searching, false)
})

test('new input invalidates the previous response before its debounce timer runs', async () => {
  const request = deferred()
  const calls = []
  const { state, timers } = setupPicker({
    search: params => {
      calls.push(params.keyword)
      return params.keyword === 'AAPL' ? request.promise : Promise.resolve({ data: [{ symbol: 'MSFT' }] })
    }
  })
  const previous = state.doSearch('AAPL')
  state.debouncedSearch('MSFT')
  request.resolve({ data: [{ symbol: 'AAPL' }] })
  await previous
  assert.equal(state.searchResults.length, 0)
  await [...timers.values()][0]()
  assert.equal(state.searchResults[0].symbol, 'MSFT')
  assert.deepEqual(calls, ['AAPL', 'MSFT'])
})

test('switching markets cancels the old timer and returns the selected request', async () => {
  const { state, timers } = setupPicker()
  const request = deferred()
  const calls = []
  state.keyword = 'AAPL'
  state.debouncedSearch(state.keyword)
  state.doSearch = keyword => { calls.push(keyword); return request.promise }
  assert.equal(state.onMarketTab('USStock'), request.promise)
  assert.equal(timers.size, 0)
  assert.deepEqual(calls, ['AAPL'])
  request.resolve()
  await request.promise
  state.keyword = ''
  state.loadHotForMarket = market => { calls.push(market); return Promise.resolve() }
  await state.onMarketTab('HKStock')
  assert.equal(calls[1], 'HKStock')
})
