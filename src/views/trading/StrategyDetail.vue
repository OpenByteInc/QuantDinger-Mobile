<template>
  <div class="page">
    <van-nav-bar :title="strategy?.strategy_name || $t('script_strategy.title')" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="replay" @click="load" />
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else-if="strategy">
      <div class="summary-card">
        <div class="summary-head">
          <div>
            <div class="strategy-name">{{ strategy.strategy_name }}</div>
            <div class="strategy-symbol">{{ strategy.symbol || '-' }} · {{ strategy.timeframe || '-' }}</div>
          </div>
          <span :class="['status', strategy.status]">{{ statusText }}</span>
        </div>
        <div class="summary-grid">
          <div><span>{{ $t('trading.initial_capital') }}</span><strong>{{ money(strategy.initial_capital) }}</strong></div>
          <div><span>{{ $t('trading.leverage') }}</span><strong>{{ strategy.trading_config?.leverage || strategy.leverage || 1 }}x</strong></div>
          <div><span>{{ $t('indicator_bot.execution_mode') }}</span><strong>{{ executionModeText }}</strong></div>
          <div><span>{{ $t('trading.market_type') }}</span><strong>{{ marketTypeText }}</strong></div>
        </div>
      </div>

      <van-tabs v-model:active="activeTab" sticky>
        <van-tab :title="$t('trading.tab_params')" name="params">
          <div class="panel">
            <div v-if="parameterRows.length" class="row-list">
              <div v-for="item in parameterRows" :key="item.name" class="data-row">
                <span>{{ item.name }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <van-empty v-else :description="$t('script_strategy.parameters_empty')" />
          </div>
        </van-tab>
        <van-tab :title="$t('trading.tab_positions')" name="positions">
          <div class="panel">
            <div v-if="positions.length" class="row-list">
              <div v-for="(item, index) in positions" :key="item.id || item.symbol || index" class="record">
                <div><strong>{{ item.symbol || strategy.symbol }}</strong><span>{{ sideText(item.side) }}</span></div>
                <div><span>{{ $t('trading.size') }}</span><strong>{{ number(item.quantity) }}</strong></div>
                <div><span>{{ $t('trading.entry_price') }}</span><strong>{{ number(item.entry_price) }}</strong></div>
                <div><span>{{ $t('trading.mark_price') }}</span><strong>{{ number(item.current_price) }}</strong></div>
                <div><span>{{ $t('trading.pnl') }}</span><strong :class="pnlClass(item.unrealized_pnl)">{{ signedNumber(item.unrealized_pnl) }}</strong></div>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_positions')" />
          </div>
        </van-tab>
        <van-tab :title="$t('trading.tab_trades')" name="trades">
          <div class="panel">
            <div v-if="trades.length" class="row-list">
              <div v-for="(item, index) in trades" :key="item.id || index" class="record">
                <div><strong>{{ item.symbol || strategy.symbol }}</strong><span>{{ tradeSideText(item.side) }}</span></div>
                <div><span>{{ $t('trading.size') }}</span><strong>{{ number(item.quantity) }}</strong></div>
                <div><span>{{ $t('trading.trade_price') }}</span><strong>{{ number(item.trade_price) }}</strong></div>
                <div><span>{{ $t('trading.trade_value') }}</span><strong>{{ number(item.value) }}</strong></div>
                <div><span>{{ $t('trading.trade_commission') }}</span><strong>{{ number(item.commission) }}</strong></div>
                <div><span>{{ $t('trading.pnl') }}</span><strong :class="pnlClass(item.pnl)">{{ signedNumber(item.pnl) }}</strong></div>
                <time v-if="item.created_at">{{ time(item.created_at) }}</time>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_trades')" />
          </div>
        </van-tab>
        <van-tab :title="$t('trading.tab_logs')" name="logs">
          <div class="panel">
            <div v-if="logs.length" class="log-list">
              <div v-for="(item, index) in logs" :key="item.id || index" class="log-row">
                <span>{{ item.created_at || item.timestamp || '' }}</span>
                <p>{{ item.message || item.content || item }}</p>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_logs')" />
          </div>
        </van-tab>
      </van-tabs>

      <div class="actions">
        <van-button v-if="strategy.status !== 'running'" type="primary" round :loading="actionLoading" @click="start">
          {{ $t('trading.action_start') }}
        </van-button>
        <van-button v-else type="warning" round :loading="actionLoading" @click="stop">
          {{ $t('trading.action_stop') }}
        </van-button>
        <van-button v-if="strategy.status !== 'running'" round @click="edit">{{ $t('trading.action_edit') }}</van-button>
        <van-button v-if="strategy.status !== 'running'" type="danger" plain round @click="remove">{{ $t('trading.action_delete') }}</van-button>
      </div>
    </template>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { scriptSourceApi, strategyApi } from '@/api'

export default {
  name: 'StrategyDetail',
  data() {
    return {
      strategy: null,
      source: null,
      positions: [],
      trades: [],
      logs: [],
      activeTab: 'params',
      loading: false,
      actionLoading: false
    }
  },
  computed: {
    strategyId() { return Number(this.$route.params.id) },
    statusText() {
      const key = `trading.${this.strategy?.status || 'stopped'}`
      const text = this.$t(key)
      return text === key ? this.strategy?.status : text
    },
    executionModeText() {
      const mode = this.strategy?.execution_mode === 'live' ? 'live' : 'signal'
      return this.$t(`indicator_bot.execution_mode_${mode}`)
    },
    marketTypeText() {
      const value = String(this.strategy?.market_type || this.strategy?.trading_config?.market_type || '').toLowerCase()
      if (value === 'spot') return this.$t('quick_trade.market_spot')
      if (value === 'swap') return this.$t('quick_trade.market_swap')
      return value || '-'
    },
    parameterDefinitions() {
      const schema = this.parseObject(this.source?.param_schema)
      return Array.isArray(schema.params) ? schema.params : []
    },
    parameterRows() {
      const params = this.strategy?.trading_config?.params || {}
      return Object.entries(params).map(([name, value]) => ({
        name: this.parameterLabel(name),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }))
    }
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        const [strategy, positions, trades, logs] = await Promise.allSettled([
          strategyApi.getDetail(this.strategyId),
          strategyApi.getPositions(this.strategyId),
          strategyApi.getTrades(this.strategyId, 30),
          strategyApi.getLogs(this.strategyId, 100)
        ])
        this.strategy = strategy.status === 'fulfilled' ? strategy.value.data : null
        this.source = null
        const sourceId = Number(this.strategy?.trading_config?.script_source_id)
        if (sourceId > 0) {
          try {
            const response = await scriptSourceApi.getDetail(sourceId)
            this.source = response?.data || null
          } catch (error) {
            console.error('Load strategy source detail failed:', error)
          }
        }
        this.positions = positions.status === 'fulfilled' ? (positions.value.data || []) : []
        this.trades = trades.status === 'fulfilled' ? (trades.value.data || []) : []
        this.logs = logs.status === 'fulfilled' ? (logs.value.data || []) : []
      } finally {
        this.loading = false
      }
    },
    parseObject(value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (typeof value !== 'string' || !value.trim()) return {}
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        return {}
      }
    },
    parameterLabel(name) {
      const definition = this.parameterDefinitions.find((item) => item.name === name)
      if (definition?.label_key && this.$te(definition.label_key)) return this.$t(definition.label_key)
      return definition?.label || name
    },
    money(value) {
      const amount = Number(value || 0)
      return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    number(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '-'
      return amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
    },
    signedNumber(value) {
      const amount = Number(value || 0)
      const prefix = amount > 0 ? '+' : ''
      return `${prefix}${this.number(amount)}`
    },
    pnlClass(value) {
      const amount = Number(value || 0)
      return amount > 0 ? 'profit' : (amount < 0 ? 'loss' : '')
    },
    sideText(value) {
      const side = String(value || '').toLowerCase()
      if (side === 'long' || side === 'buy') return this.$t('trading.side_long')
      if (side === 'short' || side === 'sell') return this.$t('trading.side_short')
      return value || '-'
    },
    tradeSideText(value) {
      const side = String(value || '').toLowerCase()
      const key = `trading.trade_${side}`
      const translated = this.$t(key)
      return translated === key ? this.sideText(side) : translated
    },
    time(value) {
      if (!value) return ''
      const numeric = Number(value)
      const date = Number.isFinite(numeric)
        ? new Date(numeric * (numeric < 1e12 ? 1000 : 1))
        : new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    },
    edit() {
      this.$router.push({ path: '/trading/create/script', query: { edit: this.strategyId } })
    },
    async start() {
      this.actionLoading = true
      try {
        await strategyApi.start(this.strategyId)
        showToast({ message: this.$t('trading.start_success'), type: 'success' })
        await this.load()
      } finally {
        this.actionLoading = false
      }
    },
    async stop() {
      await showConfirmDialog({
        title: this.$t('trading.confirm_stop_title'),
        message: this.$t('trading.confirm_stop_msg')
      })
      this.actionLoading = true
      try {
        await strategyApi.stop(this.strategyId)
        showToast({ message: this.$t('trading.stop_success'), type: 'success' })
        await this.load()
      } finally {
        this.actionLoading = false
      }
    },
    async remove() {
      await showConfirmDialog({
        title: this.$t('trading.confirm_delete_title'),
        message: this.$t('trading.confirm_delete_msg')
      })
      await strategyApi.delete(this.strategyId)
      showToast({ message: this.$t('trading.delete_success'), type: 'success' })
      this.$router.replace('/trading')
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 92px; color: var(--text); }
:deep(.van-nav-bar), :deep(.van-tabs__nav) { background: var(--bg); }
:deep(.van-nav-bar__title), :deep(.van-nav-bar .van-icon), :deep(.van-tab) { color: var(--text); }
.loading { margin-top: 80px; color: var(--text-2); }
.summary-card, .panel {
  margin: 12px 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.summary-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.strategy-name { font-size: 19px; font-weight: 900; }
.strategy-symbol { margin-top: 5px; color: var(--text-2); font-size: 12px; }
.status { padding: 4px 9px; border-radius: 999px; color: var(--text-2); background: var(--bg); }
.status.running { color: var(--up); background: rgba(34, 197, 94, 0.12); }
.status.error { color: var(--down); background: rgba(239, 68, 68, 0.12); }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
.summary-grid div, .data-row, .record div { display: flex; justify-content: space-between; gap: 8px; }
.summary-grid span, .data-row span, .record span { color: var(--text-2); font-size: 12px; }
.summary-grid strong, .data-row strong, .record strong { color: var(--text); }
.row-list { display: flex; flex-direction: column; gap: 12px; }
.data-row { padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.record { display: grid; gap: 8px; padding: 12px; border-radius: var(--radius-sm); background: var(--bg); }
.record time { color: var(--text-3); font-size: 11px; text-align: right; }
.profit { color: var(--up) !important; }
.loss { color: var(--down) !important; }
.log-row { padding: 10px 0; border-bottom: 1px solid var(--border); }
.log-row span { color: var(--text-3); font-size: 11px; }
.log-row p { margin: 5px 0 0; color: var(--text); word-break: break-word; }
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  z-index: 10;
}
.actions :deep(.van-button) { flex: 1; }
</style>
