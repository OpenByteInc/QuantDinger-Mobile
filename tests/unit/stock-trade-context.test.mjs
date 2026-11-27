import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import messages from '../../src/locales/account-ui.js'
import { forthrightStockOrderIssue, forthrightBuyingPower } from '../../src/utils/forthright.js'
import { buildStockOrder, validateStockOrder, stockQuantityPrecision, STOCK_OPEN_STATUSES } from '../../src/utils/stockOrder.js'
import { US_STOCK_BROKER_IDS, HK_STOCK_BROKER_IDS, isDirectOpenApiBroker, brokerCurrency } from '../../src/constants/exchanges.js'
import { stockSymbolsMatch, stockFillRows } from '../../src/utils/stockRecords.js'

const script = readFileSync(new URL('../../src/components/StockTradePanel.vue', import.meta.url), 'utf8').split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm, '').replace('export default', 'return')
const brokerReads=[]
const brokerApi=Object.fromEntries(['account','positions','orders','fills'].map(kind=>[kind,async(...args)=>{brokerReads.push({kind,args});return {data:{}}}]))
const options = new Function('showToast', 'forthrightErrorMessage', 'buildStockOrder', 'validateStockOrder', 'stockQuantityPrecision', 'STOCK_OPEN_STATUSES', 'ExchangeLogo', 'AlpacaTradePanel', 'forthrightStockOrderIssue', 'US_STOCK_BROKER_IDS', 'HK_STOCK_BROKER_IDS', 'brokerApi', 'isDirectOpenApiBroker', 'brokerCurrency', 'stockSymbolsMatch', 'stockFillRows', script)(()=>{}, error=>error.message, buildStockOrder, validateStockOrder, stockQuantityPrecision, STOCK_OPEN_STATUSES, null, null, forthrightStockOrderIssue, US_STOCK_BROKER_IDS, HK_STOCK_BROKER_IDS, brokerApi, isDirectOpenApiBroker, brokerCurrency, stockSymbolsMatch, stockFillRows)
function panel() {
  const vm = { ...options.data(), market: 'HKStock', symbol: '03690', $route: { query: { credential_id: '18', exchange_id: 'forthright' } }, $t: key => key }
  for (const [name, method] of Object.entries(options.methods)) vm[name] = method.bind(vm)
  return vm
}

test('Forthright buys use total buying power, not original-currency cash', () => {
  const input = {account:{currency:'USD', buying_power:1000, available_cash:0}, market:'USStock', quantity:2, orderType:'limit', price:100, side:'buy'}
  assert.equal(forthrightStockOrderIssue(input), '')
  assert.equal(forthrightStockOrderIssue({...input, quantity:11}), 'brokerAccounts.forthright.insufficientBuyingPower')
  assert.equal(forthrightStockOrderIssue({...input, account:{currency:'USD',buying_power:0,cash:1000}}), 'brokerAccounts.forthright.insufficientBuyingPower')
  assert.equal(forthrightStockOrderIssue({...input, market:'HKStock'}), 'brokerAccounts.forthright.invalidSnapshot')
  assert.equal(forthrightStockOrderIssue({...input, market:'HKStock',quantity:1.5}), 'brokerAccounts.invalidOrder')
  assert.equal(forthrightStockOrderIssue({...input, quantity:1.00001}), 'brokerAccounts.invalidOrder')
  assert.equal(forthrightStockOrderIssue({...input, orderType:'market', referencePrice:0}), 'brokerAccounts.forthright.referencePriceRequired')
  assert.equal(forthrightStockOrderIssue({...input, side:'sell',account:null}), '')
  for (const value of [undefined,null,'','invalid',Infinity]) assert.equal(forthrightBuyingPower({currency:'USD',buying_power:value,cash:1000},'USD'),null)
})

test('Forthright preflight does not change existing broker submission rules', () => {
  const vm=panel()
  vm.form={quantity:1,orderType:'limit',price:100}
  vm.account={currency:'HKD',buying_power:0,cash:1000}
  for(const exchange_id of ['alpaca','tiger','webull','ibkr']) {
    vm.selectedCredential={id:1,exchange_id}
    assert.equal(vm.orderIssue('buy'),'')
  }
  vm.selectedCredential={id:18,exchange_id:'forthright'}
  assert.equal(vm.orderIssue('buy'),'brokerAccounts.forthright.insufficientBuyingPower')
})

test('an account detail link selects its credential ahead of the default broker', () => {
  const vm = panel()
  vm.applyRequestedAccount([{ id: 1, exchange_id: 'alpaca' }, { id: 18, exchange_id: 'forthright' }])
  assert.equal(vm.selectedCredentialId, 18)
})

test('mounting after asynchronous credential loading preserves the requested account', async () => {
  const vm=panel()
  vm.credentials=[{id:18,exchange_id:'forthright'},{id:13,exchange_id:'alpaca'}]
  vm.credentialsStore={items:vm.credentials}
  vm.$route.query={credential_id:'13',exchange_id:'alpaca'}
  vm.refresh=async()=>{}
  await options.mounted.call(vm)
  assert.equal(vm.selectedCredentialId,13)
})

test('stock account picker includes all eligible brokers and excludes IBKR and futures', () => {
  const items = [
    {id:1,exchange_id:'alpaca'}, {id:2,exchange_id:'tiger'}, {id:3,exchange_id:'webull'},
    {id:18,exchange_id:'forthright',account_type:'securities'},
    {id:19,exchange_id:'forthright',account_type:'futures'}, {id:4,exchange_id:'ibkr'},
    {id:5,exchange_id:'binance'}
  ]
  for (const [market,expected] of [['USStock',[1,2,3,18]],['HKStock',[2,18]]]) {
    const vm=panel();vm.market=market;vm.credentialsStore={items}
    vm.supportedIds=options.computed.supportedIds.call(vm)
    assert.deepEqual(options.computed.credentials.call(vm).map(item=>item.id),expected)
  }
})

test('ordinary US chart entry uses the same broker selector as an account deep link', () => {
  const chart=readFileSync(new URL('../../src/views/indicator/Chart.vue',import.meta.url),'utf8')
  assert.doesNotMatch(chart, /AlpacaTradePanel|isDirectBrokerContext/)
  assert.match(chart, /<ChartTradePanel v-if="tradeProductReady"/)
  const stock=readFileSync(new URL('../../src/components/StockTradePanel.vue',import.meta.url),'utf8')
  assert.match(stock, /<AlpacaTradePanel[^>]+:credential-id="selectedCredential.id"/)
})

test('confirmed picker selection persists the exact broker and ignores unsupported account IDs', () => {
  const vm=panel(),replacements=[]
  vm.credentials=[{id:1,exchange_id:'alpaca'},{id:18,exchange_id:'forthright'}]
  vm.$router={replace:location=>replacements.push(location)}
  vm.selectCredential({selectedOptions:[{value:18}]})
  assert.equal(vm.selectedCredentialId,18)
  assert.equal(replacements[0].query.credential_id,18)
  assert.equal(replacements[0].query.exchange_id,'forthright')
  vm.selectCredential({selectedOptions:[{value:19}]})
  assert.equal(replacements.length,1)
  vm.brokerBusy=true
  vm.selectCredential({selectedOptions:[{value:1}]})
  assert.equal(vm.selectedCredentialId,18)
})

test('direct broker reads stay scoped to the selected account and Forthright market currency', async () => {
  const vm=panel()
  brokerReads.length=0
  for (const exchange_id of ['tiger','webull','forthright']) {
    const credential={id:18,exchange_id}
    await vm.request('account',{},credential,'USStock')
    assert.deepEqual(brokerReads.at(-1),{kind:'account',args:[exchange_id,18,exchange_id==='forthright'?{currency:'USD'}:{}]})
    await vm.request('positions',{},credential,'USStock')
    assert.deepEqual(brokerReads.at(-1),{kind:'positions',args:[exchange_id,18,{}]})
  }
  await vm.request('account',{}, {id:20,exchange_id:'forthright'},'HKStock')
  assert.deepEqual(brokerReads.at(-1),{kind:'account',args:['forthright',20,{currency:'HKD'}]})
})

test('switching stock context clears the previous quantity and limit price', () => {
  const vm=panel();let refreshed=0
  vm.form.quantity=100;vm.form.price=200;vm.error='previous'
  vm.refresh=()=>refreshed++
  options.watch.tradeContext.call(vm)
  assert.equal(vm.form.quantity,'')
  assert.equal(vm.form.price,'')
  assert.equal(vm.error,'')
  assert.equal(refreshed,1)
})

test('Alpaca continues to own its existing order preview and account validation', async () => {
  const vm=panel();vm.selectedCredential={id:1,exchange_id:'alpaca'}
  vm.request=()=>assert.fail('Alpaca embedded panel owns its reads')
  await vm.refresh()
  const source=readFileSync(new URL('../../src/components/AlpacaTradePanel.vue',import.meta.url),'utf8')
  assert.match(source,/props.credentialId!=null/)
  assert.match(source,/validateAlpacaOrder\(payload/)
  assert.match(source,/await openReview\(payload\)/)
})

test('chart records normalize HK codes and exclude unrelated symbols and markets', () => {
  const vm = panel()
  assert.equal(vm.matchesSymbol({ symbol: '3690.HK', market: 'HKStock' }), true)
  assert.equal(vm.matchesSymbol({ symbol: '03690', market: 'HK' }), true)
  assert.equal(vm.matchesSymbol({ symbol: '03690', market: 'USStock' }), false)
  assert.equal(vm.matchesSymbol({ symbol: 'AAPL', market: 'USStock' }), false)
  vm.symbol = 'AAPL'; vm.market = 'USStock'
  assert.equal(vm.matchesSymbol({ symbol: 'AAPL', market: 'NASDAQ' }), true)
})

test('missing financial values remain unavailable while zero is valid', () => {
  const vm = panel()
  for (const value of [null, undefined, '', NaN]) assert.equal(vm.amount(value), '—')
  assert.notEqual(vm.amount(0), '—')
  assert.equal(vm.quantity(null), '—')
})

test('HK aliases match without crossing markets or merging US share classes', () => {
  const vm=panel();vm.symbol='00700'
  for(const symbol of ['700','00700.HK','HK.00700','HKStock:00700']) assert.equal(vm.matchesSymbol({symbol}),true)
  assert.equal(vm.matchesSymbol({symbol:'USStock:00700'}),false)
  vm.market='USStock';vm.symbol='BRK.B';vm.selectedCredential={exchange_id:'alpaca'}
  assert.equal(vm.matchesSymbol({symbol:'BRK/B'}),true)
  for(const symbol of ['BRKB','BRK-B']) assert.equal(vm.matchesSymbol({symbol}),false)
})

test('each direct broker reads account-scoped fills for trade history', async () => {
  for(const exchange_id of ['tiger','webull','forthright']) {
    const vm=panel();vm.selectedCredential={id:18,exchange_id};vm.displaySymbol='03690';vm.tradeContext='18:HKStock:03690'
    await vm.loadHistory()
    assert.deepEqual(brokerReads.at(-1),{kind:'fills',args:[exchange_id,18,{symbol:'03690',limit:100}]})
  }
})

test('history shows filled shares and retains partial cancelled fills', async () => {
  const vm=panel();vm.tradeContext='18:HKStock:03690';vm.displaySymbol='03690'
  vm.request=async()=>({data:[
    {id:'partial',symbol:'03690.HK',quantity:100,filled_qty:20,filled_avg_price:24,status:'cancelled',commission:1,commission_ccy:'HKD'},
    {id:'unfilled',symbol:'03690.HK',quantity:100,filled_qty:0}
  ]})
  await vm.loadHistory()
  assert.equal(vm.history.length,1)
  assert.equal(vm.history[0].quantity,20)
  assert.equal(vm.history[0].filled_avg_price,24)
  assert.equal(vm.history[0].fee_amount,1)
})

test('late history from another account cannot replace current records', async () => {
  const vm=panel();vm.tradeContext='18:HKStock:03690';vm.refresh=async()=>{}
  let release
  vm.request=()=>new Promise(resolve=>{release=resolve})
  const pending=vm.loadHistory()
  vm.tradeContext='19:HKStock:03690';vm.history=[{id:'current'}]
  release({data:[{id:'old',filled_qty:100}]})
  await pending
  assert.deepEqual(vm.history,[{id:'current'}])
})

test('slow responses from the previous account cannot overwrite the selected account', async () => {
  const vm = panel()
  vm.selectedCredential = { id: 18, exchange_id: 'forthright' }
  let release
  const gate = new Promise(resolve => { release = resolve })
  vm.request = async (kind, params, credential) => {
    if (kind === 'account' && credential.id === 18) await gate
    return { data: kind === 'account' ? { account_id: credential.id } : [] }
  }
  const refreshing = vm.refresh()
  vm.selectedCredential = { id: 20, exchange_id: 'forthright' }
  release()
  await refreshing
  assert.equal(vm.account.account_id, 20)
  assert.equal(vm.busy, false)
})

test('every mobile language supplies submitted and open status labels', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']) {
    assert.ok(messages[locale].status.submitted)
    assert.ok(messages[locale].status.open)
  }
})

test('preview freezes payload, cancel sends nothing and context change invalidates it', async () => {
  const vm=panel()
  vm.ready=true;vm.canSubmit=true;vm.displaySymbol='03690';vm.selectedCredential={id:18,exchange_id:'forthright'}
  vm.currency='HKD';vm.validateOrder=()=>'';vm.refresh=async()=>{}
  vm.lotSize=100;vm.form={quantity:1,orderType:'limit',price:60}
  const first=vm.submit('buy')
  assert.equal(vm.review.quantity,100)
  assert.equal(vm.review.price,60)
  assert.equal(vm.reviewOpen,true)
  vm.form.quantity=20
  assert.equal(vm.review.quantity,100)
  vm.resolveReview(false)
  await first
  assert.equal(vm.busy,false)
  const second=vm.submit('buy')
  vm.selectedCredential={id:20,exchange_id:'tiger'}
  vm.resolveReview(true)
  await second
  assert.equal(vm.busy,false)
})

test('confirmed amount preview routes exact shares to each direct broker account', async () => {
  const calls=[]
  brokerApi.placeOrder=async(...args)=>{calls.push(args);return {data:{}}}
  for(const exchange_id of ['tiger','webull','forthright']) {
    const vm=panel()
    Object.assign(vm,{market:'USStock',symbol:'AAPL',displaySymbol:'AAPL',currency:'USD',chartPrice:200,ready:true,canSubmit:true,selectedCredential:{id:18,exchange_id},account:{currency:'USD',buying_power:1000},symbolPositions:[],symbolOrders:[]})
    vm.form={inputMode:'amount',notional:1000,orderType:'limit',price:300}
    vm.refresh=async()=>{}
    const request=vm.submit('buy')
    assert.equal(calls.length,['tiger','webull','forthright'].indexOf(exchange_id))
    const previewQty=vm.review.quantity
    vm.form.notional=2000
    vm.resolveReview(true)
    await request
    const [broker,id,payload]=calls.at(-1)
    assert.equal(broker,exchange_id)
    assert.equal(id,18)
    assert.equal(payload.quantity,previewQty)
    assert.equal(payload.price,300)
    assert.equal(payload.notional,undefined)
    assert.equal(vm.tab,'orders')
    assert.equal(vm.busy,false)
  }
  delete brokerApi.placeOrder
})
