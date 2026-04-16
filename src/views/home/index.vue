<template>
  <div class="home-page">
    <div class="header">
      <div class="brand-block" @click="refreshData">
        <img :src="logoUrl" alt="Logo" class="brand-logo" />
        <div class="session-meta">
          <span class="session-chip">{{ greetingText }}</span>
          <span class="refresh-text">傻瓜式量化操作入口</span>
        </div>
      </div>
      <div class="user" @click="$router.push('/profile')">
        <van-icon name="setting-o" size="22" />
      </div>
    </div>

    <div class="asset-card" @click="refreshData">
      <div class="asset-header">
        <div>
          <div class="title-row">
            <span class="label">总资产</span>
            <span class="currency">USD</span>
          </div>
          <p class="asset-note">同步本地策略统计与账户摘要</p>
        </div>
        <van-icon :name="showAsset ? 'eye-o' : 'closed-eye'" @click.stop="showAsset = !showAsset" />
      </div>
      <div class="asset-value">{{ showAsset ? formatMoney(totalAssets) : '******' }}</div>
      <div class="asset-insights">
        <div class="insight-block">
          <span class="caption">累计盈亏</span>
          <span :class="['insight-value', totalPnl >= 0 ? 'profit' : 'loss']">
            {{ showAsset ? formatSignedMoney(totalPnl) : '****' }}
          </span>
        </div>
        <div class="insight-block">
          <span class="caption">未读通知</span>
          <span class="insight-value neutral">{{ unreadCount }}</span>
        </div>
      </div>
    </div>

    <div v-if="!hasCredentials" class="setup-card">
      <div>
        <span class="setup-title">先完成交易所 API Key 配置</span>
        <p class="setup-desc">添加 Binance、OKX、Bybit 等加密交易所凭证后，才能在手机端进行闪电交易和查看账户余额。</p>
      </div>
      <van-button type="primary" size="small" @click="$router.push('/profile/credentials/new')">
        立即添加
      </van-button>
    </div>

    <div class="section">
      <div class="section-header">
        <div>
          <span class="title">一键操作</span>
          <p class="section-note">围绕手机端最常见的三件事设计</p>
        </div>
      </div>
      <div class="quick-actions">
        <div class="action-item" @click="$router.push('/profile/credentials')">
          <div class="icon">
            <van-icon name="shield-o" />
          </div>
          <div class="action-copy">
            <span>API Key 管理</span>
            <small>{{ hasCredentials ? `已配置 ${credentialCount} 个` : '尚未配置' }}</small>
          </div>
        </div>
        <div class="action-item" @click="$router.push('/trading')">
          <div class="icon">
            <van-icon name="apps-o" />
          </div>
          <div class="action-copy">
            <span>自动化策略</span>
            <small>查看并启动现有策略</small>
          </div>
        </div>
        <div class="action-item" @click="$router.push('/quick-trade')">
          <div class="icon">
            <van-icon name="exchange" />
          </div>
          <div class="action-copy">
            <span>闪电交易</span>
            <small>手动快下单与平仓</small>
          </div>
        </div>
        <div class="action-item" @click="$router.push('/profile/notifications')">
          <div class="icon">
            <van-icon name="bell" />
          </div>
          <div class="action-copy">
            <span>消息中心</span>
            <small>{{ unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读消息' }}</small>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div>
          <span class="title">策略状态</span>
          <p class="section-note">快速判断哪些策略在跑、哪些需要处理</p>
        </div>
        <span class="more" @click="$router.push('/trading')">查看全部</span>
      </div>
      <div class="strategy-stats">
        <div class="stat-item" @click="goToTrading('all')">
          <span class="value">{{ strategyCounts.total }}</span>
          <span class="label">全部</span>
        </div>
        <div class="stat-item running" @click="goToTrading('running')">
          <span class="value">{{ strategyCounts.running }}</span>
          <span class="label">运行中</span>
        </div>
        <div class="stat-item error" @click="goToTrading('error')">
          <span class="value">{{ strategyCounts.error }}</span>
          <span class="label">异常</span>
        </div>
        <div class="stat-item stopped" @click="goToTrading('stopped')">
          <span class="value">{{ strategyCounts.stopped }}</span>
          <span class="label">已停止</span>
        </div>
      </div>
    </div>

    <div v-if="alertStrategies.length" class="section">
      <div class="section-header">
        <div>
          <span class="title">待处理异常</span>
          <p class="section-note">建议优先检查这些策略</p>
        </div>
      </div>
      <div class="list-card">
        <div v-for="item in alertStrategies.slice(0, 3)" :key="item.id" class="list-row" @click="openStrategy(item.id)">
          <div>
            <span class="row-title">{{ item.name }}</span>
            <p class="row-subtitle">{{ item.trading_config?.symbol || '-' }} · {{ item.trading_config?.timeframe || '-' }}</p>
          </div>
          <van-tag type="danger" plain>异常</van-tag>
        </div>
      </div>
    </div>

    <div v-if="recentTrades.length" class="section">
      <div class="section-header">
        <div>
          <span class="title">最近成交</span>
          <p class="section-note">来自仪表盘的最新交易记录</p>
        </div>
      </div>
      <div class="list-card">
        <div v-for="trade in recentTrades.slice(0, 4)" :key="trade.id || trade.created_at" class="list-row">
          <div>
            <span class="row-title">{{ trade.symbol || trade.instrument || '未知标的' }}</span>
            <p class="row-subtitle">{{ formatTradeMeta(trade) }}</p>
          </div>
          <span :class="['pnl', Number(trade.profit || 0) >= 0 ? 'profit' : 'loss']">
            {{ formatSignedMoney(trade.profit || 0) }}
          </span>
        </div>
      </div>
    </div>

    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
  </div>
</template>

<script>
import { credentialsApi, dashboardApi, strategyApi } from '@/api'
import {
  useCredentialsStore,
  useDashboardStore,
  useNotificationStore,
  useStrategyStore
} from '@/stores'
import logoUrl from '@/assets/logo.png'

export default {
  name: 'Home',

  data() {
    return {
      logoUrl,
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
    credentialsStore() {
      return useCredentialsStore()
    },
    notificationStore() {
      return useNotificationStore()
    },
    greetingText() {
      const hour = new Date().getHours()
      if (hour < 6) return '夜间巡航'
      if (hour < 12) return '早盘检查'
      if (hour < 18) return '盘中跟踪'
      return '收盘复核'
    },
    totalAssets() {
      return this.dashboardStore.totalAssets
    },
    totalPnl() {
      return this.dashboardStore.totalPnl
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
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [summaryRes, strategyRes, credentialsRes, unreadRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          strategyApi.getList(),
          credentialsApi.list(),
          strategyApi.getUnreadNotificationCount()
        ])
        this.dashboardStore.setSummary(summaryRes.status === 'fulfilled' ? (summaryRes.value.data || {}) : {})
        this.strategyStore.setStrategies(strategyRes.status === 'fulfilled' ? (strategyRes.value.data || []) : [])
        this.credentialsStore.setItems(credentialsRes.status === 'fulfilled' ? (credentialsRes.value.data || []) : [])
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
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 18px 16px 110px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 54px;
  height: 54px;
  object-fit: contain;
}

.session-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.session-chip {
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(212, 176, 106, 0.1);
  color: rgba(212, 176, 106, 0.92);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.refresh-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.user {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.asset-card {
  margin-bottom: 24px;
  padding: 22px 20px;
  border-radius: 22px;
}

.asset-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.currency {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.asset-note {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
}

.asset-value {
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 16px;
}

.asset-insights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.insight-block {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
}

.caption {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 6px;
}

.insight-value {
  font-size: 16px;
  font-weight: 700;
}

.insight-value.profit,
.pnl.profit {
  color: #34c759;
}

.insight-value.loss,
.pnl.loss {
  color: #ff5f57;
}

.insight-value.neutral {
  color: #fff;
}

.setup-card {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px;
  margin-bottom: 24px;
  border-radius: 20px;
  background: rgba(212, 176, 106, 0.08);
  border: 1px solid rgba(212, 176, 106, 0.18);
}

.setup-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.setup-desc {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.65);
}

.section {
  margin-bottom: 26px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 14px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.section-note {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
}

.more {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--primary-color);
  background: rgba(212, 176, 106, 0.1);
}

.action-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.action-copy span {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.action-copy small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.46);
}

.strategy-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.stat-item {
  padding: 18px 10px 16px;
  border-radius: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item .value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.stat-item .label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-item.running .value {
  color: #34c759;
}

.stat-item.error .value {
  color: #ff5f57;
}

.stat-item.stopped .value {
  color: #8e8e93;
}

.list-card {
  border-radius: 18px;
  overflow: hidden;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.list-row:last-child {
  border-bottom: none;
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

.pnl {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
}
</style>
