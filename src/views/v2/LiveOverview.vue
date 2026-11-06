<template>
  <div class="v2-page live-page">
    <div :class="['system-state', { warning: failed }]">
      <i></i>
      <span>{{ t(failed ? 'v2.live.systemDegraded' : 'v2.live.systemHealthy') }}</span>
      <b>{{ t('v2.live.strategyCount', { count: modeStrategies.length }) }}</b>
      <button type="button" class="refresh-button" :disabled="loading" @click="loadData">
        <van-icon name="replay" :class="{ spinning: loading }" />
        <small>{{ refreshedLabel }}</small>
      </button>
    </div>

    <section class="overview-grid">
      <article>
        <span>{{ t('v2.live.running') }}</span>
        <div class="overview-value"><strong>{{ runningCount }}</strong><small>/ {{ modeStrategies.length }}</small></div>
      </article>
      <article>
        <span>{{ t('v2.live.sectionAttention') }}</span>
        <div class="overview-value"><strong :class="{ danger: attentionCount > 0 }">{{ attentionCount }}</strong><small>{{ t(attentionCount ? 'v2.live.requiresReview' : 'v2.live.allClear') }}</small></div>
      </article>
      <article class="money-summary">
        <span>{{ t('v2.live.todayPnl') }}</span>
        <div v-if="todayRows.length" class="overview-value multi-value">
          <strong v-for="row in todayRows" :key="row.currency" :class="pnlClass(row.value)">
            {{ money(row.value) }} <small>{{ row.currency }}</small>
          </strong>
        </div>
        <div v-else class="overview-value"><strong>—</strong></div>
      </article>
      <article class="money-summary">
        <span>{{ t('v2.live.totalPnl') }}</span>
        <div v-if="totalRows.length" class="overview-value multi-value">
          <strong v-for="row in totalRows" :key="row.currency" :class="pnlClass(row.value)">
            {{ money(row.value) }} <small>{{ row.currency }}</small>
          </strong>
        </div>
        <div v-else class="overview-value"><strong>—</strong></div>
      </article>
    </section>

    <section class="strategy-section">
      <div class="filter-row">
        <label class="search-field">
          <van-icon name="search" />
          <input v-model.trim="keyword" :placeholder="t('v2.live.searchPlaceholder')">
          <button v-if="keyword" type="button" :aria-label="t('v2.live.clearSearch')" @click="keyword = ''">
            <van-icon name="cross" />
          </button>
        </label>
        <button type="button" class="create-button" @click="router.push('/trading/create')">
          <van-icon name="plus" />
          {{ t('v2.common.createStrategy') }}
        </button>
      </div>

      <div class="mode-tabs" role="tablist" :aria-label="t('v2.live.modeFilter')">
        <button
          v-for="mode in modeFilters"
          :key="mode.key"
          type="button"
          role="tab"
          :aria-selected="executionMode === mode.key"
          :class="[mode.key, { active: executionMode === mode.key }]"
          @click="executionMode = mode.key"
        >
          {{ mode.label }} <b>{{ mode.count }}</b>
        </button>
      </div>

      <div class="status-tabs" role="tablist" :aria-label="t('v2.live.statusFilter')">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="statusFilter === tab.key"
          :class="{ active: statusFilter === tab.key }"
          @click="statusFilter = tab.key"
        >
          {{ tab.label }} <b>{{ tab.count }}</b>
        </button>
      </div>

      <div class="section-heading">
        <h2>{{ t('audit.allStrategies') }}</h2>
        <span>{{ t('v2.live.strategyCount', { count: filteredStrategies.length }) }}</span>
      </div>

      <div class="strategy-list">
        <article
          v-for="item in filteredStrategies"
          :key="item.id"
          class="strategy-row"
          @click="openStrategy(item)"
        >
          <header>
            <span :class="['status-dot', statusTone(item)]"></span>
            <div class="strategy-identity">
              <h3>{{ strategyName(item) }}</h3>
              <p>
                <strong>{{ strategySymbol(item) || '—' }}</strong>
                <span v-if="strategyTimeframe(item)">· {{ strategyTimeframe(item) }}</span>
                <span v-if="exchangeName(item)">· {{ exchangeName(item) }}</span>
              </p>
            </div>
            <span :class="['status-label', statusTone(item)]">{{ statusLabel(item) }}</span>
            <van-icon name="arrow" />
          </header>

          <div class="strategy-metrics">
            <div>
              <span>{{ t('v2.live.todayPnl') }}</span>
              <strong :class="pnlClass(todayPnl(item))">{{ money(todayPnl(item)) }}</strong>
            </div>
            <div>
              <span>{{ t('v2.live.totalPnl') }}</span>
              <strong :class="pnlClass(totalPnl(item))">{{ money(totalPnl(item)) }}</strong>
            </div>
            <div>
              <span>{{ t('v2.live.capital') }}</span>
              <strong>{{ money(strategyCapital(item), false) }}</strong>
            </div>
          </div>

          <footer class="strategy-footer">
            <div class="strategy-tags">
              <span :class="['execution-tag', executionModeOf(item)]">{{ executionModeLabel(item) }}</span>
              <span>{{ marketLabel(item) }}</span>
              <span v-if="strategyTimeframe(item)">{{ strategyTimeframe(item) }}</span>
              <span v-if="leverageOf(item) != null">{{ t('v2.live.leverageTag', { value: leverageOf(item) }) }}</span>
              <span>{{ strategyCurrency(item) }}</span>
              <span v-if="createdAtLabel(item)">{{ t('v2.live.createdAt', { date: createdAtLabel(item) }) }}</span>
              <span v-if="pendingCount(item) > 0">{{ t('v2.live.pendingOrders', { count: pendingCount(item) }) }}</span>
            </div>
            <time>{{ activityLabel(item) }}</time>
          </footer>
        </article>

        <van-loading v-if="loading && !modeStrategies.length" vertical>{{ t('common.loading') }}</van-loading>
        <button v-else-if="failed && !modeStrategies.length" type="button" class="load-button" @click="loadData">
          {{ t('audit.loadFailed') }}
        </button>
        <van-empty v-else-if="!filteredStrategies.length" :description="emptyDescription">
          <button class="v2-primary" @click="router.push('/trading/create')">{{ t('v2.common.createStrategy') }}</button>
        </van-empty>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { strategyApi } from '@/api'
import { useNotificationStore, useStrategyStore } from '@/stores'

defineOptions({ name: 'LiveOverviewV2' })

const { t, locale } = useI18n()
const router = useRouter()
const store = useStrategyStore()
const notifications = useNotificationStore()
const executionMode = ref('all')
const statusFilter = ref('all')
const keyword = ref('')
const loading = ref(false)
const failed = ref(false)
const refreshedAt = ref(null)
let refreshTimer = null

const allStrategies = computed(() => Array.isArray(store.strategies) ? store.strategies : [])
const modeStrategies = computed(() => executionMode.value === 'all'
  ? allStrategies.value
  : allStrategies.value.filter(item => executionModeOf(item) === executionMode.value))
const runningStrategies = computed(() => modeStrategies.value.filter(isRunning))
const attentionStrategies = computed(() => modeStrategies.value.filter(needsAttention))
const stoppedStrategies = computed(() => modeStrategies.value.filter(item => !isRunning(item) && !needsAttention(item)))
const runningCount = computed(() => runningStrategies.value.length)
const attentionCount = computed(() => attentionStrategies.value.length)
const todayRows = computed(() => groupedPnlRows(modeStrategies.value, todayPnl))
const totalRows = computed(() => groupedPnlRows(modeStrategies.value, totalPnl))
const refreshedLabel = computed(() => refreshedAt.value
  ? t('v2.live.updatedAt', { time: refreshedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  : t('audit.refresh'))
const modeFilters = computed(() => [
  { key: 'all', label: t('v2.live.allModes'), count: allStrategies.value.length },
  { key: 'live', label: t('audit.liveMode'), count: modeCount('live') },
  { key: 'signal', label: t('audit.signalMode'), count: modeCount('signal') }
])
const statusTabs = computed(() => [
  { key: 'all', label: t('v2.live.total'), count: modeStrategies.value.length },
  { key: 'running', label: t('v2.live.running'), count: runningStrategies.value.length },
  { key: 'attention', label: t('v2.live.sectionAttention'), count: attentionStrategies.value.length },
  { key: 'stopped', label: t('v2.live.sectionStopped'), count: stoppedStrategies.value.length }
])
const filteredStrategies = computed(() => {
  const source = statusFilter.value === 'running'
    ? runningStrategies.value
    : statusFilter.value === 'attention'
      ? attentionStrategies.value
      : statusFilter.value === 'stopped'
        ? stoppedStrategies.value
        : modeStrategies.value
  const term = keyword.value.toLowerCase()
  return source
    .filter(item => !term || [strategyName(item), strategySymbol(item), exchangeName(item), item.id].join(' ').toLowerCase().includes(term))
    .slice()
    .sort((left, right) => {
      const attentionDiff = Number(needsAttention(right)) - Number(needsAttention(left))
      if (attentionDiff) return attentionDiff
      const runningDiff = Number(isRunning(right)) - Number(isRunning(left))
      if (runningDiff) return runningDiff
      return activityTimestamp(right) - activityTimestamp(left)
    })
})
const emptyDescription = computed(() => keyword.value || statusFilter.value !== 'all'
  ? t('v2.live.noMatches')
  : t(executionMode.value === 'live' ? 'v2.live.noRunning' : 'v2.strategy.mineEmptyTitle'))

onActivated(() => {
  loadData()
  startRefreshTimer()
})
onDeactivated(stopRefreshTimer)
onBeforeUnmount(stopRefreshTimer)

async function loadData() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  const [strategiesResult, notificationResult] = await Promise.allSettled([
    strategyApi.getList(),
    strategyApi.getUnreadNotificationCount()
  ])
  if (strategiesResult.status === 'fulfilled') {
    store.setStrategies(strategiesResult.value.data || [])
    refreshedAt.value = new Date()
  } else {
    failed.value = true
  }
  if (notificationResult.status === 'fulfilled') notifications.setUnreadCount(notificationResult.value.data)
  loading.value = false
}

function startRefreshTimer() {
  if (refreshTimer) return
  refreshTimer = window.setInterval(() => {
    if (!document.hidden) loadData()
  }, 30000)
}

function stopRefreshTimer() {
  if (refreshTimer) window.clearInterval(refreshTimer)
  refreshTimer = null
}

function modeCount(mode) {
  return allStrategies.value.filter(item => executionModeOf(item) === mode).length
}

function executionModeOf(item) {
  return String(item?.execution_mode || item?.trading_config?.execution_mode || 'signal').toLowerCase() === 'live' ? 'live' : 'signal'
}

function executionModeLabel(item) {
  return t(executionModeOf(item) === 'live' ? 'audit.liveMode' : 'audit.signalMode')
}

function health(item) {
  return item?.runtime_health && typeof item.runtime_health === 'object' ? item.runtime_health : {}
}

function healthState(item) {
  const state = health(item)
  if (state.position_drift_blocked || Number(state.position_drift_count || 0) > 0) return 'degraded'
  return String(state.health || (isRunning(item) ? 'unknown' : 'inactive')).toLowerCase()
}

function needsAttention(item) {
  const state = health(item)
  if (typeof state.needs_attention === 'boolean') return state.needs_attention
  return Boolean(item?.error_message) || ['degraded', 'stale', 'offline'].includes(healthState(item)) || Number(state.failed_orders || 0) > 0 || Boolean(state.position_drift_blocked) || Number(state.position_drift_count || 0) > 0
}

function isRunning(item) {
  return String(item?.status || '').toLowerCase() === 'running'
}

function statusTone(item) {
  if (needsAttention(item)) return 'attention'
  return isRunning(item) ? 'running' : 'stopped'
}

function statusLabel(item) {
  if (needsAttention(item)) {
    const state = healthState(item)
    return t(`v2.live.health_${['degraded', 'stale', 'offline'].includes(state) ? state : 'attention'}`)
  }
  return t(isRunning(item) ? 'v2.strategy.statusRunning' : 'v2.strategy.statusStopped')
}

function strategyName(item) {
  return item?.strategy_name || item?.name || t('trading.strategy_fallback', { id: item?.id || '' })
}

function strategySymbol(item) {
  return String(item?.symbol || item?.trading_config?.symbol || '')
}

function strategyTimeframe(item) {
  return String(item?.timeframe || item?.trading_config?.timeframe || '')
}

function leverageOf(item) {
  return finiteValue(item?.leverage ?? item?.trading_config?.leverage)
}

function createdAtLabel(item) {
  const value = item?.created_at || item?.createdAt
  if (!value) return ''
  const numeric = /^\d+(?:\.\d+)?$/.test(String(value)) ? Number(value) : null
  const timestamp = numeric != null ? numeric * (numeric < 100000000000 ? 1000 : 1) : Date.parse(value)
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat(locale.value, { year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date(timestamp))
}

function strategyCapital(item) {
  return finiteValue(item?.initial_capital ?? item?.trading_config?.initial_capital)
}

function todayPnl(item) {
  return firstFinite(item?.today_pnl, item?.performance?.today_pnl, health(item).today_pnl)
}

function totalPnl(item) {
  return firstFinite(item?.total_pnl, item?.net_pnl, item?.performance?.total_pnl, item?.performance?.net_pnl)
}

function firstFinite(...values) {
  for (const value of values) {
    const parsed = finiteValue(value)
    if (parsed != null) return parsed
  }
  return null
}

function finiteValue(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return null
  return Number(value)
}

function strategyCurrency(item) {
  const explicit = String(item?.quote_currency || item?.currency || item?.trading_config?.quote_currency || '').toUpperCase()
  if (explicit) return explicit
  const symbol = strategySymbol(item).replace(/^[^:]+:/, '').replace(/@(spot|swap|future|futures)$/i, '')
  if (symbol.includes('/')) return String(symbol.split('/')[1] || '').toUpperCase()
  const market = String(item?.market || item?.trading_config?.market || '').toLowerCase()
  if (market === 'usstock' || exchangeId(item) === 'alpaca') return 'USD'
  if (market === 'astock') return 'CNY'
  if (market === 'hkstock') return 'HKD'
  return 'USDT'
}

function exchangeId(item) {
  return String(item?.exchange_config?.exchange_id || item?.trading_config?.exchange_id || item?.exchange_id || '').toLowerCase()
}

function exchangeName(item) {
  const id = exchangeId(item)
  const labels = { binance: 'Binance', okx: 'OKX', bybit: 'Bybit', gate: 'Gate.io', bitget: 'Bitget', htx: 'HTX', huobi: 'HTX', alpaca: 'Alpaca' }
  return labels[id] || (id ? id.toUpperCase() : '')
}

function marketLabel(item) {
  const type = String(item?.trading_config?.market_type || item?.market_type || '').toLowerCase()
  return t(type === 'spot' ? 'v2.live.spotMarket' : type === 'swap' || type === 'perpetual' ? 'v2.live.swapMarket' : 'v2.live.strategyRuntime')
}

function pendingCount(item) {
  return Number(health(item).pending_orders || 0)
}

function activityValue(item) {
  return health(item).last_heartbeat_at || item?.trading_config?.last_execution_time || item?.trading_config?.last_signal_time || item?.updated_at || item?.created_at || ''
}

function activityTimestamp(item) {
  const value = activityValue(item)
  if (!value) return 0
  const numeric = /^\d+(?:\.\d+)?$/.test(String(value)) ? Number(value) : null
  const parsed = numeric != null ? numeric * (numeric < 100000000000 ? 1000 : 1) : Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function activityLabel(item) {
  const timestamp = activityTimestamp(item)
  if (!timestamp) return t('v2.live.noRuntimeData')
  return t('v2.live.lastActive', { time: new Date(timestamp).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) })
}

function groupedPnlRows(items, getter) {
  const groups = new Map()
  items.forEach(item => {
    const value = getter(item)
    if (value == null) return
    const currency = strategyCurrency(item)
    groups.set(currency, (groups.get(currency) || 0) + value)
  })
  return [...groups.entries()].map(([currency, value]) => ({ currency, value }))
}

function money(value, signed = true) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const number = Number(value)
  return `${signed && number > 0 ? '+' : ''}${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pnlClass(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return ''
  return number > 0 ? 'profit' : 'loss'
}

function openStrategy(item) {
  router.push(`/trading/strategy/${item.id}`)
}
</script>

<style scoped>
.live-page { padding-top: calc(10px + var(--safe-area-top)); padding-bottom: calc(90px + var(--safe-area-bottom)); }
.refresh-button { min-height: 26px; display: inline-flex; align-items: center; gap: 4px; padding: 0 7px; border: 0; border-left: 1px solid var(--v2-line); background: transparent; color: var(--v2-text); }
.refresh-button .van-icon { width: 14px; flex: 0 0 14px; display: inline-flex; align-items: center; justify-content: center; border-radius: 0; background: none; box-shadow: none; color: var(--v2-text); font-size: 14px; }
.refresh-button small { color: var(--v2-muted); font-size: 9px; white-space: nowrap; }
.refresh-button .spinning { animation: live-spin .8s linear infinite; }
.system-state { min-height: 38px; display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid var(--v2-line); border-radius: 9px; color: var(--v2-muted); background: var(--v2-surface); font-size: 10px; }
.system-state > i { width: 7px; height: 7px; border-radius: 50%; background: var(--v2-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--v2-green) 16%, transparent); }
.system-state.warning > i { background: var(--v2-orange); box-shadow: 0 0 0 3px color-mix(in srgb, var(--v2-orange) 16%, transparent); }
.system-state b { margin-left: auto; color: var(--v2-text); font-weight: 600; }
.overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.overview-grid article { min-height: 88px; padding: 12px; border: 1px solid var(--v2-line); border-radius: 10px; background: var(--v2-surface); }
.overview-grid article > span { display: block; color: var(--v2-muted); font-size: 10px; }
.overview-grid article > strong { display: inline-block; margin-top: 8px; color: var(--v2-text); font-size: 24px; font-variant-numeric: tabular-nums; }
.overview-grid article > small { margin-left: 4px; color: var(--v2-muted); font-size: 10px; }
.overview-grid strong.danger { color: var(--v2-red); }
.money-summary div { display: grid; gap: 2px; margin-top: 7px; }
.money-summary div strong { font-size: 15px; font-variant-numeric: tabular-nums; }
.money-summary div small { color: var(--v2-muted); font-size: 9px; }
.profit { color: var(--v2-green) !important; }
.loss { color: var(--v2-red) !important; }
.mode-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-top: 14px; padding: 3px; border: 1px solid var(--v2-line); border-radius: 10px; background: var(--v2-surface); }
.mode-tabs button { min-height: 42px; border: 0; border-radius: 7px; background: transparent; color: var(--v2-muted); font-size: 13px; }
.mode-tabs button b { margin-left: 4px; font-size: 10px; }
.mode-tabs button.active { background: var(--v2-surface-2); color: var(--v2-text); font-weight: 700; }
.mode-tabs button.active::after { content: ''; display: block; width: 18px; height: 2px; margin: 4px auto 0; border-radius: 2px; background: var(--v2-brand); }
.strategy-section { margin-top: 14px; }
.filter-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.search-field { min-height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 11px; border: 1px solid var(--v2-line); border-radius: 9px; background: var(--v2-surface); color: var(--v2-muted); }
.search-field input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--v2-text); font-size: 12px; }
.search-field button { width: 28px; height: 28px; border: 0; background: transparent; color: var(--v2-muted); }
.create-button { min-height: 42px; padding: 0 12px; border: 0; border-radius: 9px; background: var(--v2-brand); color: var(--v2-on-brand); font-size: 11px; font-weight: 700; }
.status-tabs { display: flex; gap: 7px; margin-top: 10px; overflow-x: auto; scrollbar-width: none; }
.status-tabs::-webkit-scrollbar { display: none; }
.status-tabs button { min-height: 34px; flex: 0 0 auto; padding: 0 11px; border: 1px solid var(--v2-line); border-radius: 999px; background: var(--v2-surface); color: var(--v2-muted); font-size: 10px; }
.status-tabs button b { margin-left: 3px; font-size: 9px; }
.status-tabs button.active { border-color: color-mix(in srgb, var(--v2-brand) 60%, var(--v2-line)); background: color-mix(in srgb, var(--v2-brand) 10%, var(--v2-surface)); color: var(--v2-text); }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 18px 2px 9px; }
.section-heading h2 { margin: 0; color: var(--v2-text); font-size: 17px; }
.section-heading span { color: var(--v2-muted); font-size: 10px; }
.strategy-list { display: grid; gap: 8px; }
.strategy-row { padding: 13px; border: 1px solid var(--v2-line); border-radius: 11px; background: var(--v2-surface); color: var(--v2-text); cursor: pointer; }
.strategy-row header { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto 14px; gap: 9px; align-items: center; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--v2-soft); }
.status-dot.running { background: var(--v2-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--v2-green) 14%, transparent); }
.status-dot.attention { background: var(--v2-orange); box-shadow: 0 0 0 3px color-mix(in srgb, var(--v2-orange) 14%, transparent); }
.strategy-identity { min-width: 0; }
.strategy-identity h3 { margin: 0; overflow: hidden; color: var(--v2-text); font-size: 14px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.strategy-identity p { margin: 4px 0 0; overflow: hidden; color: var(--v2-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.strategy-identity p strong { color: var(--v2-text); font-weight: 600; }
.status-label { padding: 4px 7px; border-radius: 999px; background: var(--v2-surface-2); color: var(--v2-muted); font-size: 9px; white-space: nowrap; }
.status-label.running { color: var(--v2-green); background: color-mix(in srgb, var(--v2-green) 10%, var(--v2-surface)); }
.status-label.attention { color: var(--v2-orange); background: color-mix(in srgb, var(--v2-orange) 10%, var(--v2-surface)); }
.strategy-row header > .van-icon { color: var(--v2-soft); font-size: 12px; }
.strategy-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 13px; padding: 11px 0; border-block: 1px solid var(--v2-line); }
.strategy-metrics > div { min-width: 0; }
.strategy-metrics > div + div { padding-left: 12px; border-left: 1px solid var(--v2-line); }
.strategy-metrics span { display: block; color: var(--v2-muted); font-size: 9px; }
.strategy-metrics strong { display: block; margin-top: 5px; overflow: hidden; color: var(--v2-text); font-size: 13px; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.strategy-row footer { display: flex; align-items: center; gap: 7px; margin-top: 9px; color: var(--v2-muted); font-size: 9px; }
.strategy-row footer span { padding: 3px 6px; border-radius: 5px; background: var(--v2-surface-2); }
.strategy-row footer time { margin-left: auto; white-space: nowrap; }
.load-button { min-height: 46px; border: 1px solid var(--v2-line); border-radius: 10px; background: var(--v2-surface); color: var(--v2-text); }
@keyframes live-spin { to { transform: rotate(360deg); } }
@media (min-width: 720px) { .live-page { max-width: 760px; } .overview-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 360px) { .refresh-button small { display: none; } .create-button { width: 42px; padding: 0; font-size: 0; } .create-button .van-icon { font-size: 16px; } .strategy-row footer time { display: none; } }
</style>

<style scoped>
.live-page .mode-tabs,
.live-page .status-tabs {
  display: grid;
  overflow: visible;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
}
.live-page .mode-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 10px; }
.live-page .status-tabs { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 6px; }
.live-page .mode-tabs button,
.live-page .mode-tabs button.active,
.live-page .status-tabs button,
.live-page .status-tabs button.active {
  min-width: 0;
  min-height: 32px;
  padding: 0 5px;
  border: 1px solid color-mix(in srgb, var(--v2-line) 78%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--v2-surface-2) 58%, transparent);
  color: var(--v2-muted);
  font-size: 10px;
  white-space: nowrap;
}
.live-page .mode-tabs button.live {
  border-color: color-mix(in srgb, var(--v2-green) 24%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-green) 6%, var(--v2-surface));
  color: var(--v2-green);
}
.live-page .mode-tabs button.signal {
  border-color: color-mix(in srgb, #b08a42 28%, var(--v2-line));
  background: color-mix(in srgb, #b08a42 7%, var(--v2-surface));
  color: #816326;
}
.live-page .mode-tabs button.active {
  border-color: color-mix(in srgb, var(--v2-brand) 42%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-brand) 12%, var(--v2-surface));
  color: var(--v2-brand-strong);
}
.live-page .mode-tabs button.live.active {
  border-color: color-mix(in srgb, var(--v2-green) 48%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-green) 13%, var(--v2-surface));
  color: var(--v2-green);
}
.live-page .mode-tabs button.signal.active {
  border-color: color-mix(in srgb, #b08a42 52%, var(--v2-line));
  background: color-mix(in srgb, #b08a42 14%, var(--v2-surface));
  color: #765817;
}
.live-page .status-tabs button.active {
  border-color: color-mix(in srgb, var(--v2-brand) 32%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-brand) 9%, var(--v2-surface));
  color: var(--v2-text);
}
.live-page .mode-tabs button.active::after { display: none; }
.live-page .strategy-metrics { margin-top: 12px; }
.live-page .strategy-footer {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.live-page .strategy-tags {
  min-width: 0;
  display: flex;
  gap: 4px;
  margin: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.live-page .strategy-tags span {
  flex: 0 0 auto;
  padding: 3px 6px;
  border: 1px solid color-mix(in srgb, var(--v2-line) 72%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--v2-surface-2) 68%, transparent);
  color: var(--v2-muted);
  font-size: 8px;
  line-height: 1.25;
}
.live-page .strategy-tags .execution-tag.live {
  border-color: color-mix(in srgb, var(--v2-green) 30%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-green) 10%, var(--v2-surface));
  color: var(--v2-green);
}
.live-page .strategy-tags .execution-tag.signal {
  border-color: color-mix(in srgb, #b08a42 34%, var(--v2-line));
  background: color-mix(in srgb, #b08a42 10%, var(--v2-surface));
  color: #765817;
}
.live-page .strategy-footer time { margin-left: 0; font-size: 8px; }
@media (min-width: 720px) {
  .live-page .overview-grid article + article { border-left: 1px solid var(--v2-line); }
  .live-page .overview-grid article:nth-child(n+3) { border-top: 0; }
}
</style>

<style scoped>
.live-page .overview-grid article { min-height: 84px; }
.overview-value { min-height: 38px; display: flex; align-items: baseline; gap: 5px; margin-top: 8px; }
.overview-grid .overview-value > strong { margin: 0; color: var(--v2-text); font-family: var(--font-sans); font-size: 24px; font-weight: 560; line-height: 1; font-variant-numeric: tabular-nums; }
.overview-grid .overview-value > small,
.overview-grid .overview-value > strong > small { color: var(--v2-muted); font-size: 9px; font-weight: 500; }
.overview-value.multi-value { align-items: flex-start; flex-direction: column; gap: 4px; }
.overview-grid .multi-value > strong { font-size: 18px; line-height: 1.05; }
.live-page .strategy-section { margin-top: 18px; }
.live-page .mode-tabs { display: flex; gap: 5px; margin-top: 10px; padding: 0; overflow-x: auto; border: 0; border-radius: 0; background: transparent; scrollbar-width: none; }
.live-page .mode-tabs::-webkit-scrollbar { display: none; }
.live-page .mode-tabs button,
.live-page .mode-tabs button.active { min-height: 32px; flex: 0 0 auto; padding: 0 11px; border: 0; border-radius: 7px; background: transparent; color: var(--v2-muted); font-size: 11px; font-weight: 500; }
.live-page .mode-tabs button.active { background: color-mix(in srgb, var(--v2-brand) 10%, var(--v2-surface)); color: var(--v2-brand-strong); }
.live-page .mode-tabs button.active::after { display: none; }
.live-page .mode-tabs button b,
.live-page .status-tabs button b { margin-left: 3px; color: inherit; font-size: 9px; font-weight: 650; }
.live-page .status-tabs { gap: 12px; margin-top: 4px; padding-top: 4px; overflow-x: auto; border-bottom: 1px solid var(--v2-line); }
.live-page .status-tabs button,
.live-page .status-tabs button.active { min-height: 34px; flex: 0 0 auto; padding: 0 0 7px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--v2-muted); box-shadow: none; font-size: 11px; }
.live-page .status-tabs button.active { border-bottom-color: var(--v2-brand); color: var(--v2-text); }
.strategy-tags { display: flex; gap: 5px; margin: 0; overflow-x: auto; scrollbar-width: none; }
.strategy-tags::-webkit-scrollbar { display: none; }
.strategy-tags span { flex: 0 0 auto; padding: 3px 6px; border: 1px solid color-mix(in srgb, var(--v2-line) 72%, transparent); border-radius: 5px; background: color-mix(in srgb, var(--v2-surface-2) 68%, transparent); color: var(--v2-muted); font-size: 9px; line-height: 1.25; }
.strategy-row footer span { padding: 0; border-radius: 0; background: transparent; }
</style>

<style scoped>
.live-page { padding: calc(16px + var(--safe-area-top)) 16px calc(34px + var(--safe-area-bottom)); }
.system-state { min-height: 36px; padding: 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.system-state > i { box-shadow: none; }
.refresh-button { border-left-color: var(--v2-line); }
.overview-grid { gap: 0; margin-top: 22px; border-block: 1px solid var(--v2-line); }
.overview-grid article { min-height: 92px; padding: 15px 12px; border: 0; border-radius: 0; background: transparent; }
.overview-grid article:nth-child(even) { border-left: 1px solid var(--v2-line); }
.overview-grid article:nth-child(n+3) { border-top: 1px solid var(--v2-line); }
.overview-grid article > strong { font-family: var(--font-sans); font-size: 26px; font-weight: 680; }
.money-summary div strong { font-size: 18px; font-weight: 500; }
.mode-tabs { gap: 0; margin-top: 24px; padding: 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.mode-tabs button { position: relative; min-height: 44px; border-radius: 0; }
.mode-tabs button.active { background: transparent; color: var(--v2-text); }
.mode-tabs button.active::after { position: absolute; right: 28%; bottom: -1px; left: 28%; width: auto; margin: 0; background: #b08a42; }
.filter-row { margin-top: 18px; }
.search-field { border-radius: 0; background: transparent; }
.create-button { border-radius: 0; background: var(--v2-brand); }
.status-tabs { gap: 18px; margin-top: 12px; border-bottom: 1px solid var(--v2-line); }
.status-tabs button { padding: 0 0 9px; border: 0; border-radius: 0; background: transparent; }
.status-tabs button.active { color: var(--v2-text); border-bottom: 2px solid #b08a42; background: transparent; }
.section-heading { margin: 26px 0 4px; }
.section-heading h2 { font-family: var(--font-sans); font-size: 20px; font-weight: 680; }
.strategy-list { gap: 0; }
.strategy-row { padding: 18px 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.strategy-row:first-child { border-top: 1px solid var(--v2-line); }
.strategy-row header { grid-template-columns: 7px minmax(0, 1fr) auto 14px; }
.strategy-identity h3 { font-size: 15px; font-weight: 600; }
.strategy-metrics { margin-top: 14px; padding-top: 12px; border-top: 1px solid color-mix(in srgb, var(--v2-line) 70%, transparent); }
.strategy-metrics strong { font-family: var(--font-sans); font-size: 16px; font-weight: 650; }
</style>

<style scoped>
.live-page { padding: calc(12px + var(--safe-area-top)) 12px calc(32px + var(--safe-area-bottom)); }
.system-state { min-height: 40px; padding: 0 12px; border-radius: 10px; }
.system-state > i, .system-state.warning > i { width: 6px; height: 6px; box-shadow: none; }
.system-state b { font-weight: 500; }
.refresh-button { min-height: 32px; padding-inline: 8px; }
.overview-grid { gap: 8px; margin-top: 8px; }
.overview-grid article { min-height: 92px; padding: 12px; border-radius: 12px; }
.overview-grid article > span { font-size: 11px; }
.overview-grid article > strong { margin-top: 10px; font-size: 28px; font-weight: 500; }
.money-summary div strong { font-size: 16px; font-weight: 500; }
.mode-tabs { margin-top: 16px; padding: 4px; border-radius: 12px; }
.mode-tabs button { min-height: 40px; border-radius: 8px; font-size: 13px; }
.mode-tabs button.active { font-weight: 500; }
.mode-tabs button.active::after { height: 2px; }
.strategy-section { margin-top: 16px; }
.search-field, .create-button { min-height: 44px; }
.search-field { border-radius: 10px; }
.search-field input { font-size: 13px; }
.create-button { padding-inline: 14px; font-size: 12px; font-weight: 600; }
.status-tabs { gap: 4px; margin-top: 12px; }
.status-tabs button { min-height: 32px; padding: 0 10px; border-radius: 7px; background: transparent; font-size: 11px; }
.status-tabs button.active { border-color: transparent; background: color-mix(in srgb,var(--v2-brand) 10%,var(--v2-surface)); color: var(--v2-brand-strong); box-shadow: none; }
.section-heading { margin: 24px 2px 12px; }
.section-heading h2 { font-size: 19px; font-weight: 500; }
.strategy-list { gap: 8px; }
.strategy-row { padding: 14px; border-radius: 14px; }
.status-dot, .status-dot.running, .status-dot.attention { width: 6px; height: 6px; box-shadow: none; }
.strategy-identity h3 { font-size: 15px; font-weight: 500; }
.strategy-identity p { font-size: 10px; }
.status-label { padding: 0; border-radius: 0; background: transparent; font-size: 10px; }
.status-label.running, .status-label.attention { background: transparent; }
.strategy-metrics { margin-top: 16px; padding: 12px 0; }
.strategy-metrics span, .strategy-row footer { font-size: 10px; }
.strategy-metrics strong { font-size: 14px; font-weight: 500; }
.strategy-row footer span { padding: 0; border-radius: 0; background: transparent; }
</style>

<style scoped>
.live-page.live-page { padding: calc(16px + var(--safe-area-top)) 16px calc(34px + var(--safe-area-bottom)); }
.system-state { min-height: 36px; padding: 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.overview-grid { gap: 0; margin-top: 22px; border-block: 1px solid var(--v2-line); }
.overview-grid article { min-height: 92px; padding: 15px 12px; border: 0; border-radius: 0; background: transparent; }
.overview-grid article:nth-child(even) { border-left: 1px solid var(--v2-line); }
.overview-grid article:nth-child(n+3) { border-top: 1px solid var(--v2-line); }
.overview-grid article > strong { font-family: var(--font-sans); font-size: 26px; font-weight: 680; }
.mode-tabs { gap: 0; margin-top: 24px; padding: 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.mode-tabs button, .mode-tabs button.active { position: relative; min-height: 44px; border-radius: 0; background: transparent; }
.mode-tabs button.active::after { position: absolute; right: 28%; bottom: -1px; left: 28%; width: auto; margin: 0; background: #b08a42; }
.search-field, .create-button { border-radius: 0; }
.search-field { background: transparent; }
.status-tabs { gap: 18px; border-bottom: 1px solid var(--v2-line); }
.status-tabs button, .status-tabs button.active { padding: 0 0 9px; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.status-tabs button.active { border-bottom: 2px solid #b08a42; }
.section-heading { margin: 26px 0 4px; }
.section-heading h2 { font-family: var(--font-sans); font-size: 20px; font-weight: 680; }
.strategy-list { gap: 0; }
.strategy-row { padding: 18px 0; border: 0; border-bottom: 1px solid var(--v2-line); border-radius: 0; background: transparent; }
.strategy-row:first-child { border-top: 1px solid var(--v2-line); }
.strategy-metrics strong { font-family: var(--font-sans); font-size: 16px; font-weight: 650; }
@media (min-width: 720px) { .live-page.live-page { max-width: 520px; } }
</style>

<style scoped>
.live-page .overview-grid article { min-height: 84px; }
.live-page .overview-value { min-height: 38px; display: flex; align-items: baseline; gap: 5px; margin-top: 8px; }
.live-page .overview-grid .overview-value > strong { margin: 0; color: var(--v2-text); font-family: var(--font-sans); font-size: 21px; font-weight: 560; line-height: 1; font-variant-numeric: tabular-nums; }
.live-page .overview-grid .overview-value > small,
.live-page .overview-grid .overview-value > strong > small { color: var(--v2-muted); font-size: 9px; font-weight: 500; }
.live-page .overview-value.multi-value { align-items: flex-start; flex-direction: column; gap: 4px; }
.live-page .overview-grid .multi-value > strong { font-size: 21px; line-height: 1.05; }
.live-page .strategy-section { margin-top: 18px; }
.live-page .mode-tabs { display: flex; gap: 5px; margin-top: 10px; padding: 0; overflow-x: auto; border: 0; border-radius: 0; background: transparent; scrollbar-width: none; }
.live-page .mode-tabs::-webkit-scrollbar { display: none; }
.live-page .mode-tabs button,
.live-page .mode-tabs button.active { position: static; min-height: 32px; flex: 0 0 auto; padding: 0 11px; border: 0; border-radius: 7px; background: transparent; color: var(--v2-muted); font-size: 11px; font-weight: 500; }
.live-page .mode-tabs button.active { background: color-mix(in srgb, var(--v2-brand) 10%, var(--v2-surface)); color: var(--v2-brand-strong); }
.live-page .mode-tabs button.active::after { display: none; }
.live-page .mode-tabs button b,
.live-page .status-tabs button b { margin-left: 3px; color: inherit; font-size: 9px; font-weight: 650; }
.live-page .status-tabs { gap: 12px; margin-top: 4px; padding-top: 4px; overflow-x: auto; border-bottom: 1px solid var(--v2-line); }
.live-page .status-tabs button,
.live-page .status-tabs button.active { min-height: 34px; flex: 0 0 auto; padding: 0 0 7px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--v2-muted); box-shadow: none; font-size: 11px; }
.live-page .status-tabs button.active { border-bottom-color: var(--v2-brand); color: var(--v2-text); }
.live-page .strategy-tags { display: flex; gap: 5px; margin: 0; overflow-x: auto; scrollbar-width: none; }
.live-page .strategy-tags::-webkit-scrollbar { display: none; }
.live-page .strategy-tags span { flex: 0 0 auto; padding: 3px 6px; border: 1px solid color-mix(in srgb, var(--v2-line) 72%, transparent); border-radius: 5px; background: color-mix(in srgb, var(--v2-surface-2) 68%, transparent); color: var(--v2-muted); font-size: 9px; line-height: 1.25; }
</style>

<style scoped>
.live-page .mode-tabs,
.live-page .status-tabs {
  display: grid;
  overflow: visible;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
}
.live-page .mode-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 10px; }
.live-page .status-tabs { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 6px; }
.live-page .mode-tabs button,
.live-page .mode-tabs button.active,
.live-page .status-tabs button,
.live-page .status-tabs button.active {
  min-width: 0;
  min-height: 32px;
  padding: 0 5px;
  border: 1px solid color-mix(in srgb, var(--v2-line) 78%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--v2-surface-2) 58%, transparent);
  font-size: 10px;
  white-space: nowrap;
}
.live-page .mode-tabs button.active::after { display: none; }
.live-page .status-tabs button.active {
  border-color: color-mix(in srgb, var(--v2-brand) 32%, var(--v2-line));
  background: color-mix(in srgb, var(--v2-brand) 9%, var(--v2-surface));
  color: var(--v2-text);
}
.live-page .overview-grid .multi-value > strong > small {
  display: block;
  margin-top: 5px;
  line-height: 1;
}
.live-page .strategy-list {
  gap: 10px;
}
.live-page .strategy-row,
.live-page .strategy-row:first-child {
  padding: 14px;
  border: 1px solid var(--v2-line);
  border-radius: 11px;
  background: transparent;
}
.live-page .section-heading h2,
.live-page .strategy-identity h3,
.live-page .overview-grid .overview-value > strong,
.live-page .strategy-metrics strong {
  font-family: var(--font-display);
  font-optical-sizing: auto;
}
@media (min-width: 720px) {
  .live-page .overview-grid article + article { border-left: 1px solid var(--v2-line); }
  .live-page .overview-grid article:nth-child(n+3) { border-top: 0; }
}
</style>
