<template>
  <div class="trading-page">
    <!-- Compact page header -->
    <div class="nav-header">
      <div class="nav-row">
        <div class="nav-copy">
          <span class="nav-eyebrow">{{ $t('trading.hero_eyebrow') }}</span>
          <h1 class="nav-title">{{ $t('trading.hero_title') }}</h1>
          <p>{{ $t('trading.hero_desc_simple') }}</p>
        </div>
        <div class="nav-actions">
          <button class="nav-plus" type="button" @click="$router.push('/trading/create')">
            <van-icon name="plus" />
            <span>{{ $t('trading.add_strategy') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- KPI Cards (aligned with PC trading-bot view) -->
    <div class="kpi-row">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="kpi-card"
      >
        <div class="kpi-icon" :style="{ color: kpi.color, background: kpi.color + '1a' }">
          <van-icon :name="kpi.icon" />
        </div>
        <div class="kpi-body">
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value" :class="kpi.cls">{{ kpi.value }}</div>
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
      <button type="button" class="sort-button" @click="showSortActions = true">
        <van-icon name="sort" />
        <span>{{ sortLabel }}</span>
      </button>
    </div>

    <!-- Segmented status filter -->
    <div class="filter-tabs" role="tablist" :aria-label="$t('trading.status_filter')">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="currentStatus === tab.value"
        :class="['tab-item', { active: currentStatus === tab.value }]"
        @click="currentStatus = tab.value"
      >
        <span>{{ tab.label }}</span>
        <small>{{ tab.count }}</small>
      </button>
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
                <span class="symbol">{{ strategy.symbol || '-' }} · {{ strategy.timeframe || '-' }}</span>
              </div>
            </div>
            <div class="badge-stack">
              <span :class="['status-badge', strategy.status]">
                <span class="dot"></span>
                {{ getStatusText(strategy.status) }}
              </span>
              <span :class="['mode-badge', isLiveStrategy(strategy) ? 'live' : 'signal']">
                {{ executionModeLabel(strategy) }}
              </span>
            </div>
          </div>

          <button
            v-if="strategyNeedsAttention(strategy)"
            type="button"
            class="card-risk"
            @click.stop="goToDetail(strategy.id)"
          >
            <van-icon name="warning-o" />
            <span>{{ strategyAttentionText(strategy) }}</span>
            <van-icon name="arrow" />
          </button>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="label">{{ $t('trading.strategy_source') }}</span>
              <span class="value">{{ strategySource(strategy) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ $t('trading.execution_account') }}</span>
              <span class="value">{{ strategyAccount(strategy) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ $t('trading.market_type') }}</span>
              <span class="value">{{ strategyMarket(strategy) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">{{ isLiveStrategy(strategy) ? $t('trading.total_pnl') : $t('trading.run_result') }}</span>
              <span v-if="isLiveStrategy(strategy)" :class="['value pnl', pnlClass(strategy)]">{{ formatPnl(strategy) }}</span>
              <span v-else class="value signal-only">{{ $t('trading.signal_only') }}</span>
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
              @click.stop="requestStopStrategy(strategy)"
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
            <van-button
              size="small"
              plain
              @click.stop="openMore(strategy)"
            >
              {{ $t('common.more') }}
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

    <van-action-sheet
      v-model:show="showStopActions"
      :actions="stopActions"
      :cancel-text="$t('common.cancel')"
      :description="stopPolicyDescription"
      close-on-click-action
      @select="onStopAction"
      @closed="stopTarget = null"
    />
    <van-action-sheet
      v-model:show="showMoreActions"
      :actions="moreActions"
      :cancel-text="$t('common.cancel')"
      close-on-click-action
      @select="onMoreAction"
      @closed="moreTarget = null"
    />
    <van-action-sheet
      v-model:show="showSortActions"
      :actions="sortActions"
      :cancel-text="$t('common.cancel')"
      close-on-click-action
      @select="onSortAction"
    />

    <van-loading v-if="loading" class="page-loading" vertical>{{ $t('common.loading') }}</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { scriptSourceApi, strategyApi } from '@/api'
import { useStrategyStore } from '@/stores'

export default {
  name: 'Trading',

  data() {
    return {
      searchText: '',
      currentStatus: 'all',
      loading: false,
      refreshing: false,
      showStopActions: false,
      stopTarget: null,
      showMoreActions: false,
      showSortActions: false,
      sortMode: 'attention',
      moreTarget: null,
      sourceNames: {}
    }
  },

  computed: {
    strategyStore() {
      return useStrategyStore()
    },
    strategies() {
      return this.strategyStore.strategies
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
    stopPolicyDescription() {
      const name = this.stopTarget?.name || this.$t('trading.untitled')
      return `${name} · ${this.$t('trading.stop_policy_desc')}`
    },
    moreActions() {
      const running = this.moreTarget?.status === 'running'
      const hasExposure = this.strategyHasExposure(this.moreTarget)
      return [
        {
          name: this.$t('trading.action_edit'),
          subname: running ? this.$t('trading.stop_before_edit') : this.$t('trading.edit_hint'),
          action: 'edit',
          disabled: running
        },
        {
          name: this.$t('trading.action_delete'),
          subname: hasExposure
            ? this.$t('trading.delete_blocked_exposure')
            : (running ? this.$t('trading.stop_before_delete') : this.$t('trading.delete_hint')),
          action: 'delete',
          color: 'var(--down)',
          disabled: running || hasExposure
        }
      ]
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
    sortActions() {
      return [
        { name: this.$t('trading.sort_attention'), value: 'attention' },
        { name: this.$t('trading.sort_recent'), value: 'recent' },
        { name: this.$t('trading.sort_name'), value: 'name' }
      ]
    },
    sortLabel() {
      return this.sortActions.find((item) => item.value === this.sortMode)?.name || ''
    },
    kpiCards() {
      const list = this.strategies || []
      const liveList = list.filter((strategy) => this.isLiveStrategy(strategy))
      const total = list.length
      const running = list.filter((s) => s.status === 'running').length
      const errors = list.filter((s) => this.strategyNeedsAttention(s)).length
      let totalPnl = 0
      liveList.forEach((s) => {
        const pnl = this.bestPnl(s)
        if (Number.isFinite(pnl)) totalPnl += pnl
      })
      const pnlSign = totalPnl >= 0 ? '+' : ''
      return [
        {
          label: this.$t('trading.kpi_running'),
          value: `${running} / ${total}`,
          icon: 'play-circle-o',
          color: '#18b87a'
        },
        {
          label: this.$t('trading.kpi_attention'),
          value: String(errors),
          icon: 'warning-o',
          color: errors ? '#ef5350' : '#8b93a7'
        },
        {
          label: this.$t('trading.kpi_live_pnl'),
          value: `${pnlSign}$${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          icon: 'chart-trending-o',
          color: totalPnl >= 0 ? '#18b87a' : '#ef5350',
          cls: totalPnl >= 0 ? 'kpi-up' : 'kpi-down'
        }
      ]
    },
    filteredStrategies() {
      const list = this.strategies.filter((item) => {
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
      return list.sort((a, b) => {
        if (this.sortMode === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
        if (this.sortMode === 'recent') {
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
        }
        return Number(this.strategyNeedsAttention(b)) - Number(this.strategyNeedsAttention(a))
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
        const [strategyResult, sourceResult] = await Promise.allSettled([
          strategyApi.getList(),
          scriptSourceApi.getList()
        ])
        if (strategyResult.status === 'rejected') throw strategyResult.reason
        this.strategyStore.setStrategies(strategyResult.value.data || [])
        if (sourceResult.status === 'fulfilled') {
          this.sourceNames = Object.fromEntries(
            (sourceResult.value.data || []).map((source) => [
              Number(source.id),
              source.name || source.strategy_name || source.display_name || `#${source.id}`
            ])
          )
        }
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
    onSortAction(action) {
      this.sortMode = action?.value || 'attention'
      this.showSortActions = false
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

    /**
     * Resolve a strategy's realized + unrealized P&L. PC uses
     * `unrealized_pnl` directly on the strategy. Older mobile payloads
     * stored a derived value under `performance.total_pnl`. Accept
     * both so the badge value never silently reads as 0.00 just
     * because the field name changed.
     */
    bestPnl(strategy) {
      const candidates = [
        strategy?.unrealized_pnl,
        strategy?.performance?.total_pnl,
        strategy?.performance?.unrealized_pnl,
        strategy?.realized_pnl
      ]
      for (const v of candidates) {
        if (v === null || v === undefined || v === '') continue
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
      return 0
    },

    formatPnl(strategy) {
      if (!this.isLiveStrategy(strategy)) return '--'
      const num = this.bestPnl(strategy)
      const sign = num > 0 ? '+' : ''
      return `${sign}$${num.toFixed(2)}`
    },

    formatCapital(strategy) {
      if (!this.isLiveStrategy(strategy)) return '--'
      const cap = Number(strategy?.initial_capital || 0)
      if (!Number.isFinite(cap) || cap <= 0) return '-'
      return `$${cap.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    },

    pnlClass(strategy) {
      if (!this.isLiveStrategy(strategy)) return ''
      const num = this.bestPnl(strategy)
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

    goToDetail(id) {
      this.$router.push(`/trading/strategy/${id}`)
    },

    editStrategy(strategy) {
      if (strategy.status === 'running') return
      this.$router.push({ path: '/trading/create/configure', query: { edit: strategy.id } })
    },

    openMore(strategy) {
      this.moreTarget = strategy
      this.showMoreActions = true
    },

    onMoreAction(action) {
      const strategy = this.moreTarget
      this.showMoreActions = false
      this.moreTarget = null
      if (!strategy || action?.disabled) return
      if (action.action === 'edit') this.editStrategy(strategy)
      if (action.action === 'delete') this.deleteStrategy(strategy)
    },

    strategySource(strategy) {
      const sourceId = Number(strategy?.trading_config?.script_source_id || strategy?.script_source_id || 0)
      return strategy?.source_name ||
        strategy?.template_name ||
        strategy?.indicator?.name ||
        strategy?.script_source_name ||
        this.sourceNames[sourceId] ||
        strategy?.strategy_type ||
        this.$t('trading.custom_strategy')
    },

    strategyAccount(strategy) {
      if (!this.isLiveStrategy(strategy)) return this.$t('trading.no_account_needed')
      return strategy?.exchange_config?.credential_name ||
        strategy?.exchange_config?.account_name ||
        strategy?.exchange_config?.exchange_name ||
        strategy?.exchange_config?.exchange_id ||
        strategy?.trading_config?.exchange ||
        this.$t('trading.account_unset')
    },

    strategyMarket(strategy) {
      const config = strategy?.trading_config || {}
      const market = config.market_type || strategy?.market_type || strategy?.market || '-'
      const leverage = Number(config.leverage || strategy?.leverage || 0)
      return leverage > 1 ? `${market} · ${leverage}x` : String(market)
    },

    async deleteStrategy(strategy) {
      if (strategy.status === 'running' || this.strategyHasExposure(strategy)) {
        showToast({ message: this.$t('trading.delete_blocked_exposure'), type: 'fail' })
        return
      }
      try {
        await showConfirmDialog({
          title: this.$t('trading.delete_title'),
          message: this.$t('trading.delete_confirm', { name: strategy.name || '' })
        })
        strategy._loading = true
        await strategyApi.delete(strategy.id)
        showToast({ message: this.$t('common.success'), type: 'success' })
        await this.loadStrategies()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Delete strategy failed:', error)
        }
      } finally {
        strategy._loading = false
      }
    },

    async startStrategy(strategy) {
      if (this.strategyHasExposure(strategy)) {
        try {
          await showConfirmDialog({
            title: this.$t('trading.restart_with_position_title'),
            message: this.$t('trading.restart_with_position_msg', {
              count: strategy.open_position_count || strategy.position_count || 1
            })
          })
        } catch {
          return
        }
      }
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

    isLiveStrategy(strategy) {
      return String(strategy?.execution_mode || strategy?.trading_config?.execution_mode || '').toLowerCase() === 'live'
    },

    executionModeLabel(strategy) {
      return this.$t(this.isLiveStrategy(strategy)
        ? 'indicator_bot.execution_mode_live'
        : 'indicator_bot.execution_mode_signal')
    },

    strategyHasExposure(strategy) {
      if (!strategy) return false
      const positions = Number(
        strategy.open_position_count ??
        strategy.position_count ??
        strategy.positions_count ??
        strategy.active_positions ??
        0
      )
      const orders = Number(strategy.pending_order_count ?? strategy.open_order_count ?? 0)
      return Boolean(strategy.has_open_position || strategy.has_open_positions || positions > 0 || orders > 0)
    },

    strategyAccountConfigured(strategy) {
      if (!this.isLiveStrategy(strategy)) return true
      const exchange = strategy?.exchange_config || {}
      return Boolean(
        exchange.credential_id ||
        exchange.credential_name ||
        exchange.account_name ||
        strategy?.trading_config?.credential_id
      )
    },

    strategyNeedsAttention(strategy) {
      if (!strategy) return false
      if (strategy.status === 'error') return true
      if (strategy.status !== 'running' && this.strategyHasExposure(strategy)) return true
      return this.isLiveStrategy(strategy) && !this.strategyAccountConfigured(strategy)
    },

    strategyAttentionText(strategy) {
      if (strategy?.status !== 'running' && this.strategyHasExposure(strategy)) {
        return this.$t('trading.stopped_position_attention')
      }
      if (this.isLiveStrategy(strategy) && !this.strategyAccountConfigured(strategy)) {
        return this.$t('trading.account_requires_attention')
      }
      return this.$t('trading.strategy_run_error')
    },

    async requestStopStrategy(strategy) {
      if (this.isLiveStrategy(strategy)) {
        this.stopTarget = strategy
        this.showStopActions = true
        return
      }
      await this.confirmStopStrategy(strategy, false)
    },

    async onStopAction(action) {
      const strategy = this.stopTarget
      this.showStopActions = false
      this.stopTarget = null
      if (!strategy) return
      await this.confirmStopStrategy(strategy, Boolean(action?.closePositions))
    },

    async confirmStopStrategy(strategy, closePositions) {
      try {
        await showConfirmDialog({
          title: this.$t(closePositions ? 'trading.confirm_stop_close_title' : 'trading.confirm_stop_title'),
          message: this.$t(closePositions ? 'trading.confirm_stop_close_msg' : 'trading.confirm_stop_msg')
        })
        strategy._loading = true
        await strategyApi.stop(strategy.id, closePositions)
        showToast({
          message: this.$t(closePositions ? 'trading.stop_close_success' : 'trading.stop_success'),
          type: 'success'
        })
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
  padding: calc(12px + var(--safe-area-top, 0px)) 16px 12px 66px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), transparent),
    var(--bg);
  border-bottom: 1px solid var(--border);
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
}
.nav-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.nav-eyebrow {
  display: inline-block;
  width: max-content;
  max-width: 92px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  color: var(--accent);
  background: transparent;
  border: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 0;
  line-height: 1.2;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-copy p {
  max-width: 220px;
  margin: 0;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.4;
}
.nav-plus {
  min-width: 44px;
  height: 44px;
  padding: 0 13px;
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: var(--surface-raised);
  color: var(--text);
  font-size: 14px;
  font-weight: 800;
  box-shadow: var(--shadow-card);
  appearance: none;
  -webkit-appearance: none;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  padding: 4px 16px 0;
}
.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 10px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.kpi-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.kpi-body { min-width: 0; flex: 1; }
.kpi-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kpi-value {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-value.kpi-up { color: var(--up); }
.kpi-value.kpi-down { color: var(--down); }

.search-bar {
  padding: 8px 16px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-bar :deep(.van-search) { min-width: 0; flex: 1; padding: 0; }
.search-bar :deep(.van-search__content) {
  background: var(--surface-raised) !important;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.sort-button {
  min-height: 42px;
  max-width: 108px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 11px;
}
.sort-button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
  min-height: 40px;
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
  letter-spacing: 0;
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

.badge-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.mode-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.mode-badge.live {
  color: var(--down);
  background: var(--down-soft);
}

.mode-badge.signal {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface-raised));
}

.bot-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.card-risk {
  width: 100%;
  min-height: 42px;
  margin: -2px 0 12px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--down) 32%, var(--border));
  border-radius: 11px;
  color: var(--down);
  background: color-mix(in srgb, var(--down) 8%, var(--surface-deep));
  text-align: left;
  font-size: 12px;
}

.card-risk span { flex: 1; }

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-item .label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta-item .value {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  word-break: break-all;
  font-variant-numeric: tabular-nums;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta-item .value.pnl { font-weight: 700; }
.meta-item .value.profit { color: var(--up); }
.meta-item .value.loss { color: var(--down); }
.meta-item .value.signal-only { color: var(--accent); font-size: 12px; }

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.card-actions :deep(.van-button) {
  flex: 1;
  border-radius: 12px;
  height: 44px;
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

</style>
