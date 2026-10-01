<template>
  <div class="terminal-page" :class="{expanded}">
    <header class="market-head">
      <div class="market-title-row">
        <button class="symbol" @click="symbolPickerOpen=true"><strong>{{ form.symbol }}</strong><van-icon name="arrow-down"/></button>
        <div class="quote" :class="change<0?'down':'up'"><strong>{{ price(latestPrice) }}</strong><span>{{ change===null?'—':`${change>0?'+':''}${change.toFixed(2)}%` }}</span></div>
        <button class="icon-button" :aria-label="t(expanded?'audit.exitFullscreen':'audit.fullscreen')" @click="expanded=!expanded"><van-icon :name="expanded?'shrink':'expand-o'"/></button>
        <button class="icon-button" :class="{refreshing:chartRefreshing}" :aria-label="t('common.refresh')" :disabled="loading || chartRefreshing" @click="loadChart()"><van-icon name="replay"/></button>
      </div>
      <button v-if="form.market.toLowerCase()==='crypto'" class="source" @click="sourceOpen=true"><span>{{ t('audit.source') }}</span><b>{{ EXCHANGE_BRANDS[form.exchangeId]?.name || form.exchangeId }} · {{ t(form.marketType==='swap'?'chart_trade.swap':'chart_trade.spot') }}</b><van-icon name="arrow-down"/></button>
    </header>
    <div class="timeframes"><button v-for="time in timeframes" :key="time" :class="{active:form.timeframe===time}" @click="form.timeframe=time;loadChart()">{{ time }}</button></div>
    <div class="indicator-select"><button @click="indicatorSheetOpen=true"><span>{{ selectedIndicator?.name || t('indicator_chart.choose_indicator') }}</span><van-icon name="arrow-down"/></button><button v-if="parameters.length" class="parameter-button" @click="paramsOpen=true"><van-icon name="setting-o"/><b>{{ parameters.length }}</b></button></div>
    <div class="chart-area">
      <MarketChart ref="marketChart" :data="chartData" :main="mainIndicator" :lower="lowerIndicator" :expanded="expanded"/>
      <div v-if="loading" class="chart-placeholder"><van-skeleton title :row="8"/></div>
      <div v-else-if="error" class="chart-state"><p>{{ error }}</p><van-button size="small" @click="loadChart()">{{ t('common.retry') }}</van-button></div>
      <div v-else-if="!chartData?.candles?.length" class="chart-state"><p>{{ t('audit.noData') }}</p></div>
    </div>
    <div class="indicator-tools"><div class="indicators"><button v-for="name in ['EMA','MA','BOLL','SAR','BBI','SMA']" :key="name" :aria-pressed="mainIndicator===name" :class="{active:mainIndicator===name}" @click="mainIndicator=mainIndicator===name?'':name">{{ name }}</button><i/><button v-for="name in ['RSI','MACD','KDJ','CCI','WR','OBV','DMI','ROC','MTM','TRIX']" :key="name" :aria-pressed="lowerIndicator===name" :class="{active:lowerIndicator===name}" @click="lowerIndicator=lowerIndicator===name?'':name">{{ name }}</button></div><button class="more-indicators" @click="$router.push('/market/all?asset_type=indicator')">+ {{ t('v2.nav.indicator') }}</button></div>
    <div v-if="chartData?.candles?.length" class="signal-summary"><span><i :class="change<0?'down':'up'"/>{{ signalLabel }}</span><button @click="openAi">{{ t('v2.indicator.aiExplain') }} <van-icon name="arrow"/></button></div>
    <small v-if="updated" class="updated">{{ t('audit.updated',{time:new Date(updated).toLocaleTimeString()}) }}</small>
    <AlpacaTradePanel v-if="isUSStock" v-show="!expanded" :symbol="form.symbol" :chart-price="latestPrice"/>
    <ChartTradePanel v-else-if="tradeProductReady" v-show="!expanded" :market="form.market" :symbol="form.symbol" :chart-price="latestPrice" :product="selectedProduct" @context-change="onTradeContextChange"/>
    <van-popup v-model:show="indicatorSheetOpen" class="indicator-picker" position="bottom" round closeable teleport="body">
      <div class="indicator-picker-head"><h3>{{ t('indicator_chart.choose_indicator') }}</h3></div>
      <van-search v-model="indicatorQuery" :placeholder="t('common.search')" clearable/>
      <div class="indicator-picker-list">
        <button v-for="item in filteredIndicators" :key="item.id" type="button" :class="{selected:Number(item.id)===form.indicatorId}" @click="selectIndicator({indicatorId:Number(item.id)})">
          <span><strong>{{ item.name }}</strong><small v-if="item.description">{{ item.description }}</small></span>
          <van-icon :name="Number(item.id)===form.indicatorId?'success':'arrow'"/>
        </button>
        <van-empty v-if="!filteredIndicators.length" :description="t('audit.noIndicators')"/>
      </div>
      <button type="button" class="browse-indicators" @click="router.push('/market/all?asset_type=indicator');indicatorSheetOpen=false">{{ t('audit.browseIndicators') }} <van-icon name="arrow"/></button>
    </van-popup>
    <van-popup v-model:show="paramsOpen" position="bottom" round :style="{maxHeight:'80%'}"><div class="params"><h3>{{ t('indicator_chart.parameters') }}</h3><label v-for="param in parameters" :key="param.name"><span>{{ parameterLabel(param) }}</span><van-switch v-if="param.type==='bool'" v-model="form.params[param.name]" size="22"/><input v-else v-model="form.params[param.name]" :type="isNumeric(param)?'number':'text'" :min="param.min" :max="param.max" :step="param.step || 'any'"/></label><van-button block type="primary" @click="paramsOpen=false;loadChart()">{{ t('common.confirm') }}</van-button></div></van-popup>
    <van-action-sheet v-model:show="sourceOpen" :title="t('audit.source')" :actions="sourceActions" :cancel-text="t('common.cancel')" @select="selectSource"/>
    <SymbolPicker v-model:show="symbolPickerOpen" :title="t('indicator_chart.choose_symbol')" :auto-add="false" :default-market="form.market" :exchange-id="form.exchangeId" :market-type="form.marketType" :selected-symbol="form.symbol" @pick="selectSymbol"/>
  </div>
</template>
<script setup>
import { computed, onMounted, onActivated, onDeactivated, onBeforeUnmount, reactive, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute,useRouter } from 'vue-router'
import { EXCHANGE_BRANDS } from '@/constants/exchanges'
import { indicatorApi,klineApi,watchlistApi } from '@/api'
import MarketChart from '@/components/MarketChart.vue'
import ChartTradePanel from '@/components/ChartTradePanel.vue'
import AlpacaTradePanel from '@/components/AlpacaTradePanel.vue'
import SymbolPicker from '@/components/SymbolPicker.vue'
import ExchangeKlineWs from '@/utils/exchangeWs'
import { toCandles } from '@/utils/chartData'
import { mergeStreamBar, streamIsFresh } from '@/utils/chartStream'
defineOptions({name:'IndicatorChart'})
const {t,te}=useI18n();const route=useRoute();const router=useRouter()
const signalLabel=computed(()=>{const signal=chartData.value?.latest_signal;const raw=signal?.name||signal?.type;if(!raw)return t('indicator_chart.no_signal');const key=String(raw).toLowerCase();if(['buy','long','up','sell','short','down'].includes(key))return t(['buy','long','up'].includes(key)?'indicator_chart.signal_buy':'indicator_chart.signal_sell');return raw})
const form=reactive({market:String(route.query.market||'Crypto'),symbol:String(route.query.symbol||'BTC/USDT'),timeframe:String(route.query.timeframe||'1H'),exchangeId:String(route.query.exchange_id||'binance'),marketType:String(route.query.market_type||'swap'),indicatorId:0,params:{}})
const selectedProduct=ref(null)
const tradeProductReady=ref(false)
let productRequest=0
watch(()=>[form.market,form.symbol,form.exchangeId,form.marketType],async ([market,symbol,exchange,marketType])=>{
 const current=++productRequest
 tradeProductReady.value=false
 if(market.toLowerCase()!=='crypto'){selectedProduct.value=null;tradeProductReady.value=true;return}
 try{
  const result=await watchlistApi.search({market:'Crypto',keyword:symbol,exchange_id:exchange,market_type:marketType,limit:30})
  if(current!==productRequest)return
  selectedProduct.value=(result.data||[]).find(item=>String(item.symbol).toUpperCase()===symbol.toUpperCase())||null
 }catch{if(current===productRequest)selectedProduct.value={product_type:'unavailable'}}
 finally{if(current===productRequest)tradeProductReady.value=true}
},{immediate:true})
const isUSStock=computed(()=>form.market.toLowerCase()==='usstock')
const marketChart=ref(null)
const selectedInstrumentId=computed(()=>{
 const product=selectedProduct.value
 if(form.market.toLowerCase()!=='crypto'||!product)return ''
 if(product.exchange_id&&String(product.exchange_id).toLowerCase()!==form.exchangeId.toLowerCase())return ''
 if(product.market_type&&String(product.market_type).toLowerCase()!==form.marketType.toLowerCase())return ''
 if(product.symbol&&String(product.symbol).toUpperCase()!==form.symbol.toUpperCase())return ''
 return String(product.instrument_id||'').trim()
})
const streamContext=computed(()=>JSON.stringify([form.market,form.symbol,form.timeframe,form.exchangeId,form.marketType,selectedInstrumentId.value]))
let stream=null,streamGeneration=0,lastTick=0,lastPreview=0,pendingBar=null,pageActive=false
const chartData=ref(null),loading=ref(false),chartRefreshing=ref(false),error=ref(''),indicators=ref([]),parameters=ref([]),updated=ref(0),indicatorSheetOpen=ref(false),indicatorQuery=ref(''),symbolPickerOpen=ref(false),paramsOpen=ref(false),expanded=ref(false),mainIndicator=ref('EMA'),lowerIndicator=ref('')
const sourceOpen=ref(false);const sourceActions=computed(()=>['binance','gate','okx','bybit','bitget','htx'].flatMap(id=>['spot','swap'].map(type=>({name:EXCHANGE_BRANDS[id]?.name+' · '+t(type==='swap'?'chart_trade.swap':'chart_trade.spot'),exchangeId:id,marketType:type}))));function selectSource(item){sourceOpen.value=false;form.exchangeId=item.exchangeId;form.marketType=item.marketType;loadChart()}
const timeframes=['1m','5m','15m','30m','1H','4H','1D','1W'];let request=0,paramsRequest=0,timer,layoutTimer
const selectedIndicator=computed(()=>indicators.value.find(x=>Number(x.id)===form.indicatorId))
const filteredIndicators=computed(()=>{const keyword=indicatorQuery.value.trim().toLowerCase();if(!keyword)return indicators.value;return indicators.value.filter(item=>`${item.name||''} ${item.description||''}`.toLowerCase().includes(keyword))})
const latestPrice=computed(()=>{const value=chartData.value?.candles?.at(-1)?.close;return value==null?null:Number(value)})
const change=computed(()=>{const open=Number(chartData.value?.candles?.at(-1)?.open);return open&&latestPrice.value!==null?(latestPrice.value-open)/open*100:null})
const price=value=>value==null?'—':Number(value).toLocaleString(undefined,{maximumFractionDigits:Number(value)>=100?2:6})
const isNumeric=p=>['int','integer','float','number'].includes(p.type)
const parameterLabel=p=>p.label_key&&te(p.label_key)?t(p.label_key):p.label||p.name
async function loadChart(silent=false){
 if(silent&&chartRefreshing.value)return
 chartRefreshing.value=true
 const current=++request
 const context=streamContext.value,started=Date.now()
 if(!silent){loading.value=true;chartData.value=null}error.value=''
 try{
  let data
  if(form.indicatorId){const params=Object.fromEntries(parameters.value.map(p=>[p.name,p.type==='bool'?Boolean(form.params[p.name]):isNumeric(p)?Number(form.params[p.name]):form.params[p.name]]));data=(await indicatorApi.previewChart({indicator_id:form.indicatorId,market:form.market,symbol:form.symbol,timeframe:form.timeframe,exchange_id:form.market.toLowerCase()==='crypto'?form.exchangeId:undefined,market_type:form.market.toLowerCase()==='crypto'?form.marketType:'spot',instrument_id:selectedInstrumentId.value||undefined,params,limit:360})).data}
  else data={candles:(await klineApi.getKline({market:form.market,symbol:form.symbol,timeframe:form.timeframe,exchangeId:form.market.toLowerCase()==='crypto'?form.exchangeId:undefined,marketType:form.market.toLowerCase()==='crypto'?form.marketType:'spot',instrumentId:selectedInstrumentId.value||undefined,limit:360})).data}
  if(current!==request||context!==streamContext.value)return
  data.candles=toCandles(data.candles||[])
  if(pendingBar&&lastTick>=started)mergeStreamBar(data.candles,pendingBar,form.timeframe)
  chartData.value=data;updated.value=Date.now()
  lastPreview=Date.now()
 }catch(e){if(current===request&&!silent){error.value=e?.localizedMessage||e?.message||t('audit.loadFailed');chartData.value=null}}
 finally{if(current===request){loading.value=false;chartRefreshing.value=false}}
}
async function selectIndicator(item){
 indicatorSheetOpen.value=false;form.indicatorId=item.indicatorId;parameters.value=[];form.params={};const current=++paramsRequest;++request;chartData.value=null;loading.value=true;chartRefreshing.value=false
 try{const data=(await indicatorApi.getParams(form.indicatorId)).data||[];if(current!==paramsRequest)return;parameters.value=data;for(const p of data)form.params[p.name]=p.default??'';await loadChart()}catch(e){if(current===paramsRequest)error.value=e?.localizedMessage||e?.message||t('audit.loadFailed')}
 finally{if(current===paramsRequest)loading.value=false}
}
function selectSymbol(item){form.market=item.market||'Crypto';form.symbol=item.symbol;if(form.market.toLowerCase()==='crypto'){form.exchangeId=item.exchange_id||form.exchangeId;form.marketType=item.market_type||form.marketType;selectedProduct.value={symbol:form.symbol,exchange_id:form.exchangeId,market_type:form.marketType,instrument_id:item.instrument_id||'',settle_currency:item.settle_currency||'',product_type:item.product_type||'',api_family:item.api_family||'',underlying_market:item.underlying_market||'',underlying_symbol:item.underlying_symbol||'',product_meta:item.product_meta||null}}else selectedProduct.value=null;loadChart()}
function onTradeContextChange(context){if(!context.exchangeId)return;if(context.exchangeId===form.exchangeId&&context.marketType===form.marketType)return;form.exchangeId=context.exchangeId;form.marketType=context.marketType;loadChart()}
function openAi(){router.push({path:'/ai',query:{symbol:form.symbol,market:form.market,timeframe:form.timeframe}})}
async function bootstrap(){try{indicators.value=(await indicatorApi.getList()).data||[];const id=Number(route.query.indicator_id||route.query.local_copy_id||0);const preferred=indicators.value.find(x=>Number(x.id)===id)||indicators.value[0];if(preferred)await selectIndicator({indicatorId:Number(preferred.id)});else await loadChart()}catch(e){error.value=e?.localizedMessage||e?.message||t('audit.loadFailed')}}
function stopStream(){streamGeneration++;stream?.disconnect();stream=null;lastTick=0;pendingBar=null}
function startStream(){
 stopStream()
 if(!pageActive||document.hidden||form.market.toLowerCase()!=='crypto')return
 const generation=streamGeneration
 stream=new ExchangeKlineWs()
 const connecting=stream.connect(form.symbol,form.timeframe,{
  onTick(bar){
   if(generation!==streamGeneration||!pageActive||document.hidden)return
   pendingBar=bar
   const candles=chartData.value?.candles
   if(!candles?.length){lastTick=Date.now();return}
   const result=mergeStreamBar(candles,bar,form.timeframe)
   if(result==='gap'){lastTick=0;loadChart(true);return}
   if(result==='ignored')return
   lastTick=Date.now();updated.value=lastTick
   marketChart.value?.updateBar(bar)
  },
   onError(){if(generation===streamGeneration){lastTick=0;loadChart(true)}},
   onReconnecting(){if(generation===streamGeneration)lastTick=0},
   onReconnected(){if(generation===streamGeneration)loadChart(true)}
  },form.exchangeId,{marketType:form.marketType,instrumentId:selectedInstrumentId.value})
 if(!connecting)stream=null
}
function resizeChartAfterActivation(){nextTick(()=>{marketChart.value?.resize();requestAnimationFrame(()=>marketChart.value?.resize());clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>marketChart.value?.resize(),180)})}
function stop(){pageActive=false;clearInterval(timer);timer=null;clearTimeout(layoutTimer);layoutTimer=null;stopStream();request++;loading.value=false;chartRefreshing.value=false}
function start(){
 pageActive=true;clearInterval(timer);startStream();resizeChartAfterActivation()
 timer=setInterval(()=>{
  if(loading.value||chartRefreshing.value||document.hidden)return
  const healthy=streamIsFresh(lastTick)
  if(!healthy||form.indicatorId&&Date.now()-lastPreview>=30000)loadChart(true)
 },15000)
}
function visibilityChanged(){if(!pageActive)return;if(document.hidden)stopStream();else startStream()}
onMounted(()=>{bootstrap();document.addEventListener('visibilitychange',visibilityChanged)});onActivated(start);onDeactivated(stop);onBeforeUnmount(()=>{stop();paramsRequest++;document.removeEventListener('visibilitychange',visibilityChanged)})
watch(streamContext,startStream,{flush:'sync'})
watch(selectedInstrumentId,(value,previous)=>{if(pageActive&&value&&value!==previous)loadChart(true)})
watch(()=>route.query,query=>{if(route.path!=='/indicators/chart')return;let changed=false;for(const key of ['symbol','market','timeframe'])if(query[key]&&query[key]!==form[key]){form[key]=String(query[key]);changed=true}const id=Number(query.indicator_id||query.local_copy_id||0);if(id&&id!==form.indicatorId)selectIndicator({indicatorId:id});else if(changed)loadChart()})
watch(indicatorSheetOpen,value=>{if(!value)indicatorQuery.value=''})
</script>
<style scoped>
.terminal-page{padding:10px 0 24px;background:var(--v2-bg);color:var(--v2-text);min-height:100%}.market-head{padding:0 14px}.market-title-row{display:flex;align-items:center;gap:6px}.market-head button{border:0;background:none;color:inherit}.market-head .symbol{flex:0 1 auto;min-width:0;max-width:40%;display:flex;align-items:center;gap:5px;min-height:40px;text-align:left;font-size:20px}.market-head .symbol strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quote{flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;white-space:nowrap}.quote strong{overflow:hidden;font-size:21px;font-weight:780;font-variant-numeric:tabular-nums;letter-spacing:-.02em;text-overflow:ellipsis}.quote span{font-size:10px;font-weight:700}.quote.up{color:var(--v2-green)}.quote.down{color:var(--v2-red)}.icon-button{flex:0 0 36px;width:36px;height:40px;border-radius:50%!important;font-size:20px}.icon-button:active{background:var(--v2-surface-2)}.icon-button.refreshing :deep(.van-icon){animation:chart-spin .8s linear infinite}@keyframes chart-spin{to{transform:rotate(360deg)}}.market-head .source{min-height:27px;display:flex;align-items:center;gap:5px;color:var(--v2-muted);font-size:10px}.market-head .source b{color:var(--v2-text);font-size:11px}.timeframes{display:flex;overflow:auto;gap:2px;margin-top:4px;padding:0 10px;border-bottom:1px solid var(--v2-line);scrollbar-width:none}.timeframes::-webkit-scrollbar,.indicators::-webkit-scrollbar{display:none}.timeframes button{position:relative;flex:1 0 42px;min-height:42px;border:0;background:none;color:var(--v2-muted);font-size:12px}.timeframes .active{color:var(--v2-text);font-weight:700}.timeframes .active:after{content:'';position:absolute;left:11px;right:11px;bottom:0;height:3px;border-radius:3px;background:var(--v2-brand)}.indicator-select{display:flex;gap:7px;padding:9px 12px 7px}.indicator-select button{min-height:38px;min-width:0;border:1px solid var(--v2-line);background:var(--v2-surface);color:var(--v2-text);border-radius:8px;padding:7px 11px}.indicator-select button:first-child{flex:1;display:flex;align-items:center;justify-content:space-between;gap:8px;overflow:hidden;text-align:left}.indicator-select button:first-child span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.indicator-select .parameter-button{position:relative;width:42px;padding:0;font-size:17px}.parameter-button b{position:absolute;top:2px;right:2px;min-width:15px;padding:1px 3px;border-radius:8px;background:var(--v2-brand);color:var(--v2-on-brand);font-size:9px}.chart-area{position:relative;min-height:340px;overflow:hidden}.chart-placeholder,.chart-state{position:absolute;inset:0;z-index:3;background:var(--v2-bg)}.chart-placeholder{padding:22px 16px}.chart-placeholder :deep(.van-skeleton__title),.chart-placeholder :deep(.van-skeleton__row){background:var(--v2-surface-2)}.chart-state{display:grid;place-content:center;gap:10px;padding:14px;color:var(--v2-muted);text-align:center}.indicator-tools{border-top:1px solid var(--v2-line);border-bottom:1px solid var(--v2-line)}.indicators{display:flex;overflow:auto;gap:0;padding:0 8px;scrollbar-width:none}.indicators button{flex:0 0 auto;min-height:42px;padding:0 11px;border:0;background:none;color:var(--v2-muted);font-size:11px}.indicators button.active{color:var(--v2-brand);font-weight:750}.indicators i{height:18px;margin:auto 2px;border-left:1px solid var(--v2-line)}.indicators .more-indicators{margin-left:auto;color:var(--v2-text)}.signal-summary{margin:9px 12px 0;padding:10px 11px;background:var(--v2-surface-2);display:flex;align-items:center;gap:10px;border-radius:8px;font-size:11px}.signal-summary span{flex:1;display:flex;align-items:center;gap:7px}.signal-summary span i{width:7px;height:7px;border-radius:50%;background:var(--v2-muted)}.signal-summary span i.up{background:var(--v2-green)}.signal-summary span i.down{background:var(--v2-red)}.signal-summary button{border:0;background:none;color:var(--v2-text);white-space:nowrap}.updated{display:block;padding:7px 14px 0;color:var(--v2-muted);font-size:9px}.params{padding:20px;overflow:auto}.params label{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:12px 0}.params input{width:130px;min-height:40px;border:1px solid var(--v2-line);background:var(--v2-surface-2);color:var(--v2-text);border-radius:6px;padding:8px}.expanded{position:fixed;inset:0;z-index:200;overflow:auto}.expanded .signal-summary,.expanded .updated{display:none}@media(min-width:720px){.terminal-page:not(.expanded){max-width:640px;margin:auto}}
</style>

<style>
.indicator-tools{display:flex;min-width:0}.indicator-tools .indicators{flex:1;min-width:0;overscroll-behavior-x:contain}.indicator-tools .indicators i{flex:0 0 1px}.indicator-tools>.more-indicators{flex:0 0 auto;border:0;border-left:1px solid var(--v2-line);background:var(--v2-bg);color:var(--v2-text);padding:0 12px;font-size:11px}
.indicator-picker{width:100%;max-height:min(78vh,720px);display:flex;flex-direction:column;background:var(--v2-surface);color:var(--v2-text)}.indicator-picker-head{padding:18px 52px 6px 18px}.indicator-picker-head h3{margin:0;font-size:17px}.indicator-picker .van-search{padding:8px 14px;background:transparent}.indicator-picker .van-search__content{border:1px solid var(--v2-line);border-radius:9px;background:var(--v2-surface-2)}.indicator-picker .van-field__control{color:var(--v2-text)}.indicator-picker-list{flex:1;overflow-y:auto;padding:2px 12px 8px}.indicator-picker-list>button{width:100%;min-height:62px;display:flex;align-items:center;gap:12px;padding:11px 12px;border:0;border-bottom:1px solid var(--v2-line);background:transparent;color:var(--v2-text);text-align:left}.indicator-picker-list>button.selected{border:1px solid color-mix(in srgb,var(--v2-brand) 55%,var(--v2-line));border-radius:9px;background:color-mix(in srgb,var(--v2-brand) 9%,var(--v2-surface));}.indicator-picker-list>button>span{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.indicator-picker-list strong{overflow:hidden;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.indicator-picker-list small{display:-webkit-box;overflow:hidden;color:var(--v2-muted);font-size:11px;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.indicator-picker-list .van-icon{color:var(--v2-muted)}.indicator-picker-list .selected .van-icon{color:var(--v2-brand)}.browse-indicators{min-height:48px;margin:0 14px calc(12px + env(safe-area-inset-bottom));border:1px solid var(--v2-line);border-radius:9px;background:var(--v2-surface-2);color:var(--v2-text);font-weight:750}
</style>
