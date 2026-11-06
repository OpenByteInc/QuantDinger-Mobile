import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../src/components/ChartTradePanel.vue', import.meta.url), 'utf8')

test('trade and closed-position records paginate independently', () => {
  assert.match(source, /historyPageSize:5, tradeHistoryPage:1, positionHistoryPage:1/)
  assert.match(source, /v-for="item in pagedPositionHistory"/)
  assert.match(source, /v-model="positionHistoryPage"/)
  assert.match(source, /v-model="tradeHistoryPage"/)
  assert.match(source, /pagedTradeHistory\(\)/)
  assert.match(source, /pagedPositionHistory\(\)/)
  assert.match(source, /activeTab==='orders'\?this\.openOrders:this\.pagedTradeHistory/)
})

test('history pagination resets with the trading context and clamps after refresh', () => {
  assert.match(source, /resetHistoryPagination\(\)/)
  assert.match(source, /if\(contextChanged\)\{this\.resetHistoryPagination\(\)/)
  assert.match(source, /history\(\) \{ this\.tradeHistoryPage=Math\.min\(this\.tradeHistoryPage,this\.tradeHistoryPageCount\) \}/)
  assert.match(source, /positionHistory\(\) \{ this\.positionHistoryPage=Math\.min\(this\.positionHistoryPage,this\.positionHistoryPageCount\) \}/)
})
