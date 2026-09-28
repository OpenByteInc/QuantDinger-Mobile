<template>
  <section class="event-radar">
    <header class="radar-head">
      <div><van-icon name="cluster-o"/><span><strong>{{ $t('eventRadar.title') }}</strong><small>{{ $t('eventRadar.referenceOnly') }}</small></span></div>
      <button v-if="status?.enabled" type="button" :disabled="analyzing || !symbol" @click="analyze"><van-icon name="replay"/>{{ $t(result?'eventRadar.rerun':'eventRadar.run') }}</button>
    </header>

    <div v-if="loading" class="radar-loading"><van-loading size="22"/><span>{{ $t('audit.loading') }}</span></div>
    <p v-else-if="error" class="radar-error">{{ error }}</p>
    <div v-else-if="status && !status.enabled" class="radar-empty"><van-icon name="warning-o"/><span>{{ $t('eventRadar.masterDisabled') }}</span></div>
    <template v-else-if="status">
      <div v-if="result" class="radar-result">
        <article class="radar-summary" :class="directionClass">
          <div class="score"><strong>{{ confidence }}</strong><small>{{ $t('eventRadar.confidence') }}</small></div>
          <div class="summary-copy">
            <div class="summary-title"><strong>{{ directionLabel }}</strong><time>{{ formatDate(result.created_at) }}</time></div>
            <p>{{ result.summary }}</p>
            <div class="summary-tags">
              <span>{{ $t('eventRadar.impact') }} · {{ levelLabel(result.impact) }}</span>
              <span>{{ $t('eventRadar.relevance') }} · {{ levelLabel(result.relevance) }}</span>
              <span>{{ $t('eventRadar.freshness') }} · {{ freshnessLabel(result.freshness) }}</span>
            </div>
          </div>
        </article>

        <div v-if="(result.events||[]).length" class="event-list">
          <article v-for="(event,index) in result.events" :key="event.url || `${event.title}-${index}`" class="event-card">
            <div class="event-meta"><span>{{ eventKind(event) }}</span><time>{{ formatDate(event.published_at || event.date) }}</time></div>
            <h4>{{ event.title }}</h4>
            <p v-if="eventSummary(event)">{{ eventSummary(event) }}</p>
            <div v-if="macroMetrics(event).length" class="macro-metrics">
              <span v-for="metric in macroMetrics(event)" :key="metric.key"><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></span>
            </div>
            <footer><span>{{ event.source || event.provider || '—' }}</span><button v-if="safeUrl(event.url)" type="button" @click="openSource(event.url)">{{ $t('eventRadar.viewSource') }}<van-icon name="arrow"/></button></footer>
          </article>
        </div>
        <div v-else class="radar-empty"><van-icon name="notes-o"/><span>{{ $t('eventRadar.noEvents') }}</span></div>
      </div>
      <div v-else class="radar-empty no-analysis"><van-icon name="chart-trending-o"/><span>{{ $t('eventRadar.noAnalysis') }}</span><button type="button" :disabled="analyzing || !symbol" @click="analyze">{{ $t('eventRadar.run') }}</button></div>
      <p class="radar-cost">{{ $t('eventRadar.costHint',{cost:status.billing_enabled?status.cost:0}) }}</p>
    </template>
  </section>
</template>

<script setup>
import { ref,computed,watch,onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { showConfirmDialog } from 'vant'
import { quickTradeApi } from '@/api'
import { openExternal } from '@/utils/external'

const props=defineProps({symbol:String,marketType:String})
const {t,te}=useI18n()
const status=ref(null),loading=ref(false),analyzing=ref(false),error=ref('')
let request=0

const result=computed(()=>status.value?.latest)
const confidence=computed(()=>`${Math.round(Math.max(0,Math.min(1,Number(result.value?.confidence)||0))*100)}%`)
const directionClass=computed(()=>`direction-${String(result.value?.direction||'neutral').toLowerCase()}`)
const directionLabel=computed(()=>label(`eventRadar.direction.${String(result.value?.direction||'neutral').toLowerCase()}`))
const label=key=>te(key)?t(key):'—'
const levelLabel=value=>label(`eventRadar.level.${String(value||'low').toLowerCase()}`)
const freshnessLabel=value=>label(`eventRadar.freshnessValue.${String(value||'stale').toLowerCase()}`)
const safeUrl=url=>/^https?:\/\//i.test(String(url||''))
const openSource=url=>{if(safeUrl(url))openExternal(url)}
const eventKind=event=>event?.kind==='macro'?label(`eventRadar.macroType.${event.event_type||'macro'}`):(event?.kind==='filing'?t('eventRadar.filing'):t('eventRadar.news'))
const eventSummary=event=>event?.kind==='macro'&&/^\s*(actual|forecast|previous)=/i.test(String(event?.summary||''))?'':String(event?.summary||'').trim()
const macroMetrics=event=>['actual','forecast','previous'].filter(key=>event?.[key]!==undefined&&event?.[key]!==null&&event?.[key]!=='').map(key=>({key,label:t(`eventRadar.metric.${key}`),value:event[key]}))
const formatDate=value=>{const date=new Date(typeof value==='number'&&value<1e11?value*1000:value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat(undefined,{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date)}

async function load(){const id=++request;status.value=null;loading.value=true;error.value='';try{const res=await quickTradeApi.getEventRadar({symbol:props.symbol,market_type:props.marketType});if(id===request)status.value=res.data}catch(e){if(id===request)error.value=e?.message||t('audit.loadFailed')}finally{if(id===request)loading.value=false}}
async function analyze(){if(analyzing.value)return;const id=request;const payload={symbol:props.symbol,market_type:props.marketType};analyzing.value=true;try{await showConfirmDialog({title:t('eventRadar.run'),message:t('eventRadar.costHint',{cost:status.value?.billing_enabled?status.value.cost:0})});if(id!==request)return;const res=await quickTradeApi.analyzeEventRadar(payload);if(id===request)status.value={...status.value,latest:res.data}}catch(e){if(e?.message&&id===request)error.value=e.message}finally{analyzing.value=false}}
watch(()=>[props.symbol,props.marketType],load,{immediate:true})
onBeforeUnmount(()=>request++)
</script>

<style scoped>
.event-radar{color:var(--text);font-size:12px}.radar-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.radar-head>div{display:flex;min-width:0;gap:9px}.radar-head>div>.van-icon{display:grid;width:32px;height:32px;flex:0 0 auto;place-items:center;border-radius:8px;background:var(--surface-raised);color:var(--primary);font-size:17px}.radar-head span{display:flex;min-width:0;flex-direction:column;gap:3px}.radar-head strong{font-size:14px}.radar-head small{max-width:430px;color:var(--text-3);font-size:10px;line-height:1.45}.radar-head button,.no-analysis button{display:flex;align-items:center;gap:5px;min-height:32px;flex:0 0 auto;padding:0 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface-raised);color:var(--text);font-size:11px;font-weight:800}.radar-loading,.radar-empty{display:flex;min-height:110px;align-items:center;justify-content:center;gap:8px;color:var(--text-3)}.radar-error{padding:10px;border-radius:8px;background:var(--down-soft);color:var(--down)}.radar-result{display:grid;gap:10px}.radar-summary{display:grid;grid-template-columns:70px 1fr;gap:13px;padding:13px;border:1px solid var(--border);border-radius:10px;background:var(--surface-raised)}.score{display:flex;min-height:70px;align-items:center;justify-content:center;flex-direction:column;border-radius:9px;background:var(--surface-deep)}.score strong{font-size:23px;font-variant-numeric:tabular-nums}.score small{color:var(--text-3);font-size:9px}.direction-bullish .score,.direction-bullish .summary-title>strong{color:var(--up)}.direction-bearish .score,.direction-bearish .summary-title>strong{color:var(--down)}.direction-mixed .score,.direction-mixed .summary-title>strong{color:var(--warn)}.summary-copy{min-width:0}.summary-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.summary-title strong{font-size:15px}.summary-title time{color:var(--text-3);font-size:9px}.summary-copy>p{margin:7px 0 9px;color:var(--text-2);line-height:1.55}.summary-tags{display:flex;flex-wrap:wrap;gap:5px}.summary-tags span{padding:3px 6px;border-radius:4px;background:var(--surface-deep);color:var(--text-2);font-size:9px}.event-list{display:grid;gap:8px}.event-card{padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface-raised)}.event-meta,.event-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.event-meta span{padding:3px 6px;border-radius:4px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);font-size:9px;font-weight:800}.event-meta time,.event-card footer{color:var(--text-3);font-size:9px}.event-card h4{margin:9px 0 5px;font-size:13px;line-height:1.4}.event-card>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-2);line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:3}.macro-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}.macro-metrics span{display:flex;min-width:0;flex-direction:column;gap:2px;padding:7px;border-radius:6px;background:var(--surface-deep)}.macro-metrics small{color:var(--text-3);font-size:8px}.macro-metrics strong{overflow:hidden;font-size:11px;text-overflow:ellipsis}.event-card footer{margin-top:9px;padding-top:8px;border-top:1px solid var(--hairline)}.event-card footer button{display:flex;align-items:center;gap:2px;border:0;background:transparent;color:var(--primary);font-size:10px}.no-analysis{flex-direction:column}.radar-cost{margin:9px 0 0;color:var(--text-3);font-size:9px;text-align:right}@media(max-width:420px){.radar-summary{grid-template-columns:58px 1fr}.score{min-height:64px}.radar-head small{display:none}}
</style>
