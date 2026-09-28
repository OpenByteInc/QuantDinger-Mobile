const DURATIONS = { '1m':60000, '5m':300000, '15m':900000, '30m':1800000, '1H':3600000, '4H':14400000, '1D':86400000, '1W':604800000 }

export function mergeStreamBar(candles, bar, timeframe) {
  if (!candles.length || !['timestamp','open','high','low','close','volume'].every(key => Number.isFinite(bar[key])) || bar.volume < 0) return 'ignored'
  const last = candles.at(-1)
  if (bar.timestamp < last.timestamp) return 'ignored'
  if (bar.timestamp === last.timestamp) {
    candles[candles.length - 1] = { ...last, ...bar }
    return 'updated'
  }
  const duration = DURATIONS[timeframe]
  if (!duration || bar.timestamp - last.timestamp > duration) return 'gap'
  candles.push({ ...bar })
  return 'appended'
}

export function streamIsFresh(lastTick, now = Date.now()) {
  return lastTick > 0 && now - lastTick < 15000
}
