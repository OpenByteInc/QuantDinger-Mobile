import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildOrder,validateOrder,tradeProductFields,isCryptoProduct,OPEN_ORDER_STATUSES} from '../../src/utils/tradeOrder.js'
import {toCandles,signalPoints,toTimestamp} from '../../src/utils/chartData.js'
import {createPlotRenderer} from '../../src/utils/pcPlotRenderer.js'
import audit from '../../src/locales/audit.js'
import {buildOAuthStartUrl} from '../../src/utils/oauthUrl.js'

const form={amount:'100',sell_quantity:'',price:'65000',leverage:'5',order_type:'market',margin_mode:'cross',tp_price:'70000',sl_price:'60000'}
const order=overrides=>buildOrder({credentialId:7,symbol:'BTC/USDT',marketType:'swap',form,side:'buy',aiDecisionFilter:true,...overrides})
const context={available:482.71,price:65000,balanceReady:true}
test('native OAuth always opens an absolute URL after the fixed API host was removed',()=>{
 assert.equal(buildOAuthStartUrl({baseUrl:'',webOrigin:'https://m.quantdinger.com',provider:'google',redirectUri:'com.quantdinger.mobile://login'}),'https://m.quantdinger.com/api/auth/oauth/google?redirect=com.quantdinger.mobile%3A%2F%2Flogin')
 assert.equal(buildOAuthStartUrl({baseUrl:'https://api.example.com/',webOrigin:'https://m.example.com',provider:'google',redirectUri:'com.quantdinger.mobile://login'}),'https://api.example.com/api/auth/oauth/google?redirect=com.quantdinger.mobile%3A%2F%2Flogin')
 assert.throws(()=>buildOAuthStartUrl({provider:'google',redirectUri:'x'}),/absolute HTTP\(S\) origin/)
})
test('quick trade payload matches the PC contract including AI filter and margin',()=>{
 assert.deepEqual(order(),{credential_id:7,symbol:'BTC/USDT',market_type:'swap',side:'buy',order_type:'market',amount:100,price:0,leverage:5,margin_mode:'cross',tp_price:70000,sl_price:60000,source:'indicator',ai_decision_filter:true})
 assert.equal(validateOrder(order(),context),'')
})
test('spot orders cannot inherit derivative leverage or margin mode',()=>{
 const result=order({marketType:'spot'});assert.equal(result.leverage,1);assert.equal(result.margin_mode,undefined)
})
test('exchange equity orders cannot be submitted as crypto',()=>{
 assert.throws(()=>order({marketType:'spot',product:{instrument_id:'rAAPLUSDT',product_type:'tokenized_equity',api_family:'reality'}}),/account_ui.unsupported/)
})
test('Alpaca accounts load on first mount and remember the selected credential',()=>{
 const source=readFileSync(new URL('../../src/components/AlpacaTradePanel.vue',import.meta.url),'utf8')
 assert.match(source,/onMounted\(start\)/);assert.match(source,/onActivated\(start\)/);assert.match(source,/localStorage\.setItem\(ACCOUNT_STORAGE_KEY,id\)/)
})
test('spot sell sends an exact base quantity and validates against base holdings',()=>{
 const result=order({marketType:'spot',side:'sell',form:{...form,amount:'',sell_quantity:'0.001',tp_price:'',sl_price:''}})
 assert.equal(result.quantity,0.001);assert.equal(result.amount,0)
 assert.equal(validateOrder(result,{available:0.002,price:65000,balanceReady:true}),'')
 assert.equal(validateOrder(result,{available:0.0005,price:65000,balanceReady:true}),'audit.insufficientBalance')
})
test('spot buy can send an exact base quantity',()=>{
 const result=order({marketType:'spot',side:'buy',form:{...form,amount:'',buy_input_mode:'quantity',buy_quantity:'0.001',tp_price:'',sl_price:''}})
 assert.equal(result.quantity,0.001);assert.equal(result.amount,0)
 assert.equal(validateOrder(result,{available:0.002,price:65000,balanceReady:true}),'')
})
test('spot sell can send a quote amount',()=>{
 const result=order({marketType:'spot',side:'sell',form:{...form,sell_input_mode:'amount',sell_amount:'50',tp_price:'',sl_price:''}})
 assert.equal(result.quantity,undefined);assert.equal(result.amount,50)
 assert.equal(validateOrder(result,{available:100,price:65000,balanceReady:true}),'')
})
test('invalid amount, price, leverage and disconnected balances prevent order submission',()=>{
 for(const amount of ['','0','-1','Infinity','NaN'])assert.ok(validateOrder(order({form:{...form,amount}}),context))
 for(const leverage of ['0','126','1.5','Infinity'])assert.ok(validateOrder(order({form:{...form,leverage}}),context))
 assert.equal(validateOrder(order(),{...context,balanceReady:false}),'audit.stale')
 assert.equal(validateOrder(order({form:{...form,amount:483}}),context),'audit.insufficientBalance')
 assert.ok(validateOrder(order({form:{...form,order_type:'limit',price:0}}),context))
})
test('TP and SL validation distinguishes long and short against execution price',()=>{
 assert.equal(validateOrder(order({side:'sell'}),context),'audit.invalidRisk')
 assert.equal(validateOrder(order({side:'sell',form:{...form,tp_price:'60000',sl_price:'70000'}}),context),'')
 assert.equal(validateOrder(order({form:{...form,order_type:'limit',price:72000}}),context),'audit.invalidRisk')
 assert.equal(validateOrder(order({form:{...form,tp_price:'NaN'}}),context),'audit.invalidRisk')
})
test('PC pending status set excludes filled, cancelled and AI rejected trades',()=>{
 for(const status of ['new','open','pending','submitted','partially_filled','accepted','cancel_pending'])assert.ok(OPEN_ORDER_STATUSES.has(status))
 for(const status of ['filled','canceled','failed','ai_rejected'])assert.equal(OPEN_ORDER_STATUSES.has(status),false)
})
test('candles preserve missing values and normalize seconds, milliseconds and ISO dates',()=>{
 assert.equal(toTimestamp(1790000000),1790000000000)
 assert.equal(toTimestamp(1790000000000),1790000000000)
 assert.equal(toTimestamp('2026-09-21T00:00:00Z'),Date.parse('2026-09-21T00:00:00Z'))
 assert.equal(toTimestamp(null),null)
 assert.equal(toCandles([{time:'invalid',open:1,high:2,low:1,close:2}]).length,0)
})
test('signal flags anchor to candle prices and numeric prices remain actual prices',()=>{
 const candles=toCandles([{time:1790000000,open:100,high:105,low:95,close:101},{time:1790003600,open:102,high:110,low:100,close:107}])
 const points=signalPoints([{name:'buy',type:'buy',data:[true,null]},{name:'sell',type:'sell',data:[false,109]}],candles)
 assert.equal(points.length,2);assert.equal(points[0].value,95);assert.equal(points[1].value,109)
})
test('custom plot values align by candle time after history window changes',()=>{
 const renderer=createPlotRenderer({value:'light'})
 const result=renderer.buildAlignedPlotRows([{timestamp:1000},{timestamp:2000},{timestamp:3000}],{ema:[null,10,20]},[{timestamp:2000},{timestamp:3000}])
 assert.deepEqual(result,[{ema:10},{ema:20}])
})
test('six factor lamps have six independent labeled lanes and retain runtime colors',()=>{
 const renderer=createPlotRenderer({value:'dark'})
 const plots=['MACD','KDJ','RSI','LWR','BBI','MTM'].flatMap(name=>['red','green'].map(color=>({name:name+' '+color,type:'lamp',overlay:false,color,data:[{value:1,color},null]})))
 const bundle=renderer.build(2,plots,'Six Factor')
 assert.equal(bundle.lampBeltMeta.laneCount,6);assert.deepEqual(bundle.lampBeltMeta.laneKeys,['MACD','KDJ','RSI','LWR','BBI','MTM'])
 assert.equal(bundle.plotDataMap.macd_red__color[0],'red');assert.equal(bundle.plotDataMap.macd_red[1],null)
 assert.equal(typeof bundle.extra.draw,'function')
})
test('all mobile audit copy is translated in all five languages',()=>{
 const leaves=value=>Object.values(value).flatMap(x=>typeof x==='object'?leaves(x):[x])
 const english=Object.keys(audit['en-US'])
 for(const lang of ['zh-CN','zh-TW','en-US','ja-JP','ko-KR']){assert.deepEqual(Object.keys(audit[lang]),english);assert.ok(leaves(audit[lang]).every(value=>typeof value==='string'&&value.length>0))}
})

function loadPanel(api,dialog=async()=>{}){
 const source=readFileSync(new URL('../../src/components/ChartTradePanel.vue',import.meta.url),'utf8').split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm,'').replace('export default','return')
 const store={selectedCredentialId:7,marketType:'swap',balance:null,history:[],positions:[],setBalance(value){this.balance=value},setHistory(value){this.history=value},setPositions(value){this.positions=value}}
 const options=new Function('quickTradeApi','showConfirmDialog','showToast','ExchangeLogo','EventRadar','buildOrder','validateOrder','tradeProductFields','OPEN_ORDER_STATUSES',source)(api,dialog,()=>{},null,null,buildOrder,validateOrder,tradeProductFields,OPEN_ORDER_STATUSES)
 const vm={...options.data(),quickTradeStore:store,selectedCredentialId:7,selectedCredential:{id:7,name:'Gate'},selectedCredentialLabel:'Gate',isCrypto:true,normalizedSymbol:'BTC/USDT',marketType:'swap',livePrice:65000,$t:key=>key,form:{...form},$emit:()=>{}}
 for(const [name,method] of Object.entries(options.methods))vm[name]=method.bind(vm)
 vm.openOrderReview=async()=>{try{await dialog();return true}catch{return false}}
 Object.defineProperty(vm,'activeBalanceAvailable',{get:()=>Number(store.balance?.available||0)})
 Object.defineProperty(vm,'sellQuantity',{get:()=>options.computed.sellQuantity.call(vm)})
 Object.defineProperty(vm,'positions',{get:()=>store.positions})
 return vm
}
test('switching accounts ignores slow old balance, history and positions responses',async()=>{
 let resolveOld
 const old=new Promise(resolve=>{resolveOld=resolve})
 const api={getBalance:id=>id===7?old:Promise.resolve({data:{available:20}}),getHistory:async()=>({data:[]}),getPosition:async()=>({data:[]}),getAiDecisions:async()=>({data:[]})}
 const panel=loadPanel(api);const first=panel.refreshTradeData();panel.selectedCredentialId=8;await panel.refreshTradeData();resolveOld({data:{available:900}});await first
 assert.equal(panel.quickTradeStore.balance.available,20);assert.equal(panel.balanceReady,true)
})
test('failed balance refresh removes stale balance and cannot enable orders',async()=>{
 const panel=loadPanel({getBalance:async()=>{throw new Error('offline')},getHistory:async()=>({data:[]}),getPosition:async()=>({data:[]}),getAiDecisions:async()=>({data:[]})})
 panel.quickTradeStore.balance={available:1000};panel.balanceReady=true;await panel.refreshTradeData()
 assert.equal(panel.balanceReady,false);assert.equal(panel.quickTradeStore.balance,null);assert.equal(panel.dataError,'audit.loadFailed')
})
test('cancelled order review never sends a mutation',async()=>{
 let calls=0;const panel=loadPanel({placeOrder:async()=>calls++},async()=>{throw 'cancel'})
 panel.balanceReady=true;panel.quickTradeStore.balance={available:500};await panel.confirmOrder('buy');assert.equal(calls,0);assert.equal(panel.submitting,false)
})

test('background account refresh retains the displayed balance and entered order',async()=>{
 let rejectBalance
 const pending=new Promise((_,reject)=>{rejectBalance=reject})
 const api={getBalance:()=>pending,getHistory:async()=>({data:[]}),getPosition:async()=>({data:[]}),getAiDecisions:async()=>({data:[]})}
 const panel=loadPanel(api);panel.contextKey=JSON.stringify([7,'swap','BTC/USDT','','','']);panel.balanceReady=true;panel.quickTradeStore.balance={available:500}
 const refreshing=panel.refreshTradeData()
 assert.equal(panel.balanceReady,true);assert.equal(panel.activeBalanceAvailable,500);assert.equal(panel.form.amount,'100')
 rejectBalance(new Error('offline'));await refreshing
 assert.equal(panel.balanceReady,true);assert.equal(panel.activeBalanceAvailable,500);assert.equal(panel.form.amount,'100')
})

test('spot sell percentage uses the base asset holdings rather than available USDT',()=>{
 const panel=loadPanel({});panel.marketType='spot';panel.quickTradeStore.balance={available:500};panel.quickTradeStore.positions=[{symbol:'BTC/USDT',quantity:0.01},{symbol:'ETH/USDT',quantity:10}]
 assert.equal(panel.availableForSide('sell'),0.01)
 assert.equal(panel.maxNotional('sell'),650)
 panel.setAmountByPercent(50,'sell');assert.equal(Number(panel.form.sell_quantity),0.005)
 assert.equal(panel.availableForSide('buy'),500)
 assert.equal(panel.maxNotional('buy'),500)
 panel.setAmountByPercent(50,'buy');assert.equal(Number(panel.form.amount),250)
})

test('spot quantity and amount modes calculate side-specific capacity',()=>{
 const panel=loadPanel({});panel.marketType='spot';panel.quickTradeStore.balance={available:650};panel.quickTradeStore.positions=[{symbol:'BTC/USDT',quantity:0.01}]
 panel.form.buy_input_mode='quantity';panel.form.sell_input_mode='amount';panel.form.buy_quantity='';panel.form.sell_amount=''
 assert.equal(panel.availableForSide('buy'),0.01);assert.equal(panel.availableForSide('sell'),650)
 panel.setAmountByPercent(50,'buy');panel.setAmountByPercent(50,'sell')
 assert.equal(Number(panel.form.buy_quantity),0.005);assert.equal(Number(panel.form.sell_amount),325)
})

test('perpetual buy and sell capacity is displayed as balance times leverage',()=>{
 const panel=loadPanel({});panel.quickTradeStore.balance={available:482.64};panel.form.leverage='5'
 assert.equal(panel.maxNotional('buy'),2413.2);assert.equal(panel.maxNotional('sell'),2413.2)
})
test('derivative position PnL falls back to mark price and ROE uses margin principal',()=>{
 const panel=loadPanel({});panel.livePrice=84374
 const long={side:'long',size:0.1311,entry_price:84458.2,mark_price:84374,leverage:5,unrealized_pnl:0}
 const expected=(84374-84458.2)*0.1311
 assert.ok(Math.abs(panel.positionPnl(long)-expected)<1e-9)
 assert.ok(Math.abs(panel.positionPnlPercent(long)-(expected/(84458.2*0.1311/5)*100))<1e-9)
 assert.ok(panel.positionPnl({...long,side:'short'})>0)
 assert.equal(panel.positionPnl({...long,unrealized_pnl:-12.5}),-12.5)
})
test('realized PnL is shown only for derivative closing trades',()=>{
 const panel=loadPanel({})
 assert.equal(panel.showRealizedPnl({market_type:'swap',is_close:true,realized_pnl:0}),true)
 assert.equal(panel.showRealizedPnl({market_type:'swap',is_close:true,realized_pnl:null}),false)
 assert.equal(panel.showRealizedPnl({market_type:'spot',is_close:true,realized_pnl:12}),false)
 assert.equal(panel.historySideText({market_type:'spot',side:'sell'}),'chart_trade.sell')
 assert.equal(panel.historySideText({market_type:'swap',is_close:true,close_side:'short'}),'chart_trade.close_short')
})

test('direct buy and sell actions send their own side without resetting the entered limit order',async()=>{
 for(const side of ['buy','sell']){
  const sent=[]
  const api={placeOrder:async payload=>sent.push(payload),getBalance:async()=>({data:{available:500}}),getHistory:async()=>({data:[]}),getPosition:async()=>({data:[]}),getAiDecisions:async()=>({data:[]})}
  const panel=loadPanel(api);panel.balanceReady=true;panel.quickTradeStore.balance={available:500};panel.form={...form,order_type:'limit',price:'65000',tp_price:'',sl_price:''}
  await panel.confirmOrder(side)
  assert.equal(sent.length,1);assert.equal(sent[0].side,side);assert.equal(sent[0].order_type,'limit');assert.equal(sent[0].price,65000);assert.equal(sent[0].amount,100)
 }
})
test('account change during order confirmation blocks the reviewed order',async()=>{
 let calls=0,panel;panel=loadPanel({placeOrder:async()=>calls++},async()=>{panel.contextKey='changed'})
 panel.balanceReady=true;panel.quickTradeStore.balance={available:500};await panel.confirmOrder('buy');assert.equal(calls,0)
})
import {rankStrategies,strategyCurrency,contractChanged} from '../../src/utils/strategyDisplay.js'
test('conservative strategy ranking uses drawdown magnitude and places missing results last',()=>{
 const items=[{id:1,max_drawdown:-12.4,total_return:36.8},{id:2,max_drawdown:-4,total_return:10},{id:3,max_drawdown:null,total_return:null}]
 assert.deepEqual(rankStrategies(items,'stable').map(x=>x.id),[2,1,3]);assert.deepEqual(items.map(x=>x.id),[1,2,3]);assert.equal(rankStrategies(items,'balanced')[0].id,1)
})
test('strategy totals preserve quote currencies and do not assume every asset is USD',()=>{
 assert.equal(strategyCurrency({symbol:'BTC/USDT'}),'USDT');assert.equal(strategyCurrency({market:'AStock',symbol:'600519.SH'}),'CNY');assert.equal(strategyCurrency({symbol:'SPY'}),'')
})

test('editing detects a changed instrument, frequency or market type before adopting a source',()=>{
 const deployed={symbol:'BTC/USDT',timeframe:'1m',marketType:'swap'}
 assert.equal(contractChanged(deployed,{symbol:'ETH/USDT',timeframe:'15m',marketType:'spot'}),true)
 assert.equal(contractChanged(deployed,{...deployed,timeframe:'1M'}),true)
 assert.equal(contractChanged(null,deployed),false)
})


test('background refresh preserves an actionable order error until the account context changes',async()=>{
 const api={getBalance:async()=>({data:{available:500}}),getHistory:async()=>({data:[]}),getPosition:async()=>({data:[]}),getAiDecisions:async()=>({data:[]}),placeOrder:async()=>{throw Object.assign(new Error('400'),{localizedMessage:'quantity: Unknown field.'})}}
 const panel=loadPanel(api);await panel.refreshTradeData();await panel.confirmOrder('buy')
 assert.equal(panel.orderError,'quantity: Unknown field.')
 await panel.refreshTradeData();assert.equal(panel.orderError,'quantity: Unknown field.')
 panel.selectedCredentialId=8;await panel.refreshTradeData();assert.equal(panel.orderError,'')
})
