import {quantityFromAmount} from './orderQuantity.mjs'

export const STOCK_OPEN_STATUSES = new Set(['new', 'open', 'accepted', 'pending_new', 'partially_filled', 'submitted', 'pending_cancel', 'pending_replace', 'held'])

export function stockQuantityPrecision(market, broker) {
  if (market === 'HKStock' || broker === 'tiger') return 0
  return broker === 'forthright' ? 4 : 6
}

export function buildStockOrder({symbol, market, broker, side, form, referencePrice, lotSize = 0}) {
  const price = Number(form.orderType === 'limit' ? form.price : referencePrice)
  const quantity = market === 'HKStock'
    ? (Number.isSafeInteger(lotSize) && lotSize > 0 && form.inputMode !== 'amount' ? Number(form.quantity) * lotSize : 0)
    : form.inputMode === 'amount'
      ? quantityFromAmount(form.notional, price, stockQuantityPrecision(market, broker))
      : Number(form.quantity)
  return {symbol, side, quantity, orderType: form.orderType, ...(form.orderType === 'limit' ? {price} : {}), marketType: market, reference_price: price, source: 'indicator'}
}

export function validateStockOrder(order, {broker, account, positions = [], orders = [], ready, lotSize = 0}) {
  if (!ready || !account) return 'audit.stale'
  if (account.trading_blocked || account.account_blocked) return 'account_ui.blocked'
  const scale = 10 ** stockQuantityPrecision(order.marketType, broker)
  const quantity = order.quantity, price = order.reference_price
  if (order.marketType === 'HKStock') {
    if (!Number.isSafeInteger(lotSize) || lotSize <= 0) return 'brokerAccounts.forthright.lotUnavailable'
    if (quantity < lotSize) return 'brokerAccounts.forthright.belowBoardLot'
    if (quantity % lotSize !== 0) return 'brokerAccounts.forthright.wholeBoardLot'
  }
  if (!['buy', 'sell'].includes(order.side) || !['market', 'limit'].includes(order.orderType) || !Number.isFinite(quantity) || quantity <= 0 || !Number.isSafeInteger(Math.round(quantity * scale)) || Math.abs(quantity * scale - Math.round(quantity * scale)) > 1e-7 || !Number.isFinite(price) || price <= 0) return 'account_ui.invalidQuantity'
  if (order.side === 'sell') {
    const held = positions.reduce((total, row) => total + Math.max(0, Number(row.salable_qty ?? row.available_qty ?? row.quantity) || 0), 0)
    if (orders.some(row => String(row.side).toLowerCase() === 'sell' && STOCK_OPEN_STATUSES.has(String(row.status).toLowerCase())) || quantity > held) return 'account_ui.sellAvailable'
  } else {
    const currency = order.marketType === 'HKStock' ? 'HKD' : 'USD'
    if (broker === 'forthright' && account.currency !== currency) return 'brokerAccounts.forthright.invalidSnapshot'
    // A base-currency summary cannot be compared with a different quote currency.
    if (String(account.currency || 'USD').toUpperCase() === currency) {
      if (account.buying_power == null || account.buying_power === '' || !Number.isFinite(Number(account.buying_power))) return 'audit.stale'
      if (quantity * price > Number(account.buying_power) + 1e-8) return 'audit.insufficientBalance'
    }
  }
  return ''
}
