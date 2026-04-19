<template>
  <div class="home-page">
    <!-- iOS Large-Title Nav -->
    <div class="nav-header">
      <div class="nav-row">
        <div class="greeting-block">
          <span class="greeting-time">{{ greetingText }}</span>
          <span class="greeting-name">{{ displayName }}</span>
        </div>
        <div class="nav-actions">
          <div class="nav-pill" @click="$router.push('/profile/notifications')">
            <van-icon name="bell" />
            <span v-if="unreadCount > 0" class="dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </div>
          <div class="nav-avatar" @click="$router.push('/profile')">
            <img :src="avatarUrl" alt="avatar" referrerpolicy="no-referrer" @error="onAvatarError" />
          </div>
        </div>
      </div>
    </div>

    <!-- Asset Hero -->
    <div class="asset-hero" @click="refreshData">
      <div class="asset-top">
        <span class="asset-label">{{ $t('home.total_assets') }}</span>
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
    </div>

    <!-- Credentials setup prompt -->
    <div v-if="!hasCredentials" class="setup-card" @click="$router.push('/profile/credentials/new')">
      <div class="setup-icon"><van-icon name="shield-o" /></div>
      <div class="setup-text">
        <span class="setup-title">{{ $t('home.setup_title') }}</span>
        <p class="setup-desc">{{ $t('home.setup_desc') }}</p>
      </div>
      <van-icon class="setup-arrow" name="arrow" />
    </div>

    <!-- iOS app-icon grid quick actions (FIRST row for fast access) -->
    <div class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.one_click') }}</span>
      </div>
      <div class="app-grid">
        <div class="app-tile" @click="$router.push('/trading/create')">
          <div class="app-icon primary"><van-icon name="plus" /></div>
          <span>{{ $t('home.create_bot') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/ai-analysis')">
          <div class="app-icon crimson"><van-icon name="fire-o" /></div>
          <span>{{ $t('home.ai_analysis') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/market')">
          <div class="app-icon indigo"><van-icon name="bar-chart-o" /></div>
          <span>{{ $t('home.indicator_market') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/quick-trade')">
          <div class="app-icon green"><van-icon name="exchange" /></div>
          <span>{{ $t('home.quick_trade') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/profile/credentials')">
          <div class="app-icon blue"><van-icon name="shield-o" /></div>
          <span>{{ $t('home.credential_manage') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/market/my-purchases')">
          <div class="app-icon teal"><van-icon name="bag-o" /></div>
          <span>{{ $t('market.my_purchases') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/profile/referral')">
          <div class="app-icon pink"><van-icon name="friends-o" /></div>
          <span>{{ $t('profile.referral') }}</span>
        </div>
        <div class="app-tile" @click="$router.push('/profile/credits')">
          <div class="app-icon gold"><van-icon name="gold-coin-o" /></div>
          <span>{{ $t('profile.credits') }}</span>
        </div>
      </div>
    </div>

    <!-- Live trading overview KPIs (PC parity) -->
    <div class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.live_overview') }}</span>
        <span class="ios-section-action" @click="$router.push('/trading')">
          {{ $t('common.view_all') }}
          <van-icon name="arrow" />
        </span>
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

    <!-- Watchlist -->
    <div class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.watchlist') }}</span>
        <span class="ios-section-action" @click="openWatchlistPicker">
          {{ $t('home.watchlist_manage') }}
          <van-icon name="arrow" />
        </span>
      </div>
      <div v-if="watchlistItems.length" class="watchlist-strip">
        <div
          v-for="item in watchlistItems"
          :key="`${item.market}-${item.symbol}`"
          class="wl-card"
          @click="openWatchlistItem(item)"
        >
          <div class="wl-head">
            <span class="wl-sym">{{ shortSymbol(item.symbol) }}</span>
            <span class="wl-market">{{ item.market || 'Crypto' }}</span>
          </div>
          <span class="wl-price">{{ formatPrice(priceMap[priceKey(item)]?.price) }}</span>
          <span
            v-if="priceMap[priceKey(item)]"
            :class="['wl-change', (priceMap[priceKey(item)]?.changePercent || 0) >= 0 ? 'up' : 'down']"
          >
            {{ formatChangePct(priceMap[priceKey(item)]?.changePercent) }}
          </span>
          <span v-else class="wl-change muted">--</span>
        </div>
        <div class="wl-card add-card" @click="openWatchlistPicker">
          <van-icon name="plus" />
          <span>{{ $t('home.watchlist_add') }}</span>
        </div>
      </div>
      <div v-else class="watchlist-empty" @click="openWatchlistPicker">
        <van-icon name="bookmark-o" />
        <div class="we-copy">
          <span class="we-title">{{ $t('home.watchlist_empty_title') }}</span>
          <span class="we-desc">{{ $t('home.watchlist_empty_desc') }}</span>
        </div>
        <van-icon class="we-arrow" name="arrow" />
      </div>
    </div>

    <!-- Symbol picker popup for watchlist management -->
    <SymbolPicker
      v-model:show="showSymbolPicker"
      :title="$t('watchlist.picker_title')"
      @pick="onSymbolPicked"
      @close="onSymbolPickerClose"
    />

    <!-- Strategy stat widget -->
    <div class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('home.strategy_status') }}</span>
        <span class="ios-section-action" @click="$router.push('/trading')">
          {{ $t('common.view_all') }}
          <van-icon name="arrow" />
        </span>
      </div>
      <div class="stat-widget">
        <div class="stat-col" @click="goToTrading('all')">
          <span class="stat-val">{{ strategyCounts.total }}</span>
          <span class="stat-lab">{{ $t('home.status_total') }}</span>
        </div>
        <div class="stat-col running" @click="goToTrading('running')">
          <span class="stat-val">{{ strategyCounts.running }}</span>
          <span class="stat-lab">{{ $t('home.status_running') }}</span>
          <div class="pulse-dot"></div>
        </div>
        <div class="stat-col error" @click="goToTrading('error')">
          <span class="stat-val">{{ strategyCounts.error }}</span>
          <span class="stat-lab">{{ $t('home.status_error') }}</span>
        </div>
        <div class="stat-col stopped" @click="goToTrading('stopped')">
          <span class="stat-val">{{ strategyCounts.stopped }}</span>
          <span class="stat-lab">{{ $t('home.status_stopped') }}</span>
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
          @click="openStrategy(item.id)"
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
import { credentialsApi, dashboardApi, getBaseUrl, strategyApi, watchlistApi } from '@/api'
import {
  useCredentialsStore,
  useDashboardStore,
  useNotificationStore,
  useStrategyStore,
  useUserStore,
  useWatchlistStore
} from '@/stores'
import logoUrl from '@/assets/logo.png'
import SymbolPicker from '@/components/SymbolPicker.vue'

export default {
  name: 'Home',
  components: { SymbolPicker },

  data() {
    return {
      logoUrl,
      showAsset: true,
      loading: false,
      priceMap: {},
      priceTimer: null,
      showSymbolPicker: false
    }
  },

  computed: {
    dashboardStore() {
      return useDashboardStore()
    },
    strategyStore() {
      return useStrategyStore()
    },
    credentialsStore() {
      return useCredentialsStore()
    },
    notificationStore() {
      return useNotificationStore()
    },
    userStore() {
      return useUserStore()
    },
    watchlistStore() {
      return useWatchlistStore()
    },
    watchlistItems() {
      return (this.watchlistStore.items || []).slice(0, 12)
    },
    userInfo() {
      return this.userStore.userInfo || {}
    },
    displayName() {
      return this.userInfo?.nickname || this.userInfo?.username || this.$t('home.default_user')
    },
    avatarUrl() {
      const raw = (this.userInfo?.avatar || '').trim()
      if (!raw) return this.logoUrl
      if (/^(https?:|data:|blob:)/i.test(raw)) return raw
      const base = getBaseUrl().replace(/\/$/, '')
      if (raw.startsWith('/')) return `${base}${raw}`
      return `${base}/${raw}`
    },
    greetingText() {
      const hour = new Date().getHours()
      if (hour < 6) return this.$t('home.greeting_night')
      if (hour < 12) return this.$t('home.greeting_morning')
      if (hour < 18) return this.$t('home.greeting_afternoon')
      return this.$t('home.greeting_evening')
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
    strategyCounts() {
      return this.strategyStore.statusCounts
    },
    alertStrategies() {
      return this.strategyStore.alertStrategies
    },
    recentTrades() {
      return this.dashboardStore.recentTrades
    },
    hasCredentials() {
      return this.credentialsStore.hasCredentials
    },
    credentialCount() {
      return this.credentialsStore.cryptoItems.length
    },
    unreadCount() {
      return this.notificationStore.unreadCount
    }
  },

  mounted() {
    this.loadData()
    this.priceTimer = setInterval(() => {
      this.refreshPrices()
    }, 30000)
  },

  beforeUnmount() {
    if (this.priceTimer) {
      clearInterval(this.priceTimer)
      this.priceTimer = null
    }
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [summaryRes, strategyRes, credentialsRes, unreadRes, watchlistRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          strategyApi.getList(),
          credentialsApi.list(),
          strategyApi.getUnreadNotificationCount(),
          watchlistApi.getList()
        ])
        this.dashboardStore.setSummary(summaryRes.status === 'fulfilled' ? (summaryRes.value.data || {}) : {})
        this.strategyStore.setStrategies(strategyRes.status === 'fulfilled' ? (strategyRes.value.data || []) : [])
        this.credentialsStore.setItems(credentialsRes.status === 'fulfilled' ? (credentialsRes.value.data || []) : [])
        this.notificationStore.setUnreadCount(unreadRes.status === 'fulfilled' ? (unreadRes.value.data || 0) : 0)
        this.watchlistStore.setItems(watchlistRes.status === 'fulfilled' ? (watchlistRes.value.data || []) : [])
        await this.refreshPrices()
      } catch (error) {
        console.error('Load mobile overview failed:', error)
      } finally {
        this.loading = false
      }
    },

    async refreshPrices() {
      const list = this.watchlistItems.map((i) => ({ market: i.market || 'Crypto', symbol: i.symbol }))
      if (!list.length) {
        this.priceMap = {}
        return
      }
      try {
        const res = await watchlistApi.getPrices(list)
        const map = {}
        for (const row of res.data || []) {
          if (row?.symbol) {
            const key = `${row.market || 'Crypto'}-${row.symbol}`
            map[key] = {
              price: Number(row.price || 0),
              change: Number(row.change || 0),
              changePercent: Number(row.changePercent || 0)
            }
          }
        }
        this.priceMap = map
      } catch (err) {
        console.warn('Refresh watchlist prices failed:', err)
      }
    },

    priceKey(item) {
      return `${item.market || 'Crypto'}-${item.symbol}`
    },

    async refreshData() {
      await this.loadData()
    },

    openWatchlistItem(item) {
      this.watchlistStore.setActive(item.symbol, item.market || 'Crypto')
      this.$router.push('/quick-trade')
    },

    openWatchlistPicker() {
      this.showSymbolPicker = true
    },

    async onSymbolPicked(item) {
      if (item?.symbol) {
        this.watchlistStore.setActive(item.symbol, item.market || 'Crypto')
      }
      try {
        const res = await watchlistApi.getList()
        this.watchlistStore.setItems(res.data || [])
        await this.refreshPrices()
      } catch (err) {
        console.warn('Refresh watchlist after pick failed:', err)
      }
    },

    async onSymbolPickerClose() {
      try {
        const res = await watchlistApi.getList()
        this.watchlistStore.setItems(res.data || [])
        await this.refreshPrices()
      } catch (err) {
        console.warn('Refresh watchlist after close failed:', err)
      }
    },

    shortSymbol(symbol) {
      if (!symbol) return '--'
      return String(symbol).replace('/USDT', '').replace('USDT', '').replace('/USD', '')
    },

    formatPrice(value) {
      const num = Number(value || 0)
      if (!num) return '--'
      if (num >= 1000) {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num)
      }
      if (num >= 1) {
        return num.toFixed(3)
      }
      return num.toFixed(5)
    },

    formatChangePct(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num.toFixed(2)}%`
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
    },

    goToTrading(status) {
      this.$router.push({ path: '/trading', query: { status } })
    },

    openStrategy(id) {
      this.$router.push(`/trading/strategy/${id}`)
    },

    onAvatarError(event) {
      const img = event?.target
      if (img && img.src !== this.logoUrl) {
        img.src = this.logoUrl
      }
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: calc(12px + var(--safe-area-top, 0px)) 16px 120px;
  background: var(--bg);
  color: var(--text);
}

/* ===== Large-title nav ===== */
.nav-header { margin-bottom: 18px; }
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.greeting-block { display: flex; flex-direction: column; gap: 2px; }
.greeting-time {
  font-size: 13px;
  color: var(--text-3);
  font-weight: 500;
}
.greeting-name {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.nav-actions { display: flex; align-items: center; gap: 10px; }
.nav-pill {
  position: relative;
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
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
.nav-avatar {
  width: 38px; height: 38px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.nav-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* ===== Asset hero — flat solid panel ===== */
.asset-hero {
  position: relative;
  margin-bottom: 22px;
  padding: 26px 22px 22px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.asset-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(320px 220px at 100% 0%, var(--accent-crimson-soft), transparent 62%);
}
.asset-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
  position: relative;
}
.asset-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}
.eye-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 13px;
}
.asset-value-row {
  display: flex; align-items: baseline; gap: 8px;
  position: relative;
}
.asset-value {
  font-size: 42px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
  line-height: 1.02;
}
.asset-currency {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
}
.asset-pnl {
  margin-top: 12px;
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
  font-weight: 500;
  opacity: 0.8;
  margin-left: 4px;
}

/* ===== Setup card — flat panel with colored icon ===== */
.setup-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 22px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  overflow: hidden;
}
.setup-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(200px 150px at 0% 50%, var(--accent-crimson-soft), transparent 65%);
}
.setup-icon {
  position: relative;
  width: 44px; height: 44px;
  flex-shrink: 0;
  border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-red);
  color: #ffffff;
  font-size: 20px;
  border: 1px solid transparent;
}
.setup-text,
.setup-arrow { position: relative; }
.setup-text { flex: 1; min-width: 0; }
.setup-title {
  display: block;
  font-size: 14px; font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}
.setup-desc {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.4;
}
.setup-arrow { color: var(--text-3); font-size: 14px; }

/* ===== Section headers — bigger display-style ===== */
.ios-section { margin-bottom: 24px; }
.ios-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 12px;
}
.ios-section-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}
.ios-section-action {
  font-size: 13px;
  color: var(--text-2);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* ===== App grid — flat tiles with semantic color icons ===== */
.app-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 8px;
  padding: 4px 2px;
}
.app-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s;
}
.app-tile:active { transform: scale(0.94); }
.app-icon {
  width: 54px; height: 54px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
}
.app-icon.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}
.app-icon.gold    { color: var(--c-amber);  background: var(--c-amber-soft);  border-color: transparent; }
.app-icon.crimson { color: var(--c-red);    background: var(--c-red-soft);    border-color: transparent; }
.app-icon.blue    { color: var(--c-blue);   background: var(--c-blue-soft);   border-color: transparent; }
.app-icon.teal    { color: var(--c-teal);   background: var(--c-teal-soft);   border-color: transparent; }
.app-icon.green   { color: var(--c-green);  background: var(--c-green-soft);  border-color: transparent; }
.app-icon.orange  { color: var(--c-orange); background: var(--c-orange-soft); border-color: transparent; }
.app-icon.indigo  { color: var(--c-indigo); background: var(--c-indigo-soft); border-color: transparent; }
.app-icon.pink    { color: var(--c-pink);   background: var(--c-pink-soft);   border-color: transparent; }
.app-tile span {
  font-size: 11px;
  color: var(--text-2);
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
  max-width: 72px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== KPI grid (live overview from dashboard summary) ===== */
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
  padding: 14px 12px;
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

/* ===== Watchlist strip ===== */
.watchlist-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-width: none;
}
.watchlist-strip::-webkit-scrollbar { display: none; }
.wl-card {
  flex: 0 0 auto;
  width: 112px;
  padding: 12px 12px 11px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: transform 0.15s, border-color 0.15s;
}
.wl-card:active {
  transform: scale(0.97);
  border-color: var(--accent);
}
.wl-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.wl-sym {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wl-market {
  font-size: 9px;
  color: var(--text-4);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.wl-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.wl-change {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.wl-change.up { color: var(--up); }
.wl-change.down { color: var(--down); }
.wl-change.muted { color: var(--text-4); }
.wl-card.add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 6px;
  color: var(--text-2);
  background: var(--surface-raised);
  border-style: dashed;
  font-size: 12px;
  font-weight: 600;
}
.watchlist-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px dashed var(--border-strong);
}
.watchlist-empty .van-icon:first-child {
  font-size: 24px;
  color: var(--c-indigo);
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-indigo-soft);
}
.we-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.we-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.we-desc {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.5;
}
.we-arrow {
  color: var(--text-3);
  font-size: 14px;
}

/* ===== Strategy stat widget ===== */
.stat-widget {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 4px;
}
.stat-col {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 2px 6px;
}
.stat-col + .stat-col::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 1px;
  background: var(--hairline);
}
.stat-val {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.stat-lab {
  font-size: 11px;
  color: var(--text-3);
}
.stat-col.running .stat-val { color: var(--up); }
.stat-col.error .stat-val { color: var(--down); }
.stat-col.stopped .stat-val { color: var(--text-2); }
.pulse-dot {
  position: absolute;
  top: 10px; right: calc(50% - 18px);
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--up);
  box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4);
  animation: pulseDot 1.8s ease-out infinite;
}
@keyframes pulseDot {
  0% { box-shadow: 0 0 0 0 rgba(52,199,89,0.4); }
  70% { box-shadow: 0 0 0 7px rgba(52,199,89,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
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
