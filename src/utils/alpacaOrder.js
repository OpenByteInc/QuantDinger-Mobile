export const ALPACA_OPEN_STATUSES = new Set(['new', 'accepted', 'pending_new', 'partially_filled', 'pending_cancel', 'pending_replace', 'accepted_for_bidding', 'held', 'stopped', 'suspended', 'calculated'])

export function buildAlpacaOrder({credentialId, symbol, side, form, referencePrice}) {
  const inputMode=form.inputMode==='amount'?'amount':'quantity'
  const order={
    credential_id: Number(credentialId), symbol: String(symbol).toUpperCase(), side,
    marketType: 'USStock', orderType: form.type,
    ...(form.type === 'limit' ? {price: Number(form.price)} : {}),
    extendedHours: form.type === 'limit' && Boolean(form.extendedHours),
    source: 'indicator', reference_price: Number(referencePrice) || 0
  }
  if(inputMode==='amount')order.notional=Number(form.notional)
  else order.quantity=Number(form.quantity)
  return order
}

export function validateAlpacaOrder(order, {account, positions = [], openOrders = [], price, ready}) {
  if (!ready || !account) return 'audit.stale'
  if (account.trading_blocked || account.account_blocked) return 'account_ui.blocked'
  if (!order.credential_id || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(order.symbol) || !['buy', 'sell'].includes(order.side)) return 'account_ui.invalidQuantity'
  const hasQuantity=Number.isFinite(order.quantity)&&order.quantity>0
  const hasNotional=Number.isFinite(order.notional)&&order.notional>0
  if (hasQuantity===hasNotional) return 'account_ui.invalidQuantity'
  if (!['market', 'limit'].includes(order.orderType)) return 'account_ui.invalidQuantity'
  const value = order.orderType === 'limit' ? order.price : Number(price)
  if (!Number.isFinite(value) || value <= 0) return 'account_ui.invalidQuantity'
  if (order.side === 'buy') {
    const available = Number(account.buying_power)
    if (account.buying_power == null || !Number.isFinite(available)) return 'audit.stale'
    if ((hasNotional ? order.notional : order.quantity * value) > available) return 'audit.insufficientBalance'
  } else {
    const held = positions.find(p => String(p.symbol).toUpperCase() === order.symbol)
    const quantity = Number(held?.quantity ?? held?.qty ?? 0)
    const pending = openOrders.some(o => String(o.symbol).toUpperCase() === order.symbol && o.side === 'sell')
    const requestedQuantity=hasQuantity?order.quantity:order.notional/value
    if (pending || quantity < requestedQuantity) return 'account_ui.sellAvailable'
  }
  return ''
}
