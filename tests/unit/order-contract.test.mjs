import test from 'node:test'
import assert from 'node:assert/strict'
import {buildOrder, tradeProductFields, isSupportedMarketSymbol} from '../../src/utils/tradeOrder.js'
import {apiErrorMessage} from '../../src/utils/apiError.js'

// Fields exposed by the deployed /openapi.json on 2026-09-28.
const deployedFields = new Set(['credential_id','symbol','side','order_type','amount','price','leverage','market_type','tp_price','sl_price','source','margin_mode','marginMode','ai_decision_filter'])
test('ordinary crypto catalog selections work with the deployed strict order contract', () => {
  for (const marketType of ['spot','swap']) for (const orderType of ['market','limit']) {
    const payload = buildOrder({credentialId:7,symbol:'ETH/USDT',marketType,side:'buy',product:{product_type:'crypto',api_family:'classic',instrument_id:'ETH_USDT'},form:{order_type:orderType,amount:10,price:2500,leverage:5,margin_mode:'cross'}})
    const wire = JSON.parse(JSON.stringify(payload))
    assert.deepEqual(Object.keys(wire).filter(key => !deployedFields.has(key)), [])
    assert.equal(wire.order_type,orderType)
    assert.equal(wire.market_type,marketType)
    assert.equal(wire.price,orderType==='limit'?2500:0)
    assert.equal(wire.leverage,marketType==='swap'?5:1)
  }
})
test('crypto orders omit catalog routing fields and reject exchange equities', () => {
  assert.deepEqual(tradeProductFields({product_type:'crypto',api_family:'classic'}),{})
  for(const product of [{product_type:'tokenized_equity'},{product_type:'stock_perpetual'},{product_type:'direct_equity'},{asset_class:'equity'},{underlying_market:'USStock'},{api_family:'reality'}]){
    assert.throws(()=>tradeProductFields(product),/account_ui.unsupported/)
    assert.equal(isSupportedMarketSymbol({market:'Crypto',...product}),false)
  }
  assert.equal(isSupportedMarketSymbol({market:'USStock',symbol:'AAPL',asset_class:'equity'}),true)
  assert.equal(isSupportedMarketSymbol({market:'Crypto',symbol:'BTC/USDT'}),true)
})
test('validation errors retain the rejected field instead of only Invalid request data', () => {
  assert.equal(apiErrorMessage({msg:'Invalid request data',data:{errors:{json:{quantity:['Unknown field.'],price:['Must be greater than 0.']}}}}),'quantity: Unknown field.; price: Must be greater than 0.')
  assert.equal(apiErrorMessage({msg:'Insufficient balance'}),'Insufficient balance')
  assert.equal(apiErrorMessage({message:'Exchange unavailable'}),'Exchange unavailable')
  assert.equal(apiErrorMessage(null),'')
})
