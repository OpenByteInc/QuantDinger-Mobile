export const OPEN_ORDER_STATUSES = new Set(['new','open','pending','submitted','partially_filled','partially-filled','accepted','cancel_pending'])
export function isCryptoProduct(product) {
  const type = String(product?.product_type || 'crypto').toLowerCase()
  const asset = String(product?.asset_class || '').toLowerCase()
  const underlying = String(product?.underlying_market || '').toLowerCase()
  const family = String(product?.api_family || '').toLowerCase()
  return type === 'crypto' && !['equity','stock'].includes(asset) && !['usstock','hkstock','cnstock','chinastock'].includes(underlying) && !['stock','reality'].includes(family)
}
export function isSupportedMarketSymbol(item) {
  return String(item?.market || 'Crypto').toLowerCase() !== 'crypto' || isCryptoProduct(item)
}
export function tradeProductFields(product) {
  if (!isCryptoProduct(product)) throw new Error('account_ui.unsupported')
  return {}
}
export function buildOrder({credentialId,symbol,marketType,form,side,aiDecisionFilter,product}) {
  const spotSellQuantity=marketType==='spot'&&side==='sell'?Number(form.sell_quantity):0
  const order={credential_id:credentialId,symbol,market_type:marketType,side,order_type:form.order_type,amount:Number(form.amount),price:form.order_type==='limit'?Number(form.price):0,leverage:marketType==='swap'?Number(form.leverage):1,margin_mode:marketType==='swap'?form.margin_mode:undefined,tp_price:Number(form.tp_price||0),sl_price:Number(form.sl_price||0),source:'indicator',ai_decision_filter:Boolean(aiDecisionFilter)}
  if(spotSellQuantity>0)order.quantity=spotSellQuantity
  return {...order,...tradeProductFields(product)}
}
export function validateOrder(order,{available,price,balanceReady}) {
  if(!order.credential_id||!order.symbol||!['buy','sell'].includes(order.side)||!['spot','swap'].includes(order.market_type)||!['market','limit'].includes(order.order_type))return 'chart_trade.complete_order'
  if(!balanceReady)return 'audit.stale'
  const requested=order.market_type==='spot'&&order.side==='sell'?Number(order.quantity):Number(order.amount)
  if(!Number.isFinite(requested)||requested<=0||!Number.isFinite(order.amount)||order.amount<0||!Number.isFinite(order.price)||order.price<0||order.order_type==='limit'&&order.price<=0||!Number.isInteger(order.leverage)||order.leverage<1||order.leverage>125)return 'chart_trade.complete_order'
  if(requested>available)return 'audit.insufficientBalance'
  const reference=order.order_type==='limit'?order.price:price
  for(const key of ['tp_price','sl_price'])if(!Number.isFinite(order[key])||order[key]<0)return 'audit.invalidRisk'
  if(order.tp_price||order.sl_price){if(!(reference>0))return 'audit.invalidRisk';const long=order.side==='buy';if(order.tp_price&&(long?order.tp_price<=reference:order.tp_price>=reference))return 'audit.invalidRisk';if(order.sl_price&&(long?order.sl_price>=reference:order.sl_price<=reference))return 'audit.invalidRisk'}
  return ''
}
