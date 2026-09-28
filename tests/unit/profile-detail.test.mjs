import test from 'node:test'
import assert from 'node:assert/strict'
import {notificationPayload,notificationFields,notificationCategory,notificationTime} from '../../src/utils/notificationDetail.js'
import {accountNumber,accountPrice,canCancelAccountOrder,snapshotIssue} from '../../src/utils/accountDetail.js'

test('notification payload retains structured trade data including zero values',()=>{
  const row={payload_json:JSON.stringify({event:'qd.signal',display:{params:{action:'OPEN'}},instrument:{symbol:'BTC/USDT'},signal:{type:'open_long'},order:{ref_price:0,stake_amount:100},trace:{pending_order_id:71},confidence:0})}
  assert.equal(notificationCategory(row),'signal')
  const fields=Object.fromEntries(notificationFields(row).map(x=>[x.key,x.value]))
  assert.equal(fields.method,undefined);assert.equal(fields.reference,'0');assert.equal(fields.confidence,'0');assert.equal(fields.orderId,'71');assert.equal(fields.stake,'100')
  assert.deepEqual(notificationPayload({payload_json:'broken'}),{})
})
test('login notifications stay system events and absent location is omitted',()=>{
  const row={signal_type:'security_login',payload_json:'{"device":"Chrome","location":"-"}'}
  assert.equal(notificationCategory(row),'system')
  assert.equal(notificationFields(row).some(x=>x.key==='location'),false)
  assert.equal(notificationCategory({event_type:'trade_filled'}),'trade')
})
test('timestamps accept seconds or milliseconds and never invent a missing date',()=>{
  assert.equal(notificationTime(1700000000).getTime(),notificationTime(1700000000000).getTime())
  assert.equal(notificationTime(null),null);assert.equal(notificationTime(''),null)
})
test('account errors and unknown values are not presented as zero balances',()=>{
  assert.equal(accountPrice(0),'—');assert.equal(accountPrice(null),'—');assert.equal(accountPrice('24.5'),'24.5');
  assert.equal(accountNumber(null),'—');assert.equal(accountNumber('bad'),'—');assert.equal(accountNumber(0),'0')
  assert.deepEqual(snapshotIssue({error:'auth',warnings:['auth','spot failed'],partial:true}),['auth','spot failed'])
})
test('cancel is offered only for an identified active Alpaca order',()=>{
  assert.equal(canCancelAccountOrder({id:'owned-order',status:'partially_filled'}),true)
  for(const status of ['filled','canceled','pending_cancel','expired','rejected'])assert.equal(canCancelAccountOrder({id:'order',status}),false)
  assert.equal(canCancelAccountOrder({status:'new'}),false)
})
