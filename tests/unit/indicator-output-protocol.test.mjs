import test from 'node:test'
import assert from 'node:assert/strict'

import { createPlotRenderer } from '../../src/utils/pcPlotRenderer.js'
import {
  assignIndicatorSignalLanes,
  isIndicatorLampPlot,
  normalizeIndicatorLabelAnchor,
  normalizeIndicatorLabelFontSize,
  normalizeIndicatorOutput,
  resolveIndicatorLabelTextColor,
  resolveIndicatorPlotTitle
} from '../../src/utils/indicatorOutputProtocol.js'

test('schema v2 host colors and tables normalize into mobile render inputs', () => {
  const candles = [
    { open: 10, high: 13, low: 9, close: 12 },
    { open: 12, high: 14, low: 11, close: 11 }
  ]
  const result = normalizeIndicatorOutput({
    schema_version: 2,
    bar_colors: ['#112233', null],
    background_colors: [{ color: '#445566' }, null],
    tables: [{ position: 'bottom_right', title: 'State', columns: ['Key', 'Value'], rows: [['Trend', { text: 'Up', color: '#22c55e' }]] }]
  }, candles)

  assert.equal(result.version, 2)
  assert.deepEqual(result.plots.map(plot => plot.type), ['background', 'candlestick'])
  assert.equal(result.plots[0].data[0].color, '#445566')
  assert.equal(result.plots[1].data[0].open, 10)
  assert.equal(result.plots[1].data[1].color, null)
  assert.equal(result.tables[0].position, 'bottom-right')
  assert.equal(result.tables[0].rows[0][1].color, '#22c55e')
})

test('candlestick and background plots build native mobile figures', () => {
  const renderer = createPlotRenderer({ value: 'dark' })
  const bundle = renderer.build(2, [
    { name: 'Tint', type: 'background', title: false, data: [{ value: 12, color: '#123456' }, null] },
    { name: 'Colored bars', type: 'candlestick', data: [{ open: 10, high: 13, low: 9, close: 12, color: '#22c55e' }, null] }
  ], 'Protocol')

  assert.ok(bundle.figures.some(figure => figure.key === 'tint__background' && figure.type === 'rect'))
  assert.ok(bundle.figures.some(figure => figure.key === 'colored_bars__wick' && figure.type === 'line'))
  assert.ok(bundle.figures.some(figure => figure.key === 'colored_bars__body' && figure.type === 'rect'))
  assert.deepEqual(bundle.plotDataMap.colored_bars__open, [10, null])
  assert.equal(bundle.plotDataMap.tint__background_color[0], '#123456')
})

test('signal lanes, label safeguards and title visibility match the desktop contract', () => {
  const points = assignIndicatorSignalLanes([
    { dataIndex: 10, side: 'buy' },
    { dataIndex: 12, side: 'buy' },
    { dataIndex: 12, side: 'sell' }
  ])
  assert.deepEqual(points.map(point => point.lane), [0, 1, 0])
  assert.equal(normalizeIndicatorLabelAnchor('top'), 'above')
  assert.equal(normalizeIndicatorLabelAnchor('middle'), 'center')
  assert.equal(normalizeIndicatorLabelFontSize(2), 11)
  assert.equal(normalizeIndicatorLabelFontSize(99), 16)
  assert.equal(resolveIndicatorLabelTextColor('#000000', true), '#f1f5f9')
  assert.equal(resolveIndicatorPlotTitle({ name: 'EMA', title: false }), undefined)
  assert.equal(resolveIndicatorPlotTitle({ name: 'EMA', title: 'Fast' }), 'Fast')
})

test('lamp detection does not classify continuous trend prices as categorical lamps', () => {
  assert.equal(isIndicatorLampPlot({ name: 'Trend', data: [72000.1, 72100.2, 71950.4] }), false)
  assert.equal(isIndicatorLampPlot({ name: 'Trend lamp', data: [0, 1, 0, 1] }), true)
})
