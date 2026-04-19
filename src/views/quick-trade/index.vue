<template>
  <div class="quick-trade-page">
    <div class="watchlist-bar">
      <div class="watchlist-scroll">
        <div
          v-for="item in watchlistCrypto"
          :key="item.symbol"
          :class="['wl-chip', { active: form.symbol === item.symbol }]"
          @click="selectWatchlist(item)"
        >{{ shortSymbol(item.symbol) }}</div>
        <div class="wl-chip add" @click="openSymbolPicker">
          <van-icon name="plus" />
        </div>
      </div>
    </div>

    <div class="chart-wrap">
      <KlineChart
        v-if="form.symbol"
        :market="'Crypto'"
        :symbol="form.symbol"
        :height="170"
      />
      <div v-else class="chart-placeholder" @click="openSymbolPicker">
        <van-icon name="chart-trending-o" />
        <span>{{ $t('watchlist.tap_to_select') }}</span>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-title">{{ $t('quick_trade.account') }}</div>
      <van-cell
        :title="$t('quick_trade.account')"
        :value="selectedCredentialLabel || $t('quick_trade.pick_credential')"
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
          <span class="balance-label">{{ $t('quick_trade.available') }}</span>
          <p class="balance-value">{{ formatNumber(balance?.available) }} {{ balance?.currency || 'USDT' }}</p>
        </div>
        <div class="balance-side">
          <span class="balance-label">{{ $t('quick_trade.total') }}</span>
          <p class="balance-sub">{{ formatNumber(balance?.total) }}</p>
        </div>
      </div>
      <van-button block plain @click="refreshTradeData">{{ $t('quick_trade.refresh_balance') }}</van-button>
    </div>

    <div class="panel-card">
      <div class="panel-title">{{ $t('quick_trade.order_params') }}</div>
      <van-cell
        :title="$t('quick_trade.symbol')"
        :value="form.symbol || $t('watchlist.tap_to_select')"
        is-link
        @click="openSymbolPicker"
      />
      <van-field
        v-model="form.amount"
        :label="$t('quick_trade.amount')"
        type="number"
        :placeholder="$t('quick_trade.amount_placeholder')"
      />
      <van-field
        v-if="form.order_type === 'limit'"
        v-model="form.price"
        :label="$t('quick_trade.price')"
        type="number"
        :placeholder="$t('quick_trade.price_placeholder')"
      />
      <van-field
        v-if="marketType === 'swap'"
        v-model="form.leverage"
        :label="$t('quick_trade.leverage')"
        type="number"
        :placeholder="$t('quick_trade.leverage_placeholder')"
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
          {{ $t('quick_trade.buy') }}
        </van-button>
        <van-button type="danger" block :loading="submitting" @click="submitOrder('sell')">
          {{ $t('quick_trade.sell') }}
        </van-button>
      </div>
    </div>

    <div class="panel-card">
      <div class="section-head">
        <span class="panel-title">{{ $t('quick_trade.positions') }}</span>
        <span class="helper-text">{{ $t('quick_trade.positions_tip') }}</span>
      </div>
      <div v-if="positions.length" class="list-wrap">
        <div v-for="position in positions" :key="position.symbol + position.side" class="list-row">
          <div>
            <span class="row-title">{{ position.symbol || '-' }}</span>
            <p class="row-subtitle">{{ getSideText(position.side) }} · {{ formatNumber(position.size) }}</p>
          </div>
          <div class="row-actions">
            <span :class="['row-value', Number(position.unrealized_pnl || position.pnl || 0) >= 0 ? 'profit' : 'loss']">
              {{ formatSigned(position.unrealized_pnl || position.pnl || 0) }}
            </span>
            <van-button size="mini" plain type="danger" @click="closePosition(position)">
              {{ $t('quick_trade.close') }}
            </van-button>
          </div>
        </div>
      </div>
      <van-empty v-else :description="$t('quick_trade.positions_empty')" />
    </div>

    <div class="panel-card">
      <div class="section-head">
        <span class="panel-title">{{ $t('quick_trade.history') }}</span>
        <span class="helper-text">{{ $t('quick_trade.history_count', { count: history.length }) }}</span>
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
      <van-empty v-else :description="$t('quick_trade.history_empty')" />
    </div>

    <van-popup v-model:show="showCredentialPicker" position="bottom" round>
      <van-picker
        :columns="credentialActions"
        @cancel="showCredentialPicker = false"
        @confirm="onSelectCredential"
      />
    </van-popup>

    <SymbolPicker
      v-model:show="showSymbolPicker"
      :only-crypto="true"
      :title="$t('watchlist.picker_title')"
      @pick="onPickSymbol"
    />
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi, quickTradeApi, watchlistApi } from '@/api'
import { useCredentialsStore, useQuickTradeStore, useWatchlistStore } from '@/stores'
import KlineChart from '@/components/KlineChart.vue'
import SymbolPicker from '@/components/SymbolPicker.vue'

export default {
  name: 'QuickTrade',

  components: { KlineChart, SymbolPicker },

  data() {
    return {
      showCredentialPicker: false,
      showSymbolPicker: false,
      submitting: false,
      form: {
        symbol: '',
        amount: '',
        price: '',
        leverage: '1',
        order_type: 'market'
      }
    }
  },

  computed: {
    marketOptions() {
      return [
        { label: this.$t('quick_trade.market_spot'), value: 'spot' },
        { label: this.$t('quick_trade.market_swap'), value: 'swap' }
      ]
    },
    orderTypeOptions() {
      return [
        { label: this.$t('quick_trade.order_market'), value: 'market' },
        { label: this.$t('quick_trade.order_limit'), value: 'limit' }
      ]
    },
    credentialsStore() {
      return useCredentialsStore()
    },
    quickTradeStore() {
      return useQuickTradeStore()
    },
    watchlistStore() {
      return useWatchlistStore()
    },
    watchlistCrypto() {
      return this.watchlistStore.items.filter((i) => (i.market || '').toLowerCase() === 'crypto')
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

  activated() {
    this.loadWatchlist()
  },

  methods: {
    async bootstrap() {
      try {
        const [credentialsRes, historyRes, wlRes] = await Promise.allSettled([
          credentialsApi.list(),
          quickTradeApi.getHistory(),
          watchlistApi.getList()
        ])
        this.credentialsStore.setItems(credentialsRes.status === 'fulfilled' ? (credentialsRes.value.data || []) : [])
        this.quickTradeStore.setHistory(historyRes.status === 'fulfilled' ? (historyRes.value.data || []) : [])
        if (wlRes.status === 'fulfilled') {
          this.watchlistStore.setItems(wlRes.value.data || [])
          if (!this.form.symbol && this.watchlistStore.activeSymbol) {
            this.form.symbol = this.watchlistStore.activeSymbol
          } else if (!this.form.symbol && this.watchlistCrypto.length > 0) {
            this.form.symbol = this.watchlistCrypto[0].symbol
            this.watchlistStore.setActive(this.form.symbol, 'Crypto')
          }
        }
        if (!this.selectedCredentialId && this.credentials.length) {
          this.quickTradeStore.setSelectedCredential(this.credentials[0].id)
        }
      } catch (error) {
        console.error('Bootstrap quick trade failed:', error)
      }
    },

    async loadWatchlist() {
      try {
        const res = await watchlistApi.getList()
        this.watchlistStore.setItems(res.data || [])
      } catch (e) {
        /* ignore */
      }
    },

    openSymbolPicker() {
      this.showSymbolPicker = true
    },

    onPickSymbol(item) {
      this.form.symbol = item.symbol
      this.watchlistStore.setActive(item.symbol, item.market || 'Crypto')
    },

    selectWatchlist(item) {
      this.form.symbol = item.symbol
      this.watchlistStore.setActive(item.symbol, item.market || 'Crypto')
    },

    shortSymbol(symbol) {
      if (!symbol) return ''
      const s = String(symbol)
      if (s.includes('/')) return s.split('/')[0]
      return s.replace('USDT', '').replace('USD', '')
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
        showToast({ message: this.$t('quick_trade.no_credential'), type: 'fail' })
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
        showToast({ message: this.$t('quick_trade.need_credential'), type: 'fail' })
        return false
      }
      if (!this.form.symbol.trim()) {
        showToast({ message: this.$t('quick_trade.need_symbol'), type: 'fail' })
        return false
      }
      if (!Number(this.form.amount)) {
        showToast({ message: this.$t('quick_trade.need_amount'), type: 'fail' })
        return false
      }
      if (this.form.order_type === 'limit' && !Number(this.form.price)) {
        showToast({ message: this.$t('quick_trade.need_price'), type: 'fail' })
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
        const sideLabel = side === 'buy' ? this.$t('quick_trade.side_buy') : this.$t('quick_trade.side_sell')
        showToast({ message: this.$t('quick_trade.place_success', { side: sideLabel }), type: 'success' })
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
          title: this.$t('quick_trade.close_confirm_title'),
          message: this.$t('quick_trade.close_confirm_msg', {
            symbol: position.symbol || this.form.symbol,
            side: this.getSideText(position.side)
          })
        })
        await quickTradeApi.closePosition({
          credential_id: this.selectedCredentialId,
          symbol: position.symbol || this.form.symbol.trim(),
          market_type: this.marketType,
          position_side: position.side,
          source: 'manual'
        })
        showToast({ message: this.$t('quick_trade.close_success'), type: 'success' })
        await this.refreshTradeData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Close position failed:', error)
        }
      }
    },

    getSideText(value) {
      const map = {
        buy: this.$t('quick_trade.side_buy'),
        sell: this.$t('quick_trade.side_sell'),
        long: this.$t('quick_trade.side_long'),
        short: this.$t('quick_trade.side_short')
      }
      return map[value] || (value || '-')
    },

    getStatusText(value) {
      const map = {
        filled: this.$t('quick_trade.status_filled'),
        submitted: this.$t('quick_trade.status_submitted'),
        failed: this.$t('quick_trade.status_failed')
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
  padding: calc(14px + var(--safe-area-top, 0px)) 16px 110px;
  background: var(--bg);
  color: var(--text);
}

.watchlist-bar {
  margin-bottom: 12px;
  overflow: hidden;
}
.watchlist-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 2px 2px 6px;
  scrollbar-width: none;
}
.watchlist-scroll::-webkit-scrollbar { display: none; }
.wl-chip {
  flex-shrink: 0;
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  letter-spacing: 0.03em;
}
.wl-chip.active {
  color: var(--on-accent);
  background: var(--accent-grad);
  border-color: transparent;
}
.wl-chip.add {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  color: var(--accent);
  background: var(--accent-soft);
  border-color: transparent;
}

.chart-wrap {
  margin-bottom: 14px;
}
.chart-placeholder {
  padding: 32px 16px;
  border-radius: 16px;
  background: var(--surface-raised);
  border: 1px dashed var(--border-strong);
  color: var(--text-3);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.chart-placeholder .van-icon {
  font-size: 26px;
  color: var(--text-3);
}

.panel-card {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.panel-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}

.market-toggle {
  display: flex;
  gap: 4px;
  margin: 12px 0;
  padding: 3px;
  background: var(--surface-deep);
  border-radius: 12px;
  border: 1px solid var(--hairline);
}

.market-toggle.compact {
  margin: 12px 0;
}

.toggle-item {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 9px;
  color: var(--text-2);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.toggle-item.active {
  color: var(--text-on-accent);
  background: var(--accent);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.balance-card {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  overflow: hidden;
}
.balance-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(240px 160px at 0% 0%, var(--c-amber-soft), transparent 60%);
}
.balance-card > * { position: relative; }

.quick-trade-page :deep(.van-cell) {
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

.quick-trade-page :deep(.van-cell__title),
.quick-trade-page :deep(.van-cell__value),
.quick-trade-page :deep(.van-cell__right-icon) {
  color: var(--text);
}

.balance-label,
.helper-text,
.row-subtitle,
.history-side small {
  font-size: 12px;
  color: var(--text-3);
}

.balance-value {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  color: var(--c-amber);
}

.balance-side { text-align: right; }

.balance-sub {
  margin-top: 6px;
  font-size: 14px;
  color: var(--text-2);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}

.action-row :deep(.van-button) {
  border-radius: 13px;
  height: 46px;
  font-size: 15px;
  font-weight: 700;
  border: none;
}
.action-row :deep(.van-button--success) {
  background: var(--up);
  color: #fff;
}
.action-row :deep(.van-button--danger) {
  background: var(--down);
  color: #fff;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
  border-bottom: 1px solid var(--hairline);
}

.list-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.row-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
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
  color: var(--text);
}

.row-value.profit {
  color: var(--up);
}

.row-value.loss {
  color: var(--down);
}
</style>
