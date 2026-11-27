// CME outright quote display precision, not order-price rounding rules.
const CME_FUTURES_PRICE_DECIMALS = {
  '6A': 5,
  '6B': 4,
  '6C': 5,
  '6E': 5,
  '6J': 7,
  '6N': 5,
  '6S': 5,
  MES: 2,
  MNQ: 2
}

export function futuresPriceDecimals(market, symbol) {
  if (String(market || '').replace(/[\s_-]/g, '').toLowerCase() !== 'futures') return null
  const contract = String(symbol || '').trim().toUpperCase()
  const match = /^(6[ABCEJNS]|MES|MNQ)(?:[FGHJKMNQUVXZ]\d{1,4}(?:\.CME)?|=F)?$/.exec(contract)
  return match ? CME_FUTURES_PRICE_DECIMALS[match[1]] : null
}

export function formatFuturesPrice(value, market, symbol, locale) {
  const digits = futuresPriceDecimals(market, symbol)
  if (digits === null || value == null || value === '' || !Number.isFinite(Number(value))) return null
  return Number(value).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
