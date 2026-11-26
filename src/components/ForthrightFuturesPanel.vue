<template>
  <section class="futures-panel">
    <header class="ticket-head"><div><span class="ticket-broker">Forthright</span><h3>{{ $t('brokerAccounts.forthright.futures') }}</h3></div><span class="ticket-symbol">{{ contract || symbol }}</span></header>
    <div v-if="error || balanceError" class="ticket-error" role="alert"><van-icon name="warning-o"/><div><strong>{{ $t(error ? 'brokerAccounts.forthright.orderResponse' : 'profile_detail.overview') }}</strong><p>{{ error || balanceError }}</p></div></div>
    <div class="ticket-section">
      <label class="field-label">{{ $t('chart_trade.select_account') }}<select v-model="credentialId" :disabled="busy" @change="loadContracts"><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }} · {{ $t('brokerAccounts.forthright.' + (account.environment || 'sandbox')) }}</option></select></label>
      <van-button v-if="!accounts.length" size="small" @click="$router.push('/profile/credentials/new')">{{ $t('account_ui.connectAction') }}</van-button>
      <div class="field-label">{{ $t('brokerAccounts.forthright.contract') }}<button class="contract-picker" type="button" :disabled="busy || !credentialId" @click="pickerOpen=true"><span><strong>{{ contract || $t('brokerAccounts.forthright.contract') }}</strong><small>{{ selectedContract?.prodName || $t('brokerAccounts.forthright.contractHint') }}</small></span><van-loading v-if="busy" size="16"/><van-icon v-else name="arrow-down"/></button></div>
      <div v-if="selectedContract" class="contract-facts"><span>{{ selectedContract.marketCode }}</span><span>{{ $t('brokerAccounts.forthright.expiry') }} {{ selectedContract.lastTradeDate || selectedContract.expiryYmd }}</span><span v-if="selectedContract.price_tick">{{ $t('brokerAccounts.forthright.tickSize') }} {{ selectedContract.price_tick }} {{ priceUnit }}</span></div>
      <div class="balance-strip" :aria-busy="balanceLoading"><div v-for="balance in accountSummary?.balances || []" :key="balance.currency || balance.ccy"><span>{{ $t('profile_detail.cash') }}</span><strong>{{ money(balance.cash) }} <small>{{ balance.currency || String(balance.ccy || '').replace(/^HK-/, '') }}</small></strong></div><div v-for="metric in ['available_funds','initial_margin','maintenance_margin']" :key="metric"><span>{{ $t('brokerAccounts.forthright.' + metric) }}</span><strong>{{ money(accountSummary?.[metric]) }} <small>{{ accountSummary?.currency }}</small></strong></div><button type="button" :disabled="balanceLoading || !credentialId" :aria-label="$t('common.refresh')" @click="loadBalance"><van-icon name="replay" /></button></div>
    </div>
    <div class="ticket-section">
      <div class="order-segment"><button v-for="kind in ['limit','market']" :key="kind" type="button" :disabled="busy" :aria-pressed="orderType === kind" :class="{active:orderType===kind}" @click="orderType=kind">{{ $t(kind==='limit'?'chart_trade.order_limit':'chart_trade.order_market') }}</button></div>
      <div class="ticket-inputs"><label class="field-label">{{ $t('brokerAccounts.forthright.lots') }}<input v-model="quantity" type="number" min="1" step="1" inputmode="numeric" :disabled="busy"/></label><label v-if="orderType==='limit'" class="field-label">{{ $t('chart_trade.price') }}<span class="price-input"><input v-model="price" type="number" min="0" :step="selectedContract?.price_tick || 'any'" inputmode="decimal" :disabled="busy"/><small>{{ priceUnit }}</small></span></label></div>
      <p v-if="price && orderType==='limit' && selectedContract?.price_tick && !validFuturesOrder(selectedContract, 1, 'limit', price)" class="validation-note">{{ $t('brokerAccounts.forthright.priceStepHint',{tick:selectedContract.price_tick}) }}</p>
      <div class="actions"><van-button type="primary" :disabled="!valid" :loading="busy" @click="submit('buy')">{{ $t('chart_trade.buy') }}</van-button><van-button type="danger" :disabled="!valid" :loading="busy" @click="submit('sell')">{{ $t('chart_trade.sell') }}</van-button></div>
    </div>
    <van-button v-if="credentialId" class="records-button" block plain @click="$router.push(`/profile/credentials/${credentialId}`)">{{ $t('profile_detail.positions') }} / {{ $t('profile_detail.orders') }}<van-icon name="arrow"/></van-button>
    <van-popup v-model:show="pickerOpen" position="bottom" round closeable :style="{height:'70%'}" teleport="body"><div class="contracts-sheet"><h3>{{ $t('brokerAccounts.forthright.contract') }}</h3><van-search v-model="search" :placeholder="$t('common.search')"/><div class="contracts-list"><button v-for="item in visibleContracts" :key="item.prodCode" type="button" :class="{selected:contract===item.prodCode}" @click="selectContract(item)"><span><strong>{{ item.prodCode }}</strong><small>{{ item.prodName }}</small></span><span>{{ item.lastTradeDate }}<van-icon v-if="contract===item.prodCode" name="success"/></span></button><van-empty v-if="!visibleContracts.length" :description="$t('audit.noData')"/></div></div></van-popup>
  </section>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { startVisiblePolling } from '@/utils/visiblePolling'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showConfirmDialog, showToast } from 'vant'
import { brokerApi, credentialsApi } from '@/api'
import { forthrightErrorMessage, validFuturesOrder } from '@/utils/forthright'
const props = defineProps({ symbol: { type: String, default: '' } })
const { t } = useI18n()
const route = useRoute()
const emit = defineEmits(['contract-change'])
const pickerOpen = ref(false), search = ref('')
const accounts = ref([]), credentialId = ref(null), contracts = ref([]), contract = ref(''), instrument = ref('')
const quantity = ref('1'), price = ref(''), orderType = ref('limit'), busy = ref(false), error = ref('')
const accountSummary = ref(null), balanceLoading = ref(false), balanceError = ref('')
const stopPolling = startVisiblePolling(loadBalance, { enabled: () => Boolean(credentialId.value) && !busy.value && !balanceLoading.value })
onBeforeUnmount(stopPolling)
function money(value) { return value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
async function loadBalance() {
  const id = credentialId.value
  if (!id || balanceLoading.value) return
  balanceLoading.value = true
  try { const response = await brokerApi.account('forthright', id); if (id === credentialId.value) { accountSummary.value = response.data; balanceError.value = '' } } catch (e) { if (id === credentialId.value) balanceError.value = forthrightErrorMessage(e, t) } finally { balanceLoading.value = false }
}
watch(() => props.symbol, value => { const exact = value.replace(/^Futures:/i, ''); contract.value = contracts.value.some(item => item.prodCode === exact) ? exact : ''; price.value = ''; error.value = '' })
const selectedContract = computed(() => contracts.value.find(item => item.prodCode === contract.value))
const visibleContracts = computed(() => contracts.value.filter(item => `${item.prodCode} ${item.prodName}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const valid = computed(() => !busy.value && credentialId.value && validFuturesOrder(selectedContract.value, quantity.value, orderType.value, price.value))
const priceUnit = computed(() => selectedContract.value?.quote_unit === 'index_points' ? t('brokerAccounts.forthright.points') : selectedContract.value?.quote_currency || '')
function selectContract(item) { contract.value = item.prodCode; price.value = ''; error.value = ''; pickerOpen.value = false; emit('contract-change', item.prodCode) }

onMounted(async () => {
  try {
    const response = await credentialsApi.list()
    accounts.value = (response.data || []).filter(item => item.exchange_id === 'forthright' && item.account_type === 'futures')
    const requested = accounts.value.find(item => Number(item.id) === Number(route.query.credential_id))
    if (requested || accounts.value.length === 1) { credentialId.value = (requested || accounts.value[0]).id; await loadContracts() }
  } catch (e) { error.value = forthrightErrorMessage(e, t) }
})
async function loadContracts() {
  accountSummary.value = null; balanceError.value = ''
  busy.value = true; error.value = ''; contract.value = ''; contracts.value = []
  try {
    const response = await brokerApi.contracts(credentialId.value, instrument.value.trim())
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    contracts.value = (response.data || []).filter(item => String(item.expiryYmd || '') >= today && (!item.lastTradeDate || item.lastTradeDate.replaceAll('-', '') >= today))
    const exact = props.symbol.replace(/^Futures:/i, '')
    if (contracts.value.some(item => item.prodCode === exact)) contract.value = exact
    await loadBalance()
  } catch (e) { error.value = forthrightErrorMessage(e, t) } finally { busy.value = false }
}
async function submit(side) {
  if (!valid.value) return
  const payload = { symbol: contract.value, marketType: 'Futures', quantity: Number(quantity.value), orderType: orderType.value, price: Number(price.value) || 0, side }
  const selectedId = credentialId.value
  const account = accounts.value.find(item => item.id === selectedId)
  const selectedName = `${account?.name || ''} · ${t('brokerAccounts.forthright.' + (account?.environment || 'sandbox'))}`
  busy.value = true
  const orderLabel = t(payload.orderType === 'limit' ? 'chart_trade.order_limit' : 'chart_trade.order_market')
  const priceLabel = payload.orderType === 'limit' ? ` · ${payload.price} ${priceUnit.value}` : ''
  try { await showConfirmDialog({ title: t('brokerAccounts.forthright.futures'), message: `${selectedName}\n${payload.symbol} · ${t(side === 'buy' ? 'chart_trade.buy' : 'chart_trade.sell')}\n${t('brokerAccounts.forthright.lots')}: ${payload.quantity} · ${orderLabel}${priceLabel}` }) } catch { busy.value = false; return }
  if (selectedId !== credentialId.value || payload.symbol !== contract.value) { busy.value = false; return }
  busy.value = true; error.value = ''
  try { await brokerApi.placeOrder('forthright', selectedId, payload, { suppressErrorToast: true }); showToast(t('broker_mobile.orderPlaced')) } catch (e) { error.value = forthrightErrorMessage(e, t) } finally { busy.value = false; await loadBalance() }
}
</script>
<style scoped>
.futures-panel{padding:16px;background:var(--v2-bg);color:var(--v2-text);font-family:var(--van-base-font,system-ui,sans-serif)}
.ticket-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.ticket-head h3{margin:4px 0 0;font-size:18px;font-weight:600}.ticket-broker{font-size:12px;color:var(--v2-muted)}.ticket-symbol{font-size:13px;font-variant-numeric:tabular-nums;color:var(--v2-muted)}
.ticket-section{margin-bottom:16px;padding:16px;border:1px solid var(--v2-line);border-radius:12px;background:var(--v2-surface)}.field-label{display:block;min-width:0;font-size:12px;color:var(--v2-muted)}.field-label+.field-label,.ticket-section>.field-label+.field-label{margin-top:16px}
.field-label select,.field-label input,.contract-picker{box-sizing:border-box;width:100%;min-height:48px;margin-top:8px;padding:12px;border:1px solid var(--v2-line);border-radius:8px;color:var(--v2-text);background:var(--v2-surface-2);font:inherit;font-size:14px;outline-offset:3px}.contract-picker{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}.contract-picker span{min-width:0}.contract-picker strong,.contract-picker small{display:block}.contract-picker strong{font-size:15px;font-weight:600}.contract-picker small{margin-top:4px;font-size:12px;color:var(--v2-muted);overflow-wrap:anywhere}
.contract-facts{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;font-size:11px;color:var(--v2-muted)}
.balance-strip{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;margin-top:12px;padding-top:12px;border-top:1px solid var(--v2-line)}.balance-strip>div{display:grid;gap:4px}.balance-strip span,.balance-strip small{font-size:11px;color:var(--v2-muted);font-weight:400}.balance-strip strong{font-size:13px;font-variant-numeric:tabular-nums}.balance-strip button{margin-left:auto;min-width:36px;min-height:36px;border:0;background:transparent;color:var(--v2-text)}
.order-segment{display:flex;padding:4px;gap:4px;border-radius:8px;background:var(--v2-surface-2);margin-bottom:16px}.order-segment button{flex:1;min-height:40px;border:0;border-radius:6px;color:var(--v2-muted);background:transparent;font:inherit;font-size:14px}.order-segment button.active{color:var(--v2-text);background:var(--v2-surface);box-shadow:0 1px 3px #0000000d}.ticket-inputs{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ticket-inputs>.field-label{margin:0}.price-input{display:flex;position:relative}.price-input input{padding-right:48px;font-variant-numeric:tabular-nums}.price-input small{position:absolute;right:12px;top:25px;font-size:11px}.actions{display:flex;gap:12px;margin-top:16px}.actions .van-button{flex:1;height:48px;border-radius:8px;font-weight:600}.validation-note{font-size:12px;color:var(--v2-red);margin:8px 0 0}
.ticket-error{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--v2-line);border-left:3px solid var(--v2-red);border-radius:8px;padding:12px;margin-bottom:16px;background:var(--v2-surface);font-size:13px}.ticket-error>.van-icon{margin-top:2px;color:var(--v2-red)}.ticket-error strong{font-weight:600}.ticket-error p{margin:6px 0 0;line-height:1.6;overflow-wrap:anywhere;white-space:pre-line;color:var(--v2-muted)}.records-button{margin-top:16px;border-radius:8px;background:var(--v2-surface);color:var(--v2-text);border-color:var(--v2-line)}.records-button .van-icon{margin-left:8px}
.contracts-sheet{display:flex;flex-direction:column;height:100%;padding:20px 0 max(16px,env(safe-area-inset-bottom));background:var(--v2-bg);color:var(--v2-text)}.contracts-sheet h3{margin:0 20px 12px;font-size:17px}.contracts-list{overflow:auto;padding:0 16px}.contracts-list button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;padding:16px 8px;border:0;border-bottom:1px solid var(--v2-line);background:transparent;color:var(--v2-text)}.contracts-list strong,.contracts-list small{display:block}.contracts-list small{margin-top:4px;color:var(--v2-muted)}.contracts-list button>span:last-child{font-size:11px;color:var(--v2-muted)}.contracts-list .selected{background:var(--v2-surface-2)}.contracts-list .van-icon{margin-left:8px;color:var(--v2-brand)}
@media(max-width:360px){.futures-panel,.ticket-section{padding:12px}.ticket-inputs{grid-template-columns:1fr}}
</style>
