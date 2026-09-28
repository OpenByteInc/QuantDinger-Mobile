const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
export function rankStrategies(items, preference) {
  const score = item => {
    const drawdown = number(item.max_drawdown), returns = number(item.total_return)
    if (preference === 'active') return returns ?? -Infinity
    if (preference === 'balanced') return drawdown == null || returns == null ? -Infinity : returns / Math.max(Math.abs(drawdown), 1)
    return drawdown == null ? -Infinity : -Math.abs(drawdown)
  }
  return [...items].sort((a,b)=>score(b)-score(a))
}
export function strategyCurrency(strategy) {
  if (strategy.quote_currency || strategy.currency) return strategy.quote_currency || strategy.currency
  const symbol = String(strategy.symbol || strategy.trading_config?.symbol || '')
  if (symbol.includes('/')) return symbol.split('/')[1].split(':')[0]
  const market = String(strategy.market || strategy.trading_config?.market || '').toLowerCase()
  return {usstock:'USD',astock:'CNY',hkstock:'HKD'}[market] || ''
}

export function contractChanged(deployed, current) {
  if (!deployed) return false
  return ['symbol','timeframe','marketType'].some(key=>deployed[key]&&current[key]&&(key==='timeframe'?String(deployed[key])!==String(current[key]):String(deployed[key]).toLowerCase()!==String(current[key]).toLowerCase()))
}
