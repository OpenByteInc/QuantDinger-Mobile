<template>
  <div class="trading-page">
    <!-- iOS Large Title Nav -->
    <div class="nav-header">
      <div class="nav-row">
        <div>
          <span class="nav-eyebrow">{{ $t('trading.hero_eyebrow') }}</span>
          <h1 class="nav-title">{{ $t('trading.hero_title') }}</h1>
        </div>
        <div class="nav-plus" @click="$router.push('/trading/create')">
          <van-icon name="plus" />
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <van-search
        v-model="searchText"
        :placeholder="$t('trading.search_placeholder')"
        shape="round"
        background="transparent"
      />
    </div>

    <!-- Segmented status filter -->
    <div class="filter-tabs">
      <div
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['tab-item', { active: currentStatus === tab.value }]"
        @click="currentStatus = tab.value"
      >
        <span>{{ tab.label }}</span>
        <small>{{ tab.count }}</small>
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="strategy-list">
        <div
          v-for="strategy in filteredStrategies"
          :key="strategy.id"
          class="strategy-card"
          @click="goToDetail(strategy.id)"
        >
          <div class="card-top">
            <div class="strategy-ident">
              <div :class="['avatar', strategy.status]">
                <van-icon :name="statusIconName(strategy.status)" />
                <span v-if="strategy.status === 'running'" class="avatar-pulse"></span>
              </div>
              <div class="ident-text">
                <span class="name">{{ strategy.name || $t('trading.untitled') }}</span>
                <span class="symbol">{{ strategy.trading_config?.symbol || strategy.symbol || '-' }}</span>
              </div>
            </div>
            <span :class="['status-badge', strategy.status]">
              <span class="dot"></span>
              {{ getStatusText(strategy.status) }}
            </span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="label">{{ $t('bot_create.timeframe') }}</span>
              <span class="value">{{ strategy.trading_config?.timeframe || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ $t('trading.mode') }}</span>
              <span class="value">{{ modeLabel(strategy) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ indicatorLabelKey(strategy) }}</span>
              <span class="value">{{ indicatorDisplay(strategy) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ $t('trading.total_pnl') }}</span>
              <span :class="['value pnl', pnlClass(strategy)]">{{ formatSigned(strategy.performance?.total_pnl) }}</span>
            </div>
          </div>

          <div class="card-actions">
            <van-button size="small" plain @click.stop="goToDetail(strategy.id)">
              {{ $t('common.view_detail') }}
            </van-button>
            <van-button
              v-if="strategy.status === 'running'"
              size="small"
              type="danger"
              :loading="!!strategy._loading"
              @click.stop="stopStrategy(strategy)"
            >
              {{ $t('trading.stop') }}
            </van-button>
            <van-button
              v-else
              size="small"
              type="primary"
              :loading="!!strategy._loading"
              @click.stop="startStrategy(strategy)"
            >
              {{ $t('trading.start') }}
            </van-button>
          </div>
        </div>

        <van-empty v-if="!loading && filteredStrategies.length === 0" :description="$t('trading.empty_title')">
          <van-button round type="primary" size="small" @click="$router.push('/trading/create')">
            {{ $t('trading.create_btn') }}
          </van-button>
        </van-empty>
      </div>
    </van-pull-refresh>

    <div class="fab" @click="$router.push('/trading/create')">
      <van-icon name="plus" />
    </div>

    <van-loading v-if="loading" class="page-loading" vertical>{{ $t('common.loading') }}</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { strategyApi } from '@/api'
import { useStrategyStore } from '@/stores'

export default {
  name: 'Trading',

  data() {
    return {
      searchText: '',
      currentStatus: 'all',
      loading: false,
      refreshing: false
    }
  },

  computed: {
    strategyStore() {
      return useStrategyStore()
    },
    strategies() {
      return this.strategyStore.strategies
    },
    statusTabs() {
      const counts = this.strategyStore.statusCounts
      return [
        { label: this.$t('trading.filter_all'), value: 'all', count: counts.total },
        { label: this.$t('trading.filter_running'), value: 'running', count: counts.running },
        { label: this.$t('trading.filter_error'), value: 'error', count: counts.error },
        { label: this.$t('trading.filter_stopped'), value: 'stopped', count: counts.stopped }
      ]
    },
    filteredStrategies() {
      return this.strategies.filter((item) => {
        const hitStatus = this.currentStatus === 'all' || item.status === this.currentStatus
        const keyword = this.searchText.trim().toLowerCase()
        const hitKeyword = !keyword || [
          item.name,
          item.symbol,
          item.trading_config?.symbol,
          item.indicator?.name
        ].some((value) => String(value || '').toLowerCase().includes(keyword))
        return hitStatus && hitKeyword
      })
    }
  },

  watch: {
    '$route.query.status': {
      immediate: true,
      handler(value) {
        if (value) {
          this.currentStatus = value
        }
      }
    }
  },

  mounted() {
    this.loadStrategies()
  },

  methods: {
    async loadStrategies() {
      this.loading = true
      try {
        const res = await strategyApi.getList()
        this.strategyStore.setStrategies(res.data || [])
      } catch (error) {
        console.error('Load strategies failed:', error)
      } finally {
        this.loading = false
      }
    },

    async onRefresh() {
      await this.loadStrategies()
      this.refreshing = false
    },

    getStatusText(status) {
      const map = {
        running: this.$t('trading.filter_running'),
        stopped: this.$t('trading.filter_stopped'),
        error: this.$t('trading.filter_error'),
        starting: this.$t('trading.starting'),
        stopping: this.$t('trading.stopping')
      }
      return map[status] || status
    },

    formatSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num.toFixed(2)}`
    },

    pnlClass(strategy) {
      const num = Number(strategy.performance?.total_pnl || 0)
      if (num > 0) return 'profit'
      if (num < 0) return 'loss'
      return ''
    },

    statusIconName(status) {
      if (status === 'running') return 'play-circle-o'
      if (status === 'error') return 'warning-o'
      if (status === 'stopping') return 'stop-circle-o'
      return 'pause-circle-o'
    },

    botType(strategy) {
      const raw = (
        strategy?.strategy_mode ||
        strategy?.bot_type ||
        strategy?.type ||
        strategy?.strategy_type ||
        strategy?.trading_config?.bot_type ||
        ''
      )
      return String(raw || '').toLowerCase()
    },

    modeLabel(strategy) {
      const type = this.botType(strategy)
      if (!type) return this.$t('trading.indicator') || 'indicator'
      const key = `bot_create.type_${type}`
      const text = this.$t(key)
      if (text && text !== key) return text
      const rawKey = `bot_create.${type}`
      const raw = this.$t(rawKey)
      if (raw && raw !== rawKey) return raw
      return type.charAt(0).toUpperCase() + type.slice(1)
    },

    isBotMode(strategy) {
      const type = this.botType(strategy)
      return ['grid', 'martingale', 'trend', 'dca', 'ai'].includes(type)
    },

    indicatorLabelKey(strategy) {
      if (this.isBotMode(strategy)) {
        const key = 'trading.bot_type'
        const text = this.$t(key)
        return text && text !== key ? text : this.$t('trading.indicator')
      }
      return this.$t('trading.indicator')
    },

    indicatorDisplay(strategy) {
      const ic = strategy?.indicator_config || {}
      const indName = strategy?.indicator?.name || strategy?.indicator_name || ic?.indicator_name || ic?.name || ic?.display_name
      if (this.isBotMode(strategy)) {
        return this.modeLabel(strategy)
      }
      return indName || '-'
    },

    goToDetail(id) {
      this.$router.push(`/trading/strategy/${id}`)
    },

    async startStrategy(strategy) {
      strategy._loading = true
      try {
        await strategyApi.start(strategy.id)
        showToast({ message: this.$t('trading.start'), type: 'success' })
        await this.loadStrategies()
      } catch (error) {
        console.error('Start strategy failed:', error)
      } finally {
        strategy._loading = false
      }
    },

    async stopStrategy(strategy) {
      try {
        await showConfirmDialog({
          title: this.$t('trading.stop'),
          message: `${this.$t('trading.stop')} ${strategy.name} ?`
        })
        strategy._loading = true
        await strategyApi.stop(strategy.id)
        showToast({ message: this.$t('trading.stop'), type: 'success' })
        await this.loadStrategies()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Stop strategy failed:', error)
        }
      } finally {
        strategy._loading = false
      }
    }
  }
}
</script>

<style scoped>
.trading-page {
  min-height: 100vh;
  padding-bottom: 100px;
  background: var(--bg);
  color: var(--text);
}

.nav-header {
  padding: calc(14px + var(--safe-area-top, 0px)) 16px 10px;
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-eyebrow {
  display: inline-block;
  padding: 4px 10px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
}
.nav-title {
  font-size: 34px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
}
.nav-plus {
  width: 42px; height: 42px;
  border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: var(--text);
  color: var(--bg);
  font-size: 22px;
}

.search-bar {
  padding: 8px 16px 4px;
}
.search-bar :deep(.van-search) { padding: 0; }
.search-bar :deep(.van-search__content) {
  background: var(--surface-raised) !important;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 16px 14px;
  scrollbar-width: none;
}
.filter-tabs::-webkit-scrollbar { display: none; }

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-item small {
  font-size: 11px;
  color: var(--text-3);
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--surface-deep);
}

.tab-item.active {
  color: #0a0a0d;
  background: var(--accent-gold);
  border-color: var(--accent-gold);
}

.tab-item.active small {
  color: rgba(10,10,13,0.7);
  background: rgba(10,10,13,0.12);
}

.strategy-list {
  padding: 4px 16px;
}

.strategy-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  transition: transform 0.15s;
}
.strategy-card:active { transform: scale(0.985); }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.strategy-ident {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.avatar {
  position: relative;
  width: 38px; height: 38px;
  flex-shrink: 0;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  background: var(--surface-raised);
  color: var(--text-2);
  border: 1px solid var(--border);
}
.avatar.running {
  background: var(--up-soft);
  border-color: transparent;
  color: var(--up);
}
.avatar.error {
  background: var(--down-soft);
  border-color: transparent;
  color: var(--down);
}
.avatar.stopped {
  background: var(--surface-raised);
  color: var(--text-3);
}
.avatar.stopping, .avatar.starting {
  background: var(--warn-soft);
  color: var(--warn);
  border-color: transparent;
}
.avatar-pulse {
  position: absolute;
  inset: -2px;
  border-radius: 13px;
  border: 2px solid var(--up);
  opacity: 0.4;
  animation: cardPulse 1.8s ease-out infinite;
}
@keyframes cardPulse {
  0% { transform: scale(0.92); opacity: 0.5; }
  100% { transform: scale(1.15); opacity: 0; }
}

.ident-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.symbol {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.status-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-badge .dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.running {
  color: var(--up);
  background: var(--up-soft);
}

.status-badge.error {
  color: var(--down);
  background: var(--down-soft);
}

.status-badge.stopped {
  color: var(--text-3);
  background: var(--surface-raised);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-deep);
  border: 1px solid var(--hairline);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-item .label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta-item .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  word-break: break-word;
  font-variant-numeric: tabular-nums;
}

.meta-item .value.pnl { font-weight: 700; }
.meta-item .value.profit { color: var(--up); }
.meta-item .value.loss { color: var(--down); }

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.card-actions :deep(.van-button) {
  flex: 1;
  border-radius: 12px;
  height: 36px;
  font-size: 13px;
  font-weight: 600;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}

.fab {
  position: fixed;
  right: 18px;
  bottom: 88px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-grad);
  color: var(--on-accent);
  font-size: 24px;
  box-shadow: 0 10px 24px var(--accent-soft);
  z-index: 100;
}
</style>
