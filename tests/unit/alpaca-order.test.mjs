import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAlpacaOrder,validateAlpacaOrder} from '../../src/utils/alpacaOrder.js'
const build=(overrides={})=>buildAlpacaOrder({credentialId:7,symbol:'AAPL',side:'buy',form:{quantity:'2',type:'limit',price:'210',extendedHours:true},referencePrice:211,...overrides})
const context={ready:true,account:{buying_power:'1000'},positions:[{symbol:'AAPL',quantity:3}],openOrders:[],price:211}
test('Alpaca uses shares, explicit account and PC broker order contract',()=>{
  assert.deepEqual(build(),{credential_id:7,symbol:'AAPL',side:'buy',quantity:2,marketType:'USStock',orderType:'limit',price:210,extendedHours:true,source:'indicator',reference_price:211})
  assert.equal(validateAlpacaOrder(build(),context),'')
  const market=build({form:{quantity:2,type:'market',price:210,extendedHours:true}})
  assert.equal(market.extendedHours,false);assert.equal(market.price,undefined)
})
test('Alpaca rejects disconnected, blocked, invalid and excessive orders',()=>{
  assert.equal(validateAlpacaOrder(build(),{...context,ready:false}),'audit.stale')
  assert.equal(validateAlpacaOrder(build(),{...context,account:{trading_blocked:true}}),'account_ui.blocked')
  for(const quantity of [0,-1,Infinity,NaN])assert.equal(validateAlpacaOrder({...build(),quantity},context),'account_ui.invalidQuantity')
  assert.equal(validateAlpacaOrder({...build(),price:0},context),'account_ui.invalidQuantity')
  assert.equal(validateAlpacaOrder({...build(),quantity:6},context),'audit.insufficientBalance')
})
test('stock sells require holdings and cannot overlap pending sell orders',()=>{
  const sell=build({side:'sell'})
  assert.equal(validateAlpacaOrder(sell,context),'')
  assert.equal(validateAlpacaOrder({...sell,quantity:4},context),'account_ui.sellAvailable')
  assert.equal(validateAlpacaOrder(sell,{...context,openOrders:[{symbol:'AAPL',side:'sell'}]}),'account_ui.sellAvailable')
  assert.equal(validateAlpacaOrder(sell,{...context,positions:[]}),'account_ui.sellAvailable')
})
