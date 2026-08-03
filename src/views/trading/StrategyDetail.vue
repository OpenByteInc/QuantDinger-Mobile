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

      <button
        v-if="hasOwnershipDrift"
        type="button"
        class="risk-card"
        @click="openOwnershipRepair"
      >
        <span class="risk-icon"><van-icon name="warning-o" /></span>
        <span class="risk-copy">
          <strong>{{ $t('trading.position_ownership_drift_title') }}</strong>
          <small>{{ $t('trading.position_ownership_drift_desc') }}</small>
        </span>
        <van-icon name="arrow" />
      </button>

      <button
        v-else-if="hasUnmanagedPosition"
        type="button"
        class="risk-card"
        @click="activeTab = 'positions'"
      >
        <span class="risk-icon"><van-icon name="warning-o" /></span>
        <span class="risk-copy">
          <strong>{{ $t('trading.stopped_with_positions', { count: positions.length }) }}</strong>
          <small>{{ $t('trading.stopped_with_positions_desc') }}</small>
        </span>
        <van-icon name="arrow" />
      </button>

      <van-tabs v-model:active="activeTab" sticky>
        <van-tab :title="$t('trading.tab_overview')" name="overview">
          <div class="panel overview-panel">
            <div class="overview-section">
              <div class="section-heading">{{ $t('trading.attention_items') }}</div>
              <div v-if="hasOwnershipDrift" class="attention-row danger">
                <van-icon name="warning-o" />
                <span>{{ $t('trading.position_ownership_risk_desc') }}</span>
                <button type="button" @click="openOwnershipRepair">{{ $t('trading.position_ownership_open_repair') }}</button>
              </div>
              <div v-else-if="hasUnmanagedPosition" class="attention-row danger">
                <van-icon name="warning-o" />
                <span>{{ $t('trading.position_requires_attention') }}</span>
                <button type="button" @click="activeTab = 'positions'">{{ $t('trading.view_positions') }}</button>
              </div>
              <div v-else-if="strategy.status === 'error'" class="attention-row danger">
                <van-icon name="warning-o" />
                <span>{{ $t('trading.strategy_run_error') }}</span>
                <button type="button" @click="activeTab = 'logs'">{{ $t('trading.view_events') }}</button>
              </div>
              <div v-else class="attention-row safe">
                <van-icon name="passed" />
                <span>{{ $t('trading.no_attention_items') }}</span>
              </div>
            </div>

            <div class="overview-section">
              <div class="section-heading">{{ $t('trading.runtime_overview') }}</div>
              <div class="overview-grid">
                <div><span>{{ $t('trading.strategy_source') }}</span><strong>{{ sourceName }}</strong></div>
                <div><span>{{ $t('trading.execution_account') }}</span><strong>{{ accountName }}</strong></div>
                <div><span>{{ $t('trading.current_positions') }}</span><strong>{{ positions.length }}</strong></div>
                <div><span>{{ $t('trading.recent_trades') }}</span><strong>{{ trades.length }}</strong></div>
                <div><span>{{ $t('trading.last_signal') }}</span><strong>{{ latestEventSummary }}</strong></div>
                <div><span>{{ $t('trading.last_updated') }}</span><strong>{{ time(strategy.updated_at || strategy.created_at) || '-' }}</strong></div>
              </div>
            </div>
          </div>
        </van-tab>
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
            <button
              v-if="isLiveStrategy"
              type="button"
              :class="['ownership-entry', { danger: hasOwnershipDrift }]"
              @click="openOwnershipRepair"
            >
              <span class="ownership-entry-copy">
                <strong>{{ $t('trading.position_ownership_title') }}</strong>
                <small>{{ hasOwnershipDrift ? $t('trading.position_ownership_drift_desc') : $t('trading.position_ownership_summary') }}</small>
              </span>
              <span :class="['ownership-state', { danger: hasOwnershipDrift }]">
                {{ $t(hasOwnershipDrift ? 'trading.position_ownership_blocked' : 'trading.position_ownership_normal') }}
              </span>
              <van-icon name="arrow" />
            </button>
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
        <van-tab v-if="isGridStrategy" :title="$t('trading.tab_grid_orders')" name="grid-orders">
          <div class="panel">
            <div class="grid-sync-head">
              <div>
                <strong>{{ $t('trading.grid_orders_title') }}</strong>
                <small>{{ $t('trading.grid_orders_hint') }}</small>
              </div>
              <van-button size="small" plain :loading="gridOrdersLoading" @click="loadGridOrders(true)">
                {{ $t('trading.grid_orders_sync') }}
              </van-button>
            </div>
            <div class="grid-order-kpis">
              <div><span>{{ $t('trading.grid_orders_open') }}</span><strong>{{ gridOrderSummary.total || gridOrders.length }}</strong></div>
              <div><span>{{ $t('trading.grid_orders_verified') }}</span><strong>{{ gridOrderSummary.verified_exchange_orders || 0 }}</strong></div>
              <div :class="{ danger: Number(gridOrderSummary.unverified_orders || 0) > 0 }"><span>{{ $t('trading.grid_orders_unverified') }}</span><strong>{{ gridOrderSummary.unverified_orders || 0 }}</strong></div>
            </div>
            <div v-if="gridOrders.length" class="row-list">
              <article v-for="order in gridOrders" :key="order.id" class="record grid-order-card">
                <div><strong>#{{ order.cell_index }} · {{ order.purpose_label || order.purpose }}</strong><span>{{ order.status }}</span></div>
                <div><span>{{ $t('trading.grid_orders_side') }}</span><strong>{{ order.side }}</strong></div>
                <div><span>{{ $t('trading.grid_orders_price') }}</span><strong>{{ number(order.price) }}</strong></div>
                <div><span>{{ $t('trading.grid_orders_quantity') }}</span><strong>{{ number(order.quantity) }}</strong></div>
                <div><span>{{ $t('trading.grid_orders_exchange_id') }}</span><code :class="{ missing: !order.exchange_order_id }">{{ order.exchange_order_id || $t('trading.grid_orders_not_verified') }}</code></div>
                <time>{{ time(order.updated_at) }}</time>
              </article>
            </div>
            <van-empty v-else :description="$t('trading.grid_orders_empty')" />
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
                <span>{{ time(item.created_at || item.timestamp) }}</span>
                <p>{{ logSummary(item) }}</p>
                <details v-if="rawLogText(item) !== logSummary(item)">
                  <summary>{{ $t('trading.technical_details') }}</summary>
                  <code>{{ rawLogText(item) }}</code>
                </details>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_logs')" />
          </div>
        </van-tab>
      </van-tabs>

      <div class="actions">
        <van-button v-if="hasOwnershipDrift" type="danger" round @click="openOwnershipRepair">
          {{ $t('trading.position_ownership_open_repair') }}
        </van-button>
        <van-button v-else-if="hasUnmanagedPosition" type="danger" round @click="activeTab = 'positions'">
          {{ $t('trading.handle_positions') }}
        </van-button>
        <van-button v-else-if="strategy.status !== 'running'" type="primary" round :loading="actionLoading" @click="start">
          {{ $t('trading.action_start') }}
        </van-button>
        <van-button v-else type="warning" round :loading="actionLoading" @click="requestStop">
          {{ $t('trading.action_stop') }}
        </van-button>
        <van-button v-if="strategy.status !== 'running'" round @click="edit">{{ $t('trading.action_edit') }}</van-button>
        <van-button
          v-if="strategy.status !== 'running'"
          type="danger"
          plain
          round
          :disabled="hasOpenExposure"
          @click="remove"
        >{{ $t('trading.action_delete') }}</van-button>
      </div>
    </template>

    <van-action-sheet
      v-model:show="showStopActions"
      :actions="stopActions"
      :cancel-text="$t('common.cancel')"
      :description="$t('trading.stop_policy_desc')"
      close-on-click-action
      @select="onStopAction"
    />

    <van-popup
      v-model:show="showOwnershipRepair"
      position="bottom"
      round
      teleport="body"
      class="ownership-sheet"
    >
      <div class="ownership-sheet-head">
        <div>
          <strong>{{ $t('trading.position_ownership_title') }}</strong>
          <small>{{ $t('trading.position_ownership_risk_title') }}</small>
        </div>
        <button type="button" :aria-label="$t('common.close')" @click="showOwnershipRepair = false">
          <van-icon name="cross" />
        </button>
      </div>

      <div class="ownership-risk-note">
        <van-icon name="warning-o" />
        <span>{{ $t('trading.position_ownership_risk_desc') }}</span>
      </div>

      <van-loading v-if="ownershipLoading" class="ownership-loading" vertical>{{ $t('common.loading') }}</van-loading>
      <div v-else-if="ownershipRows.length" class="ownership-list">
        <article v-for="row in ownershipRows" :key="`${row.symbol}:${row.side}`" class="ownership-card">
          <div class="ownership-card-head">
            <div>
              <strong>{{ row.symbol }}</strong>
              <span>{{ sideText(row.side) }}</span>
            </div>
            <span :class="['ownership-state', { danger: row.status === 'drift_blocked' }]">
              {{ $t(row.status === 'drift_blocked' ? 'trading.position_ownership_blocked' : 'trading.position_ownership_normal') }}
            </span>
          </div>
          <div class="ownership-qty-grid">
            <div><span>{{ $t('trading.position_ownership_account') }}</span><strong>{{ ownershipQty(row.account_qty) }}</strong></div>
            <div><span>{{ $t('trading.position_ownership_strategy') }}</span><strong>{{ ownershipQty(row.strategy_qty) }}</strong></div>
            <div><span>{{ $t('trading.position_ownership_protected') }}</span><strong>{{ ownershipQty(row.protected_qty) }}</strong></div>
            <div><span>{{ $t('trading.position_ownership_unknown') }}</span><strong :class="{ loss: ownershipHasUnknown(row) }">{{ ownershipQty(row.unknown_qty) }}</strong></div>
          </div>
          <div class="ownership-meta">
            <span>{{ $t('trading.position_ownership_mode') }}</span>
            <strong>{{ $t(row.coexistence_mode === 'advanced' ? 'trading.position_ownership_advanced' : 'trading.position_ownership_strict') }}</strong>
          </div>
          <small v-if="row.updated_at" class="ownership-updated">
            {{ $t('trading.position_ownership_updated', { time: time(row.updated_at) }) }}
          </small>
          <div class="ownership-actions">
            <van-button
              v-if="ownership.advanced_coexistence_available && (row.coexistence_mode !== 'advanced' || ownershipHasUnknown(row))"
              size="small"
              type="warning"
              plain
              :loading="ownershipRepairKey === `${row.symbol}:${row.side}:protect_manual`"
              @click="repairOwnership(row, 'protect_manual')"
            >{{ $t('trading.position_ownership_protect') }}</van-button>
            <van-button
              v-else-if="row.coexistence_mode === 'advanced'"
              size="small"
              plain
              :loading="ownershipRepairKey === `${row.symbol}:${row.side}:strict_mode`"
              @click="repairOwnership(row, 'strict_mode')"
            >{{ $t('trading.position_ownership_use_strict') }}</van-button>
            <van-button
              size="small"
              type="primary"
              plain
              :loading="ownershipRepairKey === `${row.symbol}:${row.side}:recheck`"
              @click="repairOwnership(row, 'recheck')"
            >{{ $t('trading.position_ownership_recheck') }}</van-button>
          </div>
        </article>
      </div>
      <van-empty v-else :description="$t('trading.no_positions')" />
    </van-popup>
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
      gridOrders: [],
      gridOrderSummary: {},
      ownership: { items: [], status: 'ok', advanced_coexistence_available: false },
      activeTab: 'overview',
      loading: false,
      actionLoading: false,
      ownershipLoading: false,
      gridOrdersLoading: false,
      ownershipRepairKey: '',
      showStopActions: false,
      showOwnershipRepair: false
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
    isLiveStrategy() {
      return this.strategy?.execution_mode === 'live'
    },
    isGridStrategy() {
      const config = this.strategy?.trading_config || {}
      const type = String(this.strategy?.bot_type || config.bot_type || config.executor_type || '').toLowerCase()
      const template = String(this.strategy?.template_key || config.template_key || '').toLowerCase()
      return type === 'grid' || template.includes('robot_v2_grid')
    },
    hasOpenExposure() {
      const pending = Number(this.strategy?.pending_order_count || this.strategy?.open_order_count || 0)
      return this.positions.length > 0 || pending > 0
    },
    hasUnmanagedPosition() {
      return this.strategy?.status !== 'running' && this.positions.length > 0
    },
    ownershipRows() {
      return Array.isArray(this.ownership?.items) ? this.ownership.items : []
    },
    hasOwnershipDrift() {
      return this.ownership?.status === 'drift_blocked' || this.ownershipRows.some((row) => row.status === 'drift_blocked')
    },
    sourceName() {
      return this.source?.name || this.source?.strategy_name || this.strategy?.source_name || this.$t('trading.custom_strategy')
    },
    accountName() {
      if (!this.isLiveStrategy) return this.$t('trading.no_account_needed')
      const exchange = this.strategy?.exchange_config || {}
      return exchange.credential_name || exchange.account_name || exchange.exchange_name || exchange.exchange_id || this.$t('trading.account_unset')
    },
    latestEventSummary() {
      const first = this.logs[0]
      return first ? this.logSummary(first) : this.$t('trading.no_recent_event')
    },
    stopActions() {
      return [
        {
          name: this.$t('trading.stop_only'),
          subname: this.$t('trading.stop_only_desc'),
          closePositions: false
        },
        {
          name: this.$t('trading.stop_and_close'),
          subname: this.$t('trading.stop_and_close_desc'),
          color: 'var(--down)',
          closePositions: true
        }
      ]
    },
    marketTypeText() {
      const value = String(this.strategy?.market_type || this.strategy?.trading_config?.market_type || '').toLowerCase()
      if (value === 'spot') return this.$t('trading.market_spot')
      if (value === 'swap') return this.$t('trading.market_futures')
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
        if (this.isLiveStrategy) await this.loadOwnership(false)
        else this.ownership = { items: [], status: 'ok', advanced_coexistence_available: false }
        if (this.isGridStrategy) await this.loadGridOrders(false)
        else {
          this.gridOrders = []
          this.gridOrderSummary = {}
        }
      } finally {
        this.loading = false
      }
    },
    async loadOwnership(showFailure = true) {
      this.ownershipLoading = true
      try {
        const response = await strategyApi.getPositionOwnership(this.strategyId)
        this.ownership = response?.data || { items: [], status: 'ok', advanced_coexistence_available: false }
      } catch (error) {
        if (showFailure) showToast({ message: this.$t('trading.position_ownership_load_failed'), type: 'fail' })
      } finally {
        this.ownershipLoading = false
      }
    },
    async loadGridOrders(sync = false) {
      this.gridOrdersLoading = true
      try {
        const response = await strategyApi.getGridRestingOrders(this.strategyId, sync)
        const data = response?.data || {}
        this.gridOrders = data.orders || data.items || []
        this.gridOrderSummary = data.summary || {}
        if (sync && this.gridOrderSummary.sync_ok === false) {
          showToast({ message: this.$t('trading.grid_orders_sync_failed'), type: 'fail' })
        }
      } catch (error) {
        if (sync) showToast({ message: this.$t('trading.grid_orders_sync_failed'), type: 'fail' })
      } finally {
        this.gridOrdersLoading = false
      }
    },
    async openOwnershipRepair() {
      this.activeTab = 'positions'
      this.showOwnershipRepair = true
      await this.loadOwnership()
    },
    ownershipQty(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '-'
      return amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
    },
    ownershipHasUnknown(row) {
      return Math.abs(Number(row?.unknown_qty || 0)) > Math.abs(Number(row?.tolerance || 0))
    },
    async repairOwnership(row, action) {
      const key = `${row.symbol}:${row.side}:${action}`
      if (this.ownershipRepairKey) return
      if (action === 'protect_manual' || action === 'strict_mode') {
        try {
          const isProtect = action === 'protect_manual'
          await showConfirmDialog({
            title: this.$t(isProtect
              ? 'trading.position_ownership_protect_confirm_title'
              : 'trading.position_ownership_strict_confirm_title'),
            message: this.$t(isProtect
              ? 'trading.position_ownership_protect_confirm'
              : 'trading.position_ownership_strict_confirm')
          })
        } catch {
          return
        }
      }
      this.ownershipRepairKey = key
      try {
        await strategyApi.repairPositionOwnership({
          id: this.strategyId,
          symbol: row.symbol,
          side: row.side,
          action
        })
        showToast({ message: this.$t('trading.position_ownership_repair_success'), type: 'success' })
        const [positions] = await Promise.all([
          strategyApi.getPositions(this.strategyId),
          this.loadOwnership(false)
        ])
        this.positions = positions?.data || []
      } catch (error) {
        showToast({ message: this.$t('trading.position_ownership_repair_failed'), type: 'fail' })
      } finally {
        this.ownershipRepairKey = ''
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
    rawLogText(item) {
      if (typeof item === 'string') return item
      return String(item?.message || item?.content || item?.event_type || '')
    },
    logSummary(item) {
      const raw = this.rawLogText(item)
      const text = raw.toLowerCase()
      if (/(position ownership drift|position_drift_detected|account and strategy positions differ)/.test(text)) {
        const readQty = (name) => {
          const match = raw.match(new RegExp(`${name}\\s*[=:]\\s*(-?[\\d.e+-]+)`, 'i'))
          return match ? this.ownershipQty(match[1]) : '-'
        }
        const quantities = ['account', 'strategy', 'protected', 'unknown'].reduce((result, name) => {
          result[name] = readQty(name)
          return result
        }, {})
        if (Object.values(quantities).some((value) => value !== '-')) {
          return this.$t('trading.position_ownership_log', quantities)
        }
        return this.$t('trading.position_ownership_drift_event')
      }
      if (/(open_long|enter_long|buy signal)/.test(text)) return this.$t('trading.event_open_long')
      if (/(open_short|enter_short|sell signal)/.test(text)) return this.$t('trading.event_open_short')
      if (/(close_long|exit_long)/.test(text)) return this.$t('trading.event_close_long')
      if (/(close_short|exit_short)/.test(text)) return this.$t('trading.event_close_short')
      if (/(pending_order|order pending)/.test(text)) return this.$t('trading.event_order_pending')
      if (/(error|failed|exception)/.test(text)) return this.$t('trading.event_run_error')
      return raw || this.$t('trading.no_recent_event')
    },
    edit() {
      this.$router.push({ path: '/trading/create/configure', query: { edit: this.strategyId } })
    },
    async start() {
      if (this.hasOpenExposure) {
        try {
          await showConfirmDialog({
            title: this.$t('trading.restart_with_position_title'),
            message: this.$t('trading.restart_with_position_msg', { count: this.positions.length })
          })
        } catch {
          return
        }
      }
      this.actionLoading = true
      try {
        await strategyApi.start(this.strategyId)
        showToast({ message: this.$t('trading.start_success'), type: 'success' })
        await this.load()
      } finally {
        this.actionLoading = false
      }
    },
    async requestStop() {
      if (this.isLiveStrategy) {
        this.showStopActions = true
        return
      }
      await this.confirmStop(false)
    },
    async onStopAction(action) {
      this.showStopActions = false
      await this.confirmStop(Boolean(action?.closePositions))
    },
    async confirmStop(closePositions) {
      try {
        await showConfirmDialog({
          title: this.$t(closePositions ? 'trading.confirm_stop_close_title' : 'trading.confirm_stop_title'),
          message: this.$t(closePositions ? 'trading.confirm_stop_close_msg' : 'trading.confirm_stop_msg')
        })
      } catch (error) {
        return
      }
      this.actionLoading = true
      try {
        await strategyApi.stop(this.strategyId, closePositions)
        showToast({
          message: this.$t(closePositions ? 'trading.stop_close_success' : 'trading.stop_success'),
          type: 'success'
        })
        await this.load()
      } finally {
        this.actionLoading = false
      }
    },
    async remove() {
      if (this.hasOpenExposure) {
        showToast({ message: this.$t('trading.delete_blocked_exposure'), type: 'fail' })
        return
      }
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
.page {
  min-height: 100vh;
  padding-bottom: calc(160px + var(--safe-area-bottom, 0px));
  color: var(--text);
}
:deep(.van-nav-bar), :deep(.van-tabs__nav) { background: var(--bg); }
:deep(.van-nav-bar__title), :deep(.van-nav-bar .van-icon), :deep(.van-tab) { color: var(--text); }
.loading { margin-top: 80px; color: var(--text-2); }
.summary-card, .panel {
  margin: 12px var(--page-gutter);
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.risk-card {
  width: auto;
  min-height: 72px;
  margin: 0 var(--page-gutter) 12px;
  padding: 13px 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid color-mix(in srgb, var(--down) 44%, var(--border));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--down) 10%, var(--bg-elevated));
  color: var(--down);
  text-align: left;
}
.risk-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
  background: var(--down-soft);
  font-size: 19px;
}
.risk-copy { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.risk-copy strong { color: var(--text); font-size: 14px; }
.risk-copy small { color: var(--text-2); font-size: 12px; line-height: 1.4; }
.overview-panel { display: flex; flex-direction: column; gap: 18px; }
.overview-section { display: flex; flex-direction: column; gap: 10px; }
.section-heading { color: var(--text); font-size: 14px; font-weight: 800; }
.attention-row {
  min-height: 48px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  font-size: 12px;
}
.attention-row span { flex: 1; }
.attention-row button { border: 0; background: transparent; color: inherit; font-weight: 800; }
.attention-row.danger { color: var(--down); background: var(--down-soft); }
.attention-row.safe { color: var(--up); background: var(--up-soft); }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.overview-grid div { min-width: 0; padding: 11px; border-radius: 12px; background: var(--bg); }
.overview-grid span, .overview-grid strong { display: block; }
.overview-grid span { color: var(--text-2); font-size: 11px; }
.overview-grid strong {
  margin-top: 5px;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.ownership-entry {
  width: 100%;
  min-height: 66px;
  margin-bottom: 14px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  text-align: left;
}
.ownership-entry.danger {
  border-color: color-mix(in srgb, var(--down) 45%, var(--border));
  background: color-mix(in srgb, var(--down) 8%, var(--bg));
}
.ownership-entry-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.ownership-entry-copy strong { font-size: 13px; }
.ownership-entry-copy small { color: var(--text-2); font-size: 11px; line-height: 1.4; }
.ownership-state {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  color: var(--up);
  background: var(--up-soft);
  font-size: 10px;
  font-weight: 800;
}
.ownership-state.danger { color: var(--down); background: var(--down-soft); }
.row-list { display: flex; flex-direction: column; gap: 12px; }
.data-row { padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.record { display: grid; gap: 8px; padding: 12px; border-radius: var(--radius-sm); background: var(--bg); }
.record time { color: var(--text-3); font-size: 11px; text-align: right; }
.grid-sync-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.grid-sync-head > div { display: flex; flex-direction: column; gap: 4px; }
.grid-sync-head small { color: var(--text-2); font-size: 11px; line-height: 1.4; }
.grid-order-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.grid-order-kpis div { padding: 9px; border-radius: 10px; background: var(--bg); }
.grid-order-kpis span, .grid-order-kpis strong { display: block; }
.grid-order-kpis span { color: var(--text-2); font-size: 10px; }
.grid-order-kpis strong { margin-top: 4px; }
.grid-order-kpis .danger strong, .grid-order-card code.missing { color: var(--down); }
.grid-order-card code { max-width: 62%; color: var(--primary); font-size: 10px; text-align: right; word-break: break-all; }
.profit { color: var(--up) !important; }
.loss { color: var(--down) !important; }
.log-row { padding: 10px 0; border-bottom: 1px solid var(--border); }
.log-row span { color: var(--text-3); font-size: 11px; }
.log-row p { margin: 5px 0 0; color: var(--text); word-break: break-word; }
.log-row details { margin-top: 8px; color: var(--text-3); font-size: 11px; }
.log-row summary { min-height: 28px; cursor: pointer; }
.log-row code { display: block; padding: 9px; border-radius: 8px; background: var(--bg); white-space: pre-wrap; word-break: break-word; }
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--shell-tabbar-height, calc(62px + var(--safe-area-bottom, 0px)));
  display: flex;
  gap: 8px;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .16);
  z-index: 90;
}
.actions :deep(.van-button) { flex: 1; }
.ownership-sheet {
  max-height: min(82vh, 720px);
  padding: 0 16px calc(18px + env(safe-area-inset-bottom));
  overflow-y: auto;
  background: var(--bg-elevated);
  color: var(--text);
}
.ownership-sheet-head {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0 -16px;
  padding: 18px 16px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-elevated);
}
.ownership-sheet-head > div { display: flex; flex-direction: column; gap: 4px; }
.ownership-sheet-head strong { font-size: 17px; }
.ownership-sheet-head small { color: var(--text-2); font-size: 11px; }
.ownership-sheet-head button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-2);
  font-size: 18px;
}
.ownership-risk-note {
  margin-bottom: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 10px;
  color: var(--down);
  background: var(--down-soft);
  font-size: 11px;
  line-height: 1.5;
}
.ownership-loading { padding: 44px 0; color: var(--text-2); }
.ownership-list { display: flex; flex-direction: column; gap: 12px; }
.ownership-card {
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
}
.ownership-card-head, .ownership-card-head > div, .ownership-meta, .ownership-actions {
  display: flex;
  align-items: center;
}
.ownership-card-head { justify-content: space-between; gap: 10px; }
.ownership-card-head > div { gap: 7px; }
.ownership-card-head > div span { color: var(--text-2); font-size: 11px; }
.ownership-qty-grid { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ownership-qty-grid div { min-width: 0; padding: 9px; border-radius: 9px; background: var(--bg-elevated); }
.ownership-qty-grid span, .ownership-qty-grid strong { display: block; }
.ownership-qty-grid span { color: var(--text-3); font-size: 10px; }
.ownership-qty-grid strong { margin-top: 4px; overflow-wrap: anywhere; font-size: 12px; }
.ownership-meta { margin-top: 10px; justify-content: space-between; color: var(--text-2); font-size: 11px; }
.ownership-meta strong { color: var(--text); }
.ownership-updated { display: block; margin-top: 5px; color: var(--text-3); font-size: 10px; }
.ownership-actions { margin-top: 12px; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
</style>
