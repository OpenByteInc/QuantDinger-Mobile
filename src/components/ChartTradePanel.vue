<template>
  <section class="trade-terminal" :class="{ unavailable: !isCrypto }">
    <template v-if="isCrypto">
      <div class="terminal-head">
        <div>
          <span class="eyebrow">{{ $t('chart_trade.title') }}</span>
          <strong>{{ normalizedSymbol }}</strong>
        </div>
        <button type="button" class="account-link" @click="openCredentialPicker">
          <span :class="['status-dot', { online: selectedCredential }]" />
          {{ selectedCredential ? selectedCredentialLabel : $t('chart_trade.select_account') }}
          <van-icon name="arrow" />
        </button>
      </div>

      <div class="account-strip">
        <div>
          <span>{{ $t('chart_trade.available') }}</span>
          <strong>{{ formatNumber(activeBalanceAvailable) }} <small>{{ balance?.currency || 'USDT' }}</small></strong>
        </div>
        <div>
          <span>{{ $t('chart_trade.market_type') }}</span>
          <strong>{{ $t(marketType === 'swap' ? 'chart_trade.swap' : 'chart_trade.spot') }}</strong>
        </div>
        <div>
          <span>{{ $t('chart_trade.position') }}</span>
          <strong>{{ positions.length }}</strong>
        </div>
      </div>

      <div class="trade-actions">
        <button type="button" class="buy" :disabled="!selectedCredential" @click="openOrder('buy')">
          <van-icon name="arrow-up" />
          <span>{{ marketType === 'swap' ? $t('chart_trade.buy_long') : $t('chart_trade.buy') }}</span>
        </button>
        <button type="button" class="sell" :disabled="!selectedCredential || marketType !== 'swap'" @click="openOrder('sell')">
          <van-icon name="arrow-down" />
          <span>{{ $t('chart_trade.sell_short') }}</span>
        </button>
      </div>

      <button type="button" class="terminal-more" @click="openPanel('positions')">
        <span>{{ $t('chart_trade.manage_positions') }}</span>
        <strong v-if="positions.length">{{ $t('chart_trade.open_positions', { count: positions.length }) }}</strong>
        <strong v-else>{{ $t('chart_trade.no_positions_short') }}</strong>
        <van-icon name="arrow" />
      </button>
    </template>

    <button v-else type="button" class="unavailable-row" @click="$router.push('/market')">
      <van-icon name="info-o" />
      <span>{{ $t('chart_trade.unavailable_market') }}</span>
      <van-icon name="arrow" />
    </button>

    <van-action-sheet v-model:show="panelOpen" class="trade-sheet" :title="$t('chart_trade.title')" teleport="body">
      <div class="sheet-body">
        <div class="sheet-quote">
          <div>
            <span>{{ normalizedSymbol }}</span>
            <strong>{{ formatPrice(livePrice) }}</strong>
          </div>
          <button type="button" @click="refreshTradeData">
            <van-icon name="replay" />
            {{ $t('common.refresh') }}
          </button>
        </div>

        <div class="segmented">
          <button v-for="item in panelTabs" :key="item.value" type="button" :class="{ active: activeTab === item.value }" @click="activeTab = item.value">
            {{ item.label }}
            <small v-if="item.value === 'positions' && positions.length">{{ positions.length }}</small>
          </button>
        </div>

        <div v-if="activeTab === 'order'" class="order-ticket">
          <button type="button" class="ticket-account" @click="openCredentialPicker">
            <span>{{ $t('chart_trade.account') }}</span>
            <strong>{{ selectedCredentialLabel || $t('chart_trade.select_account') }}</strong>
            <van-icon name="arrow" />
          </button>

          <div class="dual-segment">
            <button type="button" :class="{ active: marketType === 'spot' }" @click="setMarketType('spot')">{{ $t('chart_trade.spot') }}</button>
            <button type="button" :class="{ active: marketType === 'swap' }" @click="setMarketType('swap')">{{ $t('chart_trade.swap') }}</button>
          </div>

          <div class="dual-segment order-type">
            <button type="button" :class="{ active: form.order_type === 'market' }" @click="form.order_type = 'market'">{{ $t('chart_trade.order_market') }}</button>
            <button type="button" :class="{ active: form.order_type === 'limit' }" @click="form.order_type = 'limit'">{{ $t('chart_trade.order_limit') }}</button>
          </div>

          <label class="ticket-field">
            <span>{{ $t(marketType === 'swap' ? 'chart_trade.margin_amount' : 'chart_trade.amount') }}</span>
            <div><input v-model="form.amount" inputmode="decimal" type="number" min="0" /><b>USDT</b></div>
          </label>
          <div class="amount-presets">
            <button v-for="pct in [25, 50, 75, 100]" :key="pct" type="button" :disabled="activeBalanceAvailable <= 0" @click="setAmountByPercent(pct)">{{ pct }}%</button>
          </div>

          <label v-if="form.order_type === 'limit'" class="ticket-field">
            <span>{{ $t('chart_trade.price') }}</span>
            <div><input v-model="form.price" inputmode="decimal" type="number" min="0" /><b>USDT</b></div>
          </label>

          <template v-if="marketType === 'swap'">
            <div class="leverage-row">
              <label class="ticket-field">
                <span>{{ $t('chart_trade.leverage') }}</span>
                <div><input v-model="form.leverage" inputmode="numeric" type="number" min="1" max="125" /><b>x</b></div>
              </label>
              <div class="dual-segment margin-mode">
                <button type="button" :class="{ active: form.margin_mode === 'cross' }" @click="form.margin_mode = 'cross'">{{ $t('chart_trade.cross') }}</button>
                <button type="button" :class="{ active: form.margin_mode === 'isolated' }" @click="form.margin_mode = 'isolated'">{{ $t('chart_trade.isolated') }}</button>
              </div>
            </div>
            <p class="notional-line">{{ $t('chart_trade.notional', { amount: formatNumber(estimatedNotional) }) }}</p>
          </template>

          <details class="risk-orders">
            <summary>{{ $t('chart_trade.risk_orders') }} <small>{{ $t('chart_trade.optional') }}</small></summary>
            <div class="risk-grid">
              <label class="ticket-field">
                <span>{{ $t('chart_trade.take_profit') }}</span>
                <div><input v-model="form.tp_price" inputmode="decimal" type="number" min="0" /><b>USDT</b></div>
              </label>
              <label class="ticket-field">
                <span>{{ $t('chart_trade.stop_loss') }}</span>
                <div><input v-model="form.sl_price" inputmode="decimal" type="number" min="0" /><b>USDT</b></div>
              </label>
            </div>
          </details>

          <div class="live-warning"><van-icon name="shield-o" />{{ $t('chart_trade.live_warning') }}</div>
          <div class="submit-row" :class="{ single: marketType === 'spot' }">
            <button type="button" class="buy" :disabled="!canSubmitOrder || submitting" @click="confirmOrder('buy')">
              {{ marketType === 'swap' ? $t('chart_trade.buy_long') : $t('chart_trade.buy') }}
            </button>
            <button v-if="marketType === 'swap'" type="button" class="sell" :disabled="!canSubmitOrder || submitting" @click="confirmOrder('sell')">
              {{ $t('chart_trade.sell_short') }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'positions'" class="trade-list">
          <article v-for="position in positions" :key="`${position.symbol}-${position.side}`" class="position-item">
            <div class="position-title">
              <div><strong>{{ normalizeSymbol(position.symbol) }}</strong><span :class="positionPnl(position) >= 0 ? 'up' : 'down'">{{ formatSigned(positionPnl(position)) }} USDT</span></div>
              <small>{{ sideText(position.side) }} · {{ Number(position.leverage || 1) }}x</small>
            </div>
            <div class="position-data">
              <span>{{ $t('chart_trade.size') }} <b>{{ formatNumber(positionSize(position)) }}</b></span>
              <span>{{ $t('chart_trade.entry') }} <b>{{ formatPrice(positionEntryPrice(position)) }}</b></span>
              <span>{{ $t('chart_trade.mark') }} <b>{{ formatPrice(positionMarkPrice(position)) }}</b></span>
            </div>
            <button type="button" class="close-position" @click="closePosition(position)">{{ $t('chart_trade.close_position') }}</button>
          </article>
          <van-empty v-if="!positions.length" :description="$t('chart_trade.no_positions')" />
        </div>

        <div v-else class="trade-list history-list">
          <article v-for="item in history.slice(0, 20)" :key="item.id || `${item.symbol}-${item.created_at}`" class="history-item">
            <div><strong>{{ normalizeSymbol(item.symbol) }}</strong><small>{{ formatTime(item.created_at) }}</small></div>
            <div><span :class="String(item.side).toLowerCase() === 'buy' ? 'up' : 'down'">{{ sideText(item.side) }}</span><small>{{ statusText(item.status) }}</small></div>
          </article>
          <van-empty v-if="!history.length" :description="$t('chart_trade.no_history')" />
        </div>
      </div>
    </van-action-sheet>

    <van-popup v-model:show="credentialPickerOpen" position="bottom" round teleport="body">
      <van-picker :columns="credentialActions" @cancel="credentialPickerOpen = false" @confirm="selectCredential" />
    </van-popup>
  </section>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi, quickTradeApi } from '@/api'
import { useCredentialsStore, useQuickTradeStore } from '@/stores'

const SUPPORTED_EXCHANGES = new Set(['binance', 'okx', 'bitget', 'bybit', 'gate', 'htx'])

export default {
  name: 'ChartTradePanel',
  props: {
    market: { type: String, default: 'Crypto' },
    symbol: { type: String, default: 'BTC/USDT' },
    chartPrice: { type: Number, default: null },
    initialOpen: { type: Boolean, default: false }
  },
  emits: ['context-change'],
  data() {
    return {
      panelOpen: false,
      credentialPickerOpen: false,
      activeTab: 'order',
      submitting: false,
      pollTimer: null,
      form: {
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
    credentialsStore() { return useCredentialsStore() },
    quickTradeStore() { return useQuickTradeStore() },
    isCrypto() { return String(this.market).toLowerCase() === 'crypto' },
    normalizedSymbol() { return this.normalizeSymbol(this.symbol) || '--' },
    credentials() {
      return this.credentialsStore.items.filter((item) => SUPPORTED_EXCHANGES.has(String(item.exchange_id || '').toLowerCase()))
    },
    selectedCredentialId() { return this.quickTradeStore.selectedCredentialId },
    selectedCredential() { return this.credentials.find((item) => String(item.id) === String(this.selectedCredentialId)) || null },
    selectedCredentialLabel() {
      if (!this.selectedCredential) return ''
      return `${this.selectedCredential.name || this.selectedCredential.exchange_id} · ${String(this.selectedCredential.exchange_id || '').toUpperCase()}`
    },
    credentialActions() {
      return this.credentials.map((item) => ({ text: `${item.name || item.exchange_id} · ${String(item.exchange_id).toUpperCase()}`, value: item.id }))
    },
    marketType() { return this.quickTradeStore.marketType },
    balance() { return this.quickTradeStore.balance },
    positions() { return this.quickTradeStore.positions },
    history() { return this.quickTradeStore.history },
    activeBalanceAvailable() {
      return Number(this.balance?.[this.marketType]?.available ?? this.balance?.available ?? 0)
    },
    livePrice() { return Number(this.chartPrice || this.form.price || 0) },
    estimatedNotional() {
      const amount = Math.max(0, Number(this.form.amount) || 0)
      return this.marketType === 'swap' ? amount * Math.max(1, Number(this.form.leverage) || 1) : amount
    },
    canSubmitOrder() {
      return Boolean(this.selectedCredential && Number(this.form.amount) > 0 && (this.form.order_type !== 'limit' || Number(this.form.price) > 0) && (this.marketType !== 'swap' || (Number(this.form.leverage) >= 1 && Number(this.form.leverage) <= 125)))
    },
    panelTabs() {
      return [
        { value: 'order', label: this.$t('chart_trade.order') },
        { value: 'positions', label: this.$t('chart_trade.positions') },
        { value: 'history', label: this.$t('chart_trade.history') }
      ]
    }
  },
  watch: {
    selectedCredentialId() { this.refreshTradeData(); this.emitContext() },
    marketType() { this.refreshTradeData(); this.emitContext() },
    symbol() { this.refreshTradeData() },
    chartPrice(value) {
      if (Number(value) > 0 && !Number(this.form.price)) this.form.price = String(value)
    },
    initialOpen(value) { if (value) this.openPanel('order') }
  },
  async mounted() {
    await this.bootstrap()
    if (this.initialOpen) this.openPanel('order')
    this.startPolling()
  },
  activated() { this.startPolling() },
  deactivated() { this.stopPolling() },
  beforeUnmount() { this.stopPolling() },
  methods: {
    async bootstrap() {
      const [credentialsResult, historyResult] = await Promise.allSettled([credentialsApi.list(), quickTradeApi.getHistory()])
      if (credentialsResult.status === 'fulfilled') this.credentialsStore.setItems(credentialsResult.value.data || [])
      if (historyResult.status === 'fulfilled') this.quickTradeStore.setHistory(historyResult.value.data || [])
      if (!this.selectedCredential && this.credentials.length) this.quickTradeStore.setSelectedCredential(this.credentials[0].id)
      if (Number(this.chartPrice) > 0) this.form.price = String(this.chartPrice)
      await this.refreshTradeData()
      this.emitContext()
    },
    openPanel(tab = 'order') { this.activeTab = tab; this.panelOpen = true; this.refreshTradeData() },
    openOrder() { this.openPanel('order') },
    openCredentialPicker() {
      if (!this.credentialActions.length) { this.$router.push('/profile/credentials/new'); return }
      this.credentialPickerOpen = true
    },
    selectCredential(payload) {
      const option = payload?.selectedOptions?.[0] || payload?.selectedOption || payload
      this.quickTradeStore.setSelectedCredential(option?.value)
      this.credentialPickerOpen = false
    },
    setMarketType(value) {
      this.quickTradeStore.setMarketType(value)
      this.form.leverage = value === 'spot' ? '1' : (Number(this.form.leverage) > 1 ? this.form.leverage : '5')
    },
    emitContext() {
      this.$emit('context-change', { exchangeId: this.selectedCredential?.exchange_id || '', marketType: this.marketType })
    },
    async refreshTradeData() {
      if (!this.selectedCredential || !this.isCrypto) return
      const tasks = [
        quickTradeApi.getBalance(this.selectedCredentialId, this.marketType),
        quickTradeApi.getHistory(),
        quickTradeApi.getPosition({ credentialId: this.selectedCredentialId, symbol: this.normalizedSymbol, marketType: this.marketType })
      ]
      const [balance, history, positions] = await Promise.allSettled(tasks)
      if (balance.status === 'fulfilled') this.quickTradeStore.setBalance(balance.value.data)
      if (history.status === 'fulfilled') this.quickTradeStore.setHistory(history.value.data)
      if (positions.status === 'fulfilled') this.quickTradeStore.setPositions(positions.value.data)
    },
    async confirmOrder(side) {
      if (!this.canSubmitOrder) { showToast({ message: this.$t('chart_trade.complete_order'), type: 'fail' }); return }
      if (this.marketType === 'spot' && side === 'sell') return
      const sideLabel = this.$t(side === 'buy' ? (this.marketType === 'swap' ? 'chart_trade.buy_long' : 'chart_trade.buy') : 'chart_trade.sell_short')
      try {
        await showConfirmDialog({
          title: this.$t('chart_trade.confirm_title'),
          message: this.$t('chart_trade.confirm_message', { side: sideLabel, symbol: this.normalizedSymbol, amount: formatMoney(this.form.amount), type: this.$t(this.form.order_type === 'market' ? 'chart_trade.order_market' : 'chart_trade.order_limit') }),
          confirmButtonText: this.$t('chart_trade.confirm_submit'),
          confirmButtonColor: side === 'buy' ? '#16a34a' : '#dc2626'
        })
      } catch { return }
      this.submitting = true
      try {
        await quickTradeApi.placeOrder({
          credential_id: this.selectedCredentialId,
          symbol: this.normalizedSymbol,
          side,
          order_type: this.form.order_type,
          amount: Number(this.form.amount),
          price: this.form.order_type === 'limit' ? Number(this.form.price) : 0,
          leverage: this.marketType === 'swap' ? Number(this.form.leverage) : 1,
          market_type: this.marketType,
          margin_mode: this.marketType === 'swap' ? this.form.margin_mode : undefined,
          tp_price: Number(this.form.tp_price || 0),
          sl_price: Number(this.form.sl_price || 0),
          source: 'indicator'
        })
        showToast({ message: this.$t('chart_trade.order_success'), type: 'success' })
        await this.refreshTradeData()
        this.activeTab = 'positions'
      } finally { this.submitting = false }
    },
    async closePosition(position) {
      try {
        await showConfirmDialog({ title: this.$t('chart_trade.close_confirm_title'), message: this.$t('chart_trade.close_confirm_message', { symbol: this.normalizeSymbol(position.symbol) }) })
      } catch { return }
      await quickTradeApi.closePosition({ credential_id: this.selectedCredentialId, symbol: this.normalizeSymbol(position.symbol || this.symbol), market_type: this.marketType, close_scope: 'full', position_side: position.side, source: 'indicator' })
      showToast({ message: this.$t('chart_trade.close_success'), type: 'success' })
      await this.refreshTradeData()
    },
    setAmountByPercent(pct) { this.form.amount = String(Math.floor(this.activeBalanceAvailable * pct) / 100) },
    normalizeSymbol(value) {
      let symbol = String(value || '').trim().toUpperCase().replace('-SWAP', '')
      if (symbol.includes(':')) symbol = symbol.split(':')[0]
      if (!symbol.includes('/') && symbol.endsWith('USDT')) symbol = `${symbol.slice(0, -4)}/USDT`
      return symbol
    },
    sideText(value) { return this.$t(['buy', 'long'].includes(String(value).toLowerCase()) ? 'chart_trade.long' : 'chart_trade.short') },
    statusText(value) {
      const status = String(value || 'submitted').toLowerCase()
      const known = ['filled', 'submitted', 'failed', 'canceled'].includes(status) ? status : 'submitted'
      return this.$t(`chart_trade.status_${known}`)
    },
    positionSize(position) { return Number(position?.size ?? position?.quantity ?? position?.qty ?? position?.amount ?? 0) },
    positionEntryPrice(position) { return Number(position?.entry_price ?? position?.avg_price ?? 0) },
    positionMarkPrice(position) { return Number(position?.mark_price ?? position?.current_price ?? position?.price ?? 0) },
    positionPnl(position) { return Number(position?.unrealized_pnl ?? position?.pnl ?? 0) },
    formatNumber(value) { return formatMoney(value) },
    formatPrice(value) {
      const number = Number(value || 0)
      if (!number) return '--'
      return number.toLocaleString('en-US', { minimumFractionDigits: number >= 100 ? 2 : 4, maximumFractionDigits: number >= 100 ? 2 : 6 })
    },
    formatSigned(value) { const number = Number(value || 0); return `${number > 0 ? '+' : ''}${number.toFixed(2)}` },
    formatTime(value) { const date = new Date(typeof value === 'number' ? value * 1000 : value); return Number.isNaN(date.getTime()) ? '-' : `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` },
    startPolling() { this.stopPolling(); this.pollTimer = window.setInterval(() => this.refreshTradeData(), 10000) },
    stopPolling() { if (this.pollTimer) window.clearInterval(this.pollTimer); this.pollTimer = null }
  }
}

function formatMoney(value) { return Number(value || 0).toFixed(2) }
</script>

<style scoped>
.trade-terminal { margin: 10px var(--page-gutter) 0; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--bg-elevated); color: var(--text); }
.terminal-head { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-bottom: 1px solid var(--hairline); }
.terminal-head > div { display: flex; flex-direction: column; gap: 2px; }
.terminal-head .eyebrow { color: var(--text-3); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.terminal-head strong { font-size: 15px; font-weight: 900; }
.account-link { min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; border: 0; background: transparent; color: var(--text-2); font-size: 11px; font-weight: 700; }
.account-link .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-4); }
.account-link .status-dot.online { background: var(--up); box-shadow: 0 0 0 3px var(--up-soft); }
.account-strip { display: grid; grid-template-columns: 1.5fr 1fr .7fr; padding: 11px 12px; border-bottom: 1px solid var(--hairline); }
.account-strip > div { display: flex; flex-direction: column; gap: 4px; }
.account-strip > div + div { padding-left: 10px; border-left: 1px solid var(--hairline); }
.account-strip span { color: var(--text-3); font-size: 10px; }
.account-strip strong { font-size: 13px; font-variant-numeric: tabular-nums; }
.account-strip small { color: var(--text-3); font-size: 9px; }
.trade-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px; }
.trade-actions button, .submit-row button { min-height: 42px; border: 0; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 900; }
.trade-actions button { display: flex; align-items: center; justify-content: center; gap: 7px; }
.buy { background: var(--up); }.sell { background: var(--down); }
button:disabled { opacity: .38; }
.terminal-more { width: 100%; min-height: 38px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 0; border-top: 1px solid var(--hairline); background: var(--surface-raised); color: var(--text-2); font-size: 11px; text-align: left; }
.terminal-more span { flex: 1; }.terminal-more strong { color: var(--text); font-size: 11px; }
.unavailable-row { width: 100%; min-height: 50px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 0; background: transparent; color: var(--text-2); text-align: left; }
.unavailable-row span { flex: 1; }
.sheet-body { max-height: min(76vh, 690px); overflow-y: auto; padding: 0 14px calc(22px + var(--safe-area-bottom)); }
.sheet-quote { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 12px; }
.sheet-quote > div { display: flex; align-items: baseline; gap: 9px; }.sheet-quote span { font-size: 14px; font-weight: 900; }.sheet-quote strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.sheet-quote button { border: 0; background: transparent; color: var(--text-2); font-size: 11px; }
.segmented, .dual-segment { display: grid; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-deep); }
.segmented { grid-template-columns: repeat(3, 1fr); margin-bottom: 14px; }
.dual-segment { grid-template-columns: 1fr 1fr; margin-bottom: 10px; }
.segmented button, .dual-segment button { min-height: 34px; border: 0; border-radius: 6px; background: transparent; color: var(--text-3); font-size: 12px; font-weight: 800; }
.segmented button.active, .dual-segment button.active { color: var(--text); background: var(--surface-raised-2); }
.segmented small { margin-left: 4px; color: var(--accent); }
.ticket-account { width: 100%; min-height: 48px; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 0 11px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-raised); color: var(--text-2); font-size: 11px; text-align: left; }
.ticket-account strong { overflow: hidden; color: var(--text); text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.order-type { margin-top: 2px; }
.ticket-field { display: block; margin: 10px 0; }.ticket-field > span { display: block; margin-bottom: 6px; color: var(--text-2); font-size: 11px; font-weight: 700; }
.ticket-field > div { min-height: 44px; display: flex; align-items: center; padding: 0 11px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-raised); }
.ticket-field input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ticket-field b { color: var(--text-3); font-size: 10px; }
.amount-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.amount-presets button { min-height: 30px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--text-2); font-size: 11px; }
.leverage-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 9px; align-items: end; }.margin-mode { margin-bottom: 10px; }.notional-line { margin: -3px 0 10px; color: var(--text-3); font-size: 10px; }
.risk-orders { margin: 12px 0; border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); }.risk-orders summary { padding: 12px 0; color: var(--text-2); font-size: 12px; font-weight: 800; cursor: pointer; }.risk-orders summary small { margin-left: 4px; color: var(--text-3); }.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.live-warning { display: flex; gap: 7px; align-items: flex-start; margin: 10px 0; padding: 9px 10px; border: 1px solid color-mix(in srgb, var(--warn) 30%, var(--border)); border-radius: 8px; color: var(--warn); background: var(--warn-soft); font-size: 10px; line-height: 1.45; }
.submit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.submit-row.single { grid-template-columns: 1fr; }
.trade-list { display: grid; gap: 8px; }.position-item, .history-item { border: 1px solid var(--border); border-radius: 8px; background: var(--surface-raised); }
.position-item { padding: 11px; }.position-title { display: flex; justify-content: space-between; margin-bottom: 10px; }.position-title > div { display: flex; gap: 8px; }.position-title small { color: var(--text-3); }.up { color: var(--up) !important; }.down { color: var(--down) !important; }
.position-data { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; color: var(--text-3); font-size: 10px; }.position-data span { display: flex; flex-direction: column; gap: 3px; }.position-data b { color: var(--text); font-size: 11px; }
.close-position { width: 100%; min-height: 32px; margin-top: 10px; border: 1px solid color-mix(in srgb, var(--down) 32%, var(--border)); border-radius: 6px; color: var(--down); background: var(--down-soft); font-size: 11px; font-weight: 800; }
.history-item { min-height: 50px; display: flex; justify-content: space-between; align-items: center; padding: 9px 11px; }.history-item > div { display: flex; flex-direction: column; gap: 3px; }.history-item > div:last-child { text-align: right; }.history-item small { color: var(--text-3); font-size: 10px; }
@media (min-width: 720px) { .trade-terminal { max-width: 720px; margin-left: auto; margin-right: auto; } }
</style>
