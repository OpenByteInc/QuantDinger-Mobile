<template>
  <section class="stock-terminal">
    <header>
      <div><strong>{{ $t('broker_mobile.stockOrder') }}</strong><small>{{ displaySymbol }} · {{ currency }}</small></div>
      <button type="button" :disabled="busy || brokerBusy" :aria-label="$t('chart_trade.select_account')" @click="pickerOpen=true">
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
    <AlpacaTradePanel v-else-if="selectedCredential?.exchange_id === 'alpaca'" :key="selectedCredential.id" :credential-id="selectedCredential.id" :symbol="displaySymbol" :chart-price="chartPrice" embedded @busy-change="brokerBusy=$event" />
    <template v-else>
      <div class="account-strip">
        <div><span>{{ $t('profile_detail.equity') }}</span><strong>{{ amount(account?.equity) }} {{ accountCurrency }}</strong></div>
        <div><span>{{ $t('profile_detail.buyingPower') }}</span><strong>{{ amount(account?.buying_power) }} {{ accountCurrency }}</strong></div>
        <div v-if="selectedCredential?.exchange_id === 'forthright'"><span>{{ $t('brokerAccounts.forthright.nativeCash') }}</span><strong>{{ amount(account?.available_cash) }} {{ currency }}</strong></div>
      </div>

      <div class="stock-ticket">
        <div class="order-kinds">
          <button v-for="type in ['market','limit']" :key="type" :class="{active:form.orderType===type}" :disabled="busy" @click="form.orderType=type">{{ $t(type==='market'?'chart_trade.order_market':'chart_trade.order_limit') }}</button>
        </div>
        <div v-if="!isHKStock" class="order-kinds">
          <button v-for="mode in ['quantity','amount']" :key="mode" :class="{active:form.inputMode===mode}" :disabled="busy" @click="form.inputMode=mode">{{ $t(mode==='quantity'?'chart_trade.by_quantity':'chart_trade.by_amount') }}</button>
        </div>
        <label v-if="isHKStock || form.inputMode==='quantity'"><span>{{ $t(isHKStock ? 'tradingUnits.lots' : 'broker_mobile.quantity') }}</span><input v-model="form.quantity" type="number" min="0" :step="isHKStock ? 1 : 10 ** -quantityPrecision" :inputmode="quantityPrecision === 0 ? 'numeric' : 'decimal'" :disabled="busy" /></label>
        <label v-else><span>{{ $t('chart_trade.amount') }} ({{ currency }})</span><input v-model="form.notional" type="number" min="0" step="0.01" inputmode="decimal" :disabled="busy" /></label>
        <p v-if="isHKStock" class="stock-lot-hint">
          {{ $t(lotSize ? 'tradingUnits.boardLot' : 'brokerAccounts.forthright.lotUnavailable', {lot: lotSize}) }}
          <span v-if="lotSize && Number(form.quantity) > 0"> · {{ $t('tradingUnits.totalShares', {lots: Number(form.quantity), shares: draftOrder.quantity}) }}</span>
        </p>
        <label v-if="form.orderType==='limit'"><span>{{ $t('chart_trade.price') }} ({{ currency }})</span><input v-model="form.price" type="number" min="0" step="any" inputmode="decimal" :disabled="busy" /></label>
        <div class="ticket-estimate"><span>{{ $t('account_ui.estimated') }}</span><strong>{{ amount(estimated) }} {{ currency }}</strong></div>
        <p v-if="!isHKStock && form.inputMode==='amount'">{{ $t('account_ui.amountConversion', {quantity: quantity(draftOrder.quantity)}) }}</p>
        <div class="order-actions">
          <button class="buy" :disabled="!canSubmit" @click="submit('buy')">{{ $t('account_ui.preview') }} · {{ $t('chart_trade.buy') }}</button>
          <button class="sell" :disabled="!canSubmit" @click="submit('sell')">{{ $t('account_ui.preview') }} · {{ $t('chart_trade.sell') }}</button>
        </div>
      </div>

      <nav>
        <button :class="{active:tab==='positions'}" @click="tab='positions'">{{ $t('profile_detail.positions') }} <small>{{ symbolPositions.length }}</small></button>
        <button :class="{active:tab==='orders'}" @click="tab='orders'">{{ $t('profile_detail.orders') }} <small>{{ symbolOrders.length }}</small></button>
        <button :class="{active:tab==='history'}" @click="loadHistory">{{ $t('chart_trade.history') }}</button>
        <button class="refresh-records" :disabled="busy" :aria-label="$t('common.refresh')" @click="tab==='history' ? loadHistory() : refresh()"><van-icon name="replay" /></button>
      </nav>
      <div class="stock-records">
        <article v-for="row in visibleRows" :key="row.id || row.order_id || row.symbol">
          <div><strong>{{ row.symbol || displaySymbol }}</strong><span :class="tone(row)">{{ rowLabel(row) }}</span></div>
          <dl v-if="tab==='positions'">
            <div><dt>{{ $t('profile_detail.quantity') }}</dt><dd>{{ quantity(row.quantity) }}</dd></div>
            <div><dt>{{ $t('profile_detail.entry') }}</dt><dd>{{ price(row.avg_entry_price) }} {{ row.currency || currency }}</dd></div>
            <div><dt>{{ $t('profile_detail.current') }}</dt><dd>{{ price(row.current_price) }} {{ row.currency || currency }}</dd></div>
            <div><dt>{{ $t('profile_detail.pnl') }}</dt><dd>{{ amount(row.unrealized_pnl) }} {{ row.currency || currency }}</dd></div>
          </dl>
          <dl v-else>
            <div><dt>{{ $t('profile_detail.orderType') }}</dt><dd>{{ orderTypeLabel(row.order_type) }}</dd></div>
            <div><dt>{{ $t('profile_detail.quantity') }}</dt><dd>{{ quantity(row.quantity) }}</dd></div>
            <div><dt>{{ $t('profile_detail.filled') }}</dt><dd>{{ quantity(row.filled_qty) }}</dd></div>
            <div><dt>{{ $t('profile_detail.price') }}</dt><dd>{{ price(row.limit_price || row.price || row.filled_avg_price) }} {{ row.currency || currency }}</dd></div>
            <div v-if="selectedCredential?.exchange_id === 'forthright'"><dt>{{ $t('chart_trade.fee') }}</dt><dd>{{ amount(row.fee_amount) }} {{ row.fee_currency || row.currency || currency }}</dd></div>
          </dl>
          <button v-if="tab==='positions' && Number(row.quantity)>0" class="cancel" :disabled="busy" @click="prepareSell(row)">{{ $t('chart_trade.sell') }}</button>
          <button v-if="tab!=='positions' && canCancel(row)" class="cancel" :disabled="busy" @click="cancel(row)">{{ $t('audit.cancelOrder') }}</button>
        </article>
        <van-empty v-if="!visibleRows.length" :description="$t('profile_detail.empty')" />
      </div>
    </template>

    <van-popup v-model:show="reviewOpen" round teleport="body" class="order-review-popup" :close-on-click-overlay="false">
      <section v-if="review" class="order-review" role="dialog" aria-modal="true" :aria-label="$t('account_ui.preview')">
        <header><span>{{ $t('account_ui.preview') }}</span><button type="button" :aria-label="$t('common.cancel')" @click="resolveReview(false)"><van-icon name="cross" /></button></header>
        <div class="review-heading"><span :class="review.side">{{ $t(review.side==='buy'?'chart_trade.buy':'chart_trade.sell') }}</span><div><strong>{{ review.symbol }}</strong><small>{{ review.account }}</small></div></div>
        <dl>
          <div><dt>{{ $t('chart_trade.order') }}</dt><dd>{{ orderTypeLabel(review.orderType) }}</dd></div>
          <div><dt>{{ $t('account_ui.quantity') }}</dt><dd>{{ review.marketType === 'HKStock' ? $t('tradingUnits.totalShares', {lots: review.quantity / review.lotSize, shares: review.quantity}) : quantity(review.quantity) + ' ' + $t('account_ui.shares') }}</dd></div>
          <div><dt>{{ $t(review.orderType==='market'?'account_ui.referencePrice':'chart_trade.price') }}</dt><dd>{{ price(review.reference_price) }} {{ review.currency }}</dd></div>
          <div><dt>{{ $t('account_ui.estimated') }}</dt><dd>{{ amount(review.quantity * review.reference_price) }} {{ review.currency }}</dd></div>
        </dl>
        <p v-if="review.inputMode==='amount'">{{ $t('account_ui.amountConversion', {quantity: quantity(review.quantity)}) }}</p>
        <footer><button type="button" class="review-cancel" @click="resolveReview(false)">{{ $t('common.cancel') }}</button><button type="button" :class="['review-submit',review.side]" @click="resolveReview(true)">{{ $t('chart_trade.confirm_submit') }}</button></footer>
      </section>
    </van-popup>

    <van-popup v-model:show="pickerOpen" position="bottom" round teleport="body">
      <van-picker :columns="credentialActions" :model-value="[selectedCredentialId]" @cancel="pickerOpen=false" @confirm="selectCredential">
        <template #option="option"><span class="broker-option"><ExchangeLogo :exchange="option.exchange" :size="24" />{{ option.text }}</span></template>
      </van-picker>
    </van-popup>
  </section>
</template>

<script>
import { forthrightErrorMessage, forthrightStockOrderIssue } from '@/utils/forthright'
import { buildStockOrder, validateStockOrder, stockQuantityPrecision, STOCK_OPEN_STATUSES } from '@/utils/stockOrder'
import '@/styles/order-review.css'
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import AlpacaTradePanel from '@/components/AlpacaTradePanel.vue'
import { alpacaApi, brokerApi, credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { brokerCurrency, isDirectOpenApiBroker, US_STOCK_BROKER_IDS, HK_STOCK_BROKER_IDS } from '@/constants/exchanges'
import { showConfirmDialog, showToast } from 'vant'

const OPEN_STATUSES = STOCK_OPEN_STATUSES

export default {
  name: 'StockTradePanel',
  components: { ExchangeLogo, AlpacaTradePanel },
  props: {
    market: { type: String, default: 'USStock' },
    symbol: { type: String, default: '' },
    chartPrice: { type: Number, default: null }
  },
  data() {
    return { lotRule: null, account: null, positions: [], orders: [], history: [], ready: false, review: null, reviewOpen: false, reviewResolver: null, disposed: false, error: '', busy: false, brokerBusy: false, pickerOpen: false, tab: 'positions', selectedCredentialId: null, form: { quantity: '', notional: '', inputMode: 'quantity', price: '', orderType: 'market' } }
  },
  computed: {
    isHKStock() { return this.market === 'HKStock' },
    lotSize() { return this.lotRule?.context === this.tradeContext ? Number(this.lotRule.lot_size) || 0 : 0 },
    credentialsStore() { return useCredentialsStore() },
    displaySymbol() { return String(this.symbol || '').replace(/^(?:USSTOCK|HKSTOCK):/i, '').replace(/\.(?:US|HK)$/i, '') || '—' },
    supportedIds() { return String(this.market).toLowerCase() === 'hkstock' ? HK_STOCK_BROKER_IDS : US_STOCK_BROKER_IDS },
    credentials() { return this.credentialsStore.items.filter(item => this.supportedIds.has(String(item.exchange_id || '').toLowerCase()) && item.exchange_id !== 'ibkr' && (item.exchange_id !== 'forthright' || item.account_type === 'securities')) },
    selectedCredential() { return this.credentials.find(item => String(item.id) === String(this.selectedCredentialId)) || this.credentials[0] || null },
    tradeContext() { return `${this.selectedCredential?.id || ''}:${this.market}:${this.symbol}` },
    credentialActions() { return this.credentials.map(item => ({ text: this.accountLabel(item), value: item.id, exchange: item.exchange_id })) },
    currency() { return brokerCurrency(this.selectedCredential?.exchange_id, this.market) },
    accountCurrency() { return String(this.account?.currency || this.currency).toUpperCase() },
    quantityPrecision() { return stockQuantityPrecision(this.market, this.selectedCredential?.exchange_id) },
    draftOrder() { return this.buildOrder('buy') },
    estimated() { return this.draftOrder.quantity > 0 && this.draftOrder.reference_price > 0 ? this.draftOrder.quantity * this.draftOrder.reference_price : null },
    symbolPositions() { return this.positions.filter(this.matchesSymbol) },
    symbolOrders() { return this.orders.filter(this.matchesSymbol) },
    visibleRows() { return this.tab === 'positions' ? this.symbolPositions : this.tab === 'history' ? this.history.filter(this.matchesSymbol) : this.symbolOrders },
    canSubmit() { return Boolean(this.ready && (!this.isHKStock || this.lotSize > 0) && this.selectedCredential && String(this.symbol || '').trim() && Number(this.form.inputMode === 'amount' ? this.form.notional : this.form.quantity) > 0 && (this.form.orderType !== 'limit' || Number(this.form.price) > 0) && !this.busy) },
    buyIssue() { return this.orderIssue('buy') }
  },
  watch: {
    credentials: { immediate: true, handler(items) { if (!items.some(item => String(item.id) === String(this.selectedCredentialId))) this.applyRequestedAccount(items) } },
    '$route.query.credential_id'() { this.applyRequestedAccount(this.credentials) },
    tradeContext() { if (this.isHKStock) this.form.inputMode = 'quantity'; this.resolveReview(false); this.form.quantity = ''; this.form.notional = ''; this.form.price = ''; this.history = []; this.error = ''; this.brokerBusy = false; this.refresh() }
  },
  async mounted() {
    if (!this.credentialsStore.items.length) {
      try { const response = await credentialsApi.list(); this.credentialsStore.setItems(response.data || []) } catch {}
    }
    if (!this.selectedCredentialId && this.credentials.length) this.applyRequestedAccount(this.credentials)
    if (this.isHKStock) this.form.inputMode = 'quantity'
    await this.refresh()
  },
  beforeUnmount() { this.disposed = true; this.resolveReview(false) },
  methods: {
    buildOrder(side) { return buildStockOrder({symbol: this.displaySymbol, market: this.market, broker: this.selectedCredential?.exchange_id, side, form: this.form, referencePrice: this.chartPrice, lotSize: this.lotSize}) },
    validateOrder(payload) { return validateStockOrder(payload, {broker: this.selectedCredential?.exchange_id, account: this.account, positions: this.symbolPositions, orders: this.symbolOrders, ready: this.ready, lotSize: this.lotSize}) },
    resolveReview(confirmed) { this.reviewOpen = false; const resolve = this.reviewResolver; this.reviewResolver = null; resolve?.(confirmed) },
    openReview(payload) { this.review = {...payload, account: this.accountLabel(this.selectedCredential), currency: this.currency, lotSize: this.lotSize, inputMode: this.form.inputMode}; this.reviewOpen = true; return new Promise(resolve => { this.reviewResolver = resolve }) },
    prepareSell(row) { this.form.inputMode = 'quantity'; const available = Number(row.salable_qty ?? row.available_qty ?? row.quantity) || 0; this.form.quantity = String(this.isHKStock ? (this.lotSize ? Math.floor(available / this.lotSize) : 0) : available); this.form.notional = ''; this.error = ''; this.$nextTick(() => this.$el.querySelector('.stock-ticket')?.scrollIntoView({block:'center', behavior:'smooth'})) },
    async loadHistory() {
      if (this.busy) return
      this.tab = 'history'; this.busy = true
      const context = this.tradeContext
      try { const result = await this.request('orders', {status:'all', limit:100}); if (context === this.tradeContext) this.history = Array.isArray(result.data) ? result.data : [] } catch (error) { if (context === this.tradeContext) this.error = forthrightErrorMessage(error, this.$t.bind(this)) } finally { this.busy = false; if (context !== this.tradeContext) await this.refresh() }
    },
    orderIssue(side) {
      if (this.selectedCredential?.exchange_id !== 'forthright') return ''
      return forthrightStockOrderIssue({account: this.account, market: this.market, quantity: this.form.quantity, orderType: this.form.orderType, price: this.form.price, referencePrice: this.chartPrice, side})
    },
    applyRequestedAccount(items) { const requested = items.find(item => String(item.id) === String(this.$route.query.credential_id)); const sameBroker = items.find(item => item.exchange_id === this.$route.query.exchange_id); this.selectedCredentialId = (requested || sameBroker || items[0])?.id || null },
    matchesSymbol(row) { const normalize = value => String(value || '').toUpperCase().replace(/^(?:USSTOCK|HKSTOCK|HK):/, '').replace(/\.(?:US|HK)$/, '').replace(/^0+(?=\d)/, ''); return normalize(row.symbol) === normalize(this.symbol) && (!['us', 'usstock', 'hk', 'hkstock', 'futures'].includes(String(row.market || '').toLowerCase()) || ({ us: 'USStock', usstock: 'USStock', hk: 'HKStock', hkstock: 'HKStock', futures: 'Futures' })[String(row.market).toLowerCase()] === this.market) },
    orderTypeLabel(value) { const key = `chart_trade.order_${String(value || '').toLowerCase()}`; return this.$te(key) ? this.$t(key) : value || '—' },
    accountLabel(item) { return `${item.name || item.exchange_id} · ${String(item.exchange_id || '').toUpperCase()}` },
    directBroker() { return isDirectOpenApiBroker(this.selectedCredential?.exchange_id) },
    async request(kind, params = {}, credential = this.selectedCredential, market = this.market) {
      if (!credential) return { data: kind === 'account' ? null : [] }
      if (isDirectOpenApiBroker(credential.exchange_id)) return brokerApi[kind](credential.exchange_id, credential.id, { ...params, ...(kind === 'account' && credential.exchange_id === 'forthright' ? { currency: brokerCurrency('forthright', market) } : {}) })
      if (kind === 'account') return alpacaApi.account({ credential_id: credential.id })
      if (kind === 'positions') return alpacaApi.positions({ credential_id: credential.id })
      return alpacaApi.orders({ credential_id: credential.id, ...params })
    },
    async refresh() {
      if (!this.selectedCredential || this.busy) return
      if (this.selectedCredential.exchange_id === 'alpaca') { this.account = null; this.positions = []; this.orders = []; return }
      this.busy = true; this.error = ''; this.ready = false
      const credential = this.selectedCredential, market = this.market, symbol = this.symbol
      const context = this.tradeContext
      this.lotRule = null
      this.account = null; this.positions = []; this.orders = []
      const calls = [() => this.request('account', {}, credential, market), () => this.request('positions', {}, credential, market), () => this.request('orders', { status: 'open', limit: 100 }, credential, market)]
      if (market === 'HKStock') calls.push(() => brokerApi.instrumentRules(credential.id, symbol, credential.exchange_id))
      const results = []
      if (credential.exchange_id === 'forthright') { for (const call of calls) { try { results.push({status:'fulfilled', value:await call()}) } catch (reason) { results.push({status:'rejected', reason}) } } } else results.push(...await Promise.allSettled(calls.map(call => call())))
      if (credential.id !== this.selectedCredential?.id || market !== this.market || symbol !== this.symbol) { this.busy = false; return this.refresh() }
      if (results[0].status === 'fulfilled') this.account = results[0].value.data || null
      if (results[1].status === 'fulfilled') this.positions = Array.isArray(results[1].value.data) ? results[1].value.data : []
      if (results[2].status === 'fulfilled') this.orders = Array.isArray(results[2].value.data) ? results[2].value.data : []
      if (results[3]?.status === 'fulfilled') this.lotRule = {...results[3].value.data, context}
      const failed = results.find(result => result.status === 'rejected')
      this.ready = !failed && Boolean(this.account)
      if (failed) this.error = failed.reason?.localizedMessage || failed.reason?.message || this.$t('audit.loadFailed')
      this.busy = false
    },
    selectCredential(payload) {
      if (this.busy || this.brokerBusy) return
      const selected = this.credentials.find(item => String(item.id) === String(payload?.selectedOptions?.[0]?.value))
      if (selected) {
        this.selectedCredentialId = selected.id
        this.$router.replace({query:{...this.$route.query, credential_id:selected.id, exchange_id:selected.exchange_id}})
      }
      this.pickerOpen = false
    },
    async submit(side) {
      if (!this.canSubmit) return
      const payload = this.buildOrder(side)
      const issue = this.validateOrder(payload)
      if (issue) { this.error = this.$t(issue); return }
      const credential = this.selectedCredential
      this.busy = true
      if (!await this.openReview(payload)) { this.busy = false; if (!this.disposed) await this.refresh(); return }
      if (this.disposed || credential.id !== this.selectedCredential?.id || payload.symbol !== this.displaySymbol || payload.marketType !== this.market) { this.busy = false; if (!this.disposed) await this.refresh(); return }
      this.busy = true; this.error = ''
      try {
        if (this.directBroker()) await brokerApi.placeOrder(this.selectedCredential.exchange_id, this.selectedCredential.id, payload)
        else await alpacaApi.placeOrder({ credential_id: this.selectedCredential.id, ...payload })
        showToast({ message: this.$t('broker_mobile.orderPlaced'), type: 'success' })
        this.form.quantity = ''
        this.form.notional = ''; this.tab = 'orders'
        await this.refreshAfterBusy()
      } catch (error) { const message = forthrightErrorMessage(error, this.$t.bind(this)); await this.refreshAfterBusy(); this.error = message } finally { this.busy = false }
    },
    canCancel(row) { return OPEN_STATUSES.has(String(row.status || '').toLowerCase()) && !['pending_cancel', 'pending_replace'].includes(String(row.status || '').toLowerCase()) },
    async cancel(row) {
      if (this.busy || !this.canCancel(row)) return
      const credential = this.selectedCredential, context = this.tradeContext
      this.busy = true
      try { await showConfirmDialog({ title: this.$t('audit.cancelOrder'), message: `${row.symbol || this.displaySymbol} · ${row.id || row.order_id}` }) } catch { this.busy = false; return }
      if (this.disposed || context !== this.tradeContext) { this.busy = false; if (!this.disposed) await this.refresh(); return }
      try {
        await brokerApi.cancelOrder(credential.exchange_id, credential.id, row.id || row.order_id)
        await this.refreshAfterBusy()
        if (this.tab === 'history') { this.busy = false; await this.loadHistory() }
      } catch (error) { this.error = forthrightErrorMessage(error, this.$t.bind(this)) } finally { this.busy = false }
    },
    async refreshAfterBusy() { this.busy = false; await this.refresh(); this.busy = true },
    amount(value) { const number = value == null || value === '' ? Number.NaN : Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    price(value) { const number = Number(value); return Number.isFinite(number) && number !== 0 ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—' },
    quantity(value) { const number = value == null || value === '' ? Number.NaN : Number(value); return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—' },
    tone(row) { const value = this.tab === 'positions' ? Number(row.unrealized_pnl || 0) : String(row.side || '').toLowerCase() === 'sell' ? -1 : 1; return value > 0 ? 'positive' : value < 0 ? 'negative' : '' },
    rowLabel(row) { if (this.tab === 'positions') return `${this.amount(row.unrealized_pnl)} ${row.currency || this.currency}`; const key = `account_ui.status.${String(row.status || 'new').toLowerCase()}`; return this.$te(key) ? this.$t(key) : row.status || '—' }
  }
}
</script>

<style scoped>
.stock-ticket .stock-lot-hint { margin: -6px 0 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.stock-terminal{display:grid;gap:12px;color:var(--text)}.stock-terminal>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.stock-terminal>header>div{display:grid;gap:3px}.stock-terminal>header small{color:var(--text-3);font-size:10px}.stock-terminal>header button{max-width:64%;display:flex;align-items:center;gap:7px;border:0;color:var(--text);background:transparent}.stock-terminal>header button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stock-error,.stock-empty{padding:11px;border:1px solid color-mix(in srgb,var(--down) 35%,var(--border));border-radius:11px;color:var(--down);background:var(--down-soft);font-size:11px}.stock-empty{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--text-2);border-color:var(--border);background:var(--bg-elevated)}.account-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.account-strip div{padding:11px;border:1px solid var(--border);border-radius:11px;background:var(--bg-elevated)}.account-strip span,.account-strip strong{display:block}.account-strip span{color:var(--text-3);font-size:9px}.account-strip strong{margin-top:5px;font-size:12px}.stock-ticket{display:grid;gap:10px;padding:13px;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated)}.stock-ticket label{display:grid;grid-template-columns:80px 1fr;align-items:center;gap:10px;color:var(--text-2);font-size:11px}.stock-ticket input{width:100%;padding:10px;border:1px solid var(--border);border-radius:9px;color:var(--text);background:var(--bg)}.order-kinds,.order-actions,.stock-terminal nav{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.order-kinds button,.stock-terminal nav button{padding:8px;border:1px solid var(--border);border-radius:8px;color:var(--text-2);background:var(--bg)}.order-kinds button.active,.stock-terminal nav button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.order-actions button{padding:11px;border:0;border-radius:9px;color:#fff;font-weight:800}.order-actions .buy{background:var(--up)}.order-actions .sell{background:var(--down)}.order-actions button:disabled{opacity:.45}.stock-ticket p{margin:0;color:var(--warn);font-size:9px}.stock-records{display:grid;gap:8px}.stock-records article{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg-elevated)}.stock-records article>div{display:flex;justify-content:space-between;gap:10px}.positive{color:var(--up)}.negative{color:var(--down)}.stock-records dl{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0 0}.stock-records dt{color:var(--text-3);font-size:9px}.stock-records dd{margin:3px 0 0;font-size:11px}.cancel{display:block;margin:10px 0 0 auto;border:0;color:var(--down);background:transparent}.broker-option{display:flex;align-items:center;gap:9px}
</style>
<style scoped>
.stock-terminal nav{grid-template-columns:1fr 1fr 1fr 36px}.stock-ticket label{grid-template-columns:84px minmax(0,1fr)}.ticket-estimate{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--text-2)}.ticket-estimate strong{color:var(--text);font-variant-numeric:tabular-nums}.stock-ticket p{font-size:11px;line-height:1.5;color:var(--text-3)}.stock-ticket .order-actions button{min-height:44px;font-size:12px}.order-review-popup{max-height:85dvh;overflow-y:auto}
</style>
<style scoped>
.stock-terminal{padding:16px;min-width:0;box-sizing:border-box;font-family:var(--van-base-font,system-ui,sans-serif)}
.stock-records :deep(.van-empty){padding:20px 0}.stock-records :deep(.van-empty__image){width:64px;height:64px}.stock-records :deep(.van-empty__description){margin-top:8px}
.stock-terminal>header{flex-wrap:wrap;align-items:flex-start}.stock-terminal>header button{max-width:100%;min-width:0;min-height:36px;padding:0;text-align:left;font-size:12px}
.stock-terminal>header>div{flex:1;min-width:110px}.stock-terminal>header button span{min-width:0}
.account-strip{grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.account-strip div{border:0;border-radius:0;background:transparent;padding:10px 0;min-width:0}.account-strip div:last-child:nth-child(odd){grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding-top:0}.account-strip strong{overflow-wrap:anywhere;font-variant-numeric:tabular-nums;font-weight:600}.account-strip div:last-child:nth-child(odd) strong{margin:0}
.stock-ticket{padding:12px;border-radius:10px}.stock-ticket label{grid-template-columns:84px minmax(0,1fr)}.stock-ticket input{box-sizing:border-box;min-width:0;min-height:40px}.stock-terminal nav{grid-template-columns:1fr 1fr 1fr 36px;gap:4px}.stock-terminal nav button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;font-size:12px;min-height:36px}.stock-terminal nav button.active{border-bottom-color:var(--accent);background:transparent}.stock-records article>div{align-items:center;font-size:12px}.stock-records article>div span{text-align:right;overflow-wrap:anywhere}.stock-records article{border-radius:8px}.stock-records dl{gap:8px}.stock-records .cancel{min-height:36px}
</style>
