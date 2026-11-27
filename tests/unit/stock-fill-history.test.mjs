import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {computed,reactive,ref} from 'vue'
import {stockSymbolsMatch,stockFillRows} from '../../src/utils/stockRecords.js'
import {validateAlpacaOrder} from '../../src/utils/alpacaOrder.js'
import {watchlistAssetKey} from '../../src/utils/watchlistAssets.js'

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
