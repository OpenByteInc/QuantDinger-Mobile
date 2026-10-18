function finiteNumber (value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nearestTimestampIndex (rows, timestamp) {
  if (!rows.length || !Number.isFinite(timestamp)) return -1
  let nearestIndex = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  rows.forEach((row, index) => {
    const current = finiteNumber(row && row.timestamp)
    if (current === null) return
    const distance = Math.abs(current - timestamp)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })
  return nearestIndex
}

export function captureChartViewport (chart, options = {}) {
  if (!chart || typeof chart.getVisibleRange !== 'function' || typeof chart.getDataList !== 'function') return null

  const rows = chart.getDataList()
  const range = chart.getVisibleRange()
  if (!Array.isArray(rows) || rows.length === 0 || !range) return null

  const tolerance = typeof options === 'number' ? options : Number(options.indexTolerance ?? 1)
  const defaultRightOffsetDistance = typeof options === 'object' ? Number(options.defaultRightOffsetDistance ?? 64) : 64
  const visibleFrom = finiteNumber(range.from)
  const realTo = finiteNumber(range.realTo)
  const visibleTo = finiteNumber(range.to)
  const rightEdge = realTo ?? visibleTo
  const rightOffsetDistance = typeof chart.getOffsetRightDistance === 'function'
    ? finiteNumber(chart.getOffsetRightDistance())
    : null
  const barSpace = typeof chart.getBarSpace === 'function' ? finiteNumber(chart.getBarSpace()) : null
  const offsetTolerance = Math.max(2, (barSpace ?? 0) / 2)
  const hasCustomFutureOffset = rightOffsetDistance !== null && rightOffsetDistance > defaultRightOffsetDistance + offsetTolerance
  const followingLatest = !hasCustomFutureOffset && (rightEdge === null || rightEdge >= rows.length - 1 - Math.max(0, tolerance))
  if (followingLatest) return { followingLatest: true }

  if (hasCustomFutureOffset) return { followingLatest: false, rightOffsetDistance }

  const anchorPosition = Math.max(0, visibleTo ?? realTo ?? visibleFrom ?? 0)
  const anchorIndex = Math.min(rows.length - 1, Math.floor(anchorPosition))
  const anchorTimestamp = finiteNumber(rows[anchorIndex] && rows[anchorIndex].timestamp)
  if (anchorTimestamp === null) return null
  return { followingLatest: false, anchorTimestamp, fallbackIndex: anchorIndex }
}

export function restoreChartViewport (chart, snapshot) {
  if (!chart || !snapshot || snapshot.followingLatest) return false

  if (Number.isFinite(snapshot.rightOffsetDistance) && typeof chart.getOffsetRightDistance === 'function' && typeof chart.scrollByDistance === 'function') {
    const currentOffset = finiteNumber(chart.getOffsetRightDistance())
    if (currentOffset === null) return false
    chart.scrollByDistance(currentOffset - snapshot.rightOffsetDistance, 0)
    return true
  }

  if (typeof chart.scrollToDataIndex !== 'function') return false
  const rows = typeof chart.getDataList === 'function' ? chart.getDataList() : []
  const anchorIndex = nearestTimestampIndex(Array.isArray(rows) ? rows : [], snapshot.anchorTimestamp)
  const targetIndex = anchorIndex >= 0 ? anchorIndex : Number(snapshot.fallbackIndex || 0)
  chart.scrollToDataIndex(Math.max(0, Math.round(targetIndex)), 0)
  return true
}
