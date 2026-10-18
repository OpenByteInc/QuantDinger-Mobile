import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRICE_CHART_TYPES,
  buildHeikinAshiRows,
  buildHlcAreaRows,
  buildPriceChartData,
  buildRangeBars,
  buildRenkoBricks,
  klineCandleType,
  normalizePriceChartType,
  usesDerivedPriceBars
} from '../../src/utils/priceChartTypes.js'

const rows = [
  { timestamp: 1000, open: 10, high: 13, low: 9, close: 12, volume: 20 },
  { timestamp: 2000, open: 12, high: 15, low: 11, close: 14, volume: 30 },
  { timestamp: 3000, open: 14, high: 18, low: 13, close: 17, volume: 40 }
]

test('mobile exposes the same eleven price chart types as desktop', () => {
  assert.equal(PRICE_CHART_TYPES.length, 11)
  assert.equal(normalizePriceChartType('unknown'), 'candle_solid')
  assert.equal(klineCandleType('line'), 'area')
  assert.equal(klineCandleType('heikin_ashi'), 'candle_solid')
  assert.equal(usesDerivedPriceBars('renko'), true)
  assert.equal(usesDerivedPriceBars('ohlc'), false)
})

test('Heikin Ashi and HLC area preserve source timestamps', () => {
  const heikin = buildHeikinAshiRows(rows)
  assert.equal(heikin[0].open, 11)
  assert.equal(heikin[0].close, 11)
  assert.equal(heikin[1].open, 11)
  assert.equal(heikin[1].sourceTimestamp, 2000)
  const hlc = buildHlcAreaRows(rows)
  assert.equal(hlc[0].close, (13 + 9 + 12) / 3)
  assert.equal(hlc[2].sourceTimestamp, 3000)
})

test('Renko and range bars retain their originating candle for indicator alignment', () => {
  const trend = [
    { timestamp: 1000, open: 100, high: 101, low: 99, close: 100, volume: 10 },
    { timestamp: 2000, open: 100, high: 104, low: 100, close: 104, volume: 20 },
    { timestamp: 3000, open: 104, high: 108, low: 104, close: 108, volume: 30 }
  ]
  const renko = buildRenkoBricks(trend, { boxSize: 2 })
  const range = buildRangeBars(trend, { rangeSize: 2 })
  assert.ok(renko.length >= 4)
  assert.ok(range.length >= 4)
  assert.ok(renko.every(item => item.sourceTimestamp === 2000 || item.sourceTimestamp === 3000))
  assert.ok(range.every(item => item.sourceTimestamp === 2000 || item.sourceTimestamp === 3000))
  assert.deepEqual(buildPriceChartData(rows, 'candle_solid').map(item => item.timestamp), [1000, 2000, 3000])
})
