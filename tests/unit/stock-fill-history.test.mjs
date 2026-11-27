import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {computed,reactive,ref} from 'vue'
import {stockSymbolsMatch,stockFillRows} from '../../src/utils/stockRecords.js'
import {validateAlpacaOrder} from '../../src/utils/alpacaOrder.js'
import {watchlistAssetKey} from '../../src/utils/watchlistAssets.js'

test('mobile fills preserve allocated fees, currency and pending evidence', () => {
  const rows = stockFillRows([
    { filled_qty: 100, commission: 65.48, commission_ccy: 'HKD', fee_status: 'actual' },
    { filled_qty: 1, fee_amount: 0, fee_currency: 'USD', fee_status: 'actual_zero' },
    { filled_qty: 20, fee_status: 'pending' }
  ])
  assert.equal(rows[0].fee_amount, 65.48)
  assert.equal(rows[0].fee_currency, 'HKD')
  assert.equal(rows[1].fee_amount, 0)
  assert.equal(rows[1].fee_status, 'actual_zero')
  assert.equal(rows[2].fee_amount, undefined)
})

test('mobile strategy fees do not present pending fees as zero', () => {
  const source = readFileSync(new URL('../../src/views/trading/StrategyDetail.vue', import.meta.url), 'utf8')
  const method = source.match(/tradeFeeText\(item\) \{([\s\S]*?)\n    \}/)[1]
  const format = new Function('item', method)
  const context = { currency: 'HKD', finite: v => v == null ? null : Number(v), money: v => Number(v).toFixed(2) }
  assert.equal(format.call(context, { commission_quote: 65.48, fee_status: 'actual' }), '65.48 HKD')
  assert.equal(format.call(context, { commission: 0, fee_status: 'pending' }), '—')
  assert.equal(format.call(context, { commission: 0, fee_status: 'actual_zero' }), '0.00 HKD')
})

test('HK-prefixed saved selections match fills and canonical search results', () => {
  assert.ok(stockSymbolsMatch('HK07709', '07709.HK', 'HKStock', 'forthright'))
  assert.ok(!stockSymbolsMatch('HK07709', '07709.HK', 'USStock', 'alpaca'))
  assert.equal(watchlistAssetKey({asset_id:1,market:'HKStock',symbol:'HK07709'}),
    watchlistAssetKey({asset_id:2,market:'HKStock',symbol:'07709'}))
})

const script=readFileSync(new URL('../../src/components/AlpacaTradePanel.vue',import.meta.url),'utf8')
  .split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm,'')
function panel(api) {
  return new Function('deps',`const {computed,reactive,ref,stockSymbolsMatch,stockFillRows,alpacaApi}=deps;
    const watch=()=>{},onMounted=()=>{},onBeforeUnmount=()=>{},onActivated=()=>{},onDeactivated=()=>{};
    const defineProps=()=>({symbol:'BRK/B'}),defineEmits=()=>()=>{};
    const useI18n=()=>({t:key=>key,te:()=>false}),useRoute=()=>({query:{}}),useRouter=()=>({});
    ${script}
    return {refresh,selectedId,positions,orders,openOrders,symbolPositions,visibleOrders,activeTab};
  `)({computed,reactive,ref,stockSymbolsMatch,stockFillRows,alpacaApi:api})
}

test('Alpaca history uses fills while pending orders remain separately available',async()=>{
  const calls=[]
  const vm=panel({
    account:async()=>({data:{buying_power:1000}}),
    positions:async()=>({data:[{symbol:'BRK.B',quantity:3},{symbol:'BRKB',quantity:20}]}),
    fills:async params=>{calls.push(params);return {data:[{id:'fill',symbol:'BRK.B',filled_qty:1,filled_avg_price:200},{id:'empty',filled_qty:0}]}},
    orders:async params=>{assert.equal(params.status,'open');return {data:[{id:'pending',symbol:'BRK.B',quantity:2}]}}
  })
  vm.selectedId.value='7'
  await vm.refresh()
  assert.deepEqual(calls,[{credential_id:7,symbol:'BRK/B',limit:100}])
  assert.equal(vm.symbolPositions.value.length,1)
  vm.activeTab.value='history'
  assert.equal(vm.visibleOrders.value[0].quantity,1)
  assert.equal(vm.visibleOrders.value[0].id,'fill')
  vm.activeTab.value='orders'
  assert.equal(vm.visibleOrders.value[0].id,'pending')
})

test('Alpaca share-class aliases also protect sell inventory and pending orders',()=>{
  const order={credential_id:7,symbol:'BRK.B',side:'sell',quantity:1,orderType:'market'}
  const ctx={ready:true,account:{},price:200,positions:[{symbol:'BRK/B',quantity:2}]}
  assert.equal(validateAlpacaOrder(order,ctx),'')
  assert.equal(validateAlpacaOrder(order,{...ctx,openOrders:[{symbol:'BRK/B',side:'sell'}]}),'account_ui.sellAvailable')
  assert.equal(validateAlpacaOrder(order,{...ctx,positions:[{symbol:'BRKB',quantity:20}]}),'account_ui.sellAvailable')
})
