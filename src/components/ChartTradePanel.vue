<template>
  <section class="trade-terminal" :class="{ unavailable: !isCrypto }">
    <template v-if="isCrypto">
      <header class="terminal-head">
        <strong>{{ $t('chart_trade.title') }}</strong>
        <button type="button" class="account-link" :disabled="submitting" @click="openCredentialPicker">
          <ExchangeLogo :exchange="selectedCredential?.exchange_id || ''" :size="24"/>
          <span>{{ selectedCredential ? selectedCredentialLabel : $t('chart_trade.select_account') }}</span><van-icon name="arrow"/>
        </button>
      </header>
      <div class="inline-ticket">
        <p v-if="orderError || dataError" class="data-error" role="alert">{{ orderError || dataError }}</p>
        <div class="ticket-mode">
          <div class="dual-segment">
            <button :class="{active:marketType==='spot'}" :disabled="selectedCredential?.market_scope==='swap' || submitting" @click="setMarketType('spot')">{{ $t('chart_trade.spot') }}</button>
            <button :class="{active:marketType==='swap'}" :disabled="selectedCredential?.market_scope==='spot' || submitting" @click="setMarketType('swap')">{{ $t('chart_trade.swap') }}</button>
          </div>
          <div v-if="marketType==='swap'" ref="marginPicker" class="compact-select">
            <button type="button" class="compact-select-trigger" :disabled="submitting" :aria-label="$t('chart_trade.market_type')" :aria-expanded="marginPickerOpen" @click="marginPickerOpen=!marginPickerOpen">
              <span>{{ $t(form.margin_mode==='isolated'?'chart_trade.isolated':'chart_trade.cross') }}</span><van-icon :name="marginPickerOpen?'arrow-up':'arrow-down'"/>
            </button>
            <div v-if="marginPickerOpen" class="compact-select-menu" role="listbox">
              <button v-for="mode in ['cross','isolated']" :key="mode" type="button" role="option" :aria-selected="form.margin_mode===mode" :class="{active:form.margin_mode===mode}" @click="selectMarginMode(mode)">
                <span>{{ $t(mode==='cross'?'chart_trade.cross':'chart_trade.isolated') }}</span><van-icon v-if="form.margin_mode===mode" name="success"/>
              </button>
            </div>
          </div>
          <label v-if="marketType==='swap'" class="compact-leverage"><input v-model="form.leverage" :disabled="submitting" type="number" min="1" max="125" inputmode="numeric" :aria-label="$t('chart_trade.leverage')"/><b>x</b></label>
        </div>
        <div class="order-kind" :aria-label="$t('chart_trade.order')">
          <button v-for="type in ['market','limit']" :key="type" :aria-pressed="form.order_type===type" :class="{active:form.order_type===type}" :disabled="submitting" @click="form.order_type=type">{{ $t(type==='market'?'chart_trade.order_market':'chart_trade.order_limit') }}</button>
        </div>
        <label v-if="form.order_type==='limit'" class="ticket-field">
          <span>{{ $t('chart_trade.price') }}</span><div><input v-model="form.price" :disabled="submitting" inputmode="decimal" type="number" min="0"/><b>{{ quoteAsset }}</b></div>
        </label>
        <div v-else class="market-price-row"><span>{{ $t('chart_trade.live_price') }}</span><b>{{ formatPrice(livePrice) }} <small>{{ quoteAsset }}</small></b></div>
        <label v-if="marketType==='swap'" class="ticket-field"><span>{{ $t('chart_trade.margin_amount') }}</span><div><input v-model="form.amount" :disabled="submitting" inputmode="decimal" type="number" min="0"/><b>{{ quoteAsset }}</b></div></label>
        <div v-if="marketType==='swap'" class="amount-presets"><button v-for="pct in [25,50,75,100]" :key="pct" :disabled="submitting || !balanceReady || activeBalanceAvailable<=0" @click="setAmountByPercent(pct)">{{ pct }}%</button></div>
        <div class="ticket-balance"><span>{{ $t('chart_trade.available') }}</span><strong>{{ balanceReady ? formatNumber(activeBalanceAvailable) : '—' }} <small>{{ quoteAsset }}</small></strong></div>
        <p v-if="marketType==='swap'" class="notional-line">{{ $t('chart_trade.notional',{amount:formatNumber(estimatedNotional)}) }}</p>
        <div class="ticket-options"><van-checkbox v-model="riskEnabled" :disabled="submitting" icon-size="17px">{{ $t('chart_trade.risk_orders') }}</van-checkbox><label>{{ $t('audit.aiFilter') }}<van-switch v-model="aiDecisionFilter" :disabled="submitting" size="18"/></label></div>
        <div v-if="riskEnabled" class="risk-grid">
          <label class="ticket-field"><span>{{ $t('chart_trade.take_profit') }}</span><div><input v-model="form.tp_price" :disabled="submitting" type="number" min="0" inputmode="decimal"/><b>{{ quoteAsset }}</b></div></label>
          <label class="ticket-field"><span>{{ $t('chart_trade.stop_loss') }}</span><div><input v-model="form.sl_price" :disabled="submitting" type="number" min="0" inputmode="decimal"/><b>{{ quoteAsset }}</b></div></label>
        </div>
        <div class="direct-orders">
          <div v-for="side in ['buy','sell']" :key="side" class="direct-order">
            <div v-if="marketType==='spot'" :class="['side-input-mode',side]">
              <button v-for="mode in ['quantity','amount']" :key="mode" type="button" :class="{active:spotInputMode(side)===mode}" :disabled="submitting" @click="setSpotInputMode(side,mode)">{{ $t(mode==='quantity'?'chart_trade.by_quantity':'chart_trade.by_amount') }}</button>
            </div>
            <label v-if="marketType==='spot'" class="ticket-field side-amount">
              <span>{{ $t(spotInputLabel(side)) }}</span>
              <div><input :value="spotInputValue(side)" :disabled="submitting" inputmode="decimal" type="number" min="0" @input="setSpotInputValue(side,$event.target.value)"/><b>{{ spotInputUnit(side) }}</b></div>
            </label>
            <div class="side-balance"><span>{{ $t(side==='buy'?'chart_trade.can_buy':'chart_trade.can_sell') }}</span><strong v-if="balanceReady&&marketType==='spot'">{{ spotInputMode(side)==='quantity' ? formatQuantity(availableForSide(side)) : formatNumber(availableForSide(side)) }} <small>{{ spotInputUnit(side) }}</small></strong><strong v-else>{{ balanceReady ? formatNumber(maxNotional(side)) : '—' }} <small>{{ quoteAsset }}</small></strong></div>
            <div v-if="marketType==='spot'" class="amount-presets"><button v-for="pct in [25,50,75,100]" :key="pct" :disabled="submitting || !balanceReady || availableForSide(side)<=0" @click="setAmountByPercent(pct,side)">{{ pct }}%</button></div>
            <div class="submit-row single"><button :class="side" :disabled="!canSubmitSide(side)" @click="confirmOrder(side)">{{ $t(side==='buy'?(marketType==='swap'?'chart_trade.buy_long':'chart_trade.buy'):(marketType==='swap'?'chart_trade.sell_short':'chart_trade.sell')) }}<small v-if="marketType==='swap'">{{ form.leverage }}x</small></button></div>
          </div>
        </div>
        <p class="ticket-notice">{{ $t('chart_trade.live_warning') }}</p>
      </div>
      <div class="inline-activity">
        <nav class="segmented"><button v-for="item in panelTabs" :key="item.value" :class="{active:activeTab===item.value}" @click="activeTab=item.value">{{ item.label }}<small v-if="item.value==='positions'">{{ positions.length }}</small><small v-if="item.value==='orders'">{{ openOrders.length }}</small></button></nav>
        <div v-if="refreshing && !balanceReady" class="activity-loading"><van-loading size="22" vertical>{{ $t('audit.loading') }}</van-loading></div>
        <div v-if="activeTab === 'positions'" class="trade-list">
          <div v-if="marketType==='swap'" class="dual-segment"><button :class="{active:closeScope==='full'}" @click="closeScope='full'">{{ $t('audit.all') }}</button><button :class="{active:closeScope==='system_tracked'}" @click="closeScope='system_tracked'">{{ $t('audit.tracked') }}</button></div><p v-if="closeScope==='system_tracked'">{{ $t('audit.trackedHint') }}</p>
          <article v-for="position in positions" :key="`${position.symbol}-${position.side}`" class="position-item">
            <div class="position-title">
              <div><strong>{{ normalizeSymbol(position.symbol) }}</strong><span :class="positionPnl(position) >= 0 ? 'up' : 'down'">{{ formatSigned(positionPnl(position)) }} {{ quoteAsset }} <small>({{ formatSigned(positionPnlPercent(position)) }}%)</small></span></div>
              <small>{{ sideText(position.side) }} · {{ Number(position.leverage || 1) }}x</small>
            </div>
            <div class="position-data">
              <span>{{ $t('chart_trade.size') }} <b>{{ formatQuantity(positionSize(position)) }}</b></span>
              <span>{{ $t('chart_trade.value') }} <b>{{ formatNumber(positionCost(position)) }} / {{ formatNumber(positionCurrentValue(position)) }} {{ quoteAsset }}</b></span>
              <span>{{ $t('chart_trade.entry') }} <b>{{ formatPrice(positionEntryPrice(position)) }}</b></span>
              <span>{{ $t('chart_trade.mark') }} <b>{{ formatPrice(positionMarkPrice(position)) }}</b></span>
            </div>
            <button type="button" class="close-position" :disabled="submitting" @click="closePosition(position)">{{ $t(marketType==='spot'?'audit.sellSpot':'chart_trade.close_position') }}</button>
          </article>
          <van-empty v-if="!positions.length" :description="$t('chart_trade.no_positions')" />
        </div>

        <div v-else-if="activeTab==='decisions'" class="decision-list">
          <article v-for="row in decisions" :key="row.decision_uid || row.id" class="decision-card" :class="decisionTone(row)">
            <header><div><span class="decision-status">{{ decisionOutcome(row) }}</span><strong>{{ normalizeSymbol(row.symbol) }}</strong></div><time>{{ formatTime(row.created_at) }}</time></header>
            <div class="decision-summary"><strong>{{ decisionAction(row) }}</strong><span>{{ $t('chart_trade.ai_confidence') }} {{ formatConfidence(row.confidence) }}</span></div>
            <div class="confidence-track"><i :style="{width: formatConfidence(row.confidence)}"></i></div>
            <p v-if="decisionReason(row)">{{ decisionReason(row) }}</p>
            <footer v-if="row.provider"><span>{{ row.provider }}<template v-if="row.model"> · {{ row.model }}</template></span></footer>
          </article>
          <van-empty v-if="!decisions.length" :description="$t('audit.noData')"/>
        </div>
        <EventRadar v-else-if="activeTab==='radar'" :symbol="normalizedSymbol" :market-type="marketType"/>
        <div v-else class="trade-list history-list">
          <article v-for="item in visibleHistory" :key="item.id || `${item.symbol}-${item.created_at}`" class="history-item">
            <header><div><strong>{{ normalizeSymbol(item.symbol) }}</strong><span :class="historyTone(item)">{{ historySideText(item) }}</span></div><div><small>{{ statusText(item.status) }}</small><time>{{ formatTime(item.created_at) }}</time></div></header>
            <div class="history-metrics">
              <span><small>{{ $t('chart_trade.fill_price') }}</small><b>{{ formatPrice(item.avg_fill_price || item.price) }}</b></span>
              <span><small>{{ $t('chart_trade.filled_quantity') }}</small><b>{{ formatQuantity(item.filled_amount || item.requested_base_qty) }} {{ baseAsset }}</b></span>
              <span><small>{{ $t('chart_trade.trade_value') }}</small><b>{{ formatNumber(item.amount || item.notional_usdt) }} {{ quoteAsset }}</b></span>
              <span v-if="showRealizedPnl(item)"><small>{{ $t('chart_trade.realized_pnl') }}</small><b :class="Number(item.realized_pnl)>=0?'up':'down'">{{ formatSigned(item.realized_pnl) }} {{ quoteAsset }}</b></span>
            </div>
            <p v-if="item.error_msg" class="history-error">{{ item.error_msg }}</p>
            <button v-if="activeTab==='orders' && item.status!=='cancel_pending'" class="cancel-order" :disabled="submitting" @click="cancelOrder(item)">{{ $t('audit.cancelOrder') }}</button>
          </article>
          <van-empty v-if="!visibleHistory.length" :description="$t('chart_trade.no_history')" />
        </div>
      </div>
    </template>
    <button v-else class="unavailable-row" @click="$router.push('/market')"><van-icon name="info-o"/><span>{{ $t('account_ui.unsupported') }}</span><van-icon name="arrow"/></button>
    <van-popup v-model:show="credentialPickerOpen" position="bottom" round teleport="body">
      <van-picker :columns="credentialActions" @cancel="credentialPickerOpen=false" @confirm="selectCredential"><template #option="option"><span class="credential-option"><ExchangeLogo :exchange="option.exchange" :size="24"/>{{ option.text }}</span></template></van-picker>
    </van-popup>
    <van-popup v-model:show="reviewOpen" round teleport="body" class="order-review-popup" :close-on-click-overlay="false">
      <section v-if="orderReview" class="order-review">
        <header><span>{{ $t('chart_trade.live_order') }}</span><button type="button" @click="resolveOrderReview(false)" :aria-label="$t('common.cancel')"><van-icon name="cross"/></button></header>
        <div class="review-heading"><span :class="orderReview.side">{{ orderReview.sideLabel }}</span><div><strong>{{ orderReview.symbol }}</strong><small>{{ orderReview.account }}</small></div></div>
        <dl>
          <div><dt>{{ $t('chart_trade.market_type') }}</dt><dd>{{ orderReview.market }}</dd></div>
          <div><dt>{{ $t('chart_trade.order') }}</dt><dd>{{ orderReview.type }}</dd></div>
          <div><dt>{{ orderReview.quantity ? $t('chart_trade.filled_quantity') : $t('chart_trade.amount') }}</dt><dd>{{ orderReview.quantity ? `${orderReview.quantity} ${orderReview.unit}` : `${orderReview.amount} ${quoteAsset}` }}</dd></div>
          <div><dt>{{ $t('chart_trade.price') }}</dt><dd>{{ orderReview.price }}</dd></div>
          <div v-if="orderReview.marketType==='swap'"><dt>{{ $t('chart_trade.leverage') }}</dt><dd>{{ orderReview.leverage }}x · {{ orderReview.margin }}</dd></div>
          <div v-if="riskEnabled"><dt>{{ $t('chart_trade.risk_orders') }}</dt><dd>{{ orderReview.tp }} / {{ orderReview.sl }}</dd></div>
        </dl>
        <p><van-icon name="warning-o"/>{{ $t('chart_trade.live_warning_short') }}</p>
        <footer><button type="button" class="review-cancel" @click="resolveOrderReview(false)">{{ $t('common.cancel') }}</button><button type="button" :class="['review-submit',orderReview.side]" @click="resolveOrderReview(true)">{{ $t('chart_trade.confirm_submit') }}</button></footer>
      </section>
    </van-popup>
  </section>
</template>

<script>
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import '@/styles/order-review.css'
import EventRadar from '@/components/EventRadar.vue'
import {buildOrder,validateOrder,tradeProductFields,isCryptoProduct,OPEN_ORDER_STATUSES} from '@/utils/tradeOrder'
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi, quickTradeApi } from '@/api'
import { useCredentialsStore, useQuickTradeStore } from '@/stores'

const SUPPORTED_EXCHANGES = new Set(['binance', 'okx', 'bitget', 'bybit', 'gate', 'htx'])

export default {
  name: 'ChartTradePanel',
  components: { ExchangeLogo, EventRadar },
  props: {
    market: { type: String, default: 'Crypto' },
    symbol: { type: String, default: 'BTC/USDT' },
    chartPrice: { type: Number, default: null },
    product: { type: Object, default: null }
  },
  emits: ['context-change'],
  data() {
    return {
      aiDecisionFilter:false, decisions:[], closeScope:'full', refreshing:false, dataError:'', orderError:'', balanceReady:false, requestId:0, contextKey:'',
      credentialPickerOpen: false,
      marginPickerOpen: false,
      reviewOpen: false,
      orderReview: null,
      reviewResolver: null,
      activeTab: 'positions',
      riskEnabled: false,
      submitting: false,
      pollTimer: null,
      form: {
        amount: '',
        buy_quantity: '',
        sell_amount: '',
        sell_quantity: '',
        buy_input_mode: 'amount',
        sell_input_mode: 'quantity',
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
    isCrypto() { return String(this.market).toLowerCase() === 'crypto' && isCryptoProduct(this.product) },
    normalizedSymbol() { return this.normalizeSymbol(this.symbol) || '--' },
    baseAsset() { return this.normalizedSymbol.split('/')[0] || '' },
    quoteAsset() { return String(this.product?.settle_currency || this.balance?.currency || this.normalizedSymbol.split('/')[1] || 'USDT').toUpperCase() },
    credentials() {
      return this.credentialsStore.items.filter((item) => SUPPORTED_EXCHANGES.has(String(item.exchange_id||'').toLowerCase()))
    },
    selectedCredentialId() { return this.quickTradeStore.selectedCredentialId },
    selectedCredential() { return this.credentials.find((item) => String(item.id) === String(this.selectedCredentialId)) || null },
    selectedCredentialLabel() {
      if (!this.selectedCredential) return ''
      return `${this.selectedCredential.name || this.selectedCredential.exchange_id} · ${String(this.selectedCredential.exchange_id || '').toUpperCase()}`
    },
    credentialActions() {
      return this.credentials.map((item) => ({ text: `${item.name || item.exchange_id} · ${String(item.exchange_id).toUpperCase()}`, value: item.id, exchange: item.exchange_id }))
    },
    marketType() { return this.quickTradeStore.marketType },
    balance() { return this.quickTradeStore.balance },
    positions() { return this.quickTradeStore.positions },
    history() { return this.quickTradeStore.history },
    openOrders() { return this.history.filter(row=>OPEN_ORDER_STATUSES.has(String(row.status).toLowerCase())) },
    visibleHistory() { return this.activeTab==='orders'?this.openOrders:this.history },
    activeBalanceAvailable() {
      return Number(this.balance?.[this.marketType]?.available ?? this.balance?.available ?? 0)
    },
    sellQuantity() {
      return this.positions.filter(p=>this.normalizeSymbol(p.symbol)===this.normalizedSymbol).reduce((total,p)=>total+Math.max(0,Number(p.available??p.free??this.positionSize(p))||0),0)
    },
    livePrice() { return Number(this.chartPrice || this.form.price || 0) },
    estimatedNotional() {
      const amount = Math.max(0, Number(this.form.amount) || 0)
      return this.marketType === 'swap' ? amount * Math.max(1, Number(this.form.leverage) || 1) : amount
    },
    panelTabs() {
      return [
        { value: 'positions', label: this.$t('chart_trade.positions') },
        { value: 'orders', label: this.$t('audit.orders') },
        { value: 'history', label: this.$t('trading.tab_trades') },
        { value: 'decisions', label: this.$t('audit.decisions') },
        { value: 'radar', label: this.$t('audit.radar') }
      ]
    }
  },
  watch: {
    riskEnabled(value) { if(!value){this.form.tp_price='';this.form.sl_price=''} },
    '$route.query.credential_id'() { if(this.$route.path==='/indicators/chart') this.applyRequestedAccount() },
    selectedCredentialId() { const scope=this.selectedCredential?.market_scope;if(['spot','swap'].includes(scope))this.quickTradeStore.setMarketType(scope);this.clearSpotInputs();this.form.price='';this.form.tp_price='';this.form.sl_price='';this.refreshTradeData(); this.emitContext() },
    marketType() { this.refreshTradeData(); this.emitContext() },
    symbol() { this.clearSpotInputs();this.form.price='';this.form.tp_price='';this.form.sl_price='';this.refreshTradeData() },
    product: {deep:true,handler(){const required=String(this.product?.market_type||'').toLowerCase();if(['spot','swap'].includes(required)&&required!==this.marketType)this.quickTradeStore.setMarketType(required);if(!this.selectedCredential&&this.credentials.length)this.quickTradeStore.setSelectedCredential(this.credentials[0].id);this.refreshTradeData()}},
    chartPrice(value) {
      if (Number(value) > 0 && !Number(this.form.price)) this.form.price = String(value)
    }
  },
  async mounted() {
    await this.bootstrap()
    this.startPolling()
    document.addEventListener('pointerdown', this.closeMarginPicker)
  },
  activated() { this.startPolling() },
  deactivated() { this.stopPolling();this.marginPickerOpen=false },
  beforeUnmount() { this.stopPolling();this.requestId++;this.resolveOrderReview(false);document.removeEventListener('pointerdown',this.closeMarginPicker) },
  methods: {
    closeMarginPicker(event) {
      if(this.marginPickerOpen&&!this.$refs.marginPicker?.contains(event.target))this.marginPickerOpen=false
    },
    selectMarginMode(mode) {
      this.form.margin_mode=mode
      this.marginPickerOpen=false
    },
    applyRequestedAccount() {
      const requested=this.credentials.find(item=>String(item.id)===String(this.$route.query.credential_id))
      if(!requested)return
      this.quickTradeStore.setSelectedCredential(requested.id)
      const scope=requested.market_scope
      const market=['spot','swap'].includes(scope)?scope:this.$route.query.market_type
      if(['spot','swap'].includes(market))this.quickTradeStore.setMarketType(market)
    },
    async bootstrap() {
      const [credentialsResult] = await Promise.allSettled([credentialsApi.list()])
      if (credentialsResult.status === 'fulfilled') this.credentialsStore.setItems(credentialsResult.value.data || [])
      this.applyRequestedAccount()
      if (!this.selectedCredential && this.credentials.length) this.quickTradeStore.setSelectedCredential(this.credentials[0].id)
      if (Number(this.chartPrice) > 0) this.form.price = String(this.chartPrice)
      await this.refreshTradeData()
      this.emitContext()
    },
    availableForSide(side) {
      if(this.marketType!=='spot')return this.activeBalanceAvailable
      const price=Math.max(0,Number(this.form.order_type==='limit'?this.form.price:this.livePrice)||0)
      if(this.spotInputMode(side)==='quantity')return side==='buy'?(price>0?this.activeBalanceAvailable/price:0):this.sellQuantity
      return side==='buy'?this.activeBalanceAvailable:this.sellQuantity*price
    },
    maxNotional(side) {
      if(this.marketType==='spot')return side==='sell'?this.sellQuantity*Math.max(0,Number(this.form.order_type==='limit'?this.form.price:this.livePrice)||0):this.activeBalanceAvailable
      return this.activeBalanceAvailable*Math.max(1,Number(this.form.leverage)||1)
    },
    canSubmitSide(side) {
      if (!this.isCrypto) return false
      const requested=this.marketType==='spot'?Number(this.spotInputValue(side)):Number(this.form.amount)
      return Boolean(this.balanceReady&&!this.submitting&&this.selectedCredential&&requested>0&&requested<=this.availableForSide(side)&&(this.form.order_type!=='limit'||Number(this.form.price)>0)&&(this.marketType!=='swap'||(Number(this.form.leverage)>=1&&Number(this.form.leverage)<=125)))
    },
    spotInputMode(side) { return (side==='buy'?this.form.buy_input_mode:this.form.sell_input_mode)||(side==='buy'?'amount':'quantity') },
    spotInputField(side) { return this.spotInputMode(side)==='quantity'?`${side}_quantity`:(side==='buy'?'amount':'sell_amount') },
    spotInputValue(side) { return this.form[this.spotInputField(side)] },
    spotInputUnit(side) { return this.spotInputMode(side)==='quantity'?this.baseAsset:this.quoteAsset },
    spotInputLabel(side) { return `chart_trade.${side}_${this.spotInputMode(side)}` },
    setSpotInputMode(side,mode) { if(!this.submitting&&['quantity','amount'].includes(mode))this.form[`${side}_input_mode`]=mode },
    setSpotInputValue(side,value) { this.form[this.spotInputField(side)]=value },
    clearSpotInputs() { this.form.amount='';this.form.buy_quantity='';this.form.sell_amount='';this.form.sell_quantity='' },
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
      if(this.submitting)return
      this.marginPickerOpen=false
      const scope=this.selectedCredential?.market_scope;if(['spot','swap'].includes(scope)&&scope!==value)return
      this.form.tp_price='';this.form.sl_price=''
      this.quickTradeStore.setMarketType(value)
      this.form.leverage = value === 'spot' ? '1' : (Number(this.form.leverage) > 1 ? this.form.leverage : '5')
    },
    emitContext() {
      this.$emit('context-change', { exchangeId: this.selectedCredential?.exchange_id || '', marketType: this.marketType })
    },
    async refreshTradeData() {
      const key=JSON.stringify([this.selectedCredentialId,this.marketType,this.normalizedSymbol,this.product?.instrument_id||'',this.product?.product_type||'',this.product?.api_family||''])
      if(this.refreshing&&key===this.contextKey)return
      const contextChanged=key!==this.contextKey
      const version=++this.requestId;this.contextKey=key
      this.refreshing=true;this.dataError=''
      if(contextChanged){this.orderError='';this.balanceReady=false;this.quickTradeStore.setBalance(null);this.quickTradeStore.setPositions([]);this.quickTradeStore.setHistory([]);this.decisions=[]}
      if(!this.selectedCredential||!this.isCrypto){this.refreshing=false;return}
      const product={...this.product,symbol:this.normalizedSymbol}
      const params={credential_id:this.selectedCredentialId,symbol:this.normalizedSymbol,market_type:this.marketType,limit:200}
      const results=await Promise.allSettled([quickTradeApi.getBalance(this.selectedCredentialId,this.marketType,product),quickTradeApi.getHistory(params),quickTradeApi.getPosition({credentialId:this.selectedCredentialId,symbol:this.normalizedSymbol,marketType:this.marketType,product}),quickTradeApi.getAiDecisions(params)])
      if(version!==this.requestId)return
      if(results[0].status==='fulfilled'){this.quickTradeStore.setBalance(results[0].value.data);this.balanceReady=true}
      if(results[1].status==='fulfilled')this.quickTradeStore.setHistory(results[1].value.data)
      if(results[2].status==='fulfilled')this.quickTradeStore.setPositions(results[2].value.data)
      if(results[3].status==='fulfilled')this.decisions=Array.isArray(results[3].value.data)?results[3].value.data:[]
      if(results.some(x=>x.status==='rejected'))this.dataError=this.$t('audit.loadFailed')
      this.refreshing=false
    },
    async confirmOrder(side) {
      if(this.submitting)return
      if(!this.isCrypto){showToast(this.$t('account_ui.unsupported'));return}
      this.orderError=''
      const payload=buildOrder({credentialId:this.selectedCredentialId,symbol:this.normalizedSymbol,marketType:this.marketType,form:this.form,side,aiDecisionFilter:this.aiDecisionFilter,product:this.product})
      const available=this.availableForSide(side)
      const error=validateOrder(payload,{available,price:this.livePrice,balanceReady:this.balanceReady})
      if(error){showToast(this.$t(error));return}
      const key=this.contextKey
      this.submitting=true
      try {
        const review={account:this.selectedCredentialLabel,symbol:payload.symbol,market:this.$t(payload.market_type==='swap'?'chart_trade.swap':'chart_trade.spot'),marketType:payload.market_type,side,sideLabel:this.$t(side==='buy'?(payload.market_type==='swap'?'chart_trade.buy_long':'chart_trade.buy'):(payload.market_type==='swap'?'chart_trade.sell_short':'chart_trade.sell')),type:this.$t(payload.order_type==='market'?'chart_trade.order_market':'chart_trade.order_limit'),amount:payload.amount,quantity:payload.quantity,unit:this.baseAsset,price:payload.price||this.$t('chart_trade.order_market'),leverage:payload.leverage,margin:this.$t(payload.margin_mode==='isolated'?'chart_trade.isolated':'chart_trade.cross'),tp:payload.tp_price||'—',sl:payload.sl_price||'—'}
        const confirmed=await this.openOrderReview(review)
        if(!confirmed)return
        if(key!==this.contextKey){showToast(this.$t('audit.accountChanged'));return}
        await quickTradeApi.placeOrder(payload)
        showToast({message:this.$t('chart_trade.order_success'),type:'success'})
        this.clearSpotInputs();await this.refreshTradeData();this.activeTab='positions'
      } catch(error) { if(error!=='cancel'&&error!=='close'&&error?.message)this.orderError=error.localizedMessage||error.message }
      finally {this.submitting=false}
    },
    async closePosition(position) {
      if(this.submitting)return
      const key=this.contextKey
      const payload={credential_id:this.selectedCredentialId,symbol:this.normalizeSymbol(position.symbol||this.symbol),market_type:this.marketType,close_scope:this.marketType==='swap'?this.closeScope:'full',position_side:position.side,source:'indicator',...tradeProductFields(this.product)}
      this.submitting=true
      try{await showConfirmDialog({title:this.$t('chart_trade.close_confirm_title'),message:this.selectedCredentialLabel+'\n'+this.$t('chart_trade.close_confirm_message',{symbol:payload.symbol})+'\n'+this.sideText(position.side)+' · '+this.$t(payload.close_scope==='full'?'audit.all':'audit.tracked')});if(key!==this.contextKey){showToast(this.$t('audit.accountChanged'));return}await quickTradeApi.closePosition(payload);showToast(this.$t('chart_trade.close_success'));await this.refreshTradeData()}
      catch(error){if(error?.message)this.dataError=error.message}finally{this.submitting=false}
    },
    async cancelOrder(item) {
      if(this.submitting)return
      this.submitting=true
      try{await showConfirmDialog({title:this.$t('audit.cancelOrder'),message:this.$t('audit.confirmCancel')+'\n'+item.symbol+' · '+item.id});await quickTradeApi.cancelOrder(item.id);await this.refreshTradeData()}catch(error){if(error?.message)this.dataError=error.message}finally{this.submitting=false}
    },
    setAmountByPercent(pct,side='buy') {
      const value=this.availableForSide(side)*pct/100
      if(this.marketType==='spot')this.form[this.spotInputField(side)]=String(this.spotInputMode(side)==='quantity'?Math.floor(value*1e8)/1e8:Math.floor(value*100)/100)
      else this.form.amount=String(Math.floor(value*100)/100)
    },
    openOrderReview(review) {
      this.orderReview=review;this.reviewOpen=true
      return new Promise(resolve=>{this.reviewResolver=resolve})
    },
    resolveOrderReview(confirmed) {
      this.reviewOpen=false;this.orderReview=null
      const resolve=this.reviewResolver;this.reviewResolver=null
      if(resolve)resolve(Boolean(confirmed))
    },
    normalizeSymbol(value) {
      let symbol = String(value || '').trim().toUpperCase().replace('-SWAP', '')
      if (symbol.includes(':')) symbol = symbol.split(':')[0]
      if (!symbol.includes('/') && symbol.endsWith('USDT')) symbol = `${symbol.slice(0, -4)}/USDT`
      return symbol
    },
    sideText(value) { return this.$t(['buy', 'long'].includes(String(value).toLowerCase()) ? 'chart_trade.long' : 'chart_trade.short') },
    historySideText(item) {
      if(item?.is_close)return this.$t(String(item.close_side).toLowerCase()==='short'?'chart_trade.close_short':'chart_trade.close_long')
      if(item?.market_type==='spot')return this.$t(String(item.side).toLowerCase()==='buy'?'chart_trade.buy':'chart_trade.sell')
      return this.sideText(item?.side)
    },
    historyTone(item) {
      if(item?.is_close)return String(item.close_side).toLowerCase()==='short'?'up':'down'
      return String(item?.side).toLowerCase()==='buy'?'up':'down'
    },
    showRealizedPnl(item) { return item?.market_type==='swap'&&Boolean(item?.is_close)&&item?.realized_pnl!==null&&item?.realized_pnl!==undefined },
    decisionTone(row) { return this.decisionAllowed(row)?'allowed':'blocked' },
    decisionAllowed(row) { return row?.allowed===true||Number(row?.allowed)===1||['allow','allowed','pass','approved'].includes(String(row?.decision||'').toLowerCase()) },
    decisionOutcome(row) { return this.$t(this.decisionAllowed(row)?'chart_trade.ai_allowed':'chart_trade.ai_blocked') },
    decisionAction(row) {
      const action=String(row?.action||'').toLowerCase()
      if(['buy','long'].includes(action))return this.$t('chart_trade.buy_long')
      if(['sell','short'].includes(action))return this.$t('chart_trade.sell_short')
      return this.$t('chart_trade.ai_hold')
    },
    decisionReason(row) { return String(row?.reason||row?.fallback_reason||'').trim() },
    formatConfidence(value) { const number=Number(value);return `${Math.round((Number.isFinite(number)?Math.max(0,Math.min(1,number)):0)*100)}%` },
    statusText(value) {
      const status = String(value || 'submitted').toLowerCase()
      const known = ['filled', 'submitted', 'failed', 'canceled'].includes(status) ? status : null
      if(!known)return status
      return this.$t(`chart_trade.status_${known}`)
    },
    positionSize(position) { return Number(position?.size ?? position?.quantity ?? position?.qty ?? position?.amount ?? 0) },
    positionEntryPrice(position) { return Number(position?.entry_price ?? position?.avg_price ?? 0) },
    positionMarkPrice(position) { return Number(position?.mark_price ?? position?.current_price ?? position?.price ?? 0) },
    positionDerivedPnl(position) {
      const size=Math.abs(this.positionSize(position)),entry=this.positionEntryPrice(position),mark=this.positionMarkPrice(position)||this.livePrice
      if(!(size>0&&entry>0&&mark>0))return 0
      const side=String(position?.side||position?.position_side||position?.direction||'long').toLowerCase()
      const direction=['short','sell'].includes(side)?-1:1
      const multiplier=Math.abs(Number(position?.contract_size??position?.contract_multiplier??1))||1
      return (mark-entry)*size*direction*multiplier
    },
    positionPnl(position) {
      const reported=Number(position?.unrealized_pnl??position?.pnl),derived=this.positionDerivedPnl(position)
      return Number.isFinite(reported)&&(Math.abs(reported)>1e-12||Math.abs(derived)<=1e-12)?reported:derived
    },
    positionCost(position) {
      return Math.abs(this.positionSize(position)*this.positionEntryPrice(position))
    },
    positionCurrentValue(position) {
      const price=this.positionMarkPrice(position)||this.livePrice
      return Math.abs(this.positionSize(position)*price)
    },
    positionPnlPercent(position) {
      const explicitMargin=Number(position?.initial_margin??position?.position_margin??position?.margin)
      const leverage=Math.max(1,Number(position?.leverage)||1)
      const margin=Number.isFinite(explicitMargin)&&explicitMargin>0?explicitMargin:this.positionCost(position)/leverage
      return margin>0?this.positionPnl(position)/margin*100:0
    },
    formatQuantity(value) { return Number(value||0).toLocaleString(undefined,{maximumFractionDigits:8}) },
    formatNumber(value) { return formatMoney(value) },
    formatPrice(value) {
      const number = Number(value || 0)
      if (!number) return '--'
      return number.toLocaleString('en-US', { minimumFractionDigits: number >= 100 ? 2 : 4, maximumFractionDigits: number >= 100 ? 2 : 6 })
    },
    formatSigned(value) { const number = Number(value || 0); return `${number > 0 ? '+' : ''}${number.toFixed(2)}` },
    formatTime(value) { const date = new Date(typeof value === 'number' && value < 1e11 ? value * 1000 : value); return Number.isNaN(date.getTime()) ? '-' : `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` },
    startPolling() { this.stopPolling(); this.pollTimer = window.setInterval(() => {if(!document.hidden&&!this.submitting)this.refreshTradeData()}, 30000) },
    stopPolling() { if (this.pollTimer) window.clearInterval(this.pollTimer); this.pollTimer = null }
  }
}

function formatMoney(value) { return Number(value || 0).toFixed(2) }
</script>

<style scoped>
.trade-terminal { margin: 10px var(--page-gutter) 0; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--bg-elevated); color: var(--text); }
.terminal-head { min-height: 50px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 12px; border-bottom: 1px solid var(--hairline); }
.terminal-head > div { display: flex; flex-direction: column; gap: 2px; }
.terminal-head .eyebrow { color: var(--text-3); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.terminal-head strong { font-size: 15px; font-weight: 900; }
.account-link { min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; border: 0; background: transparent; color: var(--text-2); font-size: 11px; font-weight: 700; }
.account-link .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-4); }
.account-link .status-dot.online { background: var(--up); box-shadow: 0 0 0 3px var(--up-soft); }
.account-strip { display: grid; grid-template-columns: 1.5fr 1fr .7fr; padding: 9px 12px; border-bottom: 1px solid var(--hairline); }
.account-strip > div { display: flex; flex-direction: column; gap: 4px; }
.account-strip > div + div { padding-left: 10px; border-left: 1px solid var(--hairline); }
.account-strip span { color: var(--text-3); font-size: 10px; }
.account-strip strong { font-size: 13px; font-variant-numeric: tabular-nums; }
.account-strip small { color: var(--text-3); font-size: 9px; }
.trade-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px 8px; }
.trade-actions button, .submit-row button { min-height: 42px; border: 0; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 900; }
.trade-actions button { display: flex; align-items: center; justify-content: center; gap: 7px; }
.buy { background: var(--up); }.sell { background: var(--down); }
button:disabled { opacity: .38; }
.terminal-more { width: 100%; min-height: 38px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 0; border-top: 1px solid var(--hairline); background: var(--surface-raised); color: var(--text-2); font-size: 11px; text-align: left; }
.terminal-more span { flex: 1; }.terminal-more strong { color: var(--text); font-size: 11px; }
.unavailable-row { width: 100%; min-height: 50px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 0; background: transparent; color: var(--text-2); text-align: left; }
.unavailable-row span { flex: 1; }
.trade-popup{width:100%;max-height:calc(88vh - var(--safe-area-top, 0px));background:var(--bg-elevated);color:var(--text)}.sheet-body { max-height:calc(88vh - var(--safe-area-top, 0px)); overflow-y:auto; padding:18px 14px calc(22px + var(--safe-area-bottom)); }
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
.position-item { padding: 11px; }.position-title { display: flex; justify-content: space-between; margin-bottom: 10px; }.position-title > div { display: flex; gap: 8px; }.position-title small { color: var(--text-3); }.position-title span small{font-size:9px}.up { color: var(--up) !important; }.down { color: var(--down) !important; }
.position-data { display: grid; grid-template-columns: .8fr 1.6fr 1fr 1fr; gap: 6px; color: var(--text-3); font-size: 10px; }.position-data span { display: flex; flex-direction: column; gap: 3px; min-width:0; }.position-data b { overflow:hidden;color: var(--text); font-size: 11px;text-overflow:ellipsis;white-space:nowrap; }
.close-position { width: 100%; min-height: 32px; margin-top: 10px; border: 1px solid color-mix(in srgb, var(--down) 32%, var(--border)); border-radius: 6px; color: var(--down); background: var(--down-soft); font-size: 11px; font-weight: 800; }
.history-item { padding: 11px; }.history-item header { display:flex;align-items:flex-start;justify-content:space-between;gap:10px }.history-item header>div{display:flex;align-items:center;gap:7px}.history-item header>div:last-child{flex-direction:column;align-items:flex-end;gap:2px}.history-item header span{padding:2px 6px;border-radius:4px;background:var(--surface-deep);font-size:10px;font-weight:800}.history-item small,.history-item time { color: var(--text-3); font-size: 10px; }.history-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:11px;padding-top:10px;border-top:1px solid var(--hairline)}.history-metrics span{display:flex;min-width:0;flex-direction:column;gap:3px}.history-metrics b{overflow:hidden;color:var(--text);font-size:11px;font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap}.history-error{margin:9px 0 0;color:var(--down);font-size:10px}.cancel-order{width:100%;min-height:30px;margin-top:9px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--text-2)}
.decision-list{display:grid;gap:8px}.decision-card{padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-raised)}.decision-card header,.decision-card header>div,.decision-card footer,.decision-summary{display:flex;align-items:center}.decision-card header,.decision-card footer,.decision-summary{justify-content:space-between;gap:10px}.decision-card header>div{gap:7px}.decision-card time,.decision-card footer{color:var(--text-3);font-size:10px}.decision-status{padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800}.decision-card.allowed .decision-status{color:var(--up);background:var(--up-soft)}.decision-card.blocked .decision-status{color:var(--down);background:var(--down-soft)}.decision-summary{margin-top:13px}.decision-summary strong{font-size:16px}.decision-summary span{color:var(--text-2);font-size:11px}.confidence-track{height:3px;margin-top:7px;overflow:hidden;border-radius:999px;background:var(--surface-deep)}.confidence-track i{display:block;height:100%;border-radius:inherit;background:var(--up)}.decision-card.blocked .confidence-track i{background:var(--down)}.decision-card p{margin:11px 0 0;color:var(--text-2);font-size:12px;line-height:1.55}.decision-card footer{margin-top:11px;padding-top:9px;border-top:1px solid var(--hairline)}
@media (min-width: 720px) { .trade-terminal { max-width: 720px; margin-left: auto; margin-right: auto; } }
.segmented{display:flex;overflow-x:auto;gap:4px}.segmented button{flex:0 0 auto;padding:0 10px}.data-error{color:var(--down);font-size:12px}.ticket-account strong{white-space:normal}.position-title{gap:8px;flex-wrap:wrap}.position-title>div{flex-wrap:wrap}.trade-list>p{font-size:12px;color:var(--text-3)}
</style>

<style scoped>
.credential-option{display:flex;align-items:center;gap:10px;max-width:100%;font-size:14px}.credential-option .exchange-logo{flex-shrink:0}
.trade-terminal{margin:12px 0 0;border-radius:0;border-left:0;border-right:0;background:var(--v2-bg)}
.inline-ticket{padding:14px}.inline-activity{border-top:6px solid var(--v2-surface-2);padding:0 14px 16px}
.terminal-head{padding:12px 14px}.account-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ticket-mode{display:flex;gap:8px;margin-bottom:12px}.ticket-mode .dual-segment{flex:1;margin:0;border:0;min-width:0}
.compact-select,.compact-leverage{display:flex;align-items:center;background:var(--v2-surface-2);border-radius:6px}.compact-select{position:relative;min-width:88px}
.compact-select-trigger{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 11px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--v2-text);font-size:12px}.compact-select-trigger[aria-expanded=true]{border-color:var(--v2-brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--v2-brand) 13%,transparent)}.compact-select-trigger .van-icon{color:var(--v2-muted);font-size:13px}.compact-select-menu{position:absolute;z-index:35;top:calc(100% + 6px);right:0;min-width:132px;padding:5px;border:1px solid var(--v2-line);border-radius:10px;background:var(--v2-surface);box-shadow:0 12px 30px color-mix(in srgb,#000 30%,transparent)}.compact-select-menu button{width:100%;min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:var(--v2-text);font-size:12px;text-align:left}.compact-select-menu button.active{background:color-mix(in srgb,var(--v2-brand) 13%,var(--v2-surface-2));color:var(--v2-text)}.compact-select-menu .van-icon{color:var(--v2-brand);font-size:14px}
.compact-leverage{padding:0 8px;width:64px}.compact-leverage input{min-width:0;width:100%;border:0;background:none;color:var(--v2-text);font-size:13px}.compact-leverage b{font-size:11px;color:var(--v2-muted)}
.direct-orders{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.direct-order{display:grid;align-content:end;gap:8px;min-width:0}.direct-order .submit-row small{margin-left:7px;font-size:12px;font-weight:600}.side-balance{display:flex;flex-direction:column;gap:3px;min-width:0;color:var(--v2-muted);font-size:11px}.side-balance strong{overflow:hidden;color:var(--v2-text);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap}
.side-input-mode{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px;border:1px solid var(--v2-line);border-radius:7px;background:var(--v2-surface-2)}.side-input-mode button{min-width:0;min-height:30px;padding:0 4px;border:0;border-radius:5px;background:transparent;color:var(--v2-muted);font-size:11px}.side-input-mode.buy button.active{background:color-mix(in srgb,var(--v2-green) 18%,var(--v2-surface));color:var(--v2-green)}.side-input-mode.sell button.active{background:color-mix(in srgb,var(--v2-red) 18%,var(--v2-surface));color:var(--v2-red)}
.order-kind{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px;padding:3px;border:1px solid var(--v2-line);border-radius:8px;background:var(--v2-surface-2)}.order-kind button{min-height:38px;border:0;border-radius:6px;background:transparent;color:var(--v2-muted);font-size:13px;font-weight:700}.order-kind button.active{background:var(--v2-surface);color:var(--v2-text);box-shadow:0 1px 4px color-mix(in srgb,var(--v2-text) 9%,transparent)}
.order-type-select{display:flex;align-items:center;padding:0 12px;background:var(--v2-surface-2);border:1px solid var(--v2-line);border-radius:7px}.order-type-select select{width:100%;appearance:none;min-height:42px;background:none;color:var(--v2-text);border:0;font-size:13px}
.market-price-row,.ticket-balance{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--v2-muted);padding:12px 0}
.market-price-row b,.ticket-balance strong{color:var(--v2-text);font-variant-numeric:tabular-nums}.market-price-row small,.ticket-balance small{font-size:10px}
.ticket-balance strong{margin-left:auto}
.ticket-options{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 16px;font-size:12px}.ticket-options label{display:flex;align-items:center;gap:8px;color:var(--v2-muted)}
.ticket-notice{margin:10px 0 0;font-size:10px;line-height:1.6;color:var(--v2-muted)}
.inline-activity .segmented{border:0;border-bottom:1px solid var(--v2-line);border-radius:0;background:none;margin-bottom:12px;padding:0}
.inline-activity .segmented button{padding:0 9px;white-space:nowrap;font-weight:600}.inline-activity .segmented small{font-size:10px;margin-left:4px;color:var(--v2-muted)}
.risk-grid .ticket-field{min-width:0}.ticket-field input{font-size:18px;font-weight:600}.submit-row button{min-height:44px}
.side-amount{margin:0}.side-amount>span{min-height:16px;margin-bottom:5px}.side-amount>div{min-height:42px;padding:0 9px}.side-amount input{font-size:15px}.side-amount b{max-width:54px;overflow:hidden;text-overflow:ellipsis}.activity-loading{min-height:96px;display:grid;place-items:center;color:var(--v2-muted)}
@media(max-width:420px){.position-data{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:10px}}
</style>

<style scoped>.dual-segment button.active{background:var(--v2-brand);color:var(--v2-on-brand)}.segmented button.active{color:var(--v2-text);background:none;box-shadow:inset 0 -3px var(--v2-brand);border-radius:0}.segmented button{min-height:44px}.terminal-head{gap:10px}.account-link{max-width:65%}</style>

<style>

</style>
