import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../../src/views/trading/StrategyDetail.vue', import.meta.url), 'utf8')

test('strategy trades and logs paginate independently', () => {
  assert.match(source, /v-for="\(item, index\) in pagedTrades"/)
  assert.match(source, /v-model="tradePage"/)
  assert.match(source, /v-for="\(item, index\) in pagedLogs"/)
  assert.match(source, /v-model="logPage"/)
  assert.match(source, /pageSize: 10/)
})

test('log filters reset pagination and retain more than the former hundred rows', () => {
  assert.match(source, /logFilter\(\) \{ this\.logPage = 1 \}/)
  assert.match(source, /strategyApi\.getLogs\(this\.strategyId, 1000\)/)
})
