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
      <div v-if="form.symbol" class="price-strip">
        <span>{{ normalizeQuickTradeSymbol(form.symbol) }}</span>
        <strong>{{ formatPrice(currentPrice) }}</strong>
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
          <span class="balance-label">{{ isSwapMode ? $t('quick_trade.swap_available') : $t('quick_trade.spot_available') }}</span>
          <p class="balance-value">{{ formatNumber(activeBalanceAvailable) }} {{ balance?.currency || 'USDT' }}</p>
        </div>
        <div class="balance-side">
          <span class="balance-label">{{ $t('quick_trade.total') }}</span>
          <p class="balance-sub">{{ formatNumber(balance?.total) }}</p>
        </div>
      </div>
      <div class="balance-legs">
        <span>{{ $t('quick_trade.swap_available') }} {{ formatNumber(swapBalanceAvailable) }}</span>
        <span>{{ $t('quick_trade.spot_available') }} {{ formatNumber(spotBalanceAvailable) }}</span>
      </div>
      <p v-if="balanceErrorMessage" class="balance-error">{{ balanceErrorMessage }}</p>
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
      <div class="quick-amounts">
        <button
          v-for="pct in quickAmountPcts"
          :key="pct"
          type="button"
          :disabled="activeBalanceAvailable <= 0"
          @click="setAmountByPercent(pct)"
        >
          {{ pct }}%
        </button>
      </div>
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
      <div v-if="isSwapMode" class="market-toggle compact">
        <span
          v-for="item in marginModeOptions"
          :key="item.value"
          :class="['toggle-item', { active: form.margin_mode === item.value }]"
          @click="form.margin_mode = item.value"
        >
          {{ item.label }}
        </span>
      </div>
      <div class="tpsl-grid">
        <van-field
          v-model="form.tp_price"
          :label="$t('quick_trade.tp_price')"
          type="number"
          :placeholder="$t('quick_trade.optional_price')"
        />
        <van-field
          v-model="form.sl_price"
          :label="$t('quick_trade.sl_price')"
          type="number"
          :placeholder="$t('quick_trade.optional_price')"
        />
      </div>
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
      <div :class="['action-row', { single: !isSwapMode }]">
        <van-button type="success" block :loading="submitting" @click="submitOrder('buy')">
          {{ isSwapMode ? $t('quick_trade.buy_long') : $t('quick_trade.buy') }}
        </van-button>
        <van-button v-if="isSwapMode" type="danger" block :loading="submitting" @click="submitOrder('sell')">
          {{ $t('quick_trade.sell_short') }}
        </van-button>
      </div>
      <p v-if="!isSwapMode" class="mode-hint">{{ $t('quick_trade.spot_buy_only_hint') }}</p>
    </div>

    <div class="panel-card">
      <div class="section-head">
        <span class="panel-title">{{ $t('quick_trade.positions') }}</span>
        <span class="helper-text">{{ $t('quick_trade.positions_tip') }}</span>
      </div>
      <div v-if="isSwapMode && positions.length" class="market-toggle compact close-scope-toggle">
        <span
          v-for="item in closeScopeOptions"
          :key="item.value"
          :class="['toggle-item', { active: closeScope === item.value }]"
          @click="closeScope = item.value"
        >
          {{ item.label }}
        </span>
      </div>
      <div v-if="positions.length" class="list-wrap">
        <div v-for="position in positions" :key="position.symbol + position.side" class="list-row">
          <div>
            <span class="row-title">{{ normalizeQuickTradeSymbol(position.symbol) || '-' }}</span>
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
import { credentialsApi, klineApi, quickTradeApi, watchlistApi } from '@/api'
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
      currentPrice: 0,
      closeScope: 'full',
      pollTimer: null,
      quickAmountPcts: [10, 25, 50, 75, 100],
      form: {
        symbol: '',
        amount: '',
        price: '',
        leverage: '5',
        order_type: 'market',
        margin_mode: 'cross',
        tp_price: '',
        sl_price: ''
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
    marginModeOptions() {
      return [
        { label: this.$t('quick_trade.cross_margin'), value: 'cross' },
        { label: this.$t('quick_trade.isolated_margin'), value: 'isolated' }
      ]
    },
    closeScopeOptions() {
      return [
        { label: this.$t('quick_trade.close_scope_full'), value: 'full' },
        { label: this.$t('quick_trade.close_scope_system'), value: 'system_tracked' }
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
    isSwapMode() {
      return this.marketType === 'swap'
    },
    swapBalanceAvailable() {
      return Number(this.balance?.swap?.available ?? (this.isSwapMode ? this.balance?.available : 0) ?? 0)
    },
    spotBalanceAvailable() {
      return Number(this.balance?.spot?.available ?? (!this.isSwapMode ? this.balance?.available : 0) ?? 0)
    },
    activeBalanceAvailable() {
      return this.isSwapMode ? this.swapBalanceAvailable : this.spotBalanceAvailable
    },
    balanceErrorMessage() {
      const err = this.balance?.error || ''
      if (!err) return ''
      if (this.balance?.error_hint_key) {
        const translated = this.$te?.(this.balance.error_hint_key) ? this.$t(this.balance.error_hint_key) : ''
        if (translated) return translated
      }
      return String(err).length > 120 ? `${String(err).slice(0, 120)}...` : String(err)
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
    },
    'form.symbol'(value) {
      if (value) {
        this.loadPrice()
        this.refreshTradeData()
      }
    }
  },

  async mounted() {
    await this.bootstrap()
  },

  activated() {
    this.loadWatchlist()
    this.startPolling()
  },

  deactivated() {
    this.stopPolling()
  },

  beforeUnmount() {
    this.stopPolling()
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
        if (this.form.symbol) {
          await this.loadPrice()
        }
        this.startPolling()
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

    async loadPrice() {
      if (!this.form.symbol) {
        this.currentPrice = 0
        return
      }
      try {
        const res = await klineApi.getPrice({ market: 'Crypto', symbol: this.normalizeQuickTradeSymbol(this.form.symbol) })
        const price = Number(res.data?.price || res.data?.last || res.data?.close || 0)
        if (price > 0) {
          this.currentPrice = price
          if (!Number(this.form.price)) {
            this.form.price = String(price)
          }
        }
      } catch (error) {
        console.warn('Load quick trade price failed:', error)
      }
    },

    shortSymbol(symbol) {
      if (!symbol) return ''
      const s = this.normalizeQuickTradeSymbol(symbol)
      if (s.includes('/')) return s.split('/')[0]
      return s.replace('USDT', '').replace('USD', '')
    },

    /** The API expects BTC/USDT while some exchange position IDs may include BTC/USDT-SWAP. */
    normalizeQuickTradeSymbol(symbol) {
      let s = String(symbol || '').trim()
      if (!s) return ''
      if (s.includes(':')) s = s.split(':')[0].trim()
      if (s.includes('/')) {
        const i = s.indexOf('/')
        const base = s.slice(0, i).trim().toUpperCase()
        let quote = s.slice(i + 1).trim().toUpperCase()
        if (quote.endsWith('-SWAP')) quote = quote.slice(0, -5)
        return `${base}/${quote}`
      }
      const upper = s.toUpperCase()
      if (upper.endsWith('-SWAP')) {
        const core = upper.slice(0, -5)
        const dash = core.indexOf('-')
        if (dash > 0) {
          return `${core.slice(0, dash)}/${core.slice(dash + 1)}`
        }
      }
      return upper
    },

    setMarketType(value) {
      this.quickTradeStore.setMarketType(value)
      if (value === 'spot') {
        this.form.leverage = '1'
        this.closeScope = 'full'
      } else if (value === 'swap' && Number(this.form.leverage || 1) <= 1) {
        this.form.leverage = '5'
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
            symbol: this.normalizeQuickTradeSymbol(this.form.symbol),
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

    async loadPositionWithRetry(maxRetries = 3, delayMs = 1800) {
      for (let i = 0; i < maxRetries; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        await this.refreshTradeData()
        if (this.positions.length) return
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
      if (!this.isSwapMode && side === 'sell') {
        showToast({ message: this.$t('quick_trade.short_disabled_spot'), type: 'fail' })
        return
      }
      this.submitting = true
      try {
        await quickTradeApi.placeOrder({
          credential_id: this.selectedCredentialId,
          symbol: this.normalizeQuickTradeSymbol(this.form.symbol),
          side,
          order_type: this.form.order_type,
          amount: Number(this.form.amount),
          price: this.form.order_type === 'limit' ? Number(this.form.price || 0) : 0,
          leverage: this.isSwapMode ? Number(this.form.leverage || 1) : 1,
          market_type: this.marketType,
          margin_mode: this.isSwapMode ? this.form.margin_mode : undefined,
          tp_price: Number(this.form.tp_price || 0),
          sl_price: Number(this.form.sl_price || 0),
          source: 'manual'
        })
        const sideLabel = side === 'buy' ? this.$t('quick_trade.side_buy') : this.$t('quick_trade.side_sell')
        showToast({ message: this.$t('quick_trade.place_success', { side: sideLabel }), type: 'success' })
        await this.refreshTradeData()
        await this.loadPositionWithRetry()
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
          symbol: this.normalizeQuickTradeSymbol(this.form.symbol || position.symbol),
          market_type: this.marketType,
          close_scope: this.isSwapMode ? this.closeScope : 'full',
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

    setAmountByPercent(pct) {
      const available = Number(this.activeBalanceAvailable || 0)
      if (available <= 0) return
      this.form.amount = String(Math.floor((available * pct / 100) * 100) / 100)
    },

    formatNumber(value) {
      return Number(value || 0).toFixed(2)
    },

    formatPrice(value) {
      const num = Number(value || 0)
      if (!num) return '--'
      if (Math.abs(num) >= 10000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
      if (Math.abs(num) >= 100) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(num) >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
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
    },

    startPolling() {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        if (this.form.symbol) this.loadPrice()
        if (this.selectedCredentialId) this.refreshTradeData()
      }, 10000)
    },

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
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
  padding-left: 54px;
  overflow: hidden;
}
.watchlist-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 42px;
  align-items: center;
  padding: 0 2px 6px;
  scrollbar-width: none;
}
.watchlist-scroll::-webkit-scrollbar { display: none; }
.wl-chip {
  flex-shrink: 0;
  min-width: 56px;
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
  min-width: 38px;
  padding: 7px 10px;
  color: var(--accent);
  background: var(--accent-soft);
  border-color: transparent;
}

.chart-wrap {
  margin-bottom: 14px;
}

.price-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 9px 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12px;
}

.price-strip strong {
  color: var(--text);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
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

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
  margin: 0 0 12px;
}

.quick-amounts button {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 7px 0;
  color: var(--text-2);
  background: var(--surface-raised);
  font-size: 12px;
  font-weight: 700;
}

.quick-amounts button:disabled {
  opacity: 0.45;
}

.tpsl-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tpsl-grid :deep(.van-cell) {
  padding-top: 6px;
  padding-bottom: 6px;
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

.balance-legs {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: -6px 0 10px;
  color: var(--text-3);
  font-size: 11px;
}

.balance-error,
.mode-hint {
  margin: 8px 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--down);
}

.mode-hint {
  color: var(--text-3);
}

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

.action-row.single {
  grid-template-columns: 1fr;
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
