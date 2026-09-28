<template>
  <section class="stock-panel">
    <header><ExchangeLogo exchange="alpaca" :size="32"/><h2>{{ t('account_ui.tradeStocks') }}</h2><button :disabled="loading || busy" :aria-label="t('common.refresh')" @click="refresh"><van-icon name="replay"/></button></header>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="!accounts.length" class="empty-account"><p>{{ t('account_ui.connectStocksHint') }}</p><van-button block type="primary" @click="router.push('/profile/credentials/new?exchange=alpaca')">{{ t('account_ui.connectAction') }}</van-button></div>
    <template v-else>
      <div ref="accountSelectEl" class="account-select">
        <span>{{ t('chart_trade.account') }}</span>
        <button type="button" class="account-trigger" :disabled="busy" :aria-expanded="accountMenuOpen" @click="accountMenuOpen=!accountMenuOpen">
          <span class="account-trigger-copy"><strong>{{ selected?.name }}</strong><small>{{ environment(selected) }}</small></span>
          <van-icon :name="accountMenuOpen?'arrow-up':'arrow-down'"/>
        </button>
        <div v-if="accountMenuOpen" class="account-menu" role="listbox">
          <button v-for="item in accounts" :key="item.id" type="button" role="option" :aria-selected="String(item.id)===selectedId" :class="{active:String(item.id)===selectedId}" @click="selectAccount(item)">
            <ExchangeLogo exchange="alpaca" :size="28"/>
            <span><strong>{{ item.name }}</strong><small>{{ environment(item) }}</small></span>
            <van-icon v-if="String(item.id)===selectedId" name="success"/>
          </button>
        </div>
      </div>
      <div class="account-summary"><div><small>{{ t('account_ui.buyingPower') }}</small><strong>{{ number(account?.buying_power) }} <em>USD</em></strong></div><div><small>{{ t('account_ui.cash') }}</small><strong>{{ number(account?.cash) }} <em>USD</em></strong></div></div>
      <van-loading v-if="loading" size="18"/>
      <nav class="stock-tabs"><button v-for="item in tabs" :key="item.id" :class="{active:activeTab===item.id}" @click="activeTab=item.id">{{ t(item.label) }}</button></nav>
      <div v-if="activeTab==='order'" class="stock-ticket">
        <div class="segments"><button v-for="side in ['buy','sell']" :key="side" :class="{active:form.side===side}" :disabled="busy" @click="form.side=side">{{ t(side==='buy'?'audit.buySpot':'audit.sellSpot') }}</button></div>
        <div class="segments secondary"><button v-for="type in ['market','limit']" :key="type" :disabled="busy" :class="{active:form.type===type}" @click="form.type=type">{{ t(type==='market'?'chart_trade.order_market':'chart_trade.order_limit') }}</button></div>
        <van-field v-model="form.quantity" label-align="top" :disabled="busy" type="number" :label="t('account_ui.quantity')"><template #extra>{{ t('account_ui.shares') }}</template></van-field>
        <van-field v-if="form.type==='limit'" v-model="form.price" label-align="top" :disabled="busy" type="number" :label="t('chart_trade.order_limit')"><template #extra>USD</template></van-field>
        <van-checkbox v-if="form.type==='limit'" v-model="form.extendedHours" :disabled="busy" icon-size="17px">{{ t('account_ui.extendedHours') }}</van-checkbox>
        <p class="estimate">{{ t('account_ui.estimated') }} <b>{{ number(estimated) }} USD</b></p>
        <van-button block type="primary" :loading="busy" :disabled="!ready || loading || !form.quantity" @click="submit">{{ t('account_ui.preview') }}</van-button>
      </div>
      <div v-else-if="activeTab==='positions'" class="stock-rows"><article v-for="item in symbolPositions" :key="item.symbol"><div><b>{{ item.symbol }}</b><span>{{ number(item.quantity,6) }} {{ t('account_ui.shares') }}</span></div><div><small>{{ t('audit.unrealized') }}</small><strong :class="Number(item.unrealized_pnl)<0?'down':'up'">{{ number(item.unrealized_pnl) }} USD</strong></div><button :disabled="busy || loading || Number(item.quantity)<=0" @click="prepareSell(item)">{{ t('audit.sellSpot') }}</button></article><van-empty v-if="!symbolPositions.length && !loading" :description="t('chart_trade.no_positions')"/></div>
      <div v-else class="stock-rows"><article v-for="item in visibleOrders" :key="item.id"><div><b>{{ item.symbol }} · {{ t(item.side==='buy'?'audit.buySpot':'audit.sellSpot') }}</b><span>{{ number(item.quantity,6) }} {{ t('account_ui.shares') }}</span></div><div><small>{{ orderStatus(item.status) }} · {{ orderPriceLabel(item) }}</small><span>{{ orderPrice(item) }}</span></div><button v-if="activeTab==='orders'" :disabled="busy || loading || item.status==='pending_cancel'" @click="cancel(item)">{{ t('audit.cancelOrder') }}</button></article><van-empty v-if="!visibleOrders.length && !loading" :description="t('chart_trade.no_history')"/></div>
    </template>
    <van-popup v-model:show="reviewOpen" round teleport="body" class="order-review-popup" :close-on-click-overlay="false">
      <section v-if="review" class="order-review" role="dialog" aria-modal="true" :aria-label="t('account_ui.preview')">
        <header><span>{{ t('account_ui.preview') }}</span><button type="button" :aria-label="t('common.cancel')" @click="resolveReview(false)"><van-icon name="cross"/></button></header>
        <div class="review-heading"><span :class="review.side">{{ t(review.side==='buy'?'audit.buySpot':'audit.sellSpot') }}</span><div><strong>{{ review.symbol }}</strong><small>{{ review.account }} · {{ review.environment }}</small></div></div>
        <dl>
          <div><dt>{{ t('chart_trade.order') }}</dt><dd>{{ t(review.orderType==='limit'?'chart_trade.order_limit':'chart_trade.order_market') }}</dd></div>
          <div><dt>{{ t('account_ui.quantity') }}</dt><dd>{{ number(review.quantity,6) }} {{ t('account_ui.shares') }}</dd></div>
          <div><dt>{{ t('chart_trade.price') }}</dt><dd>{{ review.orderType==='limit'?`${number(review.price)} USD`:t('chart_trade.order_market') }}</dd></div>
          <div><dt>{{ t('account_ui.estimated') }}</dt><dd>{{ number(review.estimated) }} USD</dd></div>
          <div v-if="review.extendedHours"><dt>{{ t('account_ui.extendedHours') }}</dt><dd><van-icon name="success"/></dd></div>
        </dl>
        <p><van-icon name="info-o"/>{{ review.environment }} · {{ review.account }}</p>
        <footer><button type="button" class="review-cancel" @click="resolveReview(false)">{{ t('common.cancel') }}</button><button type="button" :class="['review-submit',review.side]" @click="resolveReview(true)">{{ t('chart_trade.confirm_submit') }}</button></footer>
      </section>
    </van-popup>
  </section>
</template>
<script setup>
import {computed,onBeforeUnmount,onMounted,onActivated,onDeactivated,reactive,ref,watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute,useRouter} from 'vue-router'
import {showConfirmDialog,showToast} from 'vant'
import {alpacaApi,credentialsApi} from '@/api'
import ExchangeLogo from './ExchangeLogo.vue'
import '@/styles/order-review.css'
import {buildAlpacaOrder,validateAlpacaOrder} from '@/utils/alpacaOrder'
const props=defineProps({symbol:{type:String,required:true},chartPrice:{type:Number,default:null}})
const {t,te}=useI18n(),route=useRoute(),router=useRouter()
const accounts=ref([]),selectedId=ref(''),account=ref(null),positions=ref([]),orders=ref([]),openOrders=ref([])
const loading=ref(false),busy=ref(false),ready=ref(false),error=ref(''),activeTab=ref('order')
const accountMenuOpen=ref(false),accountSelectEl=ref(null)
const reviewOpen=ref(false),review=ref(null)
let reviewResolver
function resolveReview(confirmed){reviewOpen.value=false;const resolve=reviewResolver;reviewResolver=null;resolve?.(confirmed)}
function openReview(payload){review.value={...payload,account:selected.value?.name,environment:environment(selected.value),estimated:payload.quantity*(payload.price||props.chartPrice)};reviewOpen.value=true;return new Promise(resolve=>{reviewResolver=resolve})}
const form=reactive({side:'buy',type:'market',quantity:'',price:'',extendedHours:false})
const tabs=[{id:'order',label:'chart_trade.order'},{id:'positions',label:'chart_trade.positions'},{id:'orders',label:'audit.orders'},{id:'history',label:'chart_trade.history'}]
const context=computed(()=>`${selectedId.value}:${props.symbol}`)
const selected=computed(()=>accounts.value.find(x=>String(x.id)===selectedId.value))
const symbolPositions=computed(()=>positions.value.filter(p=>p.symbol===props.symbol))
const visibleOrders=computed(()=>(activeTab.value==='orders'?openOrders.value:orders.value).filter(o=>o.symbol===props.symbol))
const estimated=computed(()=>Number(form.quantity)>0?Number(form.quantity)*Number(form.type==='limit'?form.price:props.chartPrice):null)
const ACCOUNT_STORAGE_KEY='quantdinger.alpaca.credential_id'
let sequence=0,accountSequence=0,timer,active=false
function number(value,digits=2){return value==null||value===''||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString(undefined,{maximumFractionDigits:digits})}
function environment(item){return t(/paper/i.test(item?.api_key_hint||'')?'audit.paperMode':'audit.liveMode')}
function orderStatus(status){const key=`account_ui.status.${status}`;return te(key)?t(key):status}
function orderType(item){return String(item?.order_type||item?.orderType||item?.type||'').toLowerCase()}
function filledPrice(item){return Number(item?.filled_avg_price??item?.avgFillPrice??item?.filledAvgPrice)}
function limitPrice(item){return Number(item?.limit_price??item?.limitPrice??item?.price)}
function hasFilledPrice(item){return Number.isFinite(filledPrice(item))&&filledPrice(item)>0}
function orderPriceLabel(item){return t(hasFilledPrice(item)?'chart_trade.fill_price':'chart_trade.price')}
function orderPrice(item){const value=hasFilledPrice(item)?filledPrice(item):limitPrice(item);if(Number.isFinite(value)&&value>0)return `${number(value)} USD`;return !orderType(item)||orderType(item)==='market'?t('chart_trade.order_market'):'—'}
function selectAccount(item){selectedId.value=String(item.id);accountMenuOpen.value=false}
function closeAccountMenu(event){if(accountMenuOpen.value&&!accountSelectEl.value?.contains(event.target))accountMenuOpen.value=false}
async function refresh(){
  const token=++sequence;const id=Number(selectedId.value);ready.value=false;account.value=null;positions.value=[];orders.value=[];openOrders.value=[];error.value=''
  if(!id){loading.value=false;return}loading.value=true
  try{const params={credential_id:id};const result=await Promise.all([alpacaApi.account(params),alpacaApi.positions(params),alpacaApi.orders({...params,status:'all',limit:100}),alpacaApi.orders({...params,status:'open',limit:500})]);if(token!==sequence)return;account.value=result[0].data;positions.value=result[1].data||[];orders.value=result[2].data||[];openOrders.value=result[3].data||[];ready.value=true}
  catch(e){if(token===sequence)error.value=e.localizedMessage||e.message||t('audit.loadFailed')}
  finally{if(token===sequence)loading.value=false}
}
async function submit(){
  if(busy.value)return
  const key=context.value,payload=buildAlpacaOrder({credentialId:selectedId.value,symbol:props.symbol,side:form.side,form,referencePrice:props.chartPrice})
  const invalid=validateAlpacaOrder(payload,{account:account.value,positions:positions.value,openOrders:openOrders.value,price:props.chartPrice,ready:ready.value})
  if(invalid){showToast(t(invalid));return}busy.value=true
  try{if(!await openReview(payload))return;if(key!==context.value||!active){showToast(t('audit.accountChanged'));return}await alpacaApi.placeOrder(payload);showToast(t('account_ui.submitted'));form.quantity='';activeTab.value='orders';await refresh()}
  catch(e){if(e?.message)error.value=e.localizedMessage||e.message}finally{busy.value=false}
}
function prepareSell(item){form.side='sell';form.quantity=String(item.quantity);form.type='market';activeTab.value='order'}
async function cancel(item){if(busy.value)return;const key=context.value,id=Number(selectedId.value);busy.value=true;try{await showConfirmDialog({title:t('audit.cancelOrder'),message:`${t('audit.confirmCancel')}\n${item.symbol} · ${item.id}`});if(key!==context.value||!active)return;await alpacaApi.cancelOrder(item.id,{credential_id:id});await refresh()}catch(e){if(e?.message)error.value=e.localizedMessage||e.message}finally{busy.value=false}}
watch(context,()=>{resolveReview(false);form.quantity='';form.price='';form.extendedHours=false;refresh()})
async function loadAccounts(){const token=++accountSequence;try{const res=await credentialsApi.list();if(token!==accountSequence)return;accounts.value=(res.data||[]).filter(x=>String(x.exchange_id||'').toLowerCase()==='alpaca');const candidates=[route.query.credential_id,localStorage.getItem(ACCOUNT_STORAGE_KEY),selectedId.value].map(value=>String(value||'')).filter(Boolean);const next=candidates.find(value=>accounts.value.some(x=>String(x.id)===value))||String(accounts.value[0]?.id||'');if(selectedId.value===next)await refresh();else selectedId.value=next}catch(e){if(token===accountSequence){ready.value=false;account.value=null;error.value=e.localizedMessage||e.message}}}
watch(()=>route.query.credential_id,id=>{if(id&&accounts.value.some(x=>String(x.id)===String(id)))selectedId.value=String(id)})
watch(selectedId,id=>{if(id)localStorage.setItem(ACCOUNT_STORAGE_KEY,id)})
function stop(){resolveReview(false);active=false;clearInterval(timer);++sequence;++accountSequence;loading.value=false;accountMenuOpen.value=false}
function start(){if(active)return;active=true;clearInterval(timer);loadAccounts();timer=setInterval(()=>{if(!document.hidden&&!busy.value&&!loading.value)refresh()},30000)}
onMounted(start)
onMounted(()=>document.addEventListener('pointerdown',closeAccountMenu))
onActivated(start)
onDeactivated(stop);onBeforeUnmount(()=>{stop();document.removeEventListener('pointerdown',closeAccountMenu)})
</script>
<style scoped>
.stock-panel{margin:12px;padding:16px;border:1px solid var(--v2-line);border-radius:12px;background:var(--v2-surface)}header{display:flex;align-items:center;gap:10px}h2{font-size:18px;flex:1;margin:0}header button{border:0;background:none;color:var(--v2-text);font-size:20px}.account-select{position:relative;display:block;margin-top:18px;font-size:12px;color:var(--v2-muted)}.account-select>span{display:block;margin-bottom:7px}.account-trigger{width:100%;min-height:54px;display:flex;align-items:center;gap:12px;padding:8px 13px;border:1px solid var(--v2-line);border-radius:10px;background:var(--v2-surface-2);color:var(--v2-text);text-align:left;transition:border-color .16s,box-shadow .16s}.account-trigger:focus-visible,.account-trigger[aria-expanded=true]{outline:0;border-color:var(--v2-brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--v2-brand) 14%,transparent)}.account-trigger-copy{min-width:0;display:flex;flex:1;flex-direction:column;gap:3px}.account-trigger-copy strong{overflow:hidden;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.account-trigger-copy small{color:var(--v2-muted);font-size:11px}.account-trigger>.van-icon{color:var(--v2-muted);font-size:15px}.account-menu{position:absolute;z-index:30;top:calc(100% + 7px);left:0;width:100%;max-height:min(320px,45vh);overflow-y:auto;overscroll-behavior:contain;padding:5px;border:1px solid var(--v2-line);border-radius:11px;background:var(--v2-surface);box-shadow:0 12px 30px color-mix(in srgb,#000 24%,transparent)}.account-menu button{width:100%;min-height:54px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 9px;border:0;border-radius:8px;background:transparent;color:var(--v2-text);text-align:left}.account-menu button+button{margin-top:2px}.account-menu button.active{background:color-mix(in srgb,var(--v2-brand) 12%,var(--v2-surface-2))}.account-menu button>span{min-width:0;display:flex;flex-direction:column;gap:3px}.account-menu strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.account-menu small{color:var(--v2-muted);font-size:10px}.account-menu button>.van-icon{color:var(--v2-brand);font-size:16px}.account-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:18px 0}.account-summary small,.stock-rows small{display:block;color:var(--v2-muted);font-size:11px}.account-summary strong{display:block;margin-top:5px;font-size:18px}.account-summary em{font-size:10px;font-style:normal}.stock-tabs{display:flex;border-bottom:1px solid var(--v2-line)}.stock-tabs button{flex:1;padding:12px 0;border:0;background:none;color:var(--v2-muted);font-size:12px}.stock-tabs button.active{color:var(--v2-text);border-bottom:3px solid var(--v2-brand)}.segments{display:flex;gap:4px;padding:4px;background:var(--v2-surface-2);border-radius:8px;margin-top:14px}.segments button{flex:1;border:0;border-radius:6px;background:none;color:var(--v2-muted);min-height:36px}.segments button.active{background:var(--v2-brand);color:var(--v2-on-brand)}.secondary{margin-top:8px}.secondary button.active{background:var(--v2-surface);color:var(--v2-text)}.stock-ticket :deep(.van-field){background:none;padding:12px 0}.stock-ticket :deep(.van-field__body){border:1px solid var(--v2-line);border-radius:8px;padding:10px}.stock-ticket :deep(.van-checkbox){font-size:12px;margin:8px 0}.estimate{display:flex;justify-content:space-between;font-size:12px;color:var(--v2-muted);margin:16px 0}.estimate b{color:var(--v2-text)}.stock-rows article{padding:14px 0;border-bottom:1px solid var(--v2-line);font-size:12px}.stock-rows article>div{display:flex;justify-content:space-between;gap:8px;margin-bottom:7px}.stock-rows button{display:block;margin-left:auto;border:1px solid var(--v2-line);background:none;color:var(--v2-text);padding:7px 14px;border-radius:6px}.error{font-size:12px;color:var(--v2-red);overflow-wrap:anywhere}.empty-account p{font-size:13px;line-height:1.6;color:var(--v2-muted)}button:disabled{opacity:.5}
</style>
