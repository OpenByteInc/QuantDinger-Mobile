<template>
  <div class="home-page">
    <div class="dashboard-header">
      <div class="header-copy">
        <h1>{{ $t('home.data_center_title') }}</h1>
      </div>
      <div class="nav-actions">
        <div class="nav-pill" @click="$router.push('/profile/notifications')">
          <van-icon name="bell" />
          <span v-if="unreadCount > 0" class="dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </div>
      </div>
    </div>

    <div class="asset-hero" @click="refreshData">
      <div class="asset-top">
        <div>
          <span class="asset-label">{{ $t('home.total_assets') }}</span>
          <p class="asset-note">{{ $t('home.asset_note') }}</p>
        </div>
        <div class="eye-btn" @click.stop="showAsset = !showAsset">
          <van-icon :name="showAsset ? 'eye-o' : 'closed-eye'" />
        </div>
      </div>
      <div class="asset-value-row">
        <span class="asset-value">{{ showAsset ? formatMoney(totalAssets) : '••••••' }}</span>
        <span class="asset-currency">USD</span>
      </div>
      <div :class="['asset-pnl', totalPnl >= 0 ? 'profit' : 'loss']">
        <span class="pnl-arrow">{{ totalPnl >= 0 ? '↑' : '↓' }}</span>
        {{ showAsset ? formatSignedMoney(totalPnl) : '••••' }}
        <span class="pnl-label">{{ $t('home.total_pnl') }}</span>
      </div>
      <div class="asset-mini-grid">
        <div>
          <span>{{ $t('home.kpi_today_pnl') }}</span>
          <strong :class="todayPnl >= 0 ? 'up' : 'down'">{{ formatSignedMoney(todayPnl) }}</strong>
        </div>
        <div>
          <span>{{ $t('home.kpi_positions') }}</span>
          <strong>{{ positionsCount }}</strong>
        </div>
        <div>
          <span>{{ $t('home.status_running') }}</span>
          <strong class="up">{{ strategyCounts.running }}</strong>
        </div>
      </div>
    </div>

    <div class="overview-strip">
      <div class="overview-card">
        <div class="overview-icon green"><van-icon name="play-circle-o" /></div>
        <span>{{ $t('home.status_running') }}</span>
        <strong>{{ strategyCounts.running }}</strong>
      </div>
      <div class="overview-card">
        <div class="overview-icon blue"><van-icon name="apps-o" /></div>
        <span>{{ $t('home.total_strategies') }}</span>
        <strong>{{ strategyCounts.total }}</strong>
      </div>
      <div class="overview-card">
        <div class="overview-icon purple"><van-icon name="bar-chart-o" /></div>
        <span>{{ $t('home.kpi_trades') }}</span>
        <strong>{{ totalTrades }}</strong>
      </div>
      <div class="overview-card">
        <div class="overview-icon amber"><van-icon name="warning-o" /></div>
        <span>{{ $t('home.status_error') }}</span>
        <strong>{{ strategyCounts.error }}</strong>
      </div>
    </div>

    <div class="ios-section">
      <div class="section-head">
        <div>
          <span class="ios-section-title">{{ $t('home.live_overview') }}</span>
          <small>{{ $t('home.performance_chart_note') }}</small>
        </div>
      </div>
      <div class="kpi-grid">
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_today_pnl') }}</span>
          <span :class="['kpi-val', todayPnl >= 0 ? 'up' : 'down']">{{ formatSignedMoney(todayPnl) }}</span>
        </div>
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_unrealized') }}</span>
          <span :class="['kpi-val', unrealizedPnl >= 0 ? 'up' : 'down']">{{ formatSignedMoney(unrealizedPnl) }}</span>
        </div>
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_positions') }}</span>
          <span class="kpi-val">{{ positionsCount }}</span>
        </div>
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_win_rate') }}</span>
          <span class="kpi-val">{{ winRate.toFixed(1) }}%</span>
        </div>
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_trades') }}</span>
          <span class="kpi-val">{{ totalTrades }}</span>
        </div>
        <div class="kpi-cell">
          <span class="kpi-lab">{{ $t('home.kpi_profit_factor') }}</span>
          <span class="kpi-val">{{ profitFactor.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="ios-section">
      <div class="section-head">
        <div>
          <span class="ios-section-title">{{ $t('home.pnl_trend') }}</span>
          <small>{{ $t('home.pnl_trend_note') }}</small>
        </div>
      </div>
      <div class="chart-card">
        <div v-if="pnlBars.length" class="pnl-bars">
          <div v-for="bar in pnlBars" :key="bar.date" class="pnl-bar-cell">
            <span
              :class="['pnl-bar', bar.value >= 0 ? 'up' : 'down']"
              :style="{ height: `${bar.height}px` }"
            />
            <small>{{ bar.label }}</small>
          </div>
        </div>
        <div v-else class="data-empty compact">{{ $t('home.no_dashboard_data') }}</div>
      </div>
    </div>

    <div class="ios-section">
      <div class="section-head">
        <div>
          <span class="ios-section-title">{{ $t('home.pnl_calendar') }}</span>
          <small>{{ $t('home.pnl_calendar_note') }}</small>
        </div>
      </div>
      <div v-if="calendarDays.length" class="calendar-grid">
        <div
          v-for="day in calendarDays"
          :key="day.date"
          :class="['calendar-day', Number(day.profit || 0) >= 0 ? 'up-day' : 'down-day']"
        >
          <span>{{ formatCalendarDay(day.date) }}</span>
          <strong>{{ formatCompactSigned(day.profit) }}</strong>
        </div>
      </div>
      <div v-else class="data-empty">{{ $t('home.no_dashboard_data') }}</div>
    </div>

    <div class="ios-section">
      <div class="section-head">
        <div>
          <span class="ios-section-title">{{ $t('home.strategy_distribution') }}</span>
          <small>{{ $t('home.strategy_distribution_note') }}</small>
        </div>
      </div>
      <div class="distribution-panel">
        <div class="donut-chart" :style="{ background: strategyDonutGradient }">
          <div class="donut-hole">
            <strong>{{ strategyCounts.total }}</strong>
            <span>{{ $t('home.total_strategies') }}</span>
          </div>
        </div>
        <div class="donut-legend">
          <div v-for="item in strategyLegend" :key="item.key" class="legend-row">
            <span :class="['legend-dot', item.key]" />
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="ios-section">
      <div class="section-head">
        <div>
          <span class="ios-section-title">{{ $t('home.trade_quality') }}</span>
          <small>{{ $t('home.trade_quality_note') }}</small>
        </div>
      </div>
      <div class="quality-card">
        <div class="quality-row">
          <div>
            <span>{{ $t('home.kpi_win_rate') }}</span>
            <strong>{{ winRate.toFixed(1) }}%</strong>
          </div>
          <div class="quality-track">
            <i :style="{ width: `${boundedWinRate}%` }" />
          </div>
        </div>
        <div class="quality-row">
          <div>
            <span>{{ $t('home.max_drawdown') }}</span>
            <strong class="down">{{ maxDrawdownPct.toFixed(1) }}%</strong>
          </div>
          <div class="quality-track danger">
            <i :style="{ width: `${boundedDrawdown}%` }" />
          </div>
        </div>
        <div class="quality-split">
          <div>
            <span>{{ $t('home.estimated_wins') }}</span>
            <strong class="up">{{ estimatedWins }}</strong>
          </div>
          <div>
            <span>{{ $t('home.estimated_losses') }}</span>
            <strong class="down">{{ estimatedLosses }}</strong>
          </div>
          <div>
            <span>{{ $t('home.kpi_profit_factor') }}</span>
            <strong>{{ profitFactor.toFixed(2) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert strategies -->
    <div v-if="alertStrategies.length" class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.alert_title') }}</span>
      </div>
      <div class="ios-grouped">
        <div
          v-for="item in alertStrategies.slice(0, 3)"
          :key="item.id"
          class="ios-row"
        >
          <div class="ios-row-icon err"><van-icon name="warning-o" /></div>
          <div class="ios-row-main">
            <span class="ios-row-title">{{ item.name }}</span>
            <span class="ios-row-sub">{{ item.trading_config?.symbol || '-' }} · {{ item.trading_config?.timeframe || '-' }}</span>
          </div>
          <van-icon class="ios-row-arrow" name="arrow" />
        </div>
      </div>
    </div>

    <!-- Recent trades -->
    <div v-if="recentTrades.length" class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.recent_trades') }}</span>
      </div>
      <div class="ios-grouped">
        <div
          v-for="trade in recentTrades.slice(0, 5)"
          :key="trade.id || trade.created_at"
          class="ios-row"
        >
          <div :class="['ios-row-icon', Number(trade.profit || 0) >= 0 ? 'up' : 'down']">
            <van-icon :name="Number(trade.profit || 0) >= 0 ? 'arrow-up' : 'arrow-down'" />
          </div>
          <div class="ios-row-main">
            <span class="ios-row-title">{{ trade.symbol || trade.instrument || '--' }}</span>
            <span class="ios-row-sub">{{ formatTradeMeta(trade) }}</span>
          </div>
          <span :class="['pnl', Number(trade.profit || 0) >= 0 ? 'profit' : 'loss']">
            {{ formatSignedMoney(trade.profit || 0) }}
          </span>
        </div>
      </div>
    </div>

    <van-loading v-if="loading" class="page-loading" vertical>{{ $t('common.loading') }}</van-loading>
  </div>
</template>

<script>
import { dashboardApi, strategyApi } from '@/api'
import {
  useDashboardStore,
  useNotificationStore,
  useStrategyStore
} from '@/stores'

export default {
  name: 'Home',

  data() {
    return {
      showAsset: true,
      loading: false
    }
  },

  computed: {
    dashboardStore() {
      return useDashboardStore()
    },
    strategyStore() {
      return useStrategyStore()
    },
    notificationStore() {
      return useNotificationStore()
    },
    totalAssets() {
      return this.dashboardStore.totalAssets
    },
    totalPnl() {
      return this.dashboardStore.totalPnl
    },
    todayPnl() {
      return this.dashboardStore.todayPnl
    },
    unrealizedPnl() {
      return this.dashboardStore.unrealizedPnl
    },
    positionsCount() {
      return this.dashboardStore.positions.length
    },
    winRate() {
      return this.dashboardStore.winRate
    },
    totalTrades() {
      return this.dashboardStore.totalTrades
    },
    profitFactor() {
      return this.dashboardStore.profitFactor
    },
    maxDrawdownPct() {
      return this.dashboardStore.maxDrawdownPct
    },
    calendarDays() {
      return (this.dashboardStore.dailyPnlChart || []).slice(-14)
    },
    pnlBars() {
      const source = (this.dashboardStore.dailyPnlChart || []).slice(-12)
      const maxAbs = Math.max(1, ...source.map((item) => Math.abs(Number(item.profit || 0))))
      return source.map((item) => {
        const value = Number(item.profit || 0)
        return {
          date: item.date,
          value,
          label: this.formatCalendarDay(item.date),
          height: Math.max(10, Math.round((Math.abs(value) / maxAbs) * 72))
        }
      })
    },
    strategyCounts() {
      return this.strategyStore.statusCounts
    },
    strategyLegend() {
      return [
        { key: 'running', label: this.$t('home.status_running'), value: this.strategyCounts.running || 0 },
        { key: 'stopped', label: this.$t('home.status_stopped'), value: this.strategyCounts.stopped || 0 },
        { key: 'error', label: this.$t('home.status_error'), value: this.strategyCounts.error || 0 }
      ]
    },
    strategyDonutGradient() {
      const total = Number(this.strategyCounts.total || 0)
      if (!total) return 'conic-gradient(var(--surface-raised) 0 100%)'
      const running = Math.round(((this.strategyCounts.running || 0) / total) * 100)
      const stopped = Math.round(((this.strategyCounts.stopped || 0) / total) * 100)
      const runningEnd = running
      const stoppedEnd = Math.min(100, running + stopped)
      return `conic-gradient(var(--up) 0 ${runningEnd}%, var(--c-blue) ${runningEnd}% ${stoppedEnd}%, var(--down) ${stoppedEnd}% 100%)`
    },
    boundedWinRate() {
      return Math.max(0, Math.min(100, Number(this.winRate || 0)))
    },
    boundedDrawdown() {
      return Math.max(0, Math.min(100, Math.abs(Number(this.maxDrawdownPct || 0))))
    },
    estimatedWins() {
      return Math.round(Number(this.totalTrades || 0) * this.boundedWinRate / 100)
    },
    estimatedLosses() {
      return Math.max(0, Number(this.totalTrades || 0) - this.estimatedWins)
    },
    alertStrategies() {
      return this.strategyStore.alertStrategies
    },
    recentTrades() {
      return this.dashboardStore.recentTrades
    },
    unreadCount() {
      return this.notificationStore.unreadCount
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [summaryRes, strategyRes, unreadRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          strategyApi.getList(),
          strategyApi.getUnreadNotificationCount()
        ])
        this.dashboardStore.setSummary(summaryRes.status === 'fulfilled' ? (summaryRes.value.data || {}) : {})
        this.strategyStore.setStrategies(strategyRes.status === 'fulfilled' ? (strategyRes.value.data || []) : [])
        this.notificationStore.setUnreadCount(unreadRes.status === 'fulfilled' ? (unreadRes.value.data || 0) : 0)
      } catch (error) {
        console.error('Load mobile overview failed:', error)
      } finally {
        this.loading = false
      }
    },

    async refreshData() {
      await this.loadData()
    },

    formatMoney(value) {
      const num = Number(value || 0)
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num)
    },

    formatSignedMoney(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${this.formatMoney(num)}`
    },

    formatCompactSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      if (Math.abs(num) >= 1000) return `${sign}${(num / 1000).toFixed(1)}k`
      return `${sign}${num.toFixed(0)}`
    },

    formatCalendarDay(value) {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '--'
      return `${d.getMonth() + 1}/${d.getDate()}`
    },

    formatTradeMeta(trade) {
      const parts = [
        trade.side || trade.type || '-',
        trade.created_at ? this.formatTime(trade.created_at) : null
      ].filter(Boolean)
      return parts.join(' · ')
    },

    formatTime(value) {
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return '刚刚'
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: calc(12px + var(--safe-area-top, 0px)) 16px 72px;
  background: var(--bg);
  color: var(--text);
}

.dashboard-header {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.header-copy {
  min-width: 0;
  padding-left: 56px;
}

.header-copy h1 {
  margin: 0;
  color: var(--text);
  font-size: 23px;
  font-weight: 950;
  line-height: 1.1;
  letter-spacing: 0;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.nav-pill {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 17px;
}
.nav-pill .dot {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 15px; height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--down);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--bg);
}
.asset-hero {
  position: relative;
  margin-bottom: 12px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(260px 160px at 100% 0%, var(--accent-crimson-soft), transparent 68%),
    linear-gradient(145deg, var(--bg-elevated), color-mix(in srgb, var(--bg-elevated) 72%, var(--surface-raised)));
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.asset-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  position: relative;
}

.asset-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0;
  color: var(--text-3);
}

.asset-note {
  margin: 0;
  color: var(--text-4);
  font-size: 11px;
  line-height: 1.35;
}

.eye-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 15px;
}
.asset-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  position: relative;
}
.asset-value {
  font-size: clamp(32px, 10vw, 42px);
  font-weight: 950;
  color: var(--text);
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  line-height: 1.02;
}
.asset-currency {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}
.asset-pnl {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  position: relative;
}
.asset-pnl.profit {
  background: var(--up-soft);
  color: var(--up);
}
.asset-pnl.loss {
  background: var(--down-soft);
  color: var(--down);
}
.pnl-arrow { font-size: 12px; }
.pnl-label {
  font-size: 11px;
  font-weight: 650;
  opacity: 0.8;
  margin-left: 4px;
}

.asset-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--hairline);
}

.asset-mini-grid div {
  min-width: 0;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-mini-grid span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 750;
}

.asset-mini-grid strong {
  color: var(--text);
  font-size: 14px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up { color: var(--up) !important; }
.down { color: var(--down) !important; }

.overview-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 22px;
}

.overview-card {
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
}

.overview-icon {
  grid-row: 1 / span 2;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 18px;
}

.overview-icon.green {
  color: var(--up);
  background: var(--up-soft);
}

.overview-icon.blue {
  color: var(--c-blue);
  background: var(--c-blue-soft);
}

.overview-icon.purple {
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
}

.overview-icon.amber {
  color: var(--c-amber);
  background: var(--c-amber-soft);
}

.overview-card span {
  display: block;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-card strong {
  display: block;
  color: var(--text);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ios-section { margin-bottom: 22px; }

.ios-section-head,
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
  margin-bottom: 12px;
}

.section-head > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ios-section-title {
  font-size: 18px;
  font-weight: 950;
  color: var(--text);
  letter-spacing: 0;
  line-height: 1.15;
}

.ios-section-note,
.section-head small {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.35;
}

.ios-section-action {
  font-size: 13px;
  color: var(--text-2);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--hairline);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.kpi-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 15px 12px;
  background: var(--bg-elevated);
}
.kpi-lab {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.kpi-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.kpi-val.up { color: var(--up); }
.kpi-val.down { color: var(--down); }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.calendar-day {
  min-height: 48px;
  padding: 7px 4px;
  border-radius: 12px;
  background: var(--surface-raised);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
}

.calendar-day span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 750;
}

.calendar-day strong {
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.calendar-day.up-day {
  border-color: color-mix(in srgb, var(--up) 22%, transparent);
}

.calendar-day.up-day strong {
  color: var(--up);
}

.calendar-day.down-day {
  border-color: color-mix(in srgb, var(--down) 22%, transparent);
}

.calendar-day.down-day strong {
  color: var(--down);
}

.data-empty {
  min-height: 88px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 750;
}

.data-empty.compact {
  min-height: 112px;
}

.chart-card,
.distribution-panel,
.quality-card {
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.08);
}

.chart-card {
  padding: 14px 12px 12px;
}

.pnl-bars {
  height: 116px;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 7px;
  align-items: end;
}

.pnl-bar-cell {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.pnl-bar-cell small {
  color: var(--text-4);
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
  transform: rotate(-28deg);
}

.pnl-bar {
  width: 100%;
  max-width: 14px;
  min-height: 8px;
  border-radius: 999px 999px 4px 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--up) 84%, #fff), var(--up));
  box-shadow: 0 0 18px color-mix(in srgb, var(--up) 28%, transparent);
}

.pnl-bar.down {
  background: linear-gradient(180deg, color-mix(in srgb, var(--down) 84%, #fff), var(--down));
  box-shadow: 0 0 18px color-mix(in srgb, var(--down) 22%, transparent);
}

.distribution-panel {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px;
}

.donut-chart {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px var(--border);
}

.donut-hole {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.donut-hole strong {
  color: var(--text);
  font-size: 24px;
  font-weight: 950;
  font-variant-numeric: tabular-nums;
}

.donut-hole span {
  max-width: 58px;
  color: var(--text-4);
  font-size: 9px;
  font-weight: 800;
  text-align: center;
  line-height: 1.2;
}

.donut-legend {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
}

.legend-row span:nth-child(2) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-row strong {
  color: var(--text);
  font-size: 14px;
  font-weight: 950;
  font-variant-numeric: tabular-nums;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: var(--text-4);
}

.legend-dot.running { background: var(--up); }
.legend-dot.stopped { background: var(--c-blue); }
.legend-dot.error { background: var(--down); }

.quality-card {
  padding: 16px;
}

.quality-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.quality-row > div:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quality-row span,
.quality-split span {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 760;
}

.quality-row strong {
  color: var(--text);
  font-size: 18px;
  font-weight: 950;
  font-variant-numeric: tabular-nums;
}

.quality-track {
  height: 10px;
  border-radius: 999px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  overflow: hidden;
}

.quality-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--up), var(--c-teal));
}

.quality-track.danger i {
  background: linear-gradient(90deg, var(--c-amber), var(--down));
}

.quality-split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}

.quality-split div {
  min-width: 0;
  padding: 10px;
  border-radius: 14px;
  background: var(--surface-raised);
}

.quality-split strong {
  display: block;
  margin-top: 5px;
  color: var(--text);
  font-size: 18px;
  font-weight: 950;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 360px) {
  .distribution-panel {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .donut-legend {
    width: 100%;
  }
}

/* ===== Grouped list ===== */
.ios-grouped {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}
.ios-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  position: relative;
  transition: background 0.15s;
}
.ios-row:active { background: var(--surface-raised); }
.ios-row + .ios-row::before {
  content: '';
  position: absolute;
  left: 56px; right: 0; top: 0;
  height: 1px;
  background: var(--hairline);
}
.ios-row-icon {
  width: 30px; height: 30px;
  flex-shrink: 0;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  background: var(--surface-raised);
  color: var(--text-2);
}
.ios-row-icon.err  { background: var(--down-soft); color: var(--down); }
.ios-row-icon.up   { background: var(--up-soft); color: var(--up); }
.ios-row-icon.down { background: var(--down-soft); color: var(--down); }
.ios-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ios-row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ios-row-sub {
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.ios-row-arrow {
  color: var(--text-4);
  font-size: 14px;
}

.pnl {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.pnl.profit { color: var(--up); }
.pnl.loss { color: var(--down); }

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}
</style>
