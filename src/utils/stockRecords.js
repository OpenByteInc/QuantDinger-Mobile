// Comparison only: retain the original broker symbols and outbound order payloads.
export function stockSymbolsMatch(left, right, market, broker = '') {
  const category = String(market || '').toUpperCase()
  const normalize = value => {
    let symbol = String(value || '').trim().toUpperCase()
    const prefix = symbol.match(/^(USSTOCK|HKSTOCK|HK):/)
    if (prefix) {
      if ((prefix[1] === 'HK' ? 'HKSTOCK' : prefix[1]) !== category) return ''
      symbol = symbol.slice(prefix[0].length)
    }
    if (category === 'HKSTOCK' && /^(?:HK\.)?\d{1,5}(?:\.HK)?$/.test(symbol)) {
      return symbol.replace(/^HK\./, '').replace(/\.HK$/, '').padStart(5, '0') + '.HK'
    }
    if (category === 'USSTOCK') {
      symbol = symbol.replace(/\.US$/, '')
      if (broker === 'alpaca') symbol = symbol.replace(/\//g, '.')
    }
    return symbol
  }
  const key = normalize(left)
  return Boolean(key) && key === normalize(right)
}

export function stockFillRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(row => Number.isFinite(Number(row.filled_qty)) && Number(row.filled_qty) > 0)
    .map(row => ({
      ...row,
      quantity: Number(row.filled_qty),
      status: row.status || 'filled',
      fee_amount: row.fee_amount ?? row.commission,
      fee_currency: row.fee_currency || row.commission_ccy || row.currency
    }))
}
