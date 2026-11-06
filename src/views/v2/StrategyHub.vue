<template>
  <div class="v2-page strategy-page">
    <section class="market-pulse" aria-live="polite">
      <div class="market-pulse-head">
        <div><h1>{{ t('v2.strategy.globalIndices') }}</h1><p>{{ t(marketSegment === 'indices' ? 'v2.strategy.globalIndicesSubtitle' : 'v2.strategy.cryptoBenchmarksSubtitle') }}</p></div>
        <small v-if="indicesUpdatedLabel">{{ indicesUpdatedLabel }}</small>
      </div>
      <div class="market-segment" role="tablist" :aria-label="t('v2.strategy.marketCategory')">
        <button v-for="segment in marketSegments" :key="segment.key" type="button" role="tab" :aria-selected="marketSegment === segment.key" :class="{ active: marketSegment === segment.key }" @click="marketSegment = segment.key">{{ segment.label }}</button>
      </div>
      <div v-if="indicesLoading && !marketItems.length" class="index-strip index-skeleton" aria-hidden="true"><i v-for="n in 3" :key="n"></i></div>
      <div v-else-if="marketItems.length" class="index-strip">
        <article v-for="item in marketItems" :key="item.symbol || item.name_en || item.name_cn">
          <span>{{ indexName(item) }}</span><strong>{{ formatIndexPrice(item.price) }}</strong><b :class="indexTone(item)">{{ formatIndexChange(item) }}</b>
        </article>
      </div>
      <p v-else class="indices-empty">{{ t('v2.strategy.marketDataDelayed') }}</p>
    </section>

      <section class="portfolio-section">
        <div class="section-heading compact-heading">
          <h2>{{ t('v2.strategy.portfolioIntelligence') }}</h2>
          <button type="button" @click="openAll">{{ t('v2.strategy.marketOpportunity') }} <van-icon name="arrow" /></button>
        </div>
        <div :class="['portfolio-grid', { 'section-loading': dashboardLoading && !portfolioLoaded }]">
          <div class="portfolio-return">
            <span>{{ t('v2.strategy.strategyPortfolio') }}</span><small class="portfolio-scope">{{ t('v2.strategy.runningLiveScope', { count: runningLiveStrategies.length }) }}</small><strong :class="valueTone(portfolioReturn)">{{ formatPortfolioPercent(portfolioReturn) }}</strong><small>{{ t('v2.strategy.cumulativeReturn') }}</small>
          </div>
          <div v-if="portfolioSeries.length > 1" class="portfolio-chart">
            <canvas ref="portfolioCanvas" aria-hidden="true"></canvas>
            <p>{{ t('v2.strategy.livePortfolioEquity') }} <strong>{{ formatPortfolioValue(totalEquity) }}</strong></p>
          </div>
          <div v-else class="portfolio-chart portfolio-chart-empty"><span>{{ t('v2.strategy.noPortfolioHistory') }}</span><p>{{ t('v2.strategy.livePortfolioEquity') }} <strong>{{ formatPortfolioValue(totalEquity) }}</strong></p></div>
        </div>
      </section>

      <section v-if="spotlight" class="spotlight-section">
        <div class="section-kicker"><i></i>{{ t('v2.strategy.aiStrategySpotlight') }}</div>
        <button class="spotlight-title" type="button" @click="openDetail(spotlight)"><span>{{ itemName(spotlight) }}</span><van-icon name="arrow" /></button>
        <p class="spotlight-thesis">{{ t('v2.strategy.spotlightThesis') }}</p>

        <div class="spotlight-metrics">
          <div><span>{{ t('v2.strategy.annualizedReturn') }}</span><strong :class="valueTone(spotlight.total_return)">{{ formatPercent(spotlight.total_return, true) }}</strong></div>
          <div><span>{{ t('v2.strategy.drawdown') }}</span><strong class="risk-value">{{ formatDrawdown(spotlight.max_drawdown) }}</strong></div>
          <div><span>{{ t('v2.strategy.sharpeRatio') }}</span><strong>{{ sharpeRatio(spotlight) }}</strong></div>
        </div>

        <div class="spotlight-chart"><canvas ref="strategyCanvas" aria-hidden="true"></canvas></div>

        <div class="mandate-block">
          <span>{{ t('v2.strategy.chooseMandate') }}</span>
          <div class="mandate-control" role="tablist" :aria-label="t('v2.strategy.chooseMandate')">
            <button v-for="option in preferences" :key="option.value" type="button" role="tab" :aria-selected="preference === option.value" :class="{ active: preference === option.value }" @click="selectPreference(option.value)">
              <van-icon :name="option.icon" /><span><strong>{{ option.label }}</strong><small>{{ option.desc }}</small></span>
            </button>
          </div>
        </div>

        <div class="spotlight-actions">
          <button class="primary-action" type="button" @click="startWith(spotlight)">{{ t('v2.strategy.exploreStrategy') }}</button>
          <button class="report-action" type="button" @click="openDetail(spotlight)">{{ t('v2.strategy.fullReport') }} <van-icon name="arrow" /></button>
        </div>
      </section>

      <section class="recommendation-section">
        <div class="section-heading">
          <h2><i></i>{{ t('v2.strategy.recommendedForYou') }}</h2>
          <button type="button" @click="openAll">{{ t('v2.strategy.viewMore') }} <van-icon name="arrow" /></button>
        </div>
        <div v-if="loading && !topStrategies.length" class="strategy-skeleton" aria-hidden="true"><i v-for="n in 3" :key="n"></i></div>
        <div v-else-if="failed && !topStrategies.length" class="section-error"><span>{{ t('audit.loadFailed') }}</span><button type="button" @click="loadStrategies">{{ t('v2.common.retry') }}</button></div>
        <van-empty v-else-if="!topStrategies.length" :description="t('audit.noData')" />
        <div v-else class="recommendation-list">
          <button v-for="(item, index) in topStrategies" :key="item.id || index" type="button" class="recommendation-row" @click="openDetail(item)">
            <b class="rank-number">{{ String(index + 1).padStart(2, '0') }}</b>
            <span class="strategy-identity"><strong>{{ itemName(item) }}</strong><small>{{ marketMeta(item) }}</small></span>
            <strong :class="['row-return', valueTone(item.total_return)]">{{ formatPercent(item.total_return, true) }}</strong>
            <strong class="row-drawdown">{{ formatDrawdown(item.max_drawdown) }}</strong><van-icon name="arrow" />
          </button>
        </div>
      </section>

      <section class="watchlist-section">
        <div class="section-heading watchlist-heading">
          <div><h2><i></i>{{ t('v2.strategy.watchlistTitle') }}</h2><p>{{ t('v2.strategy.watchlistSubtitle') }}</p></div>
          <button type="button" @click="openWatchlist">{{ t('v2.strategy.manageWatchlist') }} <van-icon name="arrow" /></button>
        </div>

        <div v-if="watchlistLoading" class="watchlist-loading"><van-loading size="18" /></div>
        <template v-else-if="watchlistRows.length">
          <div class="watchlist-table">
            <div class="watchlist-labels" aria-hidden="true"><span>{{ t('v2.strategy.watchlistAsset') }}</span><span>{{ t('v2.strategy.watchlistPrice') }}</span><span>{{ t('v2.strategy.watchlistChange') }}</span></div>
            <button v-for="item in watchlistRows" :key="watchKey(item)" type="button" class="watchlist-row" @click="openQuote(item)">
              <span class="watch-identity"><b>{{ displaySymbol(item.symbol) }}</b><small>{{ watchMarketLabel(item) }}</small></span>
              <strong class="watch-price">{{ formatPrice(item.price) }}</strong><strong :class="['watch-change', quoteTone(item.changePercent)]">{{ formatQuoteChange(item.changePercent) }}</strong><van-icon name="arrow" />
            </button>
          </div>
          <div v-if="watchlistPageCount > 1" class="watchlist-pagination">
            <button type="button" :disabled="watchlistPage === 1" @click="watchlistPage -= 1"><van-icon name="arrow-left" /><span>{{ t('audit.previousPage') }}</span></button>
            <span><strong>{{ watchlistPage }}</strong> / {{ watchlistPageCount }}</span>
            <button type="button" :disabled="watchlistPage === watchlistPageCount" @click="watchlistPage += 1"><span>{{ t('audit.nextPage') }}</span><van-icon name="arrow" /></button>
          </div>
        </template>
        <div v-else class="watchlist-empty">
          <van-icon name="star-o" /><div><strong>{{ t('v2.strategy.watchlistEmpty') }}</strong><small>{{ t('v2.strategy.watchlistEmptyDesc') }}</small></div><button type="button" @click="openWatchlist">{{ t('v2.strategy.addWatchlist') }}</button>
        </div>
      </section>

    <SymbolPicker v-model:show="showWatchlistPicker" :title="t('v2.strategy.watchlistTitle')" @pick="handleWatchlistPick" @close="loadWatchlist" />
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { globalMarketApi, marketApi, strategyApi, watchlistApi } from '@/api'
import { rankStrategies } from '@/utils/strategyDisplay'
import { ASSET_TYPES, buildCreateRouteFromMarketAsset } from '@/utils/marketRoutes'
import SymbolPicker from '@/components/SymbolPicker.vue'

defineOptions({ name: 'StrategyHubV2' })
const { t, locale } = useI18n()
const router = useRouter()
const preference = ref('balanced')
const items = ref([])
const loading = ref(false)
const failed = ref(false)
const portfolioStrategies = ref([])
const portfolioLoaded = ref(false)
const dashboardLoading = ref(false)
const globalIndices = ref([])
const globalCrypto = ref([])
const marketSegment = ref('indices')
const indicesLoading = ref(false)
const indicesUpdatedAt = ref('')
const watchlist = ref([])
const quotes = ref([])
const watchlistLoading = ref(false)
const watchlistPage = ref(1)
const showWatchlistPicker = ref(false)
const portfolioCanvas = ref(null)
const strategyCanvas = ref(null)
const marketSegments = computed(() => [
  { key: 'indices', label: t('v2.strategy.indices') },
  { key: 'crypto', label: t('v2.strategy.cryptoBenchmarks') }
])
const marketItems = computed(() => (marketSegment.value === 'crypto' ? globalCrypto.value : globalIndices.value).slice(0, 6))

const preferences = computed(() => [
  { value: 'stable', label: t('v2.strategy.stable'), desc: t('v2.strategy.stableDesc'), icon: 'bar-chart-o' },
  { value: 'balanced', label: t('v2.strategy.balanced'), desc: t('v2.strategy.balancedDesc'), icon: 'balance-o' },
  { value: 'active', label: t('v2.strategy.active'), desc: t('v2.strategy.activeDesc'), icon: 'chart-trending-o' }
])
const displayItems = computed(() => rankStrategies(items.value, preference.value))
const topStrategies = computed(() => displayItems.value.slice(0, 3))
const spotlight = computed(() => topStrategies.value[0] || null)
const runningLiveStrategies = computed(() => portfolioStrategies.value.filter(item => isRunningStrategy(item) && executionModeOf(item) === 'live'))
const portfolioInitialCapital = computed(() => sumStrategyValues(runningLiveStrategies.value, strategyCapital))
const totalPnl = computed(() => sumStrategyValues(runningLiveStrategies.value, strategyTotalPnl))
const totalEquity = computed(() => portfolioInitialCapital.value == null || totalPnl.value == null ? null : portfolioInitialCapital.value + totalPnl.value)
const portfolioReturn = computed(() => {
  if (!(portfolioInitialCapital.value > 0) || totalPnl.value == null) return null
  return totalPnl.value / portfolioInitialCapital.value * 100
})
const portfolioSeries = computed(() => {
  const initial = portfolioInitialCapital.value
  return initial == null || totalEquity.value == null ? [] : [initial, totalEquity.value]
})
const quoteMap = computed(() => {
  const map = {}
  for (const item of quotes.value) {
    map[watchKey(item)] = item
    map[watchAssetKey(item)] = item
  }
  return map
})
const WATCHLIST_PAGE_SIZE = 20
const watchlistPageCount = computed(() => Math.max(1, Math.ceil(watchlist.value.length / WATCHLIST_PAGE_SIZE)))
const watchlistRows = computed(() => {
  const start = (watchlistPage.value - 1) * WATCHLIST_PAGE_SIZE
  return watchlist.value.slice(start, start + WATCHLIST_PAGE_SIZE).map(item => ({ ...item, ...(quoteMap.value[watchKey(item)] || quoteMap.value[watchAssetKey(item)] || {}) }))
})
const indicesUpdatedLabel = computed(() => {
  if (!indicesUpdatedAt.value) return ''
  const date = new Date(indicesUpdatedAt.value)
  if (Number.isNaN(date.getTime())) return ''
  return t('v2.strategy.indexUpdated', { time: new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date) })
})

onActivated(() => { loadData(); renderCharts() })
onMounted(() => { window.addEventListener('resize', renderCharts); renderCharts() })
onBeforeUnmount(() => window.removeEventListener('resize', renderCharts))
watch([items, preference, portfolioStrategies], renderCharts, { flush: 'post' })
watch(watchlistPageCount, count => { if (watchlistPage.value > count) watchlistPage.value = count })

function selectPreference(value) { preference.value = value }
function loadData() {
  restoreHomeCache()
  loadStrategies()
  loadPortfolio()
  loadWatchlist()
  loadGlobalIndices()
}
async function loadStrategies() {
  loading.value = true
  failed.value = false
  try {
    const result = await marketApi.getIndicators({ page: 1, page_size: 12, asset_type: ASSET_TYPES.SCRIPT_TEMPLATE, sort_by: 'score' })
    items.value = result.data?.items || []
    saveHomeCache()
  } catch { failed.value = true } finally { loading.value = false }
}
async function loadPortfolio() {
  dashboardLoading.value = true
  try {
    portfolioStrategies.value = (await strategyApi.getList()).data || []
    portfolioLoaded.value = true
    saveHomeCache()
  } catch {} finally { dashboardLoading.value = false }
}
async function loadGlobalIndices() {
  const cached = readSession('qd-mobile-global-markets') || readSession('qd-mobile-global-indices')
  if (cached?.indices?.length) {
    globalIndices.value = cached.indices
    globalCrypto.value = cached.crypto || []
    indicesUpdatedAt.value = cached.timestamp || cached.cachedAt
  }
  indicesLoading.value = true
  try {
    const data = (await globalMarketApi.getOverview()).data || {}
    globalIndices.value = (data.indices || []).slice(0, 6)
    globalCrypto.value = (data.crypto || []).filter(item => Number(item?.price) > 0).slice(0, 6)
    indicesUpdatedAt.value = data.timestamp || new Date().toISOString()
    writeSession('qd-mobile-global-markets', { indices: globalIndices.value, crypto: globalCrypto.value, timestamp: indicesUpdatedAt.value, cachedAt: new Date().toISOString() })
  } catch {} finally { indicesLoading.value = false }
}
async function loadWatchlist() {
  watchlistLoading.value = true
  try {
    watchlist.value = (await watchlistApi.getList()).data || []
    if (watchlist.value.length) {
      try { quotes.value = (await watchlistApi.getPrices()).data || [] } catch { quotes.value = [] }
    } else quotes.value = []
  } catch {
    watchlist.value = []
    quotes.value = []
  } finally { watchlistLoading.value = false }
}

function renderCharts() {
  nextTick(() => {
    drawLine(portfolioCanvas.value, portfolioSeries.value, 2)
    drawLine(strategyCanvas.value, [9, 11, 13, 12, 15, 17, 19, 18, 22, 24, 23, 27, 29, 28, 31, 34, 33, 36, 39, 42, 41, 45], 2.2)
  })
}
function readSession(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null } }
function writeSession(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {} }
function restoreHomeCache() {
  const cached = readSession('qd-mobile-home-v2')
  if (!cached) return
  if (!items.value.length && Array.isArray(cached.items)) items.value = cached.items
  if (!portfolioStrategies.value.length && Array.isArray(cached.portfolioStrategies)) {
    portfolioStrategies.value = cached.portfolioStrategies
    portfolioLoaded.value = true
  }
}
function saveHomeCache() { writeSession('qd-mobile-home-v2', { items: items.value, portfolioStrategies: portfolioStrategies.value, cachedAt: Date.now() }) }
function drawLine(canvas, points, lineWidth) {
  if (!canvas) return
  const width = Math.max(1, Math.round(canvas.clientWidth))
  const height = Math.max(1, Math.round(canvas.clientHeight))
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = width * ratio
  canvas.height = height * ratio
  const context = canvas.getContext('2d')
  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)
  if (!Array.isArray(points) || points.length < 2) return
  const min = Math.min(...points)
  const max = Math.max(...points)
  const xStep = width / (points.length - 1)
  const yFor = value => height - 6 - ((value - min) / Math.max(1, max - min)) * (height - 14)
  const trace = close => {
    context.beginPath()
    points.forEach((point, index) => {
      const x = index * xStep
      const y = yFor(point)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    if (close) { context.lineTo(width, height); context.lineTo(0, height); context.closePath() }
  }
  trace(true)
  const rising = points.at(-1) >= points[0]
  context.fillStyle = rising ? 'rgba(14,96,63,.08)' : 'rgba(139,36,55,.07)'
  context.fill()
  trace(false)
  context.strokeStyle = rising ? '#0e603f' : '#8b2437'
  context.lineWidth = lineWidth
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.stroke()
  context.beginPath()
  context.arc(width - 1, yFor(points[points.length - 1]), 3.5, 0, Math.PI * 2)
  context.fillStyle = rising ? '#0e603f' : '#8b2437'
  context.fill()
}

function itemName(item) { return item?.name || t('v2.strategy.unnamed') }
function indexName(item) { return item?.category === 'crypto' ? (item?.name || item?.symbol) : locale.value.startsWith('zh') ? (item?.name_cn || item?.name_en || item?.symbol) : (item?.name_en || item?.name_cn || item?.symbol) }
function formatIndexPrice(value) { const number = Number(value); return Number.isFinite(number) ? new Intl.NumberFormat(locale.value, { maximumFractionDigits: number >= 1000 ? 0 : 2 }).format(number) : '—' }
function indexChangeValue(item) { return finiteNumber(item?.change_24h ?? item?.change_percent ?? item?.changePercent ?? item?.change) }
function formatIndexChange(item) { const value = indexChangeValue(item); return value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%` }
function indexTone(item) { const value = indexChangeValue(item); return value == null || value === 0 ? '' : value > 0 ? 'up' : 'down' }
function marketMeta(item) {
  const contract = item?.marketplace_contract || item?.strategy_contract || {}
  const instrument = (Array.isArray(contract.instruments) && contract.instruments[0]) || (Array.isArray(item?.instruments) && item.instruments[0]) || {}
  const market = item?.market || item?.asset_market || contract.market || item?.market_type || contract.market_type || instrument.market || instrument.market_type
  const exchange = item?.exchange_name || item?.exchange_id || contract.exchange_name || contract.exchange_id || instrument.exchange_name || instrument.exchange_id
  return [market, exchange].filter(Boolean).join(' · ') || t('v2.strategy.marketUnknown')
}
function formatRatio(value) { const number = Number(value); return Number.isFinite(number) ? number.toFixed(2) : '—' }
function finiteNumber(value) { return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value) }
function executionModeOf(item) { return String(item?.execution_mode || item?.trading_config?.execution_mode || 'signal').toLowerCase() === 'live' ? 'live' : 'signal' }
function isRunningStrategy(item) { return String(item?.status || '').toLowerCase() === 'running' }
function strategyCapital(item) { return finiteNumber(item?.initial_capital ?? item?.trading_config?.initial_capital) }
function strategyTotalPnl(item) { return firstFinite(item?.total_pnl, item?.net_pnl, item?.performance?.total_pnl, item?.performance?.net_pnl) }
function firstFinite(...values) {
  for (const value of values) {
    const parsed = finiteNumber(value)
    if (parsed != null) return parsed
  }
  return null
}
function sumStrategyValues(strategies, getter) {
  if (!strategies.length) return null
  const values = strategies.map(getter).filter(value => value != null)
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}
function sharpeRatio(item) { return formatRatio(item?.sharpe ?? item?.sharpe_ratio) }
function formatDrawdown(value) { return value == null || value === '' ? '—' : formatPercent(Math.abs(Number(value))) }
function formatPercent(value, signed = false) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${signed && number > 0 ? '+' : ''}${number.toFixed(1)}%`
}
function formatPortfolioPercent(value) {
  const number = finiteNumber(value)
  if (number == null) return '—'
  const normalized = Object.is(number, -0) ? 0 : number
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(Math.abs(normalized) < 1 ? 2 : 1)}%`
}
function formatPortfolioValue(value) { return value == null ? '—' : new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(value) }
function valueTone(value) { const number = Number(value); return !Number.isFinite(number) || number === 0 ? '' : number > 0 ? 'up' : 'down' }
function watchKey(item) { return [item?.market, item?.exchange_id, item?.market_type, item?.instrument_id, item?.symbol].map(value => String(value || '').toLowerCase()).join('|') }
function watchAssetKey(item) { return [item?.market, item?.symbol].map(value => String(value || '').toLowerCase()).join('|') }
function displaySymbol(symbol) { return String(symbol || '—').replace(/[-_](spot|swap)$/i, '') }
function watchMarketLabel(item) {
  const rawMarket = String(item?.market || '')
  const marketLabels = { Crypto: 'watchlist.market_crypto', USStock: 'watchlist.market_usstock', ChinaStock: 'watchlist.market_chinastock', AStock: 'watchlist.market_chinastock', HKStock: 'watchlist.market_hkstock', HStock: 'watchlist.market_hkstock', Forex: 'watchlist.market_forex', Futures: 'watchlist.market_futures', MOEX: 'watchlist.market_moex' }
  const market = marketLabels[rawMarket] ? t(marketLabels[rawMarket]) : rawMarket
  const context = rawMarket === 'Crypto' ? [item?.exchange_id, item?.market_type] : [item?.exchange_id]
  return [market, ...context].filter(Boolean).join(' · ') || t('v2.strategy.marketUnknown')
}
function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '—'
  const decimals = number >= 1000 ? 2 : number >= 1 ? 4 : 6
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: decimals }).format(number)
}
function formatQuoteChange(value) { const number = Number(value); return Number.isFinite(number) ? `${number > 0 ? '+' : ''}${number.toFixed(2)}%` : '—' }
function quoteTone(value) { const number = Number(value); return !Number.isFinite(number) || number === 0 ? '' : number > 0 ? 'up' : 'down' }
function openAll() { router.push('/market/all?asset_type=script_template') }
function openDetail(item) { router.push(`/market/indicator/${item.id}`) }
function openWatchlist() { showWatchlistPicker.value = true }
function openQuote(item) { router.push({ path: '/indicators/chart', query: { market: item.market || 'Crypto', symbol: item.symbol, exchange_id: item.exchange_id || undefined, market_type: item.market_type || undefined } }) }
function handleWatchlistPick(item) { openQuote(item) }
function startWith(item) { const target = buildCreateRouteFromMarketAsset(item); router.push(target?.query?.source_id ? target : `/market/indicator/${item.id}`) }
</script>

<style scoped>
.strategy-page {
  --ivory: #fbf7ef; --ink: #18191d; --muted: #69645c; --forest: #0e603f; --gold: #b08a42; --burgundy: #8b2437; --hairline: rgba(127,95,39,.32);
  width: 100%; max-width: 520px; min-width: 0; margin: 0 auto; padding: calc(16px + var(--safe-area-top)) 18px 28px; border-inline: 1px solid rgba(127,95,39,.16); background: var(--ivory); color: var(--ink); font-family: var(--font-sans);
}
button { color: inherit; }
.section-heading,.spotlight-actions { display: flex; align-items: center; }
.market-pulse { padding: 4px 2px 18px; border-bottom: 1px solid var(--hairline); }
.market-pulse-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.market-pulse h1 { margin: 0; font-size: 22px; font-weight: 680; line-height: 1.2; letter-spacing: -.025em; }
.market-pulse p { margin: 4px 0 0; color: var(--muted); font-size: 11px; line-height: 1.4; }
.market-pulse-head small { flex: 0 0 auto; color: var(--muted); font-size: 9px; }
.index-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(124px, 42%); gap: 8px; margin-top: 13px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.index-strip::-webkit-scrollbar { display: none; }
.index-strip article { min-width: 0; padding: 10px 11px; border: 1px solid rgba(127,95,39,.18); border-radius: 9px; background: rgba(255,253,248,.56); }
.index-strip span,.index-strip strong,.index-strip b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.index-strip span { color: var(--muted); font-size: 9px; }
.index-strip strong { margin-top: 5px; font-family: var(--font-display); font-size: 16px; font-optical-sizing: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
.index-strip b { margin-top: 3px; color: var(--muted); font-size: 10px; font-weight: 650; font-variant-numeric: tabular-nums; }
.index-skeleton i { height: 70px; border-radius: 9px; background: linear-gradient(90deg, rgba(127,95,39,.06), rgba(255,255,255,.55), rgba(127,95,39,.06)); background-size: 200% 100%; animation: home-shimmer 1.25s linear infinite; }
.indices-empty { min-height: 46px; display: grid; place-items: center; }
@keyframes home-shimmer { to { background-position: -200% 0; } }
.portfolio-section { padding: 18px 2px 20px; border-bottom: 1px solid var(--hairline); }
.section-heading { justify-content: space-between; gap: 12px; }
.section-heading h2 { margin: 0; font-size: 20px; font-weight: 650; letter-spacing: -.025em; }
.section-heading h2 i,.section-kicker i { display: inline-block; width: 4px; height: 17px; margin-right: 10px; background: var(--gold); vertical-align: -2px; }
.section-heading button { min-height: 34px; border: 0; background: transparent; color: #715b36; font-size: 12px; white-space: nowrap; }
.portfolio-grid { display: grid; grid-template-columns: .9fr 1.3fr; align-items: end; gap: 14px; margin-top: 15px; }
.portfolio-return span,.portfolio-return small { display: block; color: var(--muted); font-size: 10px; line-height: 1.35; }
.portfolio-return strong { display: block; margin: 5px 0 1px; color: var(--ink); font-family: var(--font-display); font-size: 36px; font-optical-sizing: auto; font-weight: 600; line-height: 1; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.portfolio-chart { min-width: 0; padding-left: 14px; border-left: 1px solid var(--hairline); }
.portfolio-chart canvas { width: 100%; height: 72px; display: block; }
.portfolio-chart p { margin: 3px 0 0; color: var(--muted); font-size: 10px; text-align: right; }
.portfolio-chart p strong { color: var(--forest); font-size: 12px; font-variant-numeric: tabular-nums; }
.portfolio-chart-empty { min-height: 90px; display: flex; flex-direction: column; justify-content: space-between; color: var(--muted); font-size: 11px; }
.spotlight-section { padding: 22px 2px 24px; border-bottom: 1px solid var(--hairline); }
.section-kicker { color: var(--ink); font-size: 20px; font-weight: 650; letter-spacing: -.025em; }
.spotlight-title { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 0 0; padding: 0; border: 0; background: transparent; text-align: left; }
.spotlight-title span { font-family: var(--font-display); font-size: clamp(25px,6.8vw,32px); font-optical-sizing: auto; font-weight: 600; line-height: 1.08; letter-spacing: -.025em; }
.spotlight-title .van-icon { flex: 0 0 auto; color: #715b36; }
.spotlight-thesis { margin: 8px 0 0; color: #504c45; font-size: 13px; line-height: 1.5; }
.spotlight-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); margin-top: 18px; }
.spotlight-metrics > div { min-width: 0; padding: 0 10px; }
.spotlight-metrics > div:first-child { padding-left: 0; }
.spotlight-metrics > div + div { border-left: 1px solid var(--hairline); }
.spotlight-metrics span,.spotlight-metrics strong { display: block; }
.spotlight-metrics span { min-height: 28px; color: var(--muted); font-size: 10px; line-height: 1.25; }
.spotlight-metrics strong { margin-top: 4px; font-family: var(--font-display); font-size: 22px; font-optical-sizing: auto; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.spotlight-metrics .risk-value { color: var(--burgundy); }
.spotlight-chart { margin: 14px 0 13px; }
.spotlight-chart canvas { width: 100%; height: 82px; display: block; }
.mandate-block > span { display: block; margin-bottom: 8px; color: var(--muted); font-size: 12px; }
.mandate-control { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); overflow: hidden; border: 1px solid rgba(176,138,66,.5); border-radius: 10px; }
.mandate-control button { min-width: 0; min-height: 56px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 6px; border: 0; background: transparent; color: var(--ink); }
.mandate-control button + button { border-left: 1px solid rgba(176,138,66,.35); }
.mandate-control button.active { background: rgba(14,96,63,.1); color: var(--forest); }
.mandate-control .van-icon { flex: 0 0 auto; color: var(--gold); font-size: 17px; }
.mandate-control button.active .van-icon { color: var(--forest); }
.mandate-control span,.mandate-control strong { display: block; min-width: 0; }
.mandate-control strong { overflow: hidden; font-size: 11px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.mandate-control small { display: none; }
.spotlight-actions { gap: 10px; margin-top: 13px; }
.primary-action { min-height: 46px; padding: 0 20px; border: 0; border-radius: 9px; background: var(--forest); color: #fffdf7; font-size: 14px; font-weight: 650; }
.spotlight-actions .primary-action { flex: 1; }
.report-action { min-height: 46px; padding: 0 8px; border: 0; background: transparent; color: #715b36; font-size: 13px; font-weight: 600; }
.recommendation-section,.watchlist-section { padding: 21px 2px 0; }
.recommendation-section { padding-bottom: 18px; border-bottom: 1px solid var(--hairline); }
.recommendation-list { margin-top: 10px; }
.recommendation-row { width: 100%; min-height: 59px; display: grid; grid-template-columns: 34px minmax(0,1fr) 58px 45px 12px; align-items: center; gap: 6px; padding: 9px 0; border: 0; border-top: 1px solid rgba(127,95,39,.17); background: transparent; color: var(--ink); text-align: left; }
.recommendation-row:first-child { border-top: 0; }
.rank-number { color: #8a7046; font-family: var(--font-display); font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.strategy-identity { min-width: 0; }
.strategy-identity strong,.strategy-identity small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.strategy-identity strong { font-size: 12px; font-weight: 650; }
.strategy-identity small { margin-top: 4px; color: var(--muted); font-size: 9px; }
.row-return,.row-drawdown { font-family: var(--font-display); text-align: right; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.section-loading { opacity: .54; }
.strategy-skeleton { display: grid; gap: 1px; margin-top: 10px; }
.strategy-skeleton i { height: 59px; border-top: 1px solid rgba(127,95,39,.17); background: linear-gradient(90deg, transparent, rgba(127,95,39,.055), transparent); background-size: 200% 100%; animation: home-shimmer 1.25s linear infinite; }
.section-error { min-height: 118px; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted); font-size: 12px; }
.section-error button { min-height: 34px; padding: 0 12px; border: 1px solid var(--hairline); border-radius: 7px; background: transparent; color: var(--forest); }
.row-drawdown { color: var(--burgundy); }
.recommendation-row > .van-icon { color: #715b36; font-size: 11px; }
.watchlist-heading { align-items: flex-start; }
.watchlist-heading p { margin: 4px 0 0 14px; color: var(--muted); font-size: 10px; }
.watchlist-loading { min-height: 110px; display: grid; place-items: center; }
.watchlist-labels,.watchlist-row { display: grid; grid-template-columns: minmax(0,1fr) 74px 66px 12px; align-items: center; gap: 5px; }
.watchlist-labels { margin-top: 12px; padding: 7px 0; color: var(--muted); font-size: 9px; }
.watchlist-labels span:nth-child(n+2) { text-align: right; }
.watchlist-row { width: 100%; min-height: 55px; padding: 8px 0; border: 0; border-top: 1px solid rgba(127,95,39,.17); background: transparent; color: var(--ink); text-align: left; }
.watch-identity b,.watch-identity small { display: block; }
.watch-identity b { font-size: 13px; font-weight: 650; }
.watch-identity small { margin-top: 3px; overflow: hidden; color: var(--muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.watch-price,.watch-change { font-family: var(--font-display); text-align: right; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.watchlist-row > .van-icon { color: #715b36; font-size: 11px; }
.watchlist-pagination { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; padding: 13px 0 2px; border-top: 1px solid rgba(127,95,39,.17); }
.watchlist-pagination button { min-height: 34px; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 0 10px; border: 1px solid var(--hairline); border-radius: 7px; background: transparent; color: var(--forest); font-size: 10px; }
.watchlist-pagination button:disabled { opacity: .34; }
.watchlist-pagination > span { min-width: 48px; color: var(--muted); font-size: 10px; text-align: center; font-variant-numeric: tabular-nums; }
.watchlist-pagination > span strong { color: var(--ink); font-size: 12px; }
.watchlist-empty { min-height: 120px; display: grid; grid-template-columns: 28px minmax(0,1fr) auto; align-items: center; gap: 10px; color: var(--muted); }
.watchlist-empty > .van-icon { color: var(--gold); font-size: 22px; }
.watchlist-empty strong,.watchlist-empty small { display: block; }
.watchlist-empty strong { color: var(--ink); font-size: 12px; }
.watchlist-empty small { margin-top: 4px; font-size: 9px; line-height: 1.35; }
.watchlist-empty button { min-height: 36px; border: 1px solid var(--hairline); border-radius: 8px; background: transparent; color: #715b36; font-size: 11px; }
.up { color: var(--forest) !important; }
.down { color: var(--burgundy) !important; }
@media (max-width: 360px) {
  .strategy-page { padding-inline: 14px; }
  .spotlight-metrics strong { font-size: 21px; }
  .mandate-control .van-icon { display: none; }
  .recommendation-row { grid-template-columns: 30px minmax(0,1fr) 53px 42px 10px; gap: 4px; }
}
</style>

<style scoped>
.market-segment { display: flex; gap: 5px; margin-top: 11px; }
.market-segment button { min-height: 30px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 10px; font-weight: 560; }
.market-segment button.active { background: rgba(14,96,63,.09); color: var(--forest); }
.index-strip { margin-top: 8px; }
.portfolio-return .portfolio-scope { margin-top: 3px; color: color-mix(in srgb, var(--muted) 82%, transparent); font-size: 8px; }
.portfolio-return strong { margin-top: 8px; }
</style>
