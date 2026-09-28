export function toTimestamp(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  const result = Number.isFinite(number) ? (number < 1e11 ? number * 1000 : number) : Date.parse(value)
  return Number.isFinite(result) ? result : null
}
export function toCandles(rows = []) {
  return rows.filter(row => ['open','high','low','close'].every(key => row[key] != null && row[key] !== '')).map(row => ({
    ...row,
    timestamp: toTimestamp(row.timestamp ?? row.time ?? row.open_time),
    open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close),
    volume: Number(row.volume ?? row.vol ?? 0)
  })).filter(row => row.timestamp !== null && ['open','high','low','close'].every(key => Number.isFinite(row[key])))
}
export function signalPoints(signals, candles) {
  const points = []
  for (const signal of signals || []) {
    const side = /sell|short|exit_long/.test(String(signal.type || signal.action || signal.side)) ? 'sell' : 'buy'
    ;(signal.data || []).forEach((point, index) => {
      const candle = candles[index]
      const value = point && typeof point === 'object' ? point.value ?? point.y ?? point.active : point
      if (!candle || value == null || value === false || value === 0 || value === '' || value === 'false') return
      const price = typeof value === 'number' && value > candle.low * 0.7 && value < candle.high * 1.3 ? value : candle[side === 'buy' ? 'low' : 'high']
      points.push({timestamp:candle.timestamp,value:price,side,text:signal.textData?.[index] || point?.text || signal.text || signal.name || signal.type || '',color:point?.color || signal.color || (side==='buy'?'#0aa681':'#ef4444')})
    })
  }
  return points
}
