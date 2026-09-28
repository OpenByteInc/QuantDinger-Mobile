export const ALPACA_OPEN_STATUSES = new Set(['new', 'accepted', 'pending_new', 'partially_filled', 'pending_cancel', 'pending_replace', 'accepted_for_bidding', 'held', 'stopped', 'suspended', 'calculated'])

export function buildAlpacaOrder({credentialId, symbol, side, form, referencePrice}) {
  return {
    credential_id: Number(credentialId), symbol: String(symbol).toUpperCase(), side,
    quantity: Number(form.quantity), marketType: 'USStock', orderType: form.type,
    ...(form.type === 'limit' ? {price: Number(form.price)} : {}),
    extendedHours: form.type === 'limit' && Boolean(form.extendedHours),
    source: 'indicator', reference_price: Number(referencePrice) || 0
  }
}

export function validateAlpacaOrder(order, {account, positions = [], openOrders = [], price, ready}) {
  if (!ready || !account) return 'audit.stale'
  if (account.trading_blocked || account.account_blocked) return 'account_ui.blocked'
  if (!order.credential_id || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(order.symbol) || !['buy', 'sell'].includes(order.side)) return 'account_ui.invalidQuantity'
  if (!Number.isFinite(order.quantity) || order.quantity <= 0) return 'account_ui.invalidQuantity'
  if (!['market', 'limit'].includes(order.orderType)) return 'account_ui.invalidQuantity'
  const value = order.orderType === 'limit' ? order.price : Number(price)
  if (!Number.isFinite(value) || value <= 0) return 'account_ui.invalidQuantity'
  if (order.side === 'buy') {
    const available = Number(account.buying_power)
    if (account.buying_power == null || !Number.isFinite(available)) return 'audit.stale'
    if (order.quantity * value > available) return 'audit.insufficientBalance'
  } else {
    const held = positions.find(p => String(p.symbol).toUpperCase() === order.symbol)
    const quantity = Number(held?.quantity ?? held?.qty ?? 0)
    const pending = openOrders.some(o => String(o.symbol).toUpperCase() === order.symbol && o.side === 'sell')
    if (pending || quantity < order.quantity) return 'account_ui.sellAvailable'
  }
  return ''
}
