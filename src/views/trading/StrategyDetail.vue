<template>
  <div class="detail-page">
    <van-nav-bar
      :title="strategy?.name || '策略详情'"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    />

    <div v-if="strategy" class="content">
      <div class="status-card">
        <div>
          <span class="detail-name">{{ strategy.name || '未命名策略' }}</span>
          <p class="detail-subtitle">{{ strategy.trading_config?.symbol || '-' }} · {{ strategy.trading_config?.timeframe || '-' }}</p>
        </div>
        <span :class="['status-badge', strategy.status]">{{ getStatusText(strategy.status) }}</span>
      </div>

      <div class="action-row">
        <van-button plain block @click="refreshData">刷新</van-button>
        <van-button
          v-if="strategy.status === 'running'"
          block
          type="danger"
          :loading="actionLoading"
          @click="stopStrategy"
        >
          停止策略
        </van-button>
        <van-button
          v-else
          block
          type="primary"
          :loading="actionLoading"
          @click="startStrategy"
        >
          启动策略
        </van-button>
      </div>

      <div class="section-card">
        <div class="section-title">概览</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">指标</span>
            <span class="value">{{ strategy.indicator?.name || strategy.indicator_name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">模式</span>
            <span class="value">{{ strategy.strategy_mode || strategy.type || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">总盈亏</span>
            <span :class="['value', pnlValue >= 0 ? 'profit' : 'loss']">{{ formatSigned(pnlValue) }}</span>
          </div>
          <div class="info-item">
            <span class="label">胜率</span>
            <span class="value">{{ formatPercent(performance.win_rate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">交易笔数</span>
            <span class="value">{{ performance.total_trades || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="label">盈亏因子</span>
            <span class="value">{{ formatNumber(performance.profit_factor) }}</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">当前持仓</div>
        <div v-if="positions.length" class="simple-list">
          <div v-for="item in positions" :key="item.symbol + item.side" class="simple-row">
            <div>
              <span class="row-title">{{ item.symbol || '-' }}</span>
              <p class="row-subtitle">{{ item.side || '-' }} · 数量 {{ formatNumber(item.size) }}</p>
            </div>
            <span :class="['row-value', Number(item.unrealized_pnl || item.pnl || 0) >= 0 ? 'profit' : 'loss']">
              {{ formatSigned(item.unrealized_pnl || item.pnl || 0) }}
            </span>
          </div>
        </div>
        <van-empty v-else description="暂无持仓" />
      </div>

      <div class="section-card">
        <div class="section-title">最近成交</div>
        <div v-if="trades.length" class="simple-list">
          <div v-for="item in trades.slice(0, 10)" :key="item.id" class="simple-row">
            <div>
              <span class="row-title">{{ item.symbol || '-' }}</span>
              <p class="row-subtitle">{{ item.side || item.type || '-' }} · {{ formatTime(item.created_at || item.time) }}</p>
            </div>
            <span :class="['row-value', Number(item.profit || 0) >= 0 ? 'profit' : 'loss']">
              {{ formatSigned(item.profit || 0) }}
            </span>
          </div>
        </div>
        <van-empty v-else description="暂无成交记录" />
      </div>
    </div>

    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { strategyApi } from '@/api'

export default {
  name: 'StrategyDetail',

  data() {
    return {
      strategy: null,
      positions: [],
      trades: [],
      performance: {},
      loading: false,
      actionLoading: false
    }
  },

  computed: {
    strategyId() {
      return this.$route.params.id
    },
    pnlValue() {
      return Number(this.performance.total_profit || this.strategy?.performance?.total_pnl || 0)
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [detailRes, positionsRes, tradesRes] = await Promise.all([
          strategyApi.getDetail(this.strategyId),
          strategyApi.getPositions(this.strategyId),
          strategyApi.getTrades(this.strategyId, 20)
        ])

        this.strategy = detailRes.data || null
        this.positions = positionsRes.data || []
        this.trades = tradesRes.data || []
        this.performance = this.strategy?.performance || {}
      } catch (error) {
        console.error('Load strategy detail failed:', error)
        showToast({ message: '策略详情加载失败', type: 'fail' })
      } finally {
        this.loading = false
      }
    },

    async refreshData() {
      await this.loadData()
    },

    getStatusText(status) {
      const map = {
        running: '运行中',
        stopped: '已停止',
        error: '异常',
        starting: '启动中',
        stopping: '停止中'
      }
      return map[status] || '未知状态'
    },

    formatSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num.toFixed(2)}`
    },

    formatNumber(value) {
      const num = Number(value || 0)
      return num ? num.toFixed(2) : '0.00'
    },

    formatPercent(value) {
      const num = Number(value || 0)
      return `${num.toFixed(2)}%`
    },

    formatTime(value) {
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    async startStrategy() {
      this.actionLoading = true
      try {
        await strategyApi.start(this.strategyId)
        showToast({ message: '策略已启动', type: 'success' })
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
          title: '确认停止',
          message: '确定要停止该策略吗？'
        })
        this.actionLoading = true
        await strategyApi.stop(this.strategyId)
        showToast({ message: '策略已停止', type: 'success' })
        await this.loadData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Stop strategy failed:', error)
        }
      } finally {
        this.actionLoading = false
      }
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-bottom: 30px;
}

.detail-page :deep(.van-nav-bar) {
  background: transparent;
}

.detail-page :deep(.van-nav-bar__title),
.detail-page :deep(.van-nav-bar__arrow) {
  color: #fff;
}

.content {
  padding: 0 16px 24px;
}

.status-card,
.section-card {
  margin-bottom: 16px;
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.detail-name {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.detail-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}

.status-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.status-badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-badge.running {
  color: #34c759;
  background: rgba(52, 199, 89, 0.12);
}

.status-badge.error {
  color: #ff5f57;
  background: rgba(255, 95, 87, 0.12);
}

.status-badge.stopped {
  color: #8e8e93;
  background: rgba(142, 142, 147, 0.14);
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.action-row :deep(.van-button) {
  border-radius: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
}

.value,
.row-value {
  font-size: 14px;
  color: #fff;
}

.value.profit,
.row-value.profit {
  color: #34c759;
}

.value.loss,
.row-value.loss {
  color: #ff5f57;
}

.simple-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.simple-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.simple-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.row-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.row-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
}
</style>
