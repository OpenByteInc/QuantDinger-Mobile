<template>
  <div class="records-page">
    <van-nav-bar
      title="交易记录"
      left-arrow
      @click-left="$router.back()"
      :border="false"
    />
    
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="content">
        <div v-if="trades.length > 0" class="trade-list">
          <div v-for="trade in trades" :key="trade.id" class="trade-item">
            <div class="trade-header">
              <span class="symbol">{{ trade.symbol }}</span>
              <span :class="['direction', trade.type?.toLowerCase()]">{{ trade.type }}</span>
              <span class="time">{{ formatTime(trade.time) }}</span>
            </div>
            <div class="trade-body">
              <div class="info">
                <span class="label">手数</span>
                <span class="value">{{ trade.volume }}</span>
              </div>
              <div class="info">
                <span class="label">价格</span>
                <span class="value">{{ trade.price }}</span>
              </div>
              <div class="info">
                <span class="label">盈亏</span>
                <span :class="['value', (trade.profit || 0) >= 0 ? 'profit' : 'loss']">
                  {{ formatPnl(trade.profit) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <van-empty v-else image="search" description="暂无交易记录" />
      </div>
    </van-pull-refresh>
    
    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
  </div>
</template>

<script>
import { strategyApi } from '@/api'

export default {
  name: 'TradeRecords',
  
  data() {
    return {
      strategyId: null,
      trades: [],
      loading: false,
      refreshing: false
    }
  },
  
  mounted() {
    this.strategyId = this.$route.params.id
    this.loadTrades()
  },
  
  methods: {
    async loadTrades() {
      this.loading = true
      try {
        const res = await strategyApi.getTrades(this.strategyId, 100)
        if (res.code === 1) {
          this.trades = res.data || []
        }
      } catch (err) {
        console.error('Load trades error:', err)
      } finally {
        this.loading = false
      }
    },
    
    async onRefresh() {
      await this.loadTrades()
      this.refreshing = false
    },
    
    formatTime(time) {
      if (!time) return '-'
      const d = new Date(time)
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    
    formatPnl(val) {
      if (val === undefined || val === null) return '-'
      const sign = val >= 0 ? '+' : ''
      return `${sign}${val.toFixed(2)}`
    }
  }
}
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: transparent;
}

.records-page :deep(.van-nav-bar) { background: transparent; }
.records-page :deep(.van-nav-bar__title),
.records-page :deep(.van-nav-bar__arrow),
.records-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.content { padding: 16px; }

.trade-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trade-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
}

.trade-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.trade-header .symbol {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.direction {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
}

.direction.buy  { background: var(--up-soft);   color: var(--up); }
.direction.sell { background: var(--down-soft); color: var(--down); }

.trade-header .time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-3);
}

.trade-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info .label {
  font-size: 11px;
  color: var(--text-3);
}

.info .value {
  font-size: 14px;
  color: var(--text);
}

.info .value.profit { color: var(--up); }
.info .value.loss   { color: var(--down); }

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}
</style>
