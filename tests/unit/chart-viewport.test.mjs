import assert from 'node:assert/strict'
import test from 'node:test'
import { captureChartViewport, restoreChartViewport } from '../../src/utils/chartViewport.js'

const rows = [1000, 2000, 3000, 4000, 5000].map(timestamp => ({ timestamp }))

test('captures and restores a chart that is browsing history', () => {
  const chart = {
    getDataList: () => rows,
    getVisibleRange: () => ({ from: 0, to: 2.8, realTo: 2.8 }),
    getOffsetRightDistance: () => 24,
    getBarSpace: () => 7,
    scrollToDataIndex: (index) => { chart.restored = index }
  }
  const snapshot = captureChartViewport(chart, { defaultRightOffsetDistance: 24 })
  assert.equal(snapshot.followingLatest, false)
  assert.equal(snapshot.anchorTimestamp, 3000)
  assert.equal(restoreChartViewport(chart, snapshot), true)
  assert.equal(chart.restored, 2)
})

test('keeps a user-created future offset instead of snapping to realtime', () => {
  const chart = {
    getDataList: () => rows,
    getVisibleRange: () => ({ from: 1, to: 5, realTo: 4 }),
    getOffsetRightDistance: () => 120,
    getBarSpace: () => 7,
    scrollByDistance: (distance) => { chart.distance = distance }
  }
  const snapshot = captureChartViewport(chart, { defaultRightOffsetDistance: 24 })
  assert.deepEqual(snapshot, { followingLatest: false, rightOffsetDistance: 120 })
  chart.getOffsetRightDistance = () => 24
  assert.equal(restoreChartViewport(chart, snapshot), true)
  assert.equal(chart.distance, -96)
})

test('marks the latest edge as realtime when no custom offset exists', () => {
  const snapshot = captureChartViewport({
    getDataList: () => rows,
    getVisibleRange: () => ({ from: 1, to: 4, realTo: 4 }),
    getOffsetRightDistance: () => 24,
    getBarSpace: () => 7
  }, { defaultRightOffsetDistance: 24 })
  assert.deepEqual(snapshot, { followingLatest: true })
})
