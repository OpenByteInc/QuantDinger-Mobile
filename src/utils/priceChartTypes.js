const SUPPORTED_TYPES = new Set([
  'candle_solid',
  'candle_stroke',
  'candle_up_stroke',
  'candle_down_stroke',
  'ohlc',
  'area',
  'line',
  'hlc_area',
  'heikin_ashi',
  'renko',
  'range'
])

export const PRICE_CHART_TYPES = [...SUPPORTED_TYPES]

function finiteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({
      ...row,
      timestamp: finiteNumber(row?.timestamp),
      sourceTimestamp: finiteNumber(row?.sourceTimestamp ?? row?.timestamp),
      open: finiteNumber(row?.open),
      high: finiteNumber(row?.high),
      low: finiteNumber(row?.low),
      close: finiteNumber(row?.close),
      volume: finiteNumber(row?.volume) || 0
    }))
    .filter(row => row.timestamp != null && row.open != null && row.high != null && row.low != null && row.close != null)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function normalizePriceChartType(value) {
  return SUPPORTED_TYPES.has(value) ? value : 'candle_solid'
}

export function klineCandleType(value) {
  const type = normalizePriceChartType(value)
  if (['line', 'hlc_area'].includes(type)) return 'area'
  if (['heikin_ashi', 'renko', 'range'].includes(type)) return 'candle_solid'
  return type
}

export function usesDerivedPriceBars(value) {
  return ['heikin_ashi', 'hlc_area', 'renko', 'range'].includes(normalizePriceChartType(value))
}

export function buildHeikinAshiRows(rows) {
  const data = normalizeRows(rows)
  let previousOpen = null
  let previousClose = null
  return data.map((row, index) => {
    const close = (row.open + row.high + row.low + row.close) / 4
    const open = index === 0 ? (row.open + row.close) / 2 : (previousOpen + previousClose) / 2
    const transformed = {
      ...row,
      open,
      high: Math.max(row.high, open, close),
      low: Math.min(row.low, open, close),
      close
    }
    previousOpen = open
    previousClose = close
    return transformed
  })
}

export function buildHlcAreaRows(rows) {
  return normalizeRows(rows).map(row => ({ ...row, close: (row.high + row.low + row.close) / 3 }))
}

function calculateAtrSize(rows, atrLength = 14) {
  const data = normalizeRows(rows)
  if (data.length < 2) return 0
  const ranges = []
  for (let index = 1; index < data.length; index += 1) {
    const current = data[index]
    const previous = data[index - 1]
    ranges.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    ))
  }
  const sample = ranges.slice(-Math.max(1, Number(atrLength) || 14)).filter(value => value > 0)
  const atr = sample.length ? sample.reduce((sum, value) => sum + value, 0) / sample.length : 0
  const lastClose = Math.abs(data.at(-1)?.close || 0)
  return Math.max(atr || lastClose * 0.005 || 0.01, Number.EPSILON)
}

export function buildRangeBars(rows, options = {}) {
  const data = normalizeRows(rows)
  if (data.length < 2) return []
  const requestedRange = finiteNumber(options.rangeSize)
  const rangeSize = requestedRange && requestedRange > 0 ? requestedRange : calculateAtrSize(data, options.atrLength)
  if (!Number.isFinite(rangeSize) || rangeSize <= 0) return []
  const bars = []
  let barClose = data[0].close
  let lastTimestamp = data[0].timestamp - 1
  for (let index = 1; index < data.length; index += 1) {
    const row = data[index]
    let remaining = row.close - barClose
    const barCount = Math.floor((Math.abs(remaining) + Number.EPSILON) / rangeSize)
    if (!barCount) continue
    const volumePerBar = row.volume / barCount
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      const open = barClose
      const close = open + Math.sign(remaining) * rangeSize
      const timestamp = Math.max(row.timestamp + barIndex, lastTimestamp + 1)
      bars.push({ timestamp, sourceTimestamp: row.timestamp, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: volumePerBar })
      barClose = close
      remaining = row.close - barClose
      lastTimestamp = timestamp
    }
  }
  return bars
}

export function buildRenkoBricks(rows, options = {}) {
  const data = normalizeRows(rows)
  if (data.length < 2) return []
  const requestedBoxSize = finiteNumber(options.boxSize)
  const boxSize = requestedBoxSize && requestedBoxSize > 0 ? requestedBoxSize : calculateAtrSize(data, options.atrLength)
  if (!Number.isFinite(boxSize) || boxSize <= 0) return []
  const bricks = []
  let brickClose = data[0].close
  let direction = 0
  let lastTimestamp = data[0].timestamp - 1
  for (let index = 1; index < data.length; index += 1) {
    const row = data[index]
    const difference = row.close - brickClose
    const nextDirection = Math.sign(difference)
    if (!nextDirection) continue
    const reversing = Boolean(direction && nextDirection !== direction)
    const threshold = reversing ? boxSize * 2 : boxSize
    if (Math.abs(difference) + Number.EPSILON < threshold) continue
    const distance = Math.floor((Math.abs(difference) + Number.EPSILON) / boxSize)
    const brickCount = reversing ? distance - 1 : distance
    if (!brickCount) continue
    const volumePerBrick = row.volume / brickCount
    for (let brickIndex = 0; brickIndex < brickCount; brickIndex += 1) {
      const open = reversing && brickIndex === 0 ? brickClose + nextDirection * boxSize : brickClose
      const close = reversing && brickIndex === 0 ? brickClose + nextDirection * boxSize * 2 : brickClose + nextDirection * boxSize
      const timestamp = Math.max(row.timestamp + brickIndex, lastTimestamp + 1)
      bricks.push({ timestamp, sourceTimestamp: row.timestamp, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: volumePerBrick })
      brickClose = close
      lastTimestamp = timestamp
    }
    direction = nextDirection
  }
  return bricks
}

export function buildPriceChartData(rows, value) {
  const source = normalizeRows(rows)
  const type = normalizePriceChartType(value)
  if (type === 'heikin_ashi') return buildHeikinAshiRows(source)
  if (type === 'hlc_area') return buildHlcAreaRows(source)
  if (type === 'renko') {
    const transformed = buildRenkoBricks(source, { atrLength: 14 })
    return transformed.length ? transformed : source.slice(-1)
  }
  if (type === 'range') {
    const transformed = buildRangeBars(source, { atrLength: 14 })
    return transformed.length ? transformed : source.slice(-1)
  }
  return source
}
