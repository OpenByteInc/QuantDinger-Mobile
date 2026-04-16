<template>
  <div class="quick-trade-page">
    <div class="hero-card">
      <div>
        <span class="hero-title">闪电交易</span>
        <p class="hero-desc">选凭证、输币对、填金额，直接完成手机端手动快下单。</p>
      </div>
      <van-button size="small" type="primary" plain @click="$router.push('/profile/credentials')">
        管理 API Key
      </van-button>
    </div>

    <div class="panel-card">
      <div class="panel-title">交易账户</div>
      <van-cell
        title="交易所"
        :value="selectedCredentialLabel || '请选择已保存的 API Key'"
        is-link
        @click="openCredentialPicker"
      />
      <div class="market-toggle">
        <span
          v-for="item in marketOptions"
          :key="item.value"
          :class="['toggle-item', { active: marketType === item.value }]"
          @click="setMarketType(item.value)"
        >
          {{ item.label }}
        </span>
      </div>
      <div class="balance-card">
        <div>
          <span class="balance-label">可用余额</span>
          <p class="balance-value">{{ formatNumber(balance?.available) }} {{ balance?.currency || 'USDT' }}</p>
        </div>
        <div class="balance-side">
          <span class="balance-label">总额</span>
          <p class="balance-sub">{{ formatNumber(balance?.total) }}</p>
        </div>
      </div>
      <van-button block plain @click="refreshTradeData">刷新余额与持仓</van-button>
    </div>

    <div class="panel-card">
      <div class="panel-title">下单参数</div>
      <van-field v-model="form.symbol" label="交易对" placeholder="例如 BTC/USDT" />
      <van-field v-model="form.amount" label="金额(USDT)" type="number" placeholder="例如 100" />
      <van-field
        v-if="form.order_type === 'limit'"
        v-model="form.price"
        label="限价"
        type="number"
        placeholder="请输入限价"
      />
      <van-field
        v-if="marketType === 'swap'"
        v-model="form.leverage"
        label="杠杆"
        type="number"
        placeholder="例如 5"
      />
      <div class="market-toggle compact">
        <span
          v-for="item in orderTypeOptions"
          :key="item.value"
          :class="['toggle-item', { active: form.order_type === item.value }]"
          @click="form.order_type = item.value"
        >
          {{ item.label }}
        </span>
      </div>
      <div class="action-row">
        <van-button type="success" block :loading="submitting" @click="submitOrder('buy')">
          买入
        </van-button>
        <van-button type="danger" block :loading="submitting" @click="submitOrder('sell')">
          卖出
        </van-button>
      </div>
    </div>

    <div class="panel-card">
      <div class="section-head">
        <span class="panel-title">当前持仓</span>
        <span class="helper-text">按当前交易对查询</span>
      </div>
      <div v-if="positions.length" class="list-wrap">
        <div v-for="position in positions" :key="position.symbol + position.side" class="list-row">
          <div>
            <span class="row-title">{{ position.symbol || '-' }}</span>
            <p class="row-subtitle">{{ getSideText(position.side) }} · 数量 {{ formatNumber(position.size) }}</p>
          </div>
          <div class="row-actions">
            <span :class="['row-value', Number(position.unrealized_pnl || position.pnl || 0) >= 0 ? 'profit' : 'loss']">
              {{ formatSigned(position.unrealized_pnl || position.pnl || 0) }}
            </span>
            <van-button size="mini" plain type="danger" @click="closePosition(position)">
              平仓
            </van-button>
          </div>
        </div>
      </div>
      <van-empty v-else description="暂无持仓" />
    </div>

    <div class="panel-card">
      <div class="section-head">
        <span class="panel-title">最近闪电交易</span>
        <span class="helper-text">{{ history.length }} 条记录</span>
      </div>
      <div v-if="history.length" class="list-wrap">
        <div v-for="item in history.slice(0, 12)" :key="item.id" class="list-row">
          <div>
            <span class="row-title">{{ item.symbol || '-' }}</span>
            <p class="row-subtitle">{{ getSideText(item.side) }} · {{ formatTime(item.created_at) }}</p>
          </div>
          <div class="history-side">
            <span class="row-value">{{ formatNumber(item.amount) }} USDT</span>
            <small>{{ getStatusText(item.status) }}</small>
          </div>
        </div>
      </div>
      <van-empty v-else description="暂无历史记录" />
    </div>

    <van-popup v-model:show="showCredentialPicker" position="bottom" round>
      <van-picker
        :columns="credentialActions"
        @cancel="showCredentialPicker = false"
        @confirm="onSelectCredential"
      />
    </van-popup>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi, quickTradeApi } from '@/api'
import { useCredentialsStore, useQuickTradeStore } from '@/stores'

export default {
  name: 'QuickTrade',

  data() {
    return {
      showCredentialPicker: false,
      submitting: false,
      form: {
        symbol: '',
        amount: '',
        price: '',
        leverage: '1',
        order_type: 'market'
      },
      marketOptions: [
        { label: '现货', value: 'spot' },
        { label: '合约', value: 'swap' }
      ],
      orderTypeOptions: [
        { label: '市价', value: 'market' },
        { label: '限价', value: 'limit' }
      ]
    }
  },

  computed: {
    credentialsStore() {
      return useCredentialsStore()
    },
    quickTradeStore() {
      return useQuickTradeStore()
    },
    credentials() {
      return this.credentialsStore.cryptoItems
    },
    selectedCredentialId() {
      return this.quickTradeStore.selectedCredentialId
    },
    marketType() {
      return this.quickTradeStore.marketType
    },
    balance() {
      return this.quickTradeStore.balance
    },
    positions() {
      return this.quickTradeStore.positions
    },
    history() {
      return this.quickTradeStore.history
    },
    selectedCredential() {
      return this.credentials.find((item) => item.id === this.selectedCredentialId)
    },
    selectedCredentialLabel() {
      if (!this.selectedCredential) return ''
      return `${this.selectedCredential.name} · ${String(this.selectedCredential.exchange_id || '').toUpperCase()}`
    },
    credentialActions() {
      return this.credentials.map((item) => ({
        text: `${item.name} · ${String(item.exchange_id || '').toUpperCase()}`,
        value: item.id
      }))
    }
  },

  watch: {
    selectedCredentialId: {
      immediate: true,
      handler() {
        this.refreshTradeData()
      }
    },
    marketType() {
      this.refreshTradeData()
    }
  },

  async mounted() {
    await this.bootstrap()
  },

  methods: {
    async bootstrap() {
      try {
        const [credentialsRes, historyRes] = await Promise.allSettled([
          credentialsApi.list(),
          quickTradeApi.getHistory()
        ])
        this.credentialsStore.setItems(credentialsRes.status === 'fulfilled' ? (credentialsRes.value.data || []) : [])
        this.quickTradeStore.setHistory(historyRes.status === 'fulfilled' ? (historyRes.value.data || []) : [])
        if (!this.selectedCredentialId && this.credentials.length) {
          this.quickTradeStore.setSelectedCredential(this.credentials[0].id)
        }
      } catch (error) {
        console.error('Bootstrap quick trade failed:', error)
      }
    },

    setMarketType(value) {
      this.quickTradeStore.setMarketType(value)
      if (value === 'spot') {
        this.form.leverage = '1'
      }
    },

    onSelectCredential(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.selectedOption || payload?.[0] || payload
      this.quickTradeStore.setSelectedCredential(selected?.value)
      this.showCredentialPicker = false
    },

    openCredentialPicker() {
      if (!this.credentialActions.length) {
        showToast({ message: '请先到“我的”里添加 API Key', type: 'fail' })
        return
      }
      this.showCredentialPicker = true
    },

    async refreshTradeData() {
      if (!this.selectedCredentialId) return
      try {
        const tasks = [
          quickTradeApi.getBalance(this.selectedCredentialId, this.marketType),
          quickTradeApi.getHistory()
        ]
        if (this.form.symbol.trim()) {
          tasks.push(quickTradeApi.getPosition({
            credentialId: this.selectedCredentialId,
            symbol: this.form.symbol.trim(),
            marketType: this.marketType
          }))
        }
        const [balanceRes, historyRes, positionRes] = await Promise.allSettled(tasks)
        this.quickTradeStore.setBalance(balanceRes.status === 'fulfilled' ? (balanceRes.value.data || null) : null)
        this.quickTradeStore.setHistory(historyRes.status === 'fulfilled' ? (historyRes.value.data || []) : [])
        this.quickTradeStore.setPositions(positionRes?.status === 'fulfilled' ? (positionRes.value.data || []) : [])
      } catch (error) {
        console.error('Refresh quick trade data failed:', error)
      }
    },

    validateOrder() {
      if (!this.selectedCredentialId) {
        showToast({ message: '请先选择 API Key', type: 'fail' })
        return false
      }
      if (!this.form.symbol.trim()) {
        showToast({ message: '请输入交易对', type: 'fail' })
        return false
      }
      if (!Number(this.form.amount)) {
        showToast({ message: '请输入下单金额', type: 'fail' })
        return false
      }
      if (this.form.order_type === 'limit' && !Number(this.form.price)) {
        showToast({ message: '请输入限价价格', type: 'fail' })
        return false
      }
      return true
    },

    async submitOrder(side) {
      if (!this.validateOrder()) return
      this.submitting = true
      try {
        await quickTradeApi.placeOrder({
          credential_id: this.selectedCredentialId,
          symbol: this.form.symbol.trim(),
          side,
          order_type: this.form.order_type,
          amount: Number(this.form.amount),
          price: Number(this.form.price || 0),
          leverage: this.marketType === 'swap' ? Number(this.form.leverage || 1) : 1,
          market_type: this.marketType,
          source: 'manual'
        })
        showToast({ message: `${side === 'buy' ? '买入' : '卖出'}请求已提交`, type: 'success' })
        await this.refreshTradeData()
      } catch (error) {
        console.error('Submit quick trade failed:', error)
      } finally {
        this.submitting = false
      }
    },

    async closePosition(position) {
      try {
        await showConfirmDialog({
          title: '确认平仓',
          message: `确认平掉 ${position.symbol || this.form.symbol} 的${this.getSideText(position.side)}仓位吗？`
        })
        await quickTradeApi.closePosition({
          credential_id: this.selectedCredentialId,
          symbol: position.symbol || this.form.symbol.trim(),
          market_type: this.marketType,
          position_side: position.side,
          source: 'manual'
        })
        showToast({ message: '平仓请求已提交', type: 'success' })
        await this.refreshTradeData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Close position failed:', error)
        }
      }
    },

    getSideText(value) {
      const map = {
        buy: '买入',
        sell: '卖出',
        long: '多仓',
        short: '空仓'
      }
      return map[value] || (value || '-')
    },

    getStatusText(value) {
      const map = {
        filled: '已成交',
        submitted: '已提交',
        failed: '失败'
      }
      return map[value] || (value || '-')
    },

    formatNumber(value) {
      return Number(value || 0).toFixed(2)
    },

    formatSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num.toFixed(2)}`
    },

    formatTime(value) {
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.quick-trade-page {
  min-height: 100vh;
  padding: 16px 16px 110px;
}

.hero-card,
.panel-card {
  margin-bottom: 16px;
  padding: 18px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.hero-title,
.panel-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.hero-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.48);
}

.market-toggle {
  display: flex;
  gap: 8px;
  margin: 12px 0 14px;
}

.market-toggle.compact {
  margin: 14px 0;
}

.toggle-item {
  flex: 1;
  text-align: center;
  padding: 10px 12px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.toggle-item.active {
  color: #050505;
  background: rgba(240, 211, 155, 0.95);
}

.balance-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  margin-bottom: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.quick-trade-page :deep(.van-cell) {
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

.quick-trade-page :deep(.van-cell__title),
.quick-trade-page :deep(.van-cell__value),
.quick-trade-page :deep(.van-cell__right-icon) {
  color: #fff;
}

.balance-label,
.helper-text,
.row-subtitle,
.history-side small {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.balance-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.balance-sub {
  margin-top: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.list-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.row-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.row-actions,
.history-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.row-value {
  font-size: 13px;
  color: #fff;
}

.row-value.profit {
  color: #34c759;
}

.row-value.loss {
  color: #ff5f57;
}
</style>
