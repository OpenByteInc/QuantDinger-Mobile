<template>
  <div class="account-page account-detail">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="t('profile_detail.details')" left-arrow @click-left="router.back()"><template #right><button class="text-button" :disabled="loading || busy" @click="refresh">{{ t('profile_detail.refresh') }}</button></template></van-nav-bar>
    <div class="detail-content">
      <header v-if="credential" class="account-heading"><ExchangeLogo :exchange="credential.exchange_id" :size="36"/><div><h1>{{ credential.name || brand }}</h1><p>{{ brand }} · {{ environment }}</p></div></header>
      <p class="section-note">{{ t('profile_detail.allAccounts') }}<span v-if="isAlpaca"> · {{ account?.currency || 'USD' }}</span></p>
      <van-loading v-if="loading" class="inline-loading"/>
      <div v-if="errors.length" class="account-errors" role="alert"><b>{{ t('profile_detail.partial') }}</b><p v-for="(error,index) in errors" :key="index">{{ error }}</p><button class="text-button" :disabled="loading" @click="refresh">{{ t('profile_detail.refresh') }}</button></div>
      <p v-if="updated" class="section-note">{{ t('profile_detail.updated',{time:date(updated)}) }}</p>
      <div class="plain-tabs" role="tablist"><button v-for="tab in tabs" :key="tab" role="tab" :aria-selected="activeTab===tab" :class="{active:activeTab===tab}" @click="activeTab=tab; visibleCount=20">{{ t('profile_detail.'+tab) }}</button></div>
      <template v-if="activeTab==='overview'">
        <section v-if="isAlpaca" class="metric-grid"><div v-for="metric in stockMetrics" :key="metric.key"><span>{{ t('profile_detail.'+metric.key) }}</span><strong>{{ metric.value }}</strong></div></section>
        <section v-for="market in markets" v-else :key="market" class="balance-section"><h2>{{ t('profile_detail.'+market) }} <small>{{ balances[market]?.currency || 'USDT' }}</small></h2><div class="metric-grid"><div><span>{{ t('profile_detail.total') }}</span><strong>{{ number(balances[market]?.total,2) }}</strong></div><div><span>{{ t('profile_detail.available') }}</span><strong>{{ number(balances[market]?.available,2) }}</strong></div></div></section>
      </template>
      <template v-else>
        <div v-if="!isAlpaca" class="market-filter"><button v-for="market in ['all','spot','swap']" :key="market" :class="{active:marketFilter===market}" @click="marketFilter=market;visibleCount=20">{{ market==='all'?t('common.all'):t('profile_detail.'+market) }}</button></div>
        <p v-if="activeTab==='history'" class="section-note">{{ t('profile_detail.recent',{count:history.length}) }}</p>
        <article v-for="(row,index) in visibleRows.slice(0,visibleCount)" :key="row.id || row.exchange_order_id || row.symbol+index" class="account-record">
          <header><strong>{{ row.symbol || row.inst_id || '—' }}</strong><span :class="['side', /sell|short/i.test(row.side)?'negative':'positive']">{{ side(row.side) }}</span><small>{{ activeTab==='positions' ? (isAlpaca?t('account_ui.usStocks'):t('profile_detail.'+row._market)) : status(row.status)+(isAlpaca?'':' · '+t('profile_detail.'+row._market)) }}</small></header>
          <dl><div v-for="field in recordFields(row)" :key="field.key"><dt>{{ t('profile_detail.'+field.key) }}</dt><dd>{{ field.value }}</dd></div></dl>
          <footer><button v-if="isAlpaca && activeTab!=='positions' && canCancelAccountOrder(row)" class="text-button danger" :disabled="busy || loading" @click="cancel(row)">{{ t('audit.cancelOrder') }}</button><button v-if="isAlpaca || row.symbol?.includes('/')" class="text-button" @click="openChart(row.symbol,row._market)">{{ t('indicator_chart.view_chart') }} <van-icon name="arrow"/></button></footer>
        </article>
        <p v-if="!loading && !visibleRows.length" class="plain-empty">{{ errors.length?t('audit.loadFailed'):t('profile_detail.empty') }}</p>
        <van-button v-if="visibleRows.length>visibleCount" block plain @click="visibleCount+=20">{{ t('profile_detail.moreReferrals') }}</van-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {showConfirmDialog,showToast} from 'vant'
import {credentialsApi,alpacaApi,quickTradeApi} from '@/api'
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import {EXCHANGE_BRANDS} from '@/constants/exchanges'
import {accountNumber,accountPrice,canCancelAccountOrder,snapshotIssue} from '@/utils/accountDetail'
import {notificationTime} from '@/utils/notificationDetail'
const {t,te,locale}=useI18n(),route=useRoute(),router=useRouter()
const credential=ref(null),account=ref(null),balances=ref({}),positions=ref([]),orders=ref([]),history=ref([]),errors=ref([]),updated=ref(null)
const positionCount=ref(null),recentFills=ref(null)
const loading=ref(false),busy=ref(false),activeTab=ref('overview'),marketFilter=ref('all'),visibleCount=ref(20)
let sequence=0,alive=true
const id=computed(()=>Number(route.params.id)),isAlpaca=computed(()=>credential.value?.exchange_id==='alpaca')
const brand=computed(()=>EXCHANGE_BRANDS[credential.value?.exchange_id]?.name||credential.value?.exchange_id||'')
const environment=computed(()=>t(isAlpaca.value?(/paper/i.test(credential.value?.api_key_hint||'')?'audit.paperMode':'credentials.environment_live'):`credentials.environment_${credential.value?.environment||(credential.value?.enable_demo_trading?'demo':'live')}`))
const markets=computed(()=>isAlpaca.value?[]:credential.value?.market_scope==='spot'?['spot']:credential.value?.market_scope==='swap'?['swap']:['spot','swap'])
const tabs=computed(()=>['overview','positions','orders',...(isAlpaca.value?['history']:[])])
const number=(v,digits=6)=>accountNumber(v,digits,locale.value)
const price=v=>accountPrice(v,locale.value)
const date=v=>notificationTime(v)?.toLocaleString(locale.value)||'—'
const stockMetrics=computed(()=>[
  ...['equity','cash','buyingPower'].map(key=>({key,value:`${number(account.value?.[{equity:'equity',cash:'cash',buyingPower:'buying_power'}[key]],2)} ${account.value?.currency||'USD'}`})),
  {key:'status',value:account.value?.account_blocked||account.value?.trading_blocked?t('account_ui.blocked'):account.value?.status==='ACTIVE'?t('profile_detail.active'):account.value?.status||'—'},
  {key:'positionCount',value:number(positionCount.value,0)}, {key:'recentFills',value:number(recentFills.value,0)}
])
const visibleRows=computed(()=>{const rows=activeTab.value==='positions'?positions.value:activeTab.value==='history'?history.value:orders.value;return isAlpaca.value||marketFilter.value==='all'?rows:rows.filter(r=>r._market===marketFilter.value)})
function side(value){const key=String(value||'').toLowerCase();return key==='buy'?t('audit.buySpot'):key==='sell'?t('audit.sellSpot'):['long','short'].includes(key)?t('profile_detail.'+key):value||'—'}
function status(value){if(value==='open')return t('profile_detail.open');const key='account_ui.status.'+String(value||'').toLowerCase();return te(key)?t(key):value||'—'}
function orderType(value){return ['market','limit'].includes(value)?t('chart_trade.order_'+value):value||'—'}
function recordFields(row){
  if(activeTab.value==='positions')return [
    {key:'quantity',value:number(row.quantity??row.size,8)}, {key:'entry',value:price(row.avg_entry_price??row.entry_price)},
    ...(isAlpaca.value?[{key:'current',value:price(row.current_price)},{key:'value',value:number(row.market_value,2)},{key:'pnl',value:number(row.unrealized_pnl,2)}]:[])
  ]
  return [{key:'orderType',value:orderType(row.order_type||row.orderType)},{key:'quantity',value:number(row.quantity??row.amount)},{key:'price',value:price(row.limit_price??row.price)},{key:'filled',value:number(row.filled_qty??row.filled)},
    ...(isAlpaca.value?[{key:'fillPrice',value:price(row.filled_avg_price)},{key:'submitted',value:date(row.submitted_at)},{key:'filledAt',value:date(row.filled_at)}]:[]),
    {key:'orderId',value:row.id||row.exchange_order_id||'—'}]
}
async function refresh(){
  if(loading.value||!id.value)return
  const token=++sequence,credentialId=id.value;loading.value=true;errors.value=[];positionCount.value=null;recentFills.value=null;account.value=null;balances.value={};positions.value=[];orders.value=[];history.value=[];updated.value=null
  try{
    if(!credential.value||Number(credential.value.id)!==credentialId){const list=await credentialsApi.list();if(token!==sequence)return;credential.value=list.data.find(x=>Number(x.id)===credentialId);if(!credential.value)throw new Error(t('audit.noAccount'))}
    const params={credential_id:credentialId}
    const requests=isAlpaca.value?[
      ['account',()=>alpacaApi.account(params)],['positions',()=>alpacaApi.positions(params)],['orders',()=>alpacaApi.orders({...params,status:'open',limit:500})],['history',()=>alpacaApi.orders({...params,status:'all',limit:100})]
    ]:[['snapshot',()=>credentialsApi.snapshot(credentialId)],...markets.value.map(m=>[m,()=>quickTradeApi.getBalance(credentialId,m)])]
    const results=await Promise.allSettled(requests.map(([,fn])=>fn()))
    if(token!==sequence||!alive)return
    results.forEach((result,index)=>{
      const key=requests[index][0]
      if(result.status==='rejected'){errors.value.push(`${t('profile_detail.'+(key==='snapshot'?'positions':key==='account'?'overview':key))}: ${result.reason?.localizedMessage||result.reason?.message||t('audit.loadFailed')}`);return}
      const data=result.value.data
      if(key==='account')account.value=data
      else if(key==='positions'){positions.value=Array.isArray(data)?data:[];positionCount.value=positions.value.length}
      else if(key==='orders')orders.value=Array.isArray(data)?data:[]
      else if(key==='history'){history.value=Array.isArray(data)?data:[];recentFills.value=history.value.filter(r=>r.status==='filled').length}
      else if(key==='snapshot'){positions.value=[...(data.spot_positions||[]).map(r=>({...r,_market:'spot'})),...(data.swap_positions||[]).map(r=>({...r,_market:'swap'}))];orders.value=(data.open_orders||[]).map(r=>({...r,_market:['spot','cash'].includes(r.market_type||r.marketType)?'spot':'swap'}));errors.value.push(...snapshotIssue(data));}
      else balances.value[key]=data
    })
    if(results.some(r=>r.status==='fulfilled'))updated.value=Date.now()
  }catch(e){if(token===sequence)errors.value=[e.localizedMessage||e.message]}finally{if(token===sequence)loading.value=false}
}
async function cancel(row){if(busy.value||!canCancelAccountOrder(row))return;const credentialId=id.value;busy.value=true;try{await showConfirmDialog({title:t('audit.cancelOrder'),message:`${t('audit.confirmCancel')}\n${credential.value.name||brand.value} · ${row.symbol}\n${row.id}`});if(!alive||id.value!==credentialId)return;await alpacaApi.cancelOrder(row.id,{credential_id:credentialId});showToast(t('account_ui.submitted'));await refresh()}catch(e){if(e?.message)showToast(e.localizedMessage||e.message)}finally{busy.value=false}}
function openChart(symbol,market){if(!symbol)return;router.push({path:'/indicators/chart',query:{market:isAlpaca.value?'USStock':'Crypto',symbol,credential_id:id.value,exchange_id:credential.value.exchange_id,market_type:market||'spot',timeframe:'1D'}})}
watch(id,()=>{++sequence;loading.value=false;credential.value=null;activeTab.value='overview';marketFilter.value='all';refresh()},{immediate:true})
onBeforeUnmount(()=>{alive=false;++sequence})
</script>

<style scoped>
.detail-content{padding:4px 16px 30px}.account-heading{display:flex;align-items:center;gap:12px;padding:12px 0}.account-heading h1{font-size:18px;margin:0;overflow-wrap:anywhere}.account-heading p{font-size:12px;margin:4px 0 0;color:var(--text-2)}.section-note{font-size:12px;color:var(--text-2);line-height:1.6;margin:8px 0 14px}.inline-loading{padding:20px;text-align:center}.account-errors{padding:12px;border:1px solid var(--border);border-left:3px solid var(--v2-orange);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.account-errors p{margin:5px 0}.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border:1px solid var(--border);border-radius:10px;margin:16px 0;overflow:hidden}.metric-grid>div{padding:16px 12px;min-width:0}.metric-grid span{display:block;color:var(--text-2);font-size:12px}.metric-grid strong{display:block;font-size:19px;margin-top:8px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.balance-section h2{font-size:15px;margin:22px 0 0}.balance-section h2 small{font-size:11px;color:var(--text-2);margin-left:6px}.market-filter{display:flex;gap:8px;margin:14px 0}.market-filter button{padding:6px 14px;border:0;background:transparent;color:var(--text-2);border-radius:6px}.market-filter button.active{background:var(--surface-raised);color:var(--text)}.account-record{padding:16px 0;border-bottom:1px solid var(--border)}.account-record header{display:flex;align-items:center;gap:8px}.account-record header strong{font-size:16px;overflow-wrap:anywhere}.account-record header small{margin-left:auto;color:var(--text-2);font-size:11px}.side{font-size:12px}.positive{color:var(--v2-green)}.negative{color:var(--v2-red)}.account-record dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}.account-record dt{font-size:11px;color:var(--text-2);margin-bottom:4px}.account-record dd{margin:0;font-size:13px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.account-record dl>div:last-child:nth-child(odd){grid-column:1/-1}.account-record footer{display:flex;justify-content:flex-end;gap:20px}.danger{color:var(--v2-red)}
</style>
