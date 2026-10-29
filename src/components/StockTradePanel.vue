<template>
  <section class="stock-terminal">
    <header>
      <div><strong>{{ $t('broker_mobile.stockOrder') }}</strong><small>{{ displaySymbol }} · {{ currency }}</small></div>
      <button type="button" :disabled="busy" @click="pickerOpen=true">
        <ExchangeLogo :exchange="selectedCredential?.exchange_id || ''" :size="24" />
        <span>{{ selectedCredential ? accountLabel(selectedCredential) : $t('chart_trade.select_account') }}</span>
        <van-icon name="arrow" />
      </button>
    </header>

    <p v-if="error" class="stock-error" role="alert">{{ error }}</p>
    <div v-if="!credentials.length" class="stock-empty">
      <span>{{ $t('broker_mobile.noStockAccount') }}</span>
      <van-button size="small" type="primary" @click="$router.push('/profile/credentials/new')">{{ $t('account_ui.connectAction') }}</van-button>
    </div>
    <template v-else>
      <div class="account-strip">
        <div><span>{{ $t('profile_detail.equity') }}</span><strong>{{ amount(account?.equity) }} {{ currency }}</strong></div>
        <div><span>{{ $t('profile_detail.buyingPower') }}</span><strong>{{ amount(account?.buying_power) }} {{ currency }}</strong></div>
      </div>

      <div class="stock-ticket">
        <div class="order-kinds">
          <button v-for="type in ['market','limit']" :key="type" :class="{active:form.orderType===type}" :disabled="busy" @click="form.orderType=type">{{ $t(type==='market'?'chart_trade.order_market':'chart_trade.order_limit') }}</button>
        </div>
        <label><span>{{ $t('broker_mobile.quantity') }}</span><input v-model="form.quantity" type="number" min="0" step="any" inputmode="decimal" :disabled="busy" /></label>
        <label v-if="form.orderType==='limit'"><span>{{ $t('chart_trade.price') }}</span><input v-model="form.price" type="number" min="0" step="any" inputmode="decimal" :disabled="busy" /></label>
        <div class="order-actions">
          <button class="buy" :disabled="!canSubmit" @click="submit('buy')">{{ $t('chart_trade.buy') }}</button>
          <button class="sell" :disabled="!canSubmit" @click="submit('sell')">{{ $t('chart_trade.sell') }}</button>
        </div>
        <p>{{ $t('chart_trade.live_warning') }}</p>
      </div>

      <nav>
        <button :class="{active:tab==='positions'}" @click="tab='positions'">{{ $t('profile_detail.positions') }} <small>{{ positions.length }}</small></button>
        <button :class="{active:tab==='orders'}" @click="tab='orders'">{{ $t('profile_detail.orders') }} <small>{{ orders.length }}</small></button>
      </nav>
      <div class="stock-records">
        <article v-for="row in visibleRows" :key="row.id || row.order_id || row.symbol">
          <div><strong>{{ row.symbol || displaySymbol }}</strong><span :class="tone(row)">{{ rowLabel(row) }}</span></div>
          <dl v-if="tab==='positions'">
            <div><dt>{{ $t('profile_detail.quantity') }}</dt><dd>{{ quantity(row.quantity) }}</dd></div>
            <div><dt>{{ $t('profile_detail.entry') }}</dt><dd>{{ price(row.avg_entry_price) }}</dd></div>
            <div><dt>{{ $t('profile_detail.current') }}</dt><dd>{{ price(row.current_price) }}</dd></div>
            <div><dt>{{ $t('profile_detail.pnl') }}</dt><dd>{{ amount(row.unrealized_pnl) }} {{ row.currency || currency }}</dd></div>
          </dl>
          <dl v-else>
            <div><dt>{{ $t('profile_detail.orderType') }}</dt><dd>{{ row.order_type || '—' }}</dd></div>
            <div><dt>{{ $t('profile_detail.quantity') }}</dt><dd>{{ quantity(row.quantity) }}</dd></div>
            <div><dt>{{ $t('profile_detail.filled') }}</dt><dd>{{ quantity(row.filled_qty) }}</dd></div>
            <div><dt>{{ $t('profile_detail.price') }}</dt><dd>{{ price(row.limit_price || row.price || row.filled_avg_price) }}</dd></div>
          </dl>
          <button v-if="tab==='orders' && canCancel(row)" class="cancel" :disabled="busy" @click="cancel(row)">{{ $t('audit.cancelOrder') }}</button>
        </article>
        <van-empty v-if="!visibleRows.length" :description="$t('profile_detail.empty')" />
      </div>
    </template>

    <van-popup v-model:show="pickerOpen" position="bottom" round teleport="body">
      <van-picker :columns="credentialActions" @cancel="pickerOpen=false" @confirm="selectCredential">
        <template #option="option"><span class="broker-option"><ExchangeLogo :exchange="option.exchange" :size="24" />{{ option.text }}</span></template>
      </van-picker>
    </van-popup>
  </section>
</template>

<script>
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import { alpacaApi, brokerApi, credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { brokerCurrency, isDirectOpenApiBroker, US_STOCK_BROKER_IDS, HK_STOCK_BROKER_IDS } from '@/constants/exchanges'
import { showConfirmDialog, showToast } from 'vant'

const OPEN_STATUSES = new Set(['new', 'open', 'accepted', 'pending_new', 'partially_filled', 'submitted'])

export default {
  name: 'StockTradePanel',
  components: { ExchangeLogo },
  props: {
    market: { type: String, default: 'USStock' },
    symbol: { type: String, default: '' },
    chartPrice: { type: Number, default: null }
  },
  data() {
    return { account: null, positions: [], orders: [], error: '', busy: false, pickerOpen: false, tab: 'positions', selectedCredentialId: null, form: { quantity: '', price: '', orderType: 'market' } }
  },
  computed: {
    credentialsStore() { return useCredentialsStore() },
    displaySymbol() { return String(this.symbol || '').replace(/^(?:USSTOCK|HKSTOCK):/i, '').replace(/\.(?:US|HK)$/i, '') || '—' },
    supportedIds() { return String(this.market).toLowerCase() === 'hkstock' ? HK_STOCK_BROKER_IDS : US_STOCK_BROKER_IDS },
    credentials() { return this.credentialsStore.items.filter(item => this.supportedIds.has(String(item.exchange_id || '').toLowerCase()) && item.exchange_id !== 'ibkr') },
    selectedCredential() { return this.credentials.find(item => String(item.id) === String(this.selectedCredentialId)) || this.credentials[0] || null },
    credentialActions() { return this.credentials.map(item => ({ text: this.accountLabel(item), value: item.id, exchange: item.exchange_id })) },
    currency() { return String(this.account?.currency || brokerCurrency(this.selectedCredential?.exchange_id, this.market)).toUpperCase() },
    visibleRows() { return this.tab === 'positions' ? this.positions : this.orders },
    canSubmit() { return Boolean(this.selectedCredential && this.displaySymbol !== '—' && Number(this.form.quantity) > 0 && (this.form.orderType !== 'limit' || Number(this.form.price) > 0) && !this.busy) }
  },
  watch: {
    credentials: { immediate: true, handler(items) { if (!this.selectedCredentialId && items.length) this.selectedCredentialId = items[0].id } },
    selectedCredentialId() { this.refresh() },
    symbol() { this.refresh() }
  },
  async mounted() {
    if (!this.credentialsStore.items.length) {
      try { const response = await credentialsApi.list(); this.credentialsStore.setItems(response.data || []) } catch {}
    }
    if (!this.selectedCredentialId && this.credentials.length) this.selectedCredentialId = this.credentials[0].id
    await this.refresh()
  },
  methods: {
    accountLabel(item) { return `${item.name || item.exchange_id} · ${String(item.exchange_id || '').toUpperCase()}` },
    directBroker() { return isDirectOpenApiBroker(this.selectedCredential?.exchange_id) },
    async request(kind, params = {}) {
      const credential = this.selectedCredential
      if (!credential) return { data: kind === 'account' ? null : [] }
      if (this.directBroker()) return brokerApi[kind](credential.exchange_id, credential.id, params)
      if (kind === 'account') return alpacaApi.account({ credential_id: credential.id })
      if (kind === 'positions') return alpacaApi.positions({ credential_id: credential.id })
      return alpacaApi.orders({ credential_id: credential.id, ...params })
    },
    async refresh() {
      if (!this.selectedCredential || this.busy) return
      this.busy = true; this.error = ''
      const results = await Promise.allSettled([this.request('account'), this.request('positions'), this.request('orders', { status: 'open', limit: 100 })])
      if (results[0].status === 'fulfilled') this.account = results[0].value.data || null
      if (results[1].status === 'fulfilled') this.positions = Array.isArray(results[1].value.data) ? results[1].value.data : []
      if (results[2].status === 'fulfilled') this.orders = Array.isArray(results[2].value.data) ? results[2].value.data : []
      const failed = results.find(result => result.status === 'rejected')
      if (failed) this.error = failed.reason?.localizedMessage || failed.reason?.message || this.$t('audit.loadFailed')
      this.busy = false
    },
    selectCredential(payload) { const selected = payload?.selectedOptions?.[0]; if (selected) this.selectedCredentialId = selected.value; this.pickerOpen = false },
    async submit(side) {
      if (!this.canSubmit) return
      const payload = { symbol: this.displaySymbol, side, quantity: Number(this.form.quantity), orderType: this.form.orderType, price: Number(this.form.price) || 0, marketType: this.market }
      try {
        await showConfirmDialog({ title: this.$t('broker_mobile.stockOrder'), message: `${this.accountLabel(this.selectedCredential)}\n${payload.symbol} · ${this.$t(side === 'buy' ? 'chart_trade.buy' : 'chart_trade.sell')}\n${payload.quantity} ${this.$t('account_ui.shares')}` })
      } catch { return }
      this.busy = true; this.error = ''
      try {
        if (this.directBroker()) await brokerApi.placeOrder(this.selectedCredential.exchange_id, this.selectedCredential.id, payload)
        else await alpacaApi.placeOrder({ credential_id: this.selectedCredential.id, ...payload })
        showToast({ message: this.$t('broker_mobile.orderPlaced'), type: 'success' })
        this.form.quantity = ''
        await this.refreshAfterBusy()
      } catch (error) { this.error = error.localizedMessage || error.message } finally { this.busy = false }
    },
    canCancel(row) { return OPEN_STATUSES.has(String(row.status || '').toLowerCase()) },
    async cancel(row) {
      try { await showConfirmDialog({ title: this.$t('audit.cancelOrder'), message: `${row.symbol || this.displaySymbol} · ${row.id || row.order_id}` }) } catch { return }
      this.busy = true
      try {
        if (this.directBroker()) await brokerApi.cancelOrder(this.selectedCredential.exchange_id, this.selectedCredential.id, row.id || row.order_id)
        else await alpacaApi.cancelOrder(row.id || row.order_id, { credential_id: this.selectedCredential.id })
        await this.refreshAfterBusy()
      } catch (error) { this.error = error.localizedMessage || error.message } finally { this.busy = false }
    },
    async refreshAfterBusy() { this.busy = false; await this.refresh(); this.busy = true },
    amount(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    price(value) { const number = Number(value); return Number.isFinite(number) && number !== 0 ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—' },
    quantity(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—' },
    tone(row) { const value = this.tab === 'positions' ? Number(row.unrealized_pnl || 0) : String(row.side || '').toLowerCase() === 'sell' ? -1 : 1; return value > 0 ? 'positive' : value < 0 ? 'negative' : '' },
    rowLabel(row) { return this.tab === 'positions' ? `${this.amount(row.unrealized_pnl)} ${row.currency || this.currency}` : this.$t(`account_ui.status.${String(row.status || 'new').toLowerCase()}`) }
  }
}
</script>

<style scoped>
.stock-terminal{display:grid;gap:12px;color:var(--text)}.stock-terminal>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.stock-terminal>header>div{display:grid;gap:3px}.stock-terminal>header small{color:var(--text-3);font-size:10px}.stock-terminal>header button{max-width:64%;display:flex;align-items:center;gap:7px;border:0;color:var(--text);background:transparent}.stock-terminal>header button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stock-error,.stock-empty{padding:11px;border:1px solid color-mix(in srgb,var(--down) 35%,var(--border));border-radius:11px;color:var(--down);background:var(--down-soft);font-size:11px}.stock-empty{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--text-2);border-color:var(--border);background:var(--bg-elevated)}.account-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.account-strip div{padding:11px;border:1px solid var(--border);border-radius:11px;background:var(--bg-elevated)}.account-strip span,.account-strip strong{display:block}.account-strip span{color:var(--text-3);font-size:9px}.account-strip strong{margin-top:5px;font-size:12px}.stock-ticket{display:grid;gap:10px;padding:13px;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated)}.stock-ticket label{display:grid;grid-template-columns:80px 1fr;align-items:center;gap:10px;color:var(--text-2);font-size:11px}.stock-ticket input{width:100%;padding:10px;border:1px solid var(--border);border-radius:9px;color:var(--text);background:var(--bg)}.order-kinds,.order-actions,.stock-terminal nav{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.order-kinds button,.stock-terminal nav button{padding:8px;border:1px solid var(--border);border-radius:8px;color:var(--text-2);background:var(--bg)}.order-kinds button.active,.stock-terminal nav button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.order-actions button{padding:11px;border:0;border-radius:9px;color:#fff;font-weight:800}.order-actions .buy{background:var(--up)}.order-actions .sell{background:var(--down)}.order-actions button:disabled{opacity:.45}.stock-ticket p{margin:0;color:var(--warn);font-size:9px}.stock-records{display:grid;gap:8px}.stock-records article{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg-elevated)}.stock-records article>div{display:flex;justify-content:space-between;gap:10px}.positive{color:var(--up)}.negative{color:var(--down)}.stock-records dl{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0 0}.stock-records dt{color:var(--text-3);font-size:9px}.stock-records dd{margin:3px 0 0;font-size:11px}.cancel{display:block;margin:10px 0 0 auto;border:0;color:var(--down);background:transparent}.broker-option{display:flex;align-items:center;gap:9px}
</style>
