export function forthrightErrorMessage(error, t) {
  const data = error?.response?.data || error || {}
  const message = error?.localizedMessage || t(data.error || error?.message || 'brokerAccounts.orderFailed')
  const details = data.broker_details
  if (!details) return message
  const reason = t('brokerAccounts.forthright.brokerError', { code: details.code, message: details.message })
  return [message, reason, details.replacement_on_wire ? t('brokerAccounts.forthright.encodingLost') : ''].filter(Boolean).join(' ')
}

export function brokerRowCurrency(row, brokerId) {
  const currency = String(row.currency || row.ccy || '').replace(/^HK-/, '').toUpperCase()
  if (/^[A-Z]{3}$/.test(currency)) return currency
  if (row.market === 'HKStock' || /\.HK$/i.test(row.symbol || '')) return 'HKD'
  if (row.market === 'USStock' || ['alpaca', 'webull'].includes(brokerId)) return 'USD'
  return null
}

export function forthrightBuyingPower(account, currency) {
  const value = account?.buying_power
  if (value == null || value === '' || String(account?.currency || '').toUpperCase() !== currency) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : null
}

export function forthrightStockOrderIssue({account, market, quantity, orderType, price, referencePrice, side}) {
  const qty = Number(quantity)
  const scale = market === 'HKStock' ? 1 : 10000
  if (!Number.isFinite(qty) || qty <= 0 || Math.abs(qty * scale - Math.round(qty * scale)) > 1e-7) return 'brokerAccounts.invalidOrder'
  const value = Number(orderType === 'limit' ? price : referencePrice)
  if (!Number.isFinite(value) || value <= 0) return 'brokerAccounts.forthright.referencePriceRequired'
  if (side === 'buy') {
    const power = forthrightBuyingPower(account, market === 'HKStock' ? 'HKD' : 'USD')
    if (power == null) return 'brokerAccounts.forthright.invalidSnapshot'
    if (qty * value > power + 1e-8) return 'brokerAccounts.forthright.insufficientBuyingPower'
  }
  return ''
}

export function validFuturesOrder(contract, quantity, orderType, price) {
  if (!contract || !Number.isSafeInteger(Number(quantity)) || Number(quantity) <= 0) return false
  if (orderType === 'market') return true
  const value = Number(price), tick = Number(contract.price_tick)
  return orderType === 'limit' && Number.isFinite(value) && value > 0 && (!tick || Math.abs(value / tick - Math.round(value / tick)) < 1e-7)
}
