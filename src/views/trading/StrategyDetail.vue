<template>
  <div class="detail-page">
    <van-nav-bar
      :title="strategy?.name || $t('trading.title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon name="replay" @click="refreshData" />
      </template>
    </van-nav-bar>

    <div v-if="strategy" class="content">
      <!-- Header -->
      <div class="hero">
        <div class="hero-top">
          <div class="hero-avatar" :style="avatarStyle">
            <van-icon :name="botTypeIcon" />
          </div>
          <div class="hero-text">
            <div class="hero-title">{{ strategy.name }}</div>
            <div class="hero-tags">
              <span :class="['tag', 'status', strategy.status]">{{ statusText }}</span>
              <span v-if="botTypeLabel" class="tag type">{{ botTypeLabel }}</span>
              <span v-if="tc.symbol" class="tag neutral">{{ tc.symbol }}</span>
              <span v-if="exchangeName" class="tag neutral">{{ exchangeName }}</span>
            </div>
          </div>
        </div>

        <!-- Quick metrics -->
        <div class="hero-metrics">
          <div class="metric">
            <span class="label">{{ $t('trading.total_pnl') }}</span>
            <span :class="['value', pnlValue >= 0 ? 'profit' : 'loss']">
              {{ formatSigned(pnlValue) }}
            </span>
          </div>
          <div class="metric">
            <span class="label">{{ $t('trading.win_rate') }}</span>
            <span class="value">{{ formatPercentValue(perfMetrics.winRate) }}</span>
          </div>
          <div class="metric">
            <span class="label">{{ $t('trading.total_trades') }}</span>
            <span class="value">{{ perfMetrics.totalTrades || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Action bar -->
      <div class="action-bar">
        <van-button
          v-if="strategy.status === 'running'"
          class="action-btn stop"
          block
          type="danger"
          :loading="actionLoading"
          @click="stopStrategy"
        >
          <van-icon name="pause-circle-o" />
          {{ $t('trading.action_stop') }}
        </van-button>
        <van-button
          v-else
          class="action-btn start"
          block
          type="primary"
          :loading="actionLoading"
          @click="startStrategy"
        >
          <van-icon name="play-circle-o" />
          {{ $t('trading.action_start') }}
        </van-button>
        <van-button
          class="action-btn ghost"
          plain
          :disabled="strategy.status === 'running'"
          @click="handleDelete"
        >
          <van-icon name="delete-o" />
        </van-button>
      </div>

      <!-- Tabs -->
      <van-tabs
        v-model:active="activeTab"
        type="line"
        shrink
        class="detail-tabs"
        background="transparent"
      >
        <van-tab :title="$t('trading.tab_params')" name="params">
          <div class="tab-body">
            <div class="section">
              <div class="section-title">
                <van-icon name="setting-o" />
                {{ $t('bot_create.base_config') }}
              </div>
              <div class="grid">
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.symbol') }}</span>
                  <span class="g-value">{{ tc.symbol || '-' }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.market_type') }}</span>
                  <span class="g-value">
                    {{ tc.market_type === 'swap' ? $t('trading.market_futures') : $t('trading.market_spot') }}
                  </span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.timeframe') }}</span>
                  <span class="g-value">{{ tc.timeframe || '-' }}</span>
                </div>
                <div v-if="tc.market_type === 'swap'" class="grid-item">
                  <span class="g-label">{{ $t('trading.leverage') }}</span>
                  <span class="g-value highlight">{{ tc.leverage || 1 }}x</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ capitalLabel }}</span>
                  <span class="g-value highlight">{{ formatNumber(tc.initial_capital) }} USDT</span>
                </div>
                <div v-if="tc.trade_direction || tc.direction" class="grid-item">
                  <span class="g-label">{{ $t('trading.direction') }}</span>
                  <span class="g-value">{{ directionLabel }}</span>
                </div>
                <div v-if="tc.order_mode" class="grid-item">
                  <span class="g-label">{{ $t('bot_create.grid_order_mode') }}</span>
                  <span class="g-value">{{ orderModeLabel }}</span>
                </div>
              </div>
            </div>

            <div v-if="strategyParamItems.length" class="section">
              <div class="section-title">
                <van-icon name="bars" />
                {{ $t('trading.strategy_params') }}
              </div>
              <div class="grid">
                <div v-for="p in strategyParamItems" :key="p.key" class="grid-item">
                  <span class="g-label">{{ p.label }}</span>
                  <span class="g-value">{{ p.value }}</span>
                </div>
              </div>
            </div>

            <div v-if="riskParamItems.length" class="section">
              <div class="section-title">
                <van-icon name="shield-o" />
                {{ $t('trading.risk_params') }}
              </div>
              <div class="grid">
                <div v-for="p in riskParamItems" :key="p.key" class="grid-item">
                  <span class="g-label">{{ p.label }}</span>
                  <span :class="['g-value', 'highlight', riskValueClass(p.key)]">{{ p.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </van-tab>

        <van-tab :title="$t('trading.tab_positions')" name="positions">
          <div class="tab-body">
            <div v-if="positions.length" class="list">
              <div v-for="item in positions" :key="(item.symbol || '') + (item.side || '')" class="card">
                <div class="card-head">
                  <div class="card-title">{{ item.symbol || '-' }}</div>
                  <span :class="['side-tag', sideClass(item.side)]">{{ sideLabel(item.side) }}</span>
                </div>
                <div class="card-grid">
                  <div><span class="k">{{ $t('trading.size') }}</span><span class="v">{{ formatNumber(item.size || item.position_size) }}</span></div>
                  <div><span class="k">{{ $t('trading.entry_price') }}</span><span class="v">{{ formatNumber(item.entry_price || item.avg_entry_price) }}</span></div>
                  <div><span class="k">{{ $t('trading.mark_price') }}</span><span class="v">{{ formatNumber(item.mark_price || item.current_price) }}</span></div>
                  <div>
                    <span class="k">{{ $t('trading.pnl') }}</span>
                    <span :class="['v', Number(item.unrealized_pnl || item.pnl || 0) >= 0 ? 'profit' : 'loss']">
                      {{ formatSigned(item.unrealized_pnl || item.pnl || 0) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_positions')" />
          </div>
        </van-tab>

        <van-tab :title="$t('trading.tab_trades')" name="trades">
          <div class="tab-body">
            <div v-if="trades.length" class="list">
              <div v-for="item in trades" :key="item.id" class="card compact">
                <div class="card-head">
                  <div>
                    <div class="card-title">{{ item.symbol || tc.symbol || '-' }}</div>
                    <div class="card-sub">{{ formatTime(item.created_at || item.time || item.timestamp) }}</div>
                  </div>
                  <div class="head-right">
                    <span :class="['side-tag', tradeTypeClass(item.type)]">{{ tradeTypeLabel(item.type) }}</span>
                    <span
                      v-if="hasProfit(item)"
                      :class="['pnl', Number(item.profit) >= 0 ? 'profit' : 'loss']"
                    >
                      {{ formatSigned(item.profit) }}
                    </span>
                  </div>
                </div>
                <div class="card-grid three">
                  <div><span class="k">{{ $t('trading.trade_price') }}</span><span class="v">${{ formatPrice(item.price) }}</span></div>
                  <div><span class="k">{{ $t('trading.size') }}</span><span class="v">{{ formatAmount(item.amount) }}</span></div>
                  <div><span class="k">{{ $t('trading.trade_value') }}</span><span class="v">${{ formatNumber(tradeValue(item)) }}</span></div>
                </div>
                <div v-if="item.commission != null && item.commission !== ''" class="trade-fee">
                  {{ $t('trading.trade_commission') }}:
                  {{ formatNumber(item.commission) }}{{ item.commission_ccy ? (' ' + item.commission_ccy) : '' }}
                </div>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_trades')" />
          </div>
        </van-tab>

        <van-tab :title="$t('trading.tab_performance')" name="performance">
          <div class="tab-body">
            <div class="section perf-summary">
              <div class="grid">
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.total_return') }}</span>
                  <span :class="['g-value', perfMetrics.totalReturn >= 0 ? 'profit' : 'loss']">{{ formatPercentValue(perfMetrics.totalReturn) }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.annual_return') }}</span>
                  <span :class="['g-value', perfMetrics.annualReturn >= 0 ? 'profit' : 'loss']">{{ formatPercentValue(perfMetrics.annualReturn) }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.max_drawdown') }}</span>
                  <span class="g-value loss">{{ formatPercentValue(perfMetrics.maxDrawdown) }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.sharpe_ratio') }}</span>
                  <span class="g-value">{{ perfMetrics.sharpe != null ? Number(perfMetrics.sharpe).toFixed(2) : '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.win_rate') }}</span>
                  <span class="g-value">{{ formatPercentValue(perfMetrics.winRate) }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.profit_factor') }}</span>
                  <span class="g-value">{{ perfMetrics.profitFactor != null ? Number(perfMetrics.profitFactor).toFixed(2) : '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.total_trades') }}</span>
                  <span class="g-value">{{ perfMetrics.totalTrades || 0 }}</span>
                </div>
                <div class="grid-item">
                  <span class="g-label">{{ $t('trading.running_days') }}</span>
                  <span class="g-value">{{ perfMetrics.runningDays || 0 }}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">
                <van-icon name="chart-trending-o" />
                {{ $t('trading.equity_curve') }}
              </div>
              <div v-if="equityCurve.length > 1">
                <svg class="equity-svg" :viewBox="equityViewBox" preserveAspectRatio="none">
                  <path :d="equityPath" fill="none" :stroke="equityColor" stroke-width="1.6" />
                  <path :d="equityAreaPath" :fill="equityFillColor" />
                </svg>
                <div class="equity-foot">
                  <span>{{ formatDate(equityCurve[0]?.time) }}</span>
                  <span>{{ formatDate(equityCurve[equityCurve.length - 1]?.time) }}</span>
                </div>
              </div>
              <van-empty v-else :description="$t('trading.no_equity')" />
            </div>
          </div>
        </van-tab>

        <van-tab :title="$t('trading.tab_logs')" name="logs">
          <div class="tab-body">
            <div v-if="logs.length" class="log-list">
              <div
                v-for="log in logs"
                :key="log.id"
                :class="['log-row', logLevelClass(log.level)]"
              >
                <span class="log-level">{{ String(log.level || '').toUpperCase() }}</span>
                <span class="log-msg">{{ log.message }}</span>
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              </div>
            </div>
            <van-empty v-else :description="$t('trading.no_logs')" />
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <van-loading v-if="loading && !strategy" class="page-loading" vertical>{{ $t('common.loading') }}</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { strategyApi, credentialsApi } from '@/api'

const BOT_ICONS = {
  grid: 'apps-o',
  martingale: 'refund-o',
  trend: 'chart-trending-o',
  dca: 'add-o',
  indicator: 'bars',
  ai: 'fire-o'
}

/** bot_params 字段（camelCase）→ 移动端 i18n key */
const PARAM_LABEL_MAP = {
  upperPrice: 'bot_create.upper_price',
  lowerPrice: 'bot_create.lower_price',
  gridCount: 'bot_create.grid_count',
  amountPerGrid: 'bot_create.amount_per_grid',
  gridMode: 'bot_create.grid_mode',
  gridDirection: 'bot_create.grid_direction',
  orderMode: 'bot_create.grid_order_mode',
  referencePrice: 'trading.ref_price',
  initialAmount: 'bot_create.initial_amount',
  multiplier: 'bot_create.multiplier',
  maxLayers: 'bot_create.max_layers',
  priceDropPct: 'bot_create.price_drop_pct',
  takeProfitPct: 'bot_create.take_profit_pct',
  stopLossPct: 'bot_create.stop_loss_pct',
  direction: 'bot_create.direction',
  maPeriod: 'bot_create.ma_period',
  maType: 'bot_create.ma_type',
  confirmBars: 'bot_create.confirm_bars',
  positionPct: 'bot_create.position_pct',
  amountEach: 'bot_create.amount_each',
  frequency: 'bot_create.frequency',
  totalBudget: 'bot_create.total_budget',
  dipBuyEnabled: 'bot_create.dca_dip_buy',
  dipThreshold: 'bot_create.dca_dip_threshold'
}

/** 枚举值 → 移动端 i18n key */
const VALUE_DISPLAY_MAP = {
  gridMode: {
    arithmetic: 'bot_create.grid_mode_arithmetic',
    geometric: 'bot_create.grid_mode_geometric'
  },
  gridDirection: {
    neutral: 'bot_create.grid_direction_neutral',
    long: 'bot_create.grid_direction_long',
    short: 'bot_create.grid_direction_short'
  },
  orderMode: {
    maker: 'bot_create.grid_order_maker',
    market: 'bot_create.grid_order_market'
  }
}

/** 后端 bot_display.label_key（PC 前端命名空间）→ 移动端 i18n key */
const PC_LABEL_KEY_MAP = {
  'trading-bot.grid.upperPrice': 'bot_create.upper_price',
  'trading-bot.grid.lowerPrice': 'bot_create.lower_price',
  'trading-bot.grid.gridCount': 'bot_create.grid_count',
  'trading-bot.grid.amountPerGrid': 'bot_create.amount_per_grid',
  'trading-bot.grid.mode': 'bot_create.grid_mode',
  'trading-bot.grid.direction': 'bot_create.grid_direction',
  'trading-bot.grid.orderType': 'bot_create.grid_order_mode',
  'trading-bot.grid.arithmetic': 'bot_create.grid_mode_arithmetic',
  'trading-bot.grid.geometric': 'bot_create.grid_mode_geometric',
  'trading-bot.grid.neutral': 'bot_create.grid_direction_neutral',
  'trading-bot.grid.long': 'bot_create.grid_direction_long',
  'trading-bot.grid.short': 'bot_create.grid_direction_short',
  'trading-bot.grid.limitOrder': 'bot_create.grid_order_maker',
  'trading-bot.grid.marketOrder': 'bot_create.grid_order_market',
  'trading-bot.martingale.initialAmount': 'bot_create.initial_amount',
  'trading-bot.martingale.initialAmountAuto': 'bot_create.martingale_first_order',
  'trading-bot.martingale.multiplier': 'bot_create.multiplier',
  'trading-bot.martingale.maxLayers': 'bot_create.max_layers',
  'trading-bot.martingale.priceDropPct': 'bot_create.price_drop_pct',
  'trading-bot.martingale.priceDropTrigger': 'bot_create.price_drop_pct',
  'trading-bot.martingale.takeProfitPct': 'bot_create.take_profit_pct',
  'trading-bot.martingale.avgEntryTakeProfit': 'bot_create.martingale_take_profit_pct',
  'trading-bot.martingale.avgEntryStopLoss': 'bot_create.martingale_stop_loss_pct',
  'trading-bot.martingale.direction': 'bot_create.direction',
  'trading-bot.martingale.totalBudget': 'bot_create.martingale_total_budget',
  'trading-bot.martingale.maxDailyLossAdvanced': 'bot_create.max_daily_loss',
  'trading-bot.martingale.long': 'bot_create.direction_long',
  'trading-bot.martingale.short': 'bot_create.direction_short',
  'trading-bot.trend.maPeriod': 'bot_create.ma_period',
  'trading-bot.trend.maType': 'bot_create.ma_type',
  'trading-bot.trend.confirmBars': 'bot_create.confirm_bars',
  'trading-bot.trend.positionPct': 'bot_create.position_pct',
  'trading-bot.trend.longOnly': 'bot_create.direction_long',
  'trading-bot.trend.shortOnly': 'bot_create.direction_short',
  'trading-bot.trend.bothSides': 'bot_create.direction_both',
  'trading-bot.dca.amountEach': 'bot_create.amount_each',
  'trading-bot.dca.frequency': 'bot_create.frequency',
  'trading-bot.dca.totalBudget': 'bot_create.total_budget',
  'trading-bot.dca.dipBuy': 'bot_create.dca_dip_buy',
  'trading-bot.dca.dipThreshold': 'bot_create.dca_dip_threshold',
  'trading-bot.risk.stopLossPct': 'bot_create.stop_loss_pct',
  'trading-bot.risk.takeProfitPct': 'bot_create.take_profit_pct',
  'trading-bot.risk.maxPosition': 'bot_create.max_position',
  'trading-bot.risk.maxDailyLoss': 'bot_create.max_daily_loss',
  'trading-bot.wizard.initialCapital': 'bot_create.initial_capital',
  'trading-bot.detail.gridRefPrice': 'trading.ref_price',
  'trading-bot.common.enabled': 'trading.enabled',
  'trading-bot.common.disabled': 'trading.disabled'
}

/** frequency 枚举 → 显示文案 key；找不到则显示原值 */
const FREQUENCY_MAP = {
  every_bar: 'trading.freq_every_bar',
  hourly: 'trading.freq_hourly',
  '4h': '4H',
  daily: 'trading.freq_daily',
  weekly: 'trading.freq_weekly',
  biweekly: 'trading.freq_biweekly',
  monthly: 'trading.freq_monthly'
}

const EXCHANGE_NAME_MAP = {
  binance: 'Binance',
  bybit: 'Bybit',
  gate: 'Gate.io',
  okx: 'OKX',
  htx: 'HTX',
  bitget: 'Bitget',
  kucoin: 'KuCoin'
}

/** 风控参数格式化帮助 */
const RISK_PCT_KEYS = new Set(['stopLossPct', 'takeProfitPct'])
const RISK_USDT_KEYS = new Set(['maxPosition', 'maxDailyLoss'])

/** 成交记录 type 字段 → 显示标签 i18n key */
const TRADE_TYPE_LABEL = {
  open_long: 'trading.trade_open_long',
  add_long: 'trading.trade_add_long',
  close_long: 'trading.trade_close_long',
  close_long_stop: 'trading.trade_close_long_stop',
  close_long_profit: 'trading.trade_close_long_profit',
  close_long_trailing: 'trading.trade_close_long_trailing',
  reduce_long: 'trading.trade_reduce_long',
  open_short: 'trading.trade_open_short',
  add_short: 'trading.trade_add_short',
  close_short: 'trading.trade_close_short',
  close_short_stop: 'trading.trade_close_short_stop',
  close_short_profit: 'trading.trade_close_short_profit',
  close_short_trailing: 'trading.trade_close_short_trailing',
  reduce_short: 'trading.trade_reduce_short',
  liquidation: 'trading.trade_liquidation',
  buy: 'trading.side_long',
  sell: 'trading.side_short',
  long: 'trading.side_long',
  short: 'trading.side_short'
}

export default {
  name: 'StrategyDetail',

  data() {
    return {
      strategy: null,
      positions: [],
      trades: [],
      performance: {},
      equityCurve: [],
      logs: [],
      credentials: [],
      loading: false,
      actionLoading: false,
      activeTab: 'params'
    }
  },

  computed: {
    strategyId() {
      return this.$route.params.id
    },
    tc() {
      return this.strategy?.trading_config || {}
    },
    ic() {
      return this.strategy?.indicator_config || {}
    },
    ec() {
      return this.strategy?.exchange_config || {}
    },
    botParams() {
      return this.tc.bot_params || {}
    },
    botDisplay() {
      return this.strategy?.bot_display || {}
    },
    botType() {
      return (
        this.strategy?.bot_type ||
        this.tc.bot_type ||
        this.botDisplay.bot_type ||
        this.strategy?.strategy_mode ||
        this.strategy?.type ||
        'indicator'
      )
    },
    isMartingaleBot() {
      return this.botType === 'martingale'
    },
    botTypeIcon() {
      return BOT_ICONS[this.botType] || 'setting-o'
    },
    botTypeLabel() {
      const map = {
        grid: 'bot_create.type_grid',
        martingale: 'bot_create.type_martingale',
        trend: 'bot_create.type_trend',
        dca: 'bot_create.type_dca',
        indicator: 'trading.indicator'
      }
      const key = map[this.botType]
      if (!key) return this.botType === 'ai' ? 'AI' : this.botType
      const text = this.$t(key)
      return text === key ? this.botType : text
    },
    capitalLabel() {
      const pcKey = this.botDisplay?.capital_label_key
      if (pcKey && PC_LABEL_KEY_MAP[pcKey]) return this.$t(PC_LABEL_KEY_MAP[pcKey])
      if (this.isMartingaleBot) return this.$t('bot_create.martingale_total_budget')
      return this.$t('bot_create.initial_capital')
    },
    orderModeLabel() {
      const mode = this.tc.order_mode
      if (!mode) return ''
      const key = VALUE_DISPLAY_MAP.orderMode[mode]
      return key ? this.$t(key) : mode
    },
    avatarStyle() {
      const gradients = {
        grid: 'linear-gradient(135deg,#667eea,#764ba2)',
        martingale: 'linear-gradient(135deg,#fc4a1a,#f7b733)',
        trend: 'linear-gradient(135deg,#11998e,#38ef7d)',
        dca: 'linear-gradient(135deg,#4facfe,#00f2fe)',
        indicator: 'linear-gradient(135deg,#7c5cff,#22d3ee)',
        ai: 'linear-gradient(135deg,#fc466b,#3f5efb)'
      }
      return { background: gradients[this.botType] || gradients.indicator }
    },
    statusText() {
      return this.$t(`trading.${this.strategy?.status || 'stopped'}`)
    },
    exchangeName() {
      const id = this.ec.exchange_id || this.ec.credential_id || this.strategy?.credential_id
      if (!id) return ''
      const hit = this.credentials.find((c) => String(c.id) === String(id))
      if (hit) return hit.label || hit.name || hit.exchange_id
      const key = String(id).toLowerCase()
      return EXCHANGE_NAME_MAP[key] || id
    },
    pnlValue() {
      return Number(
        this.strategy?.total_pnl ??
          this.performance.total_profit ??
          this.performance.total_pnl ??
          this.strategy?.performance?.total_pnl ??
          this.strategy?.realized_pnl ??
          0
      )
    },
    /**
     * 基于 equityCurve + trades 本地计算业绩指标（对齐 PC PerformanceAnalysis）
     * 返回：{ totalReturn, annualReturn, maxDrawdown, sharpe, winRate, profitFactor, totalTrades, runningDays }
     */
    perfMetrics() {
      const data = (this.equityCurve || [])
        .map((d) => ({
          time: Number(d.time != null ? d.time : d.timestamp || 0),
          equity: Number(d.equity != null ? d.equity : d.value != null ? d.value : d.y || 0)
        }))
        .filter((d) => d.time > 0)
        .sort((a, b) => a.time - b.time)
      const out = {
        totalReturn: 0,
        annualReturn: 0,
        maxDrawdown: 0,
        sharpe: null,
        winRate: 0,
        profitFactor: null,
        totalTrades: (this.trades || []).length,
        runningDays: 0
      }
      if (data.length) {
        const equities = data.map((d) => d.equity)
        const initial = equities[0] || 1
        const final = equities[equities.length - 1] || initial
        out.totalReturn = initial > 0 ? (final - initial) / initial : 0

        let maxPeak = equities[0]
        let maxDd = 0
        for (let i = 0; i < equities.length; i++) {
          if (equities[i] > maxPeak) maxPeak = equities[i]
          const peak = maxPeak > 0 ? maxPeak : 1e-9
          const dd = (equities[i] - peak) / peak
          if (dd < maxDd) maxDd = dd
        }
        out.maxDrawdown = maxDd

        const times = data.map((d) => d.time).filter((t) => t > 0)
        let runningDays = 1
        if (times.length >= 1) {
          const spanSec = Math.max(...times) - Math.min(...times)
          runningDays = Math.max(1, Math.ceil(spanSec / 86400))
        }
        out.runningDays = runningDays

        const years = runningDays / 365.0
        if (initial > 0 && final > 0 && years > 1e-6) {
          out.annualReturn = years >= 1
            ? Math.pow(final / initial, 1 / years) - 1
            : out.totalReturn * (365 / Math.max(runningDays, 1))
        }

        const stepRets = []
        for (let i = 1; i < data.length; i++) {
          const prev = equities[i - 1]
          const cur = equities[i]
          const denom = prev > 0 ? prev : 1e-9
          stepRets.push((cur - prev) / denom)
        }
        if (stepRets.length > 1) {
          const avg = stepRets.reduce((a, b) => a + b, 0) / stepRets.length
          const variance = stepRets.reduce((s, r) => s + (r - avg) ** 2, 0) / (stepRets.length - 1)
          const std = Math.sqrt(variance)
          out.sharpe = std > 0 ? (avg / std) * Math.sqrt(Math.min(252, Math.max(stepRets.length, 1))) : 0
        }
      }

      const settled = (this.trades || []).filter((t) => {
        const ty = String(t.type || '').toLowerCase()
        if (ty.startsWith('open') || ty.startsWith('add')) return false
        const p = this.pickTradeProfit(t)
        return p !== null
      })
      const profits = settled
        .map((t) => parseFloat(this.pickTradeProfit(t)))
        .filter((n) => !isNaN(n))
      const wins = profits.filter((p) => p > 0).length
      const losses = profits.filter((p) => p < 0).length
      const decided = wins + losses
      out.winRate = decided > 0 ? wins / decided : 0
      let gp = 0
      let gl = 0
      profits.forEach((p) => {
        if (p > 0) gp += p
        if (p < 0) gl += Math.abs(p)
      })
      out.profitFactor = gl > 0 ? gp / gl : gp > 0 ? 99 : null
      return out
    },
    directionLabel() {
      const d = (this.tc.trade_direction || this.tc.direction || this.tc.side || '').toString().toLowerCase()
      if (this.botType === 'trend') {
        if (d === 'long') return this.$t('bot_create.direction_long')
        if (d === 'short') return this.$t('bot_create.direction_short')
        if (d === 'both') return this.$t('bot_create.direction_both')
      }
      if (d === 'long' || d === 'buy') return this.$t('trading.side_long')
      if (d === 'short' || d === 'sell') return this.$t('trading.side_short')
      if (d === 'neutral') return this.$t('bot_create.grid_direction_neutral')
      return d || '-'
    },
    /**
     * 策略参数：优先使用后端 bot_display.strategy_params（已结构化），
     * 否则用 trading_config.bot_params，最后 fallback 到 indicator_config.params。
     */
    strategyParamItems() {
      const backendItems = Array.isArray(this.botDisplay?.strategy_params) ? this.botDisplay.strategy_params : null
      if (backendItems && backendItems.length) {
        return backendItems.map((item) => ({
          key: item.key,
          label: this.resolveLabelKey(item.label_key, item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      const bp = this.botParams
      if (bp && typeof bp === 'object' && Object.keys(bp).length > 0) {
        const skip = new Set(['orderMode', 'timeframe'])
        return Object.entries(bp)
          .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
          .map(([k, v]) => ({
            key: k,
            label: this.paramLabel(k),
            value: this.formatParamValue(k, v)
          }))
      }
      const params = this.ic?.params || this.ic?.indicator_params || this.strategy?.params || {}
      if (!params || typeof params !== 'object') return []
      return Object.entries(params).map(([k, v]) => ({
        key: k,
        label: this.prettyKey(k),
        value: this.prettyVal(v)
      }))
    },
    /**
     * 风险参数：优先 bot_display.risk_params，否则从 trading_config 直取
     * （stop_loss_pct / take_profit_pct / max_position / max_daily_loss）。
     */
    riskParamItems() {
      const backendItems = Array.isArray(this.botDisplay?.risk_params) ? this.botDisplay.risk_params : null
      if (backendItems && backendItems.length) {
        return backendItems.map((item) => ({
          key: item.key,
          label: this.resolveLabelKey(item.label_key, item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      const fallback = []
      const tc = this.tc
      const isM = this.isMartingaleBot
      if (!isM && tc.stop_loss_pct) {
        fallback.push({ key: 'stopLossPct', label: this.$t('bot_create.stop_loss_pct'), value: `${this.formatNumber(tc.stop_loss_pct)}%` })
      }
      if (!isM && tc.take_profit_pct) {
        fallback.push({ key: 'takeProfitPct', label: this.$t('bot_create.take_profit_pct'), value: `${this.formatNumber(tc.take_profit_pct)}%` })
      }
      if (!isM && tc.max_position) {
        fallback.push({ key: 'maxPosition', label: this.$t('bot_create.max_position'), value: `${this.formatNumber(tc.max_position)} USDT` })
      }
      if (tc.max_daily_loss) {
        fallback.push({ key: 'maxDailyLoss', label: this.$t('bot_create.max_daily_loss'), value: `${this.formatNumber(tc.max_daily_loss)} USDT` })
      }
      return fallback
    },
    equityViewBox() {
      return '0 0 300 100'
    },
    equityPath() {
      if (this.equityCurve.length < 2) return ''
      const values = this.equityCurve.map((p) => Number(p.equity || 0))
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = max - min || 1
      const step = 300 / (values.length - 1)
      return values
        .map((v, i) => {
          const x = i * step
          const y = 100 - ((v - min) / span) * 90 - 5
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
        })
        .join(' ')
    },
    equityAreaPath() {
      if (!this.equityPath) return ''
      return `${this.equityPath} L300,100 L0,100 Z`
    },
    equityColor() {
      return this.pnlValue >= 0 ? '#34c759' : '#ff5f57'
    },
    equityFillColor() {
      return this.pnlValue >= 0 ? 'rgba(52,199,89,0.12)' : 'rgba(255,95,87,0.12)'
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [detailRes, credRes] = await Promise.allSettled([
          strategyApi.getDetail(this.strategyId),
          credentialsApi.list()
        ])
        if (detailRes.status === 'fulfilled') {
          this.strategy = detailRes.value?.data || null
          this.performance = this.strategy?.performance || {}
        }
        if (credRes.status === 'fulfilled') {
          this.credentials = credRes.value?.data || []
        }
        await Promise.allSettled([
          this.loadPositions(),
          this.loadTrades(),
          this.loadPerformance(),
          this.loadLogs()
        ])
      } catch (error) {
        console.error('Load strategy detail failed:', error)
        showToast({ message: this.$t('common.error_network') || 'Error', type: 'fail' })
      } finally {
        this.loading = false
      }
    },
    async loadPositions() {
      try {
        const res = await strategyApi.getPositions(this.strategyId)
        this.positions = Array.isArray(res?.data) ? res.data : []
      } catch {
        this.positions = []
      }
    },
    async loadTrades() {
      try {
        const res = await strategyApi.getTrades(this.strategyId, 30)
        this.trades = Array.isArray(res?.data) ? res.data : []
      } catch {
        this.trades = []
      }
    },
    async loadPerformance() {
      try {
        const [perfRes, equityRes] = await Promise.allSettled([
          strategyApi.getPerformance(this.strategyId),
          strategyApi.getEquityCurve(this.strategyId)
        ])
        let curve = []
        if (perfRes.status === 'fulfilled' && perfRes.value?.data) {
          const d = perfRes.value.data
          this.performance = {
            ...this.performance,
            total_return: d.total_return,
            latest_equity: d.latest_equity,
            points: d.points
          }
          if (Array.isArray(d.equity_curve)) curve = d.equity_curve
        }
        if (equityRes.status === 'fulfilled') {
          const arr = equityRes.value?.data
          if (Array.isArray(arr) && arr.length > curve.length) curve = arr
        }
        this.equityCurve = curve
      } catch {
        /* ignore */
      }
    },
    async loadLogs() {
      try {
        const res = await strategyApi.getLogs(this.strategyId, 100)
        this.logs = Array.isArray(res?.data) ? res.data : []
      } catch {
        this.logs = []
      }
    },
    async refreshData() {
      await this.loadData()
      showToast({ message: 'OK', type: 'success', duration: 600 })
    },

    async startStrategy() {
      this.actionLoading = true
      try {
        await strategyApi.start(this.strategyId)
        showToast({ message: this.$t('trading.start_success'), type: 'success' })
        await this.loadData()
      } catch (error) {
        console.error('Start strategy failed:', error)
      } finally {
        this.actionLoading = false
      }
    },
    async stopStrategy() {
      try {
        await showConfirmDialog({
          title: this.$t('trading.confirm_stop_title'),
          message: this.$t('trading.confirm_stop_msg')
        })
      } catch {
        return
      }
      this.actionLoading = true
      try {
        await strategyApi.stop(this.strategyId)
        showToast({ message: this.$t('trading.stop_success'), type: 'success' })
        await this.loadData()
      } catch (error) {
        console.error('Stop strategy failed:', error)
      } finally {
        this.actionLoading = false
      }
    },
    async handleDelete() {
      try {
        await showConfirmDialog({
          title: this.$t('trading.confirm_delete_title'),
          message: this.$t('trading.confirm_delete_msg')
        })
      } catch {
        return
      }
      try {
        await strategyApi.delete(this.strategyId)
        showToast({ message: this.$t('trading.delete_success'), type: 'success' })
        this.$router.back()
      } catch (err) {
        console.error('Delete failed:', err)
      }
    },

    sideLabel(side) {
      const s = String(side || '').toLowerCase()
      if (s === 'long' || s === 'buy') return this.$t('trading.side_long')
      if (s === 'short' || s === 'sell') return this.$t('trading.side_short')
      return side || '-'
    },
    sideClass(side) {
      const s = String(side || '').toLowerCase()
      if (s === 'long' || s === 'buy') return 'long'
      if (s === 'short' || s === 'sell') return 'short'
      return ''
    },
    tradeTypeLabel(type) {
      const raw = String(type || '').toLowerCase().replace(/-/g, '_')
      const key = TRADE_TYPE_LABEL[raw]
      if (key) {
        const text = this.$t(key)
        if (text && text !== key) return text
      }
      return raw || '-'
    },
    tradeTypeClass(type) {
      const raw = String(type || '').toLowerCase()
      if (raw.includes('long') || raw === 'buy') return 'long'
      if (raw.includes('short') || raw === 'sell') return 'short'
      if (raw === 'liquidation') return 'short'
      return ''
    },
    pickTradeProfit(row) {
      if (!row || typeof row !== 'object') return null
      const keys = ['profit', 'pnl', 'realized_pnl', 'realizedPnl', 'net_profit', 'realized_profit']
      for (const k of keys) {
        const v = row[k]
        if (v !== null && v !== undefined && v !== '') return v
      }
      return null
    },
    hasProfit(row) {
      return this.pickTradeProfit(row) !== null
    },
    tradeValue(item) {
      if (item?.value != null && item.value !== '') return item.value
      const price = parseFloat(item?.price)
      const amount = parseFloat(item?.amount)
      if (!isNaN(price) && !isNaN(amount)) return price * amount
      return 0
    },
    formatAmount(value) {
      const num = Number(value || 0)
      if (!num) return '0'
      if (Math.abs(num) >= 1) return num.toFixed(4)
      return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
    },
    formatPrice(value) {
      const num = Number(value || 0)
      if (!num) return '0.00'
      if (Math.abs(num) >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(num) >= 1) return num.toFixed(4)
      return num.toPrecision(6)
    },
    /** perfMetrics 的比率 (0~1 小数) → 百分比字符串 */
    formatPercentValue(value) {
      const num = Number(value || 0)
      if (!num) return '0.00%'
      return `${(num * 100).toFixed(2)}%`
    },
    logLevelClass(level) {
      const l = String(level || '').toLowerCase()
      if (l === 'error' || l === 'critical') return 'error'
      if (l === 'warn' || l === 'warning') return 'warn'
      if (l === 'info') return 'info'
      return ''
    },

    prettyKey(key) {
      if (!key) return '-'
      return String(key)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    },
    prettyVal(val, key) {
      if (val === null || val === undefined || val === '') return '-'
      if (typeof val === 'boolean') return val ? this.$t('trading.enabled') : this.$t('trading.disabled')
      if (Array.isArray(val)) return val.join(', ')
      if (typeof val === 'object') return JSON.stringify(val)
      if (typeof val === 'number') {
        if (key && /percent|pct|rate/.test(key)) return `${val}%`
        return val
      }
      return String(val)
    },
    paramLabel(key) {
      if (this.isMartingaleBot) {
        const m = {
          initialAmount: 'bot_create.martingale_first_order',
          priceDropPct: 'bot_create.price_drop_pct',
          takeProfitPct: 'bot_create.martingale_take_profit_pct',
          stopLossPct: 'bot_create.martingale_stop_loss_pct'
        }
        if (m[key]) return this.$t(m[key])
      }
      const i18nKey = PARAM_LABEL_MAP[key]
      if (i18nKey) {
        const text = this.$t(i18nKey)
        if (text && text !== i18nKey) return text
      }
      return this.prettyKey(key.replace(/([A-Z])/g, '_$1').toLowerCase())
    },
    formatParamValue(key, val) {
      if (val === null || val === undefined || val === '') return '-'
      const displayMap = VALUE_DISPLAY_MAP[key]
      if (displayMap && displayMap[val]) return this.$t(displayMap[val])
      if (key === 'direction') {
        if (this.botType === 'trend') {
          const m = {
            long: 'bot_create.direction_long',
            short: 'bot_create.direction_short',
            both: 'bot_create.direction_both'
          }
          return m[val] ? this.$t(m[val]) : String(val)
        }
        const m = {
          long: 'bot_create.direction_long',
          short: 'bot_create.direction_short',
          neutral: 'bot_create.grid_direction_neutral'
        }
        return m[val] ? this.$t(m[val]) : String(val)
      }
      if (key === 'frequency') {
        const fk = FREQUENCY_MAP[val]
        if (!fk) return String(val)
        if (fk === '4H') return '4H'
        const text = this.$t(fk)
        return text === fk ? String(val) : text
      }
      if (val === 'true' || val === 'false') {
        return val === 'true' ? this.$t('trading.enabled') : this.$t('trading.disabled')
      }
      if (typeof val === 'boolean') {
        return val ? this.$t('trading.enabled') : this.$t('trading.disabled')
      }
      if (['priceDropPct', 'takeProfitPct', 'stopLossPct', 'positionPct', 'dipThreshold'].includes(key)) {
        return `${this.formatNumber(val)}%`
      }
      if (['initialAmount', 'amountEach', 'amountPerGrid', 'referencePrice', 'totalBudget'].includes(key)) {
        return `${this.formatNumber(val)} USDT`
      }
      if (typeof val === 'number') return this.formatNumber(val)
      return String(val)
    },
    /** 处理后端返回的结构化 item（含 value_type） */
    formatDisplayItem(item) {
      const valueType = item?.value_type || 'text'
      const value = item?.value
      if (valueType === 'enum' && item?.value_key) return this.resolveLabelKey(item.value_key, value)
      if (valueType === 'bool') return value ? this.$t('trading.enabled') : this.$t('trading.disabled')
      if (valueType === 'percent') return `${this.formatNumber(value)}%`
      if (valueType === 'usdt') return `${this.formatNumber(value)} USDT`
      if (valueType === 'number' && typeof value === 'number') return this.formatNumber(value)
      if (value === null || value === undefined || value === '') return '-'
      return String(value)
    },
    /** PC 命名空间 label_key → 移动端 i18n key，如都找不到则 fallback 到原值 */
    resolveLabelKey(labelKey, fallback) {
      if (!labelKey) return fallback || '-'
      const mapped = PC_LABEL_KEY_MAP[labelKey]
      if (mapped) {
        const t = this.$t(mapped)
        if (t && t !== mapped) return t
      }
      const direct = this.$t(labelKey)
      if (direct && direct !== labelKey) return direct
      return fallback || labelKey
    },
    riskValueClass(key) {
      if (key === 'takeProfitPct') return 'profit'
      if (key === 'stopLossPct' || key === 'maxDailyLoss') return 'loss'
      return ''
    },
    formatSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num.toFixed(2)}`
    },
    formatNumber(value) {
      const num = Number(value || 0)
      if (!num) return '0'
      if (Math.abs(num) >= 1000) return num.toFixed(2)
      if (Math.abs(num) >= 1) return num.toFixed(4)
      return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
    },
    formatPercent(value) {
      const num = Number(value || 0)
      return `${num.toFixed(2)}%`
    },
    formatTime(value) {
      if (!value) return '-'
      const d = typeof value === 'number' ? new Date(value * (String(value).length <= 10 ? 1000 : 1)) : new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    formatDate(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getMonth() + 1}/${d.getDate()}`
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-bottom: 40px;
}
.detail-page :deep(.van-nav-bar) { background: transparent; }
.detail-page :deep(.van-nav-bar__title),
.detail-page :deep(.van-nav-bar__arrow),
.detail-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.content { padding: 0 16px 40px; }

.hero {
  margin: 4px 0 14px;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(320px 220px at 100% 0%, var(--c-amber-soft), transparent 62%);
}
.hero > * { position: relative; }
.hero-top { display: flex; gap: 14px; align-items: center; }
.hero-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22px;
  flex: none;
}
.hero-text { flex: 1; min-width: 0; }
.hero-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-tags { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.tag.status.running { background: var(--up-soft); color: var(--up); }
.tag.status.error { background: var(--down-soft); color: var(--down); }
.tag.status.stopped { background: var(--c-slate-soft); color: var(--c-slate); }
.tag.status.starting,
.tag.status.stopping { background: var(--warn-soft); color: var(--warn); }
.tag.type { background: var(--c-indigo-soft); color: var(--c-indigo); }
.tag.neutral { background: var(--surface-raised); color: var(--text-2); }

.hero-metrics {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  background: var(--surface-deep);
  border-radius: 14px;
  padding: 12px;
}
.metric { display: flex; flex-direction: column; gap: 4px; text-align: center; }
.metric .label { font-size: 11px; color: var(--text-3); }
.metric .value {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.metric .value.profit { color: var(--up); }
.metric .value.loss { color: var(--down); }

.action-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.action-bar .action-btn { flex: 1; border-radius: 14px; }
.action-bar .action-btn.ghost { flex: 0 0 56px; }
.action-bar :deep(.van-button) { border-radius: 14px; font-weight: 700; }
.action-bar :deep(.van-button .van-icon) { margin-right: 4px; }

.detail-page :deep(.van-tabs__wrap) { border-bottom: 1px solid var(--hairline); }
.detail-page :deep(.van-tab) { font-size: 13px; color: var(--text-2); }
.detail-page :deep(.van-tab--active) { color: var(--text); }
.detail-page :deep(.van-tab__text) { color: inherit; }
.detail-page :deep(.van-tabs__line) { background: var(--accent); height: 3px; border-radius: 2px; }

.tab-body {
  padding: 14px 0 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-title .van-icon { color: var(--accent); }

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}
.grid-item { display: flex; flex-direction: column; gap: 3px; }
.g-label { font-size: 11px; color: var(--text-3); }
.g-value {
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.g-value.highlight { color: var(--accent); }
.g-value.profit { color: var(--up); }
.g-value.loss { color: var(--down); }

.list { display: flex; flex-direction: column; gap: 10px; }
.card {
  padding: 14px;
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.card.compact { padding: 12px 14px; }
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.card-title { font-size: 14px; font-weight: 700; color: var(--text); }
.card-sub {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}
.head-right { display: flex; align-items: center; gap: 8px; }
.side-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}
.side-tag.long { background: var(--up-soft); color: var(--up); }
.side-tag.short { background: var(--down-soft); color: var(--down); }
.pnl {
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.pnl.profit { color: var(--up); }
.pnl.loss { color: var(--down); }

.card-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.card-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.card-grid > div { display: flex; flex-direction: column; gap: 2px; }
.card-grid .k { font-size: 10px; color: var(--text-3); }
.card-grid .v { font-size: 12px; color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
.card-grid .v.profit { color: var(--up); }
.card-grid .v.loss { color: var(--down); }
.trade-fee {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.side-tag { text-transform: none; }

.perf-summary .grid-item { align-items: flex-start; }

.equity-svg { width: 100%; height: 120px; display: block; }
.equity-foot {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-3);
  margin-top: 6px;
}

.log-list {
  background: var(--surface-deep);
  border-radius: 12px;
  padding: 8px 10px;
  max-height: 70vh;
  overflow-y: auto;
}
.log-row {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  font-size: 11px;
  border-bottom: 1px solid var(--hairline);
  color: var(--text);
  font-family: ui-monospace, Menlo, Consolas, monospace;
}
.log-row:last-child { border-bottom: none; }
.log-row .log-level { flex: none; width: 44px; font-weight: 700; }
.log-row.error .log-level,
.log-row.error .log-msg { color: var(--down); }
.log-row.warn .log-level,
.log-row.warn .log-msg { color: var(--warn); }
.log-row.info .log-level { color: var(--c-blue); }
.log-row .log-msg { flex: 1; word-break: break-word; }
.log-row .log-time { flex: none; color: var(--text-4); }

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}
</style>
