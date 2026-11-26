import test from 'node:test'
import assert from 'node:assert/strict'
import {buildStockOrder, validateStockOrder} from '../../src/utils/stockOrder.js'
import messages from '../../src/locales/account-ui.js'

const draft = (broker, market, extra = {}) => buildStockOrder({broker, market, lotSize:10, symbol: market === 'HKStock' ? '00700' : 'AAPL', side:'buy', referencePrice:3, form:{inputMode:'amount',notional:100,orderType:'market'}, ...extra})

test('preview and submitted quantity preserve exact decimal budgets', () => {
  const order = draft('tiger', 'USStock', {referencePrice: 0.01, form: {inputMode: 'amount', notional: 0.29, orderType: 'market'}})
  assert.equal(order.quantity, 29)
})

test('amount orders floor shares consistently across direct brokers and markets', () => {
  for (const [broker, market, expected] of [['forthright','USStock',33.3333],['webull','USStock',33.333333],['tiger','USStock',33]]) {
    const order = draft(broker, market)
    assert.equal(order.quantity, expected)
    assert.ok(order.quantity * order.reference_price <= 100)
    assert.equal(order.notional, undefined)
    assert.equal(order.marketType, market)
  }
})

test('limit amount conversion uses the limit rather than the chart price', () => {
  const order = draft('forthright','USStock',{form:{inputMode:'amount',notional:100,orderType:'limit',price:6}})
  assert.equal(order.quantity,16.6666)
  assert.equal(order.price,6)
  assert.equal(order.reference_price,6)
})

test('invalid, undersized and fractional whole-share orders never pass validation', () => {
  const context = {broker:'tiger',account:{currency:'USD',buying_power:1000},ready:true}
  for (const quantity of [0,-1,Infinity,NaN,0.1]) assert.equal(validateStockOrder({...draft('tiger','USStock'),quantity},context),'account_ui.invalidQuantity')
  for (const reference_price of [0,NaN,Infinity,-1]) assert.equal(validateStockOrder({...draft('tiger','USStock'),reference_price},context),'account_ui.invalidQuantity')
  assert.equal(draft('tiger','USStock',{referencePrice:101}).quantity,0)
  assert.equal(validateStockOrder(draft('tiger','USStock'),{...context,ready:false}),'audit.stale')
})

test('Forthright uses total quote-currency power and rejects stale currency snapshots', () => {
  const order=draft('forthright','USStock'), context={broker:'forthright',ready:true,account:{currency:'USD',buying_power:100,available_cash:0}}
  assert.equal(validateStockOrder(order,context),'')
  assert.equal(validateStockOrder(order,{...context,account:{currency:'USD',buying_power:0}}),'audit.insufficientBalance')
  assert.equal(validateStockOrder(order,{...context,account:{currency:'HKD',buying_power:100000}}),'brokerAccounts.forthright.invalidSnapshot')
  assert.equal(validateStockOrder(order,{...context,account:{currency:'USD'}}),'audit.stale')
})

test('sell validation uses sellable shares and blocks outstanding sell orders', () => {
  const order={...draft('tiger','HKStock'),side:'sell',quantity:10}
  const context={broker:'tiger',lotSize:10,ready:true,account:{currency:'USD'},positions:[{quantity:100,salable_qty:9}],orders:[]}
  assert.equal(validateStockOrder(order,context),'account_ui.sellAvailable')
  context.positions[0].salable_qty=10
  assert.equal(validateStockOrder(order,context),'')
  context.orders=[{side:'sell',status:'pending_cancel'}]
  assert.equal(validateStockOrder(order,context),'account_ui.sellAvailable')
  context.orders[0].status='canceled'
  assert.equal(validateStockOrder(order,context),'')
})

test('Tiger HK summary is not mislabeled or numerically compared as HKD buying power', () => {
  assert.equal(validateStockOrder(draft('tiger','HKStock',{form:{inputMode:'quantity',quantity:1,orderType:'market'}}),{broker:'tiger',lotSize:10,ready:true,account:{currency:'USD',buying_power:50}}),'')
})

test('amount conversion explanation is translated in every mobile locale', () => {
  for (const locale of Object.values(messages)) assert.match(locale.amountConversion,/\{quantity\}/)
})

test('Forthright HK preview uses board lots and rejects unknown rules or odd lots', () => {
  const context={broker:'forthright',lotSize:100,ready:true,account:{currency:'HKD',buying_power:100000}}
  const order=draft('forthright','HKStock',{lotSize:100,referencePrice:90,form:{inputMode:'quantity',quantity:1,orderType:'market'}})
  assert.equal(order.quantity,100)
  assert.equal(validateStockOrder(order,context),'')
  assert.equal(validateStockOrder({...order,quantity:11},context),'brokerAccounts.forthright.belowBoardLot')
  assert.equal(validateStockOrder({...order,quantity:101},context),'brokerAccounts.forthright.wholeBoardLot')
  assert.equal(validateStockOrder(order,{...context,lotSize:0}),'brokerAccounts.forthright.lotUnavailable')
  assert.equal(draft('forthright','HKStock',{lotSize:0}).quantity,0)
  assert.equal(draft('forthright','HKStock',{lotSize:100,referencePrice:90,form:{inputMode:'amount',notional:1000,orderType:'market'}}).quantity,0)
})


test('HK tickets accept whole lots for each supported broker and keep wire quantities in shares', () => {
  for (const broker of ['tiger', 'forthright']) for (const lotSize of [100,500,1000]) {
    const order = draft(broker,'HKStock',{lotSize,form:{inputMode:'quantity',quantity:2,orderType:'limit',price:90}})
    assert.equal(order.quantity,lotSize*2)
    assert.equal(order.price,90)
    const context = {broker,lotSize,ready:true,account:{currency:'HKD',buying_power:1000000}}
    assert.equal(validateStockOrder(order,context),'')
    const fractionalLot = draft(broker,'HKStock',{lotSize,form:{inputMode:'quantity',quantity:1.5,orderType:'limit',price:90}})
    assert.equal(validateStockOrder(fractionalLot,context),'brokerAccounts.forthright.wholeBoardLot')
    assert.equal(draft(broker,'HKStock').quantity,0)
  }
})
