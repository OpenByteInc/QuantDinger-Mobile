<template>
  <div class="v2-page strategy-page">
    <section class="welcome-hero">
      <img class="hero-image-dark" :src="welcomeHero" alt="" />
      <img class="hero-image-light" :src="welcomeHeroLight" alt="" />
      <div class="welcome-copy">
        <span>{{ t('v2.strategy.welcomeEyebrow') }}</span>
        <h1>{{ t('v2.strategy.welcomeTitle') }}</h1>
        <p>{{ t('v2.strategy.welcomeSubtitle') }}</p>
      </div>
    </section>

    <section class="preference-section" :aria-label="t('v2.strategy.riskPreference')">
      <h2>{{ t('v2.strategy.riskPreference') }}</h2>
      <div class="preference-row" role="tablist">
        <button v-for="option in preferences" :key="option.value" type="button" role="tab" :aria-selected="preference === option.value" :class="{ active: preference === option.value }" @click="selectPreference(option.value)">
          <van-icon :name="option.icon" /><span><strong>{{ option.label }}</strong><small>{{ option.desc }}</small></span>
        </button>
      </div>
      <p>{{ preferenceSummary }}</p>
    </section>

    <div v-if="loading && !items.length" class="loading-state v2-card"><van-loading vertical>{{ t('common.loading') }}</van-loading></div>
    <div v-else-if="failed && !items.length" class="error-state v2-card">
      <van-icon name="warning-o" /><p>{{ t('audit.loadFailed') }}</p><button class="v2-primary" type="button" @click="loadData">{{ t('v2.common.retry') }}</button>
    </div>
    <template v-else>
      <section class="ranking-card v2-card">
        <div class="ranking-heading">
          <h2>{{ t('v2.strategy.popularRanking') }}</h2>
          <button type="button" @click="openAll">{{ t('v2.strategy.viewMore') }} <van-icon name="arrow" /></button>
        </div>

        <van-empty v-if="!topStrategies.length" :description="t('audit.noData')" />
        <div v-else class="ranking-list">
          <template v-for="(item, index) in topStrategies" :key="item.id || index">
            <button type="button" class="ranking-row" :class="{ selected: selectedRank === index }" :aria-expanded="selectedRank === index" @click="selectedRank = index">
              <b class="rank-number">{{ String(index + 1).padStart(2, '0') }}</b>
              <span class="strategy-identity"><strong>{{ itemName(item) }}</strong><small>{{ marketMeta(item) }}</small></span>
              <span class="rank-metric return-metric"><small>{{ t('v2.strategy.return') }}</small><b :class="valueTone(item.total_return)">{{ formatPercent(item.total_return, true) }}</b></span>
              <span class="rank-metric drawdown-metric"><small>{{ t('v2.strategy.drawdown') }}</small><b>{{ formatDrawdown(item.max_drawdown) }}</b></span>
              <van-icon :name="selectedRank === index ? 'arrow-up' : 'arrow'" />
            </button>

            <div v-if="selectedRank === index" class="strategy-evidence">
              <div class="evidence-grid">
                <div><span>{{ t('v2.strategy.returnDrawdownRatio') }}</span><strong>{{ returnDrawdownRatio(item) }}</strong></div>
                <div><span>{{ t('v2.strategy.winRate') }}</span><strong>{{ winRate(item) }}</strong></div>
                <div><span>{{ t('v2.strategy.sharpeRatio') }}</span><strong>{{ sharpeRatio(item) }}</strong></div>
                <div><span>{{ t('v2.strategy.profitLossRatio') }}</span><strong>{{ profitLossRatio(item) }}</strong></div>
              </div>
              <p class="performance-notice"><van-icon name="info-o" />{{ t('v2.strategy.performanceNotice') }}</p>
              <div class="strategy-actions">
                <button type="button" class="v2-primary" @click.stop="startWith(item)">{{ t('v2.common.createStrategy') }}</button>
                <button type="button" class="detail-button" @click.stop="openDetail(item)">{{ t('v2.strategy.details') }}</button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section class="watchlist-card v2-card">
        <div class="watchlist-heading">
          <div>
            <h2>{{ t('v2.strategy.watchlistTitle') }}</h2>
            <p>{{ t('v2.strategy.watchlistSubtitle') }}</p>
          </div>
          <button type="button" @click="openWatchlist">{{ t('v2.strategy.manageWatchlist') }} <van-icon name="arrow" /></button>
        </div>

        <div v-if="watchlistLoading" class="watchlist-loading"><van-loading size="18" /></div>
        <div v-else-if="watchlistRows.length" class="watchlist-table">
          <div class="watchlist-labels" aria-hidden="true">
            <span>{{ t('v2.strategy.watchlistAsset') }}</span>
            <span>{{ t('v2.strategy.watchlistPrice') }}</span>
            <span>{{ t('v2.strategy.watchlistChange') }}</span>
          </div>
          <button v-for="item in watchlistRows" :key="watchKey(item)" type="button" class="watchlist-row" @click="openQuote(item)">
            <span class="watch-identity">
              <b>{{ displaySymbol(item.symbol) }}</b>
              <small>{{ watchMarketLabel(item) }}</small>
            </span>
            <strong class="watch-price">{{ formatPrice(item.price) }}</strong>
            <strong :class="['watch-change', quoteTone(item.changePercent)]">{{ formatQuoteChange(item.changePercent) }}</strong>
            <van-icon name="arrow" />
          </button>
        </div>
        <div v-else class="watchlist-empty">
          <span><van-icon name="star-o" /></span>
          <div><strong>{{ t('v2.strategy.watchlistEmpty') }}</strong><small>{{ t('v2.strategy.watchlistEmptyDesc') }}</small></div>
          <button type="button" @click="openWatchlist">{{ t('v2.strategy.addWatchlist') }}</button>
        </div>
      </section>
    </template>

    <SymbolPicker
      v-model:show="showWatchlistPicker"
      :title="t('v2.strategy.watchlistTitle')"
      @pick="handleWatchlistPick"
      @close="loadWatchlist"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { marketApi, watchlistApi } from '@/api'
import { rankStrategies } from '@/utils/strategyDisplay'
import { ASSET_TYPES, buildCreateRouteFromMarketAsset } from '@/utils/marketRoutes'
import SymbolPicker from '@/components/SymbolPicker.vue'
import welcomeHero from '@/assets/market-welcome-hero.jpg'
import welcomeHeroLight from '@/assets/market-welcome-hero-light.jpg'

defineOptions({ name: 'StrategyHubV2' })

const { t, locale } = useI18n()
const router = useRouter()
const preference = ref('balanced')
const selectedRank = ref(0)
const items = ref([])
const loading = ref(false)
const failed = ref(false)
const watchlist = ref([])
const quotes = ref([])
const watchlistLoading = ref(false)
const showWatchlistPicker = ref(false)

const preferences = computed(() => [
  { value: 'stable', label: t('v2.strategy.stable'), desc: t('v2.strategy.stableDesc'), icon: 'bar-chart-o' },
  { value: 'balanced', label: t('v2.strategy.balanced'), desc: t('v2.strategy.balancedDesc'), icon: 'balance-o' },
  { value: 'active', label: t('v2.strategy.active'), desc: t('v2.strategy.activeDesc'), icon: 'chart-trending-o' }
])
const preferenceSummary = computed(() => t(`v2.strategy.${preference.value}Ranking`))
const displayItems = computed(() => rankStrategies(items.value, preference.value))
const topStrategies = computed(() => displayItems.value.slice(0, 3))
const quoteMap = computed(() => {
  const map = {}
  for (const item of quotes.value) {
    map[watchKey(item)] = item
    map[watchAssetKey(item)] = item
  }
  return map
})
const watchlistRows = computed(() => watchlist.value.slice(0, 8).map(item => ({ ...item, ...(quoteMap.value[watchKey(item)] || quoteMap.value[watchAssetKey(item)] || {}) })))

onActivated(loadData)

function selectPreference(value) { preference.value = value; selectedRank.value = 0 }

async function loadData() {
  loading.value = true
  failed.value = false
  const [marketResult] = await Promise.allSettled([
    marketApi.getIndicators({ page: 1, page_size: 12, asset_type: ASSET_TYPES.SCRIPT_TEMPLATE, sort_by: 'score' }),
    loadWatchlist()
  ])
  if (marketResult.status === 'fulfilled') items.value = marketResult.value.data?.items || []
  failed.value = marketResult.status === 'rejected'
  selectedRank.value = 0
  loading.value = false
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
  } finally {
    watchlistLoading.value = false
  }
}

function itemName(item) { return item?.name || t('v2.strategy.unnamed') }
function marketMeta(item) {
  const contract = item?.marketplace_contract || item?.strategy_contract || {}
  const instrument = (Array.isArray(contract.instruments) && contract.instruments[0]) || (Array.isArray(item?.instruments) && item.instruments[0]) || {}
  const market = item?.market || item?.asset_market || contract.market || item?.market_type || contract.market_type || instrument.market || instrument.market_type
  const exchange = item?.exchange_name || item?.exchange_id || contract.exchange_name || contract.exchange_id || instrument.exchange_name || instrument.exchange_id
  return [market, exchange].filter(Boolean).join(' · ') || t('v2.strategy.marketUnknown')
}
function winRate(item) { return formatPercent(item?.win_rate_backtest ?? item?.win_rate) }
function returnDrawdownRatio(item) {
  const totalReturn = Number(item?.total_return)
  const maxDrawdown = Math.abs(Number(item?.max_drawdown))
  if (!Number.isFinite(totalReturn) || !Number.isFinite(maxDrawdown) || maxDrawdown === 0) return '—'
  return `${(totalReturn / maxDrawdown).toFixed(2)}×`
}
function formatRatio(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '—'
}
function sharpeRatio(item) { return formatRatio(item?.sharpe ?? item?.sharpe_ratio) }
function profitLossRatio(item) { return formatRatio(item?.profit_loss_ratio ?? item?.profitLossRatio ?? item?.payoff_ratio) }
function formatDrawdown(value) { return value == null || value === '' ? '—' : formatPercent(Math.abs(Number(value))) }
function formatPercent(value, signed = false) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${signed && number > 0 ? '+' : ''}${number.toFixed(1)}%`
}
function valueTone(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return ''
  return number > 0 ? 'up' : 'down'
}
function watchKey(item) {
  return [item?.market, item?.exchange_id, item?.market_type, item?.instrument_id, item?.symbol].map(value => String(value || '').toLowerCase()).join('|')
}
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
function formatQuoteChange(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}
function quoteTone(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return ''
  return number > 0 ? 'up' : 'down'
}
function openAll() { router.push('/market/all?asset_type=script_template') }
function openDetail(item) { router.push(`/market/indicator/${item.id}`) }
function openWatchlist() { showWatchlistPicker.value = true }
function openQuote(item) {
  router.push({ path: '/indicators/chart', query: { market: item.market || 'Crypto', symbol: item.symbol, exchange_id: item.exchange_id || undefined, market_type: item.market_type || undefined } })
}
function handleWatchlistPick(item) { openQuote(item) }
function startWith(item) {
  const target = buildCreateRouteFromMarketAsset(item)
  router.push(target?.query?.source_id ? target : `/market/indicator/${item.id}`)
}
</script>

<style scoped>
.strategy-page{min-width:0;padding:calc(12px + var(--safe-area-top)) 16px 26px}.welcome-hero{position:relative;min-height:226px;overflow:hidden;border:1px solid rgba(255,255,255,.28);border-radius:20px;background:#101014;color:#fff}.welcome-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%;opacity:.82}.hero-image-light{display:none}.welcome-hero::after{position:absolute;inset:0;content:'';background:linear-gradient(180deg,rgba(10,10,12,.02) 24%,rgba(10,10,12,.38) 59%,rgba(10,10,12,.96) 100%)}.welcome-copy{position:absolute;z-index:1;right:20px;bottom:18px;left:20px}.welcome-copy span{display:inline-flex;padding:4px 8px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:rgba(15,15,17,.62);color:#fff;font-size:10px;font-weight:800}.welcome-copy h1{margin:9px 0 4px;color:#fff;font-size:25px;line-height:1.08;letter-spacing:-.035em}.welcome-copy p{margin:0;color:rgba(255,255,255,.72);font-size:11px;line-height:1.5}
.preference-section{margin-top:22px}.preference-section h2{margin:0 0 12px;color:var(--v2-text);font-size:20px;font-weight:850;letter-spacing:-.025em}.preference-section>p{margin:11px 2px 0;color:var(--v2-muted);font-size:12px}.preference-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.preference-row button{min-width:0;min-height:76px;display:flex;align-items:center;gap:8px;padding:10px 9px;border:1px solid var(--v2-line);border-radius:12px;background:var(--v2-surface);color:var(--v2-text);text-align:left}.preference-row button.active{border-color:var(--v2-brand);background:color-mix(in srgb,var(--v2-brand) 12%,var(--v2-surface))}.preference-row .van-icon{flex:0 0 auto;color:var(--v2-muted);font-size:23px}.preference-row button.active .van-icon,.preference-row button.active strong{color:var(--v2-brand)}.preference-row span,.preference-row small{display:block;min-width:0}.preference-row strong{font-size:14px;white-space:nowrap}.preference-row small{margin-top:4px;color:var(--v2-muted);font-size:9px;line-height:1.25}
.loading-state,.error-state{margin-top:18px;min-height:240px;display:grid;place-content:center;text-align:center}.error-state .van-icon{color:var(--v2-orange);font-size:32px}.error-state p{color:var(--v2-muted)}
.ranking-card{margin-top:18px;padding:6px}.ranking-heading{display:flex;align-items:center;justify-content:space-between;padding:15px 13px 12px}.ranking-heading h2{margin:0;font-size:22px;letter-spacing:-.025em}.ranking-heading button{border:0;background:transparent;color:var(--v2-muted);font-size:12px}.ranking-list{display:grid;gap:7px}.ranking-row{width:100%;min-width:0;min-height:64px;display:grid;grid-template-columns:42px minmax(0,1fr) 73px 66px 18px;align-items:center;gap:8px;padding:13px 10px;border:1px solid var(--v2-line);border-radius:10px;background:var(--v2-surface-2);color:var(--v2-text);text-align:left}.ranking-row.selected{border-color:var(--v2-brand);background:color-mix(in srgb,var(--v2-brand) 7%,var(--v2-surface-2));box-shadow:0 0 0 1px var(--v2-brand)}.rank-number{color:var(--v2-soft);font-size:21px;font-variant-numeric:tabular-nums}.ranking-row.selected .rank-number{color:var(--v2-brand)}.strategy-identity{min-width:0;overflow:hidden}.strategy-identity strong,.strategy-identity small,.rank-metric small,.rank-metric b{display:block}.strategy-identity strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.strategy-identity small{margin-top:5px;overflow:hidden;color:var(--v2-muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.rank-metric{min-width:0;padding-left:8px;border-left:1px solid var(--v2-line)}.rank-metric small{color:var(--v2-muted);font-size:9px;white-space:nowrap}.rank-metric b{margin-top:5px;font-size:14px;white-space:nowrap}.ranking-row>.van-icon{color:var(--v2-muted)}
.strategy-evidence{margin:-6px 2px 0;padding:17px 12px 13px;border:1px solid var(--v2-line);border-top:0;border-radius:0 0 10px 10px;background:var(--v2-surface)}.evidence-grid{display:grid;grid-template-columns:repeat(4,1fr)}.evidence-grid>div{min-width:0;padding:0 8px}.evidence-grid>div+div{border-left:1px solid var(--v2-line)}.evidence-grid span,.evidence-grid strong{display:block}.evidence-grid span{color:var(--v2-muted);font-size:8px;white-space:nowrap}.evidence-grid strong{margin-top:6px;overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.performance-notice{display:flex;align-items:center;gap:6px;margin:17px 5px 12px;color:var(--v2-muted);font-size:10px}.strategy-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.strategy-actions button{min-height:42px;border-radius:8px;font-size:13px;font-weight:800}.detail-button{border:1px solid var(--v2-brand);background:transparent;color:var(--v2-text)}
.watchlist-card{margin-top:15px;padding:6px}.watchlist-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:15px 13px 12px}.watchlist-heading h2{margin:0;font-size:20px;letter-spacing:-.025em}.watchlist-heading p{margin:5px 0 0;color:var(--v2-muted);font-size:10px}.watchlist-heading button{flex:0 0 auto;border:0;background:transparent;color:var(--v2-muted);font-size:12px}.watchlist-loading{min-height:110px;display:grid;place-items:center}.watchlist-labels,.watchlist-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(78px,.8fr) minmax(72px,.65fr) 14px;align-items:center;gap:8px}.watchlist-labels{padding:8px 11px;color:var(--v2-muted);font-size:9px}.watchlist-labels span:nth-child(n+2){text-align:right}.watchlist-row{width:100%;min-height:62px;padding:10px 11px;border:0;border-top:1px solid var(--v2-line);background:transparent;color:var(--v2-text);text-align:left}.watchlist-row:active{background:var(--v2-surface-2)}.watch-identity b,.watch-identity small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.watch-identity b{font-size:14px}.watch-identity small{margin-top:4px;color:var(--v2-muted);font-size:9px;text-transform:capitalize}.watch-price,.watch-change{text-align:right;font-size:14px;font-variant-numeric:tabular-nums}.watchlist-row>.van-icon{color:var(--v2-muted);font-size:12px}.watch-change.up{color:var(--v2-green)}.watch-change.down{color:var(--v2-red)}.watchlist-empty{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;margin:0 7px 7px;padding:16px 12px;border-radius:11px;background:var(--v2-surface-2)}.watchlist-empty>span{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,var(--v2-brand) 13%,var(--v2-surface));color:var(--v2-brand);font-size:22px}.watchlist-empty strong,.watchlist-empty small{display:block}.watchlist-empty strong{font-size:13px}.watchlist-empty small{margin-top:4px;color:var(--v2-muted);font-size:9px}.watchlist-empty button{padding:8px 11px;border:1px solid var(--v2-brand);border-radius:8px;background:transparent;color:var(--v2-brand);font-size:11px;font-weight:800}
@media(max-width:360px){.strategy-page{padding-inline:12px}.welcome-hero{min-height:206px}.welcome-copy{right:16px;bottom:15px;left:16px}.preference-row button{justify-content:center}.preference-row .van-icon{display:none}.preference-row strong{font-size:13px}.ranking-row{grid-template-columns:34px minmax(0,1fr) 67px 59px 14px;gap:5px;padding-inline:7px}.rank-number{font-size:18px}.strategy-identity strong{font-size:12px}.rank-metric{padding-left:5px}.rank-metric b{font-size:12px}.watchlist-labels,.watchlist-row{grid-template-columns:minmax(0,1.2fr) 70px 66px 12px;gap:5px}.watch-price,.watch-change{font-size:12px}}
</style>

<style>
html[data-theme='light'] .strategy-page{background:#f6f7f9}
html[data-theme='light'] .strategy-page .ranking-card,html[data-theme='light'] .strategy-page .watchlist-card{box-shadow:0 6px 18px rgba(16,19,27,.035)}
html[data-theme='light'] .strategy-page .welcome-hero{border-color:rgba(0,0,0,.22);background:#f4f0e8;color:#17191e}
html[data-theme='light'] .strategy-page .hero-image-dark{display:none}
html[data-theme='light'] .strategy-page .hero-image-light{display:block;opacity:1}
html[data-theme='light'] .strategy-page .welcome-hero::after{background:linear-gradient(180deg,rgba(255,255,255,0) 30%,rgba(250,248,243,.3) 58%,rgba(250,248,243,.96) 100%)}
html[data-theme='light'] .strategy-page .welcome-copy span{border-color:rgba(0,0,0,.32);background:rgba(255,255,255,.78);color:#17191e}
html[data-theme='light'] .strategy-page .welcome-copy h1{color:#17191e}
html[data-theme='light'] .strategy-page .welcome-copy p{color:#5e6470}
</style>
