import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import messages from '../../src/locales/mobile-parity.js'

const source = readFileSync(new URL('../../src/views/trading/StrategyDetail.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*$/gm, '').replace('export default', 'result =')

function page(getGridRestingOrders) {
  const timers = new Map()
  const notices = []
  const listeners = new Map()
  let nextTimer = 0
  const document = {
    hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name)
  }
  const scope = { strategyApi: { getGridRestingOrders }, showToast: value => notices.push(value), document,
    setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, delay }); return nextTimer },
    clearTimeout: id => timers.delete(id) }
  vm.runInNewContext(script, scope)
  const options = scope.result
  const instance = { ...options.data(), strategyId: 7, isLiveStrategy: true, isGridStrategy: true,
    activeTab: 'grid-orders', $t: key => messages['en-US'][key] || key }
  for (const [key, fn] of Object.entries(options.methods)) instance[key] = fn.bind(instance)
  return { instance, options, timers, notices, document, listeners }
}
const response = (summary = {}, orders = []) => ({ code: 1, data: { summary, orders } })

test('grid polling synchronization and watchers return the refresh promise', async () => {
  const { instance, options } = page(async () => response())
  const pending = Promise.resolve()
  const calls = []
  instance.loadGridOrders = sync => { calls.push(sync); return pending }
  assert.equal(instance.syncGridOrderPolling(), pending)
  assert.equal(options.watch.activeTab.call(instance, 'grid-orders'), pending)
  assert.equal(options.watch.strategyId.call(instance), pending)
  assert.deepEqual(calls, [true, true, true])
  await pending
})

test('visibility-triggered polling handles network failures without rejecting', async () => {
  const { instance, timers } = page(async () => { throw new Error('offline') })
  const pending = instance.syncGridOrderPolling()
  assert.equal(instance.gridOrdersLoading, true)
  await assert.doesNotReject(pending)
  assert.equal(instance.gridOrdersFailed, true)
  assert.equal(instance.gridOrdersLoading, false)
  assert.equal([...timers.values()][0].delay, 15000)
})

test('opening review stops grid polling and returns the history request', async () => {
  const { instance, options, timers } = page(async () => response())
  await instance.loadGridOrders(true)
  assert.equal(timers.size, 1)
  const pending = Promise.resolve()
  instance.loadReviewHistory = () => pending
  instance.activeTab = 'review'
  assert.equal(options.watch.activeTab.call(instance, 'review'), pending)
  assert.equal(timers.size, 0)
  await pending
})

test('queued verification is pending, not an error, and polls for results', async () => {
  const calls = []
  const { instance, timers, notices } = page(async (...args) => {
    calls.push(args)
    return calls.length === 1
      ? response({ sync_pending: true, sync_ok: false })
      : response({ sync_pending: false, sync_ok: true }, [{ id: 3, status: 'open', exchange_status: 'cancelled' }])
  })
  await instance.loadGridOrders(true)
  assert.equal(instance.gridOrderSummary.sync_pending, true)
  assert.equal(instance.gridOrdersFailed, false)
  assert.equal(notices.length, 0)
  assert.equal(timers.size, 1)
  assert.equal([...timers.values()][0].delay, 5000)
  await [...timers.values()][0].fn()
  assert.equal(instance.gridOrders[0].exchange_status, 'cancelled')
  assert.equal(timers.size, 1)
  assert.equal([...timers.values()][0].delay, 15000)
  assert.deepEqual(calls, [[7, true], [7, true]])
})

test('a failed fetch keeps the last evidence, marks it stale and retries without a toast storm', async () => {
  const { instance, timers, notices } = page(async () => { throw new Error('offline') })
  instance.gridOrders = [{ id: 1, exchange_status: 'filled' }]
  instance.gridOrderSummary = { last_reconciled_at: '2026-11-25T01:00:00Z', sync_pending: true }
  await instance.loadGridOrders(true)
  assert.equal(instance.gridOrdersFailed, true)
  assert.equal(instance.gridOrders[0].exchange_status, 'filled')
  assert.equal(instance.gridOrderSummary.last_reconciled_at, '2026-11-25T01:00:00Z')
  assert.equal([...timers.values()][0].delay, 15000)
  assert.equal(notices.length, 0)
  assert.match(source, /v-if="gridOrdersFailed"[\s\S]*?v-else-if="gridOrderSummary.sync_pending"/)
})

test('business errors do not become an empty successful result', async () => {
  const { instance } = page(async () => ({ code: 0, data: {} }))
  await instance.loadGridOrders(true)
  assert.equal(instance.gridOrdersFailed, true)
})

test('overlapping refresh clicks do not start concurrent requests', async () => {
  let finish
  let calls = 0
  const { instance } = page(() => { calls++; return new Promise(resolve => { finish = resolve }) })
  const pending = instance.loadGridOrders(true)
  await instance.loadGridOrders(true)
  assert.equal(calls, 1)
  finish(response())
  await pending
  assert.equal(instance.gridOrdersLoading, false)
})

test('leaving the tab invalidates an in-flight response and stops polling', async () => {
  let finish
  const { instance, options, timers } = page(() => new Promise(resolve => { finish = resolve }))
  const pending = instance.loadGridOrders(true)
  instance.activeTab = 'overview'
  options.watch.activeTab.call(instance, 'overview')
  finish(response({}, [{ id: 1 }]))
  await pending
  assert.equal(instance.gridOrders.length, 0)
  assert.equal(timers.size, 0)
  assert.equal(instance.gridOrdersLoading, false)
})

test('backgrounding stops polling and foregrounding refreshes only the visible grid tab', async () => {
  let calls = 0
  const { instance, options, timers, document, listeners } = page(async () => { calls++; return response() })
  instance.load = () => {}
  options.mounted.call(instance)
  await instance.loadGridOrders(true)
  document.hidden = true
  listeners.get('visibilitychange')()
  assert.equal(timers.size, 0)
  await instance.loadGridOrders(true)
  assert.equal(calls, 1)
  document.hidden = false
  listeners.get('visibilitychange')()
  await Promise.resolve()
  assert.equal(calls, 2)
  options.beforeUnmount.call(instance)
  assert.equal(timers.size, 0)
  assert.equal(listeners.size, 0)
})

test('unmounting or changing strategy ignores late responses', async () => {
  for (const change of ['unmount', 'strategy']) {
    let finish
    const { instance, options, timers } = page(() => new Promise(resolve => { finish = resolve }))
    const pending = instance.loadGridOrders(true)
    if (change === 'unmount') options.beforeUnmount.call(instance)
    else { instance.strategyId = 9; instance.activeTab = 'overview'; options.watch.strategyId.call(instance) }
    finish(response({}, [{ id: 1 }]))
    await pending
    assert.equal(instance.gridOrders.length, 0)
    assert.equal(timers.size, 0)
  }
})

test('signal mode never asks for exchange verification', async () => {
  const calls = []
  const { instance } = page(async (...args) => { calls.push(args); return response({ virtual_mode: true }) })
  instance.isLiveStrategy = false
  await instance.loadGridOrders(true)
  assert.deepEqual(calls, [[7, false]])
  assert.match(source, /isLiveStrategy \? 'trading.grid_orders_hint' : 'gridAudit.virtualHint'/)
  assert.match(source, /v-if="isLiveStrategy && order.reconciliation_pending"/)
})

test('local, confirmed exchange and pending ledger states stay distinct', () => {
  const { instance, options } = page(() => {})
  assert.equal(instance.gridStatusLabel('filled'), 'Filled')
  assert.equal(instance.gridStatusLabel('cancelled'), 'Cancelled')
  assert.equal(instance.gridStatusLabel('submitted'), 'Submitted')
  assert.equal(instance.gridStatusLabel('not_open'), 'Not in open orders (cancellation unconfirmed)')
  assert.equal(instance.gridStatusLabel(), 'Unverified')
  assert.equal(instance.gridStatusLabel('unexpected'), 'Unverified')
  instance.gridOrderSummary = { sync_error: 'grid_exchange_reconciliation_pending' }
  assert.equal(options.computed.gridAuditWarning.call(instance), messages['en-US']['gridAudit.reconciliationHint'])
  assert.match(source, /gridStatusLabel\(order\.status\)/)
  assert.match(source, /gridStatusLabel\(order\.exchange_status\)/)
  assert.match(source, /gridOrderSummary\.last_reconciled_at/)
})

test('mobile uses the desktop order scope and all five locales cover every new label', () => {
  const api = readFileSync(new URL('../../src/api/index.js', import.meta.url), 'utf8')
  assert.match(api, /getGridRestingOrders:[\s\S]*?params: \{ id, status: '', limit: 500,/)
  assert.match(api, /getGridRestingOrders:[\s\S]*?suppressErrorToast: true/)
  const keys = Object.keys(messages['en-US']).filter(key => key.startsWith('gridAudit.') || key === 'market.sort_recommended')
  assert.equal(Object.keys(messages).length, 5)
  for (const [locale, bundle] of Object.entries(messages)) {
    for (const key of keys) assert.ok(bundle[key]?.trim(), `${locale}: ${key}`)
  }
})
