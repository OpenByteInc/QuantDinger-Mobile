<template>
  <div class="account-page account-detail">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="t('profile_detail.details')" left-arrow @click-left="router.back()"><template #right><button class="text-button" :disabled="loading || busy" @click="refresh">{{ t('profile_detail.refresh') }}</button></template></van-nav-bar>
    <div class="detail-content">
      <header v-if="credential" class="account-heading"><ExchangeLogo :exchange="credential.exchange_id" :size="36"/><div><h1>{{ credential.name || brand }}</h1><p>{{ brand }} · {{ environment }}</p></div></header>
      <ForthrightUnlock v-if="credential?.exchange_id === 'forthright'" :credential-id="id" />
      <p class="section-note">{{ t('profile_detail.allAccounts') }}<span v-if="isStockBroker"> · {{ account?.currency || 'USD' }}</span></p>
      <van-loading v-if="loading && !backgroundRefreshing" class="inline-loading"/>
      <div v-if="errors.length" class="account-errors" role="alert"><b>{{ t('profile_detail.partial') }}</b><p v-for="(error,index) in errors" :key="index">{{ error }}</p><button class="text-button" :disabled="loading" @click="refresh">{{ t('profile_detail.refresh') }}</button></div>
      <p v-if="updated" class="section-note">{{ t('profile_detail.updated',{time:date(updated)}) }}</p>
      <div class="plain-tabs account-tabs" role="tablist"><button v-for="tab in tabs" :key="tab" role="tab" :aria-selected="activeTab===tab" :class="{active:activeTab===tab}" @click="activeTab=tab; visibleCount=20">{{ t('profile_detail.'+tab) }}</button></div>
      <template v-if="activeTab==='overview'">
        <section v-if="isStockBroker" class="metric-grid"><div v-for="metric in stockMetrics" :key="metric.key" :class="{'available-metric':isFutures && metric.key==='buyingPower'}"><button v-if="metric.help" class="metric-help" @click="showMetricHelp(metric)">{{ t(metric.label || 'profile_detail.'+metric.key) }} <van-icon name="question-o"/></button><span v-else>{{ t(metric.label || 'profile_detail.'+metric.key) }}</span><strong>{{ metric.value }}</strong></div></section>
        <template v-if="credential?.exchange_id === 'forthright'">
          <h2 v-if="isFutures" class="funds-heading">{{ t('brokerAccounts.forthright.nativeBalances') }}</h2>
          <p class="section-note">{{ t(isFutures ? 'brokerAccounts.forthright.nativeCashHelp' : 'brokerAccounts.forthright.currencyHint') }}<template v-if="!isFutures"> {{ t('brokerAccounts.forthright.convertedCash') }}</template></p>
          <section class="metric-grid"><div v-for="balance in account?.balances || []" :key="balance.currency || balance.ccy"><span>{{ t(balance.available_cash != null ? 'brokerAccounts.forthright.nativeCash' : 'brokerAccounts.forthright.originalCash') }}</span><strong>{{ number(balance.available_cash ?? balance.cash,2) }} {{ balance.currency || String(balance.ccy || '').replace(/^HK-/, '') }}</strong></div></section>
        </template>
        <section v-for="market in markets" v-if="!isStockBroker" :key="market" class="balance-section"><h2>{{ t('profile_detail.'+market) }} <small>{{ balances[market]?.currency || 'USDT' }}</small></h2><div class="metric-grid"><div><span>{{ t('profile_detail.total') }}</span><strong>{{ number(balances[market]?.total,2) }}</strong></div><div><span>{{ t('profile_detail.available') }}</span><strong>{{ number(balances[market]?.available,2) }}</strong></div></div></section>
      </template>
      <template v-else>
        <div v-if="!isStockBroker" class="market-filter"><button v-for="market in ['all','spot','swap']" :key="market" :class="{active:marketFilter===market}" @click="marketFilter=market;visibleCount=20">{{ market==='all'?t('common.all'):t('profile_detail.'+market) }}</button></div>
        <p v-if="activeTab==='history'" class="section-note">{{ t('profile_detail.recent',{count:history.length}) }}</p>
        <article v-for="(row,index) in visibleRows.slice(0,visibleCount)" :key="row.id || row.exchange_order_id || row.symbol+index" class="account-record">
          <header><strong>{{ row.symbol || row.inst_id || '—' }}</strong><span :class="['side', /sell|short/i.test(row.side)?'negative':'positive']">{{ side(row.side) }}</span><small>{{ activeTab==='positions' ? (isStockBroker?t('brokerAccounts.market.'+(row.market||'USStock')):t('profile_detail.'+row._market)) : status(row.status)+(isStockBroker?'':' · '+t('profile_detail.'+row._market)) }}</small></header>
          <dl><div v-for="field in recordFields(row)" :key="field.key"><dt>{{ t(field.label || 'profile_detail.'+field.key) }}</dt><dd>{{ field.value }}</dd></div></dl>
          <footer><button v-if="credential?.exchange_id==='forthright' && activeTab==='positions' && row.market==='Futures' && row.quantity" class="text-button danger" :disabled="busy || loading" @click="closePosition(row)">{{ t('brokerAccounts.forthright.closePosition') }}</button><button v-if="isStockBroker && activeTab!=='positions' && canCancelAccountOrder(row)" class="text-button danger" :disabled="busy || loading" @click="cancel(row)">{{ t('audit.cancelOrder') }}</button><button v-if="isStockBroker || row.symbol?.includes('/')" class="text-button" @click="openChart(row.symbol,row.market_category||row.market||row.market_type||row._market)">{{ t('indicator_chart.view_chart') }} <van-icon name="arrow"/></button></footer>
        </article>
        <p v-if="!loading && !visibleRows.length" class="plain-empty">{{ errors.length?t('audit.loadFailed'):t('profile_detail.empty') }}</p>
        <van-button v-if="visibleRows.length>visibleCount" block plain @click="visibleCount+=20">{{ t('profile_detail.moreReferrals') }}</van-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {startVisiblePolling} from '@/utils/visiblePolling'
import {useRoute,useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {showConfirmDialog,showDialog,showToast} from 'vant'
import {credentialsApi,alpacaApi,brokerApi,quickTradeApi} from '@/api'
import {brokerRowCurrency,forthrightErrorMessage} from '@/utils/forthright'
import ForthrightUnlock from '@/components/ForthrightUnlock.vue'
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import {EXCHANGE_BRANDS,isDirectOpenApiBroker,isStockBroker as stockBroker} from '@/constants/exchanges'
import {accountNumber,accountPrice,canCancelAccountOrder,snapshotIssue} from '@/utils/accountDetail'
import {balanceIssue,localizedBalanceIssue} from '@/utils/balanceIssue'
import {notificationTime} from '@/utils/notificationDetail'
const {t,te,locale}=useI18n(),route=useRoute(),router=useRouter()
const credential=ref(null),account=ref(null),balances=ref({}),positions=ref([]),orders=ref([]),history=ref([]),errors=ref([]),updated=ref(null)
const positionCount=ref(null),recentFills=ref(null)
const loading=ref(false),backgroundRefreshing=ref(false),busy=ref(false),activeTab=ref('overview'),marketFilter=ref('all'),visibleCount=ref(20)
let sequence=0,alive=true
const id=computed(()=>Number(route.params.id)),isAlpaca=computed(()=>credential.value?.exchange_id==='alpaca')
const isDirectBroker=computed(()=>isDirectOpenApiBroker(credential.value?.exchange_id)),isStockBroker=computed(()=>stockBroker(credential.value?.exchange_id))
const brand=computed(()=>EXCHANGE_BRANDS[credential.value?.exchange_id]?.name||credential.value?.exchange_id||'')
const environment=computed(()=>{if(credential.value?.exchange_id==='forthright')return t('brokerAccounts.forthright.'+(credential.value?.account_type||'securities'))+' · '+t('brokerAccounts.forthright.'+(credential.value?.environment||'sandbox'));if(isAlpaca.value)return t(/paper/i.test(credential.value?.api_key_hint||'')?'audit.paperMode':'credentials.environment_live');if(isDirectBroker.value){const value=String(credential.value?.environment||'live').toLowerCase();return t(value==='paper'?'broker_mobile.paper':['sandbox','testnet'].includes(value)?'broker_mobile.sandbox':'broker_mobile.live')}return t(`credentials.environment_${credential.value?.environment||(credential.value?.enable_demo_trading?'demo':'live')}`)})
const markets=computed(()=>isStockBroker.value?[]:credential.value?.market_scope==='spot'?['spot']:credential.value?.market_scope==='swap'?['swap']:['spot','swap'])
const tabs=computed(()=>['overview','positions','orders',...(isStockBroker.value?['history']:[])])
const number=(v,digits=6)=>accountNumber(v,digits,locale.value)
const price=v=>accountPrice(v,locale.value)
const date=v=>notificationTime(v)?.toLocaleString(locale.value)||'—'
const isFutures=computed(()=>credential.value?.exchange_id==='forthright' && account.value?.account_type==='futures')
function showMetricHelp(metric){showDialog({title:t(metric.label || 'profile_detail.'+metric.key),message:t(metric.help),confirmButtonText:t('common.confirm')})}
const stockMetrics=computed(()=>[
  ...['equity','cash','buyingPower'].map(key=>({key,label:isFutures.value && key!=='equity'?'brokerAccounts.forthright.'+({cash:'convertedCashLabel',buyingPower:'available_funds'}[key]):null,help:isFutures.value?'brokerAccounts.forthright.'+({equity:'equityHelp',cash:'cashHelp',buyingPower:'availableFundsHelp'}[key]):null,value:`${number(account.value?.[{equity:'equity',cash:'cash',buyingPower:'buying_power'}[key]],2)} ${account.value?.currency||'USD'}`})),
  ...(isFutures.value?['initial_margin','maintenance_margin'].map(key=>({key,label:'brokerAccounts.forthright.'+key,help:'brokerAccounts.forthright.'+key+'Help',value:`${number(account.value?.[key],2)} ${account.value?.currency||''}`})):[]),
  {key:'status',value:account.value?.account_blocked||account.value?.trading_blocked?t('account_ui.blocked'):account.value?.status==='ACTIVE'?t('profile_detail.active'):account.value?.status||'—'},
  {key:'positionCount',value:number(positionCount.value,0)}, {key:'recentFills',value:number(recentFills.value,0)}
])
const visibleRows=computed(()=>{const rows=activeTab.value==='positions'?positions.value:activeTab.value==='history'?history.value:orders.value;return isStockBroker.value||marketFilter.value==='all'?rows:rows.filter(r=>r._market===marketFilter.value)})
function side(value){const key=String(value||'').toLowerCase();return key==='buy'?t('audit.buySpot'):key==='sell'?t('audit.sellSpot'):['long','short'].includes(key)?t('profile_detail.'+key):value||'—'}
function status(value){if(value==='open')return t('profile_detail.open');const key='account_ui.status.'+String(value||'').toLowerCase();return te(key)?t(key):value||'—'}
function orderType(value){return ['market','limit'].includes(value)?t('chart_trade.order_'+value):value||'—'}
function recordFields(row){
  const currency=brokerRowCurrency(row,credential.value?.exchange_id)
  const money=value=>isStockBroker.value?(value==null||!currency?'—':`${price(value)} ${currency}`):price(value)
  const quote=value=>row.market==='Futures'?accountPrice(value,locale.value,row.market,row.symbol):money(value)
  if(activeTab.value==='positions')return [
    {key:'quantity',value:number(row.quantity??row.size,8)}, {key:'entry',value:quote(row.avg_entry_price??row.entry_price)},
    ...(isStockBroker.value?[{key:'current',value:quote(row.current_price)},{key:'value',value:money(row.market_value)},{key:'pnl',value:money(row.unrealized_pnl)}]:[])
  ]
  return [{key:'orderType',value:orderType(row.order_type||row.orderType)},{key:'quantity',value:number(row.quantity??row.amount)},{key:'price',value:quote(row.limit_price??row.price)},{key:'filled',value:number(row.filled_qty??row.filled)},
    ...(isStockBroker.value?[{key:'fillPrice',value:quote(Number(row.filled_qty??row.filled)>0?row.filled_avg_price:null)},{key:'submitted',value:date(row.submitted_at)},{key:'filledAt',value:date(row.filled_at)}]:[]),
    ...(credential.value?.exchange_id==='forthright'?[{key:'fee',label:'chart_trade.fee',value:number(row.fee_amount,2)+' '+(row.fee_currency||row.currency||'')}]:[]),
    {key:'orderId',value:row.id||row.exchange_order_id||'—'}]
}
async function refresh(background=false){
  if(loading.value||!id.value)return
  const token=++sequence,credentialId=id.value;loading.value=true;backgroundRefreshing.value=background===true;errors.value=[]
  if(background!==true){positionCount.value=null;recentFills.value=null;account.value=null;balances.value={};positions.value=[];orders.value=[];history.value=[];updated.value=null}
  try{
    if(!credential.value||Number(credential.value.id)!==credentialId){const list=await credentialsApi.list();if(token!==sequence)return;credential.value=list.data.find(x=>Number(x.id)===credentialId);if(!credential.value)throw new Error(t('audit.noAccount'))}
    const params={credential_id:credentialId}
    const requests=isAlpaca.value?[
      ['account',()=>alpacaApi.account(params)],['positions',()=>alpacaApi.positions(params)],['orders',()=>alpacaApi.orders({...params,status:'open',limit:500})],['history',()=>alpacaApi.orders({...params,status:'all',limit:100})]
    ]:isDirectBroker.value?[
      ['status',()=>brokerApi.status(credential.value.exchange_id,credentialId)],
      ['account',()=>brokerApi.account(credential.value.exchange_id,credentialId)],
      ['positions',()=>brokerApi.positions(credential.value.exchange_id,credentialId)],
      ['orders',()=>brokerApi.orders(credential.value.exchange_id,credentialId,{status:'open',limit:100})],
      ['history',()=>brokerApi.fills(credential.value.exchange_id,credentialId,{limit:100})]
    ]:[['snapshot',()=>credentialsApi.snapshot(credentialId)],...markets.value.map(m=>[m,()=>quickTradeApi.getBalance(credentialId,m)])]
    const results=[]
    if(credential.value.exchange_id==='forthright'){
      for(const [,fn] of requests){
        if(token!==sequence||!alive)return
        try{results.push({status:'fulfilled',value:await fn()})}catch(reason){results.push({status:'rejected',reason})}
      }
    }else results.push(...await Promise.allSettled(requests.map(([,fn])=>fn())))
    if(token!==sequence||!alive)return
    results.forEach((result,index)=>{
      const key=requests[index][0]
      if(result.status==='rejected'){errors.value.push(`${t('profile_detail.'+(key==='snapshot'?'positions':key==='account'?'overview':key))}: ${result.reason?.localizedMessage||result.reason?.message||t('audit.loadFailed')}`);return}
      const data=result.value.data
      if(key==='status')credential.value={...credential.value,environment:data?.environment||(data?.paper?'paper':'live'),connection_status:data?.connected?'connected':'error'}
      else if(key==='account')account.value=data
      else if(key==='positions'){positions.value=Array.isArray(data)?data:[];positionCount.value=positions.value.length}
      else if(key==='orders')orders.value=Array.isArray(data)?data:[]
      else if(key==='history'){history.value=Array.isArray(data)?data:[];recentFills.value=history.value.filter(r=>r.status==='filled').length}
      else if(key==='snapshot'){positions.value=[...(data.spot_positions||[]).map(r=>({...r,_market:'spot'})),...(data.swap_positions||[]).map(r=>({...r,_market:'swap'}))];orders.value=(data.open_orders||[]).map(r=>({...r,_market:['spot','cash'].includes(r.market_type||r.marketType)?'spot':'swap'}));errors.value.push(...snapshotIssue(data));}
      else {
        const issue=balanceIssue(data,key)
        if(issue)errors.value.push(`${t('profile_detail.'+key)}: ${localizedBalanceIssue(issue,t,te)}`)
        else balances.value[key]=data
      }
    })
    if(results.some(r=>r.status==='fulfilled'))updated.value=Date.now()
  }catch(e){if(token===sequence)errors.value=[e.localizedMessage||e.message]}finally{if(token===sequence)loading.value=false}
}
async function cancel(row){if(busy.value||!canCancelAccountOrder(row))return;const credentialId=id.value;busy.value=true;try{await showConfirmDialog({title:t('audit.cancelOrder'),message:`${t('audit.confirmCancel')}\n${credential.value.name||brand.value} · ${row.symbol}\n${row.id}`});if(!alive||id.value!==credentialId)return;if(isDirectBroker.value)await brokerApi.cancelOrder(credential.value.exchange_id,credentialId,row.id);else await alpacaApi.cancelOrder(row.id,{credential_id:credentialId});showToast(t('account_ui.submitted'));await refresh()}catch(e){if(e?.message)showToast(e.localizedMessage||e.message)}finally{busy.value=false}}
async function closePosition(row){
  if(busy.value||loading.value)return
  const credentialId=id.value,payload={symbol:row.symbol,expected_quantity:row.quantity};busy.value=true
  try{
    await showConfirmDialog({title:t('brokerAccounts.forthright.closePosition'),message:`${credential.value.name} · ${environment.value}\n${t('brokerAccounts.forthright.closeConfirm',{symbol:row.symbol,quantity:Math.abs(row.quantity)})}`})
    if(!alive||id.value!==credentialId)return
    await brokerApi.closePosition(credentialId,payload);showToast(t('account_ui.submitted'))
  }catch(e){if(e?.message)showToast(forthrightErrorMessage(e,t))}finally{busy.value=false;await refresh()}
}
function openChart(symbol,market){if(!symbol)return;const isHongKong=['tiger','forthright'].includes(credential.value?.exchange_id)&&(/hkstock|hong.?kong|^hk$/i.test(String(market||''))||/\.HK$|^HK[:.]/i.test(symbol));const stockMarket=credential.value?.account_type==='futures'?'Futures':isHongKong?'HKStock':'USStock';router.push({path:'/indicators/chart',query:{market:isStockBroker.value?stockMarket:'Crypto',symbol,credential_id:id.value,exchange_id:credential.value.exchange_id,market_type:market||'spot',timeframe:'1D'}})}
watch(id,()=>{++sequence;loading.value=false;credential.value=null;activeTab.value='overview';marketFilter.value='all';refresh()},{immediate:true})
const stopPolling=startVisiblePolling(()=>refresh(true),{enabled:()=>credential.value?.exchange_id==='forthright'&&credential.value?.account_type==='futures'&&!loading.value&&!busy.value})
onBeforeUnmount(()=>{alive=false;++sequence;stopPolling()})
</script>

<style scoped>
.account-page.account-detail .account-tabs{display:flex;gap:4px;padding:4px;border:0;border-radius:12px;background:var(--v2-surface-2);margin:20px 0 16px;overflow:visible}
.account-page.account-detail .account-tabs button{flex:1;min-width:0;min-height:44px;padding:8px 4px;border:0;border-radius:8px;background:transparent;color:var(--v2-muted);font:inherit;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
.account-page.account-detail .account-tabs button.active{background:var(--v2-brand);color:var(--v2-on-brand);font-weight:600}
.account-tabs button:focus-visible,.metric-help:focus-visible{outline:2px solid var(--v2-brand) !important;outline-offset:2px}
.metric-help{display:flex;align-items:center;gap:6px;min-height:28px;margin:-6px 0;padding:6px 0;border:0;background:transparent;color:var(--v2-muted);font:inherit;font-size:12px;text-align:start;line-height:1.5}
.metric-help .van-icon{flex-shrink:0;font-size:14px}
.metric-grid .available-metric{background:var(--v2-surface-2)}
.funds-heading{margin:24px 0 8px;font-size:14px;font-weight:600;color:var(--v2-text)}
.detail-content{padding:4px 16px 30px}.account-heading{display:flex;align-items:center;gap:12px;padding:12px 0}.account-heading h1{font-size:18px;margin:0;overflow-wrap:anywhere}.account-heading p{font-size:12px;margin:4px 0 0;color:var(--text-2)}.section-note{font-size:12px;color:var(--text-2);line-height:1.6;margin:8px 0 14px}.inline-loading{padding:20px;text-align:center}.account-errors{padding:12px;border:1px solid var(--border);border-left:3px solid var(--v2-orange);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.account-errors p{margin:5px 0}.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border:1px solid var(--border);border-radius:10px;margin:16px 0;overflow:hidden}.metric-grid>div{padding:16px 12px;min-width:0}.metric-grid span{display:block;color:var(--text-2);font-size:12px}.metric-grid strong{display:block;font-size:19px;margin-top:8px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.balance-section h2{font-size:15px;margin:22px 0 0}.balance-section h2 small{font-size:11px;color:var(--text-2);margin-left:6px}.market-filter{display:flex;gap:8px;margin:14px 0}.market-filter button{padding:6px 14px;border:0;background:transparent;color:var(--text-2);border-radius:6px}.market-filter button.active{background:var(--surface-raised);color:var(--text)}.account-record{padding:16px 0;border-bottom:1px solid var(--border)}.account-record header{display:flex;align-items:center;gap:8px}.account-record header strong{font-size:16px;overflow-wrap:anywhere}.account-record header small{margin-left:auto;color:var(--text-2);font-size:11px}.side{font-size:12px}.positive{color:var(--v2-green)}.negative{color:var(--v2-red)}.account-record dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}.account-record dt{font-size:11px;color:var(--text-2);margin-bottom:4px}.account-record dd{margin:0;font-size:13px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.account-record dl>div:last-child:nth-child(odd){grid-column:1/-1}.account-record footer{display:flex;justify-content:flex-end;gap:20px}.danger{color:var(--v2-red)}
</style>
