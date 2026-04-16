<template>
  <div class="trading-page">
    <div class="hero-card">
      <div>
        <span class="hero-title">自动化策略</span>
        <p class="hero-desc">手机端第一版只保留查看、启动、停止与状态检查，复杂创建流程留给 PC 端。</p>
      </div>
      <van-button size="small" type="primary" plain @click="$router.push('/profile/credentials')">
        先配 API Key
      </van-button>
    </div>

    <div class="search-bar">
      <van-search
        v-model="searchText"
        placeholder="搜索策略名称或交易对"
        shape="round"
        background="transparent"
      />
    </div>

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
            <div>
              <span class="name">{{ strategy.name || '未命名策略' }}</span>
              <p class="symbol">{{ strategy.trading_config?.symbol || strategy.symbol || '-' }}</p>
            </div>
            <span :class="['status-badge', strategy.status]">{{ getStatusText(strategy.status) }}</span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="label">周期</span>
              <span class="value">{{ strategy.trading_config?.timeframe || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">模式</span>
              <span class="value">{{ strategy.strategy_mode || strategy.type || 'indicator' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">指标</span>
              <span class="value">{{ strategy.indicator?.name || strategy.indicator_name || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">盈亏</span>
              <span :class="['value', pnlClass(strategy)]">{{ formatSigned(strategy.performance?.total_pnl) }}</span>
            </div>
          </div>

          <div class="card-actions">
            <van-button size="small" plain @click.stop="goToDetail(strategy.id)">
              查看详情
            </van-button>
            <van-button
              v-if="strategy.status === 'running'"
              size="small"
              type="danger"
              :loading="!!strategy._loading"
              @click.stop="stopStrategy(strategy)"
            >
              停止
            </van-button>
            <van-button
              v-else
              size="small"
              type="primary"
              :loading="!!strategy._loading"
              @click.stop="startStrategy(strategy)"
            >
              启动
            </van-button>
          </div>
        </div>

        <van-empty v-if="!loading && filteredStrategies.length === 0" description="当前没有可用策略" />
      </div>
    </van-pull-refresh>

    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
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
        { label: '全部', value: 'all', count: counts.total },
        { label: '运行中', value: 'running', count: counts.running },
        { label: '异常', value: 'error', count: counts.error },
        { label: '已停止', value: 'stopped', count: counts.stopped }
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

    pnlClass(strategy) {
      const num = Number(strategy.performance?.total_pnl || 0)
      if (num > 0) return 'profit'
      if (num < 0) return 'loss'
      return ''
    },

    goToDetail(id) {
      this.$router.push(`/trading/strategy/${id}`)
    },

    async startStrategy(strategy) {
      strategy._loading = true
      try {
        await strategyApi.start(strategy.id)
        showToast({ message: '策略已启动', type: 'success' })
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
          title: '确认停止',
          message: `确定要停止 ${strategy.name} 吗？`
        })
        strategy._loading = true
        await strategyApi.stop(strategy.id)
        showToast({ message: '策略已停止', type: 'success' })
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
}

.hero-card {
  margin: 16px;
  padding: 18px;
  border-radius: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.hero-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.hero-desc {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
}

.search-bar {
  padding: 0 16px 8px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 16px 14px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  white-space: nowrap;
}

.tab-item small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.44);
}

.tab-item.active {
  color: #050505;
  background: rgba(240, 211, 155, 0.95);
}

.tab-item.active small {
  color: rgba(5, 5, 5, 0.65);
}

.strategy-list {
  padding: 0 16px;
}

.strategy-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.symbol {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.46);
}

.status-badge {
  flex-shrink: 0;
  padding: 5px 10px;
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

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item .label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
}

.meta-item .value {
  font-size: 14px;
  color: #fff;
  word-break: break-word;
}

.meta-item .value.profit {
  color: #34c759;
}

.meta-item .value.loss {
  color: #ff5f57;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
}

.card-actions :deep(.van-button) {
  flex: 1;
  border-radius: 12px;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
}
</style>
