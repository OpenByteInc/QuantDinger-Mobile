<template>
  <div class="credits-page">
    <van-nav-bar
      :title="$t('profile.credits_recharge')"
      :border="false"
      left-arrow
      @click-left="goBack"
    />

    <div class="balance-card">
      <div class="balance-label">{{ $t('profile.credits') }}</div>
      <div class="balance-value">{{ formatCredits(billing.credits) }}</div>
      <div class="balance-sub">
        <span v-if="isVip">{{ $t('profile.vip_active', { date: formatDate(billing.vip_expires_at) }) }}</span>
        <span v-else-if="billing.vip_expires_at">{{ $t('profile.vip_expired') }}</span>
        <span v-else>{{ $t('profile.vip_none') }}</span>
      </div>
    </div>

    <div class="section plans-section">
      <div class="section-title">{{ $t('profile.credits_recharge') }}</div>
      <div v-if="loading && !planItems.length" class="plans-loading">
        <van-loading size="22" />
        <span>{{ tr('profile.pay_loading_plans', '正在加载套餐…') }}</span>
      </div>
      <div v-else-if="plansLoadError" class="plans-error">
        <van-icon name="warning-o" />
        <span>{{ tr('profile.pay_load_failed', '套餐加载失败，请检查网络后重试') }}</span>
        <van-button size="small" plain @click="load">{{ $t('common.retry') }}</van-button>
      </div>
      <div v-else-if="planItems.length" class="plan-grid">
        <button
          v-for="plan in planItems"
          :key="plan.key"
          type="button"
          class="plan-card"
          :class="{ popular: plan.popular }"
          :aria-label="`${plan.name}，${tr('profile.pay_choose_plan', '选择此套餐')}`"
          @click="handlePurchase(plan)"
        >
          <div v-if="plan.popular" class="plan-badge">HOT</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-price">
            <span class="currency">$</span>
            <span class="amount">{{ plan.price_usd || plan.price_cny || plan.price || 0 }}</span>
            <span v-if="plan.price_usd" class="unit">USD</span>
            <span v-else-if="plan.price_cny" class="unit">CNY</span>
          </div>
          <div v-if="plan.credits" class="plan-credits">+{{ plan.credits }} {{ $t('profile.credits_unit') }}</div>
          <div v-if="plan.vip_days" class="plan-vip">VIP {{ plan.vip_days }} {{ vipDaysUnit }}</div>
          <div v-if="plan.description" class="plan-desc">{{ plan.description }}</div>
          <span class="plan-action">
            {{ tr('profile.pay_choose_plan', '选择此套餐') }}
            <van-icon name="arrow" />
          </span>
        </button>
      </div>
      <van-empty v-else :description="tr('profile.pay_no_plans', '暂无可购买套餐')" />
    </div>

    <div class="section">
      <div class="section-head">
        <span class="section-title">{{ $t('profile.credits_log') }}</span>
      </div>
      <div v-if="log.length" class="log-list">
        <div v-for="item in log" :key="item.id" class="log-row">
          <div class="col">
            <span class="name">{{ actionLabel(item.action) }}</span>
            <span class="sub">
              <span v-if="featureLabel(item.feature, item.action)">{{ featureLabel(item.feature, item.action) }}</span>
              <span v-if="item.remark" class="remark">{{ item.remark }}</span>
            </span>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>
          <div class="col-right">
            <div :class="['amount', Number(item.amount || 0) >= 0 ? 'up' : 'down']">
              {{ formatSigned(item.amount) }}
            </div>
            <div class="balance-tag">= {{ formatCredits(item.balance_after) }}</div>
          </div>
        </div>
      </div>
      <van-empty v-else :description="$t('profile.credits_log_empty')" />
    </div>

    <van-popup
      v-model:show="methodPickerVisible"
      position="bottom"
      round
      class="method-popup"
    >
      <div class="method-sheet">
        <div class="chain-head">
          <div class="chain-title">{{ tr('profile.pay_method_title', '选择支付方式') }}</div>
          <div class="chain-desc">{{ tr('profile.pay_method_desc', '选择稳定币或银行卡完成支付') }}</div>
          <button type="button" class="icon-close chain-close" :aria-label="$t('common.close')" @click="closeMethodPicker">
            <van-icon name="cross" />
          </button>
        </div>
        <div class="method-list">
          <button v-for="method in availablePaymentMethods" :key="method.code" class="method-option" @click="choosePaymentMethod(method.code)">
            <span class="method-brand" :class="`brand-${method.code.toLowerCase()}`" aria-hidden="true">
              <img :src="paymentMethodLogo(method.code)" alt="" />
            </span>
            <span class="method-copy">
              <strong>{{ paymentMethodTitle(method.code) }}</strong>
              <small>{{ paymentMethodDescription(method.code) }}</small>
              <span v-if="method.code === 'STRIPE'" class="mobile-card-brands" aria-hidden="true">
                <span class="card-brand visa"><img :src="visaLogo" alt="" /></span>
                <span class="card-brand mastercard"><img :src="mastercardLogo" alt="" /></span>
                <span class="stripe-word">Stripe</span>
              </span>
            </span>
            <van-icon class="method-arrow" name="arrow" />
          </button>
          <van-empty v-if="!availablePaymentMethods.length" :description="tr('profile.pay_no_method', '该套餐暂未配置支付方式')" />
        </div>
      </div>
    </van-popup>

    <!-- Chain Picker Popup (v3.0.6+ parity with PC) -->
    <van-popup
      v-model:show="chainPickerVisible"
      position="bottom"
      round
      :close-on-click-overlay="!creatingOrder"
      class="chain-popup"
    >
      <div class="chain-sheet">
        <div class="chain-head">
          <div class="chain-title">{{ $t('profile.pay_pick_chain_title') }}</div>
          <div class="chain-desc">{{ $t('profile.pay_pick_chain_desc') }}</div>
          <button
            v-if="!creatingOrder"
            type="button"
            class="chain-close"
            :aria-label="$t('common.close')"
            @click="closeChainPicker"
          ><van-icon name="cross" /></button>
        </div>

        <div v-if="chainsLoading" class="chain-loading">
          <van-loading />
        </div>
        <div v-else-if="chainsLoadError" class="chain-error">
          <van-icon name="warning-o" />
          <span>{{ chainsLoadError }}</span>
        </div>
        <div v-else-if="!availableChains.length" class="chain-error">
          <van-icon name="warning-o" />
          <span>{{ tr('profile.pay_no_chains_currency', `No ${selectedCurrency} receiving address is configured`, { currency: selectedCurrency }) }}</span>
        </div>
        <div v-else class="chain-list">
          <button
            v-for="c in availableChains"
            :key="c.code"
            type="button"
            class="chain-option"
            :class="{ selected: selectedChain === c.code }"
            :aria-pressed="selectedChain === c.code"
            @click="selectedChain = c.code"
          >
            <div class="chain-row">
              <div class="chain-name">
                <van-icon name="link-o" />
                <span class="chain-label">{{ c.label }}</span>
                <span v-if="c.recommended" class="chain-tag recommended">{{ $t('profile.pay_recommended') }}</span>
              </div>
              <van-icon v-if="selectedChain === c.code" name="checked" class="picked-icon" />
            </div>
            <div class="chain-meta">
              <span class="meta-fee">
                {{ $t('profile.pay_typical_fee') }}: ≈ ${{ Number(c.typical_fee_usdt || 0).toFixed(Number(c.typical_fee_usdt || 0) < 0.01 ? 4 : 2) }}
              </span>
              <span v-if="c.address_prefix_hint" class="meta-addr">{{ c.address_prefix_hint }}</span>
            </div>
          </button>
        </div>

        <div class="chain-actions">
          <van-button :disabled="creatingOrder" block plain @click="closeChainPicker">
            {{ $t('common.cancel') }}
          </van-button>
          <van-button
            type="primary"
            block
            :disabled="!selectedChain || !availableChains.length"
            :loading="creatingOrder"
            @click="confirmChain"
          >{{ $t('profile.pay_continue_to_pay') }}</van-button>
        </div>
      </div>
    </van-popup>

    <!-- Stablecoin Pay Modal -->
    <van-popup
      v-model:show="payVisible"
      position="center"
      round
      :close-on-click-overlay="false"
      class="usdt-popup"
    >
      <div class="usdt-modal" v-if="order">
        <div class="usdt-head" :class="{ 'is-usdc': activeCurrency === 'USDC' }">
          <div class="usdt-logo">
            <img :src="paymentMethodLogo(activeCurrency)" alt="" />
          </div>
          <div class="usdt-head-text">
            <div class="usdt-title">{{ activeCurrency }} {{ tr('profile.pay_crypto_title', '支付') }}</div>
            <div class="usdt-desc">{{ tr('profile.pay_crypto_desc', `请通过 ${order.chain || 'TRC20'} 支付准确的 ${activeCurrency} 金额`, { chain: order.chain || 'TRC20', currency: activeCurrency }) }}</div>
          </div>
          <button type="button" class="icon-close usdt-close" :aria-label="$t('common.close')" @click="closePay">
            <van-icon name="cross" />
          </button>
        </div>

        <div :class="['usdt-status', statusClass]">
          <van-icon :name="statusIcon" />
          <span>{{ statusLabel }}</span>
        </div>

        <div class="usdt-qr">
          <div class="qr-frame" :class="{ confirmed: order.status === 'confirmed' }">
            <img v-if="qrDataUrl" :src="qrDataUrl" :alt="`${activeCurrency} QR`" />
          </div>
          <div class="qr-amount">
            <span class="num">{{ order.amount_usdt }}</span>
            <span class="cur">{{ activeCurrency }}</span>
          </div>
          <div class="qr-chain">{{ order.chain || 'TRC20' }}</div>
        </div>

        <div class="usdt-info">
          <div class="info-row">
            <div class="info-label">{{ $t('profile.pay_address') }}</div>
            <div class="info-value addr">
              <span>{{ order.address }}</span>
              <van-button size="mini" plain @click="copy(order.address)">{{ $t('profile.pay_copy_address') }}</van-button>
            </div>
          </div>
          <div class="info-row">
            <div class="info-label">{{ $t('profile.pay_amount') }}</div>
            <div class="info-value">
              <span>{{ order.amount_usdt }} {{ activeCurrency }}</span>
              <van-button size="mini" plain @click="copy(order.amount_usdt)">{{ $t('profile.pay_copy_amount') }}</van-button>
            </div>
          </div>
          <div v-if="order.expires_at" class="info-row">
            <div class="info-label">{{ $t('profile.pay_expire') }}</div>
            <div class="info-value sub">{{ formatDateTime(order.expires_at) }}</div>
          </div>
        </div>

        <div class="usdt-warn">
          <van-icon name="warning-o" />
          <span>{{ $t('profile.pay_warn') }}</span>
        </div>

        <div class="usdt-actions">
          <van-button
            v-if="order.status !== 'confirmed'"
            block
            plain
            :loading="refreshing"
            @click="refreshOrder"
          >{{ $t('profile.pay_refresh') }}</van-button>
          <van-button
            v-else
            block
            type="primary"
            @click="closePay"
          >{{ $t('profile.pay_done') }}</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import QRCode from 'qrcode'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { billingApi, userApi } from '@/api'
import tetherLogo from '@/assets/payment/tether.svg'
import circleLogo from '@/assets/payment/circle.svg'
import stripeLogo from '@/assets/payment/stripe.svg'
import visaLogo from '@/assets/payment/visa.svg'
import mastercardLogo from '@/assets/payment/mastercard.svg'

export default {
  name: 'ProfileCredits',
  data() {
    return {
      billing: {
        credits: 0,
        is_vip: false,
        vip_expires_at: null
      },
      plans: {},
      paymentMethods: [],
      log: [],
      loading: false,
      plansLoadError: false,

      payVisible: false,
      order: null,
      qrDataUrl: '',
      pollTimer: null,
      pollGeneration: 0,
      pollRequestInFlight: false,
      refreshing: false,
      stripeCreating: false,
      lastResumeRefreshAt: 0,
      stripeRefreshTimers: [],
      appStateListener: null,
      browserFinishedListener: null,

      /* Chain picker state (v3.0.6+ parity with PC billing flow) */
      chainPickerVisible: false,
      chainsLoading: false,
      chainsLoadError: '',
      availableChains: [],
      selectedChain: null,
      pendingPlan: null,
      creatingOrder: false,
      methodPickerVisible: false,
      selectedCurrency: 'USDT',
      visaLogo,
      mastercardLogo
    }
  },
  computed: {
    isVip() {
      if (!this.billing.vip_expires_at) return !!this.billing.is_vip
      const ts = new Date(this.billing.vip_expires_at).getTime()
      return !Number.isNaN(ts) && ts > Date.now()
    },
    vipDaysUnit() {
      const loc = this.$i18n?.locale
      if (loc === 'en-US') return 'days'
      if (loc === 'ja-JP') return '日'
      if (loc === 'ko-KR') return '일'
      return '天'
    },
    planItems() {
      const map = this.plans || {}
      const entries = Object.entries(map)
      if (!entries.length) return []
      return entries
        .sort(([, a], [, b]) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
        .map(([key, value]) => ({
          key,
          name: this.planName(key, value),
          price_usd: value?.price_usd,
          price_cny: value?.price_cny || value?.price,
          credits: value?.credits_once || value?.credits_monthly || value?.credits,
          vip_days: value?.duration_days || value?.vip_days,
          description: this.planDescription(key, value),
          popular: !!(value?.is_popular || value?.popular),
          raw: value
        }))
    },
    activeCurrency() {
      return this.order?.currency || this.selectedCurrency || 'USDT'
    },
    availablePaymentMethods() {
      const plan = this.pendingPlan?.raw
      return (this.paymentMethods || []).filter((method) => method.code !== 'STRIPE' || plan?.stripe_enabled)
    },
    statusLabel() {
      const s = this.order?.status
      const map = {
        pending: this.$t('profile.pay_status_pending'),
        paid: this.$t('profile.pay_status_paid'),
        confirmed: this.$t('profile.pay_status_confirmed'),
        expired: this.$t('profile.pay_status_expired'),
        failed: this.$t('profile.pay_status_failed'),
        cancelled: this.$t('profile.pay_status_expired')
      }
      return map[s] || s || '-'
    },
    statusClass() {
      const s = this.order?.status
      if (s === 'confirmed') return 'success'
      if (s === 'paid') return 'processing'
      if (['expired', 'failed', 'cancelled'].includes(s)) return 'error'
      return 'pending'
    },
    statusIcon() {
      const s = this.order?.status
      if (s === 'confirmed') return 'passed'
      if (s === 'paid') return 'refresh'
      if (['expired', 'failed', 'cancelled'].includes(s)) return 'close'
      return 'clock-o'
    }
  },
  mounted() {
    window.addEventListener('focus', this.handlePaymentResume)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.load()
    if (Capacitor.isNativePlatform?.()) this.bindNativePaymentResume()
    if (this.$route.query.payment === 'stripe_success') {
      showToast({ message: this.tr('profile.pay_stripe_success', '支付已完成，积分到账后将自动更新'), type: 'success' })
      this.scheduleStripeRefreshes()
      this.clearStripeReturnQuery()
    } else if (this.$route.query.payment === 'stripe_cancelled') {
      showToast({ message: this.tr('profile.pay_stripe_cancelled', '已取消银行卡支付'), type: 'fail' })
      this.clearStripeReturnQuery()
    }
  },
  beforeUnmount() {
    this.stopPolling()
    this.clearStripeRefreshTimers()
    window.removeEventListener('focus', this.handlePaymentResume)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.appStateListener?.remove()
    this.browserFinishedListener?.remove()
  },
  methods: {
    tr(key, fallback, params) {
      const translated = this.$t(key, params)
      return translated && translated !== key ? translated : fallback
    },
    paymentMethodTitle(code) {
      const titles = {
        USDT: this.tr('profile.pay_method_usdt_title', 'USDT 稳定币'),
        USDC: this.tr('profile.pay_method_usdc_title', 'USDC 稳定币'),
        STRIPE: this.tr('profile.pay_method_card_title', '银行卡支付')
      }
      return titles[code] || code
    },
    paymentMethodDescription(code) {
      const descriptions = {
        USDT: this.tr('profile.pay_method_usdt_desc', '通过链上钱包转账，支持多条网络'),
        USDC: this.tr('profile.pay_method_usdc_desc', 'Circle 官方稳定币，支持 Ethereum 与 Solana'),
        STRIPE: this.tr('profile.pay_method_card_desc', '支持 Visa、Mastercard 等银行卡，由 Stripe 安全处理')
      }
      return descriptions[code] || ''
    },
    paymentMethodLogo(code) {
      const logos = { USDT: tetherLogo, USDC: circleLogo, STRIPE: stripeLogo }
      return logos[code] || stripeLogo
    },
    async bindNativePaymentResume() {
      // Older native shells may not expose every listener. Billing data must
      // still load even when one optional bridge event is unavailable.
      try {
        this.appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) this.handlePaymentResume()
        })
      } catch (err) {
        console.warn('Native app-state listener is unavailable:', err)
      }
      try {
        this.browserFinishedListener = await Browser.addListener('browserFinished', () => {
          this.handlePaymentResume()
        })
      } catch (err) {
        console.warn('Native browser-finished listener is unavailable:', err)
      }
    },
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') this.handlePaymentResume()
    },
    handlePaymentResume() {
      const now = Date.now()
      if (now - this.lastResumeRefreshAt < 1200) return
      this.lastResumeRefreshAt = now
      this.load()
    },
    scheduleStripeRefreshes() {
      this.clearStripeRefreshTimers()
      this.stripeRefreshTimers = [1500, 5000].map((delay) => window.setTimeout(() => this.load(), delay))
    },
    clearStripeRefreshTimers() {
      this.stripeRefreshTimers.forEach((timer) => window.clearTimeout(timer))
      this.stripeRefreshTimers = []
    },
    clearStripeReturnQuery() {
      const query = { ...this.$route.query }
      delete query.payment
      delete query.session_id
      this.$router.replace({ path: this.$route.path, query }).catch(() => {})
    },
    goBack() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace('/profile')
    },
    planName(key, value) {
      return this.tr(`profile.plan_${key}_name`, value?.name || value?.title || key)
    },
    planDescription(key, value) {
      return this.tr(`profile.plan_${key}_desc`, value?.description || value?.subtitle || '')
    },
    async load() {
      this.loading = true
      this.plansLoadError = false
      try {
        const [profileRes, plansRes, logRes] = await Promise.allSettled([
          userApi.getProfile(),
          billingApi.getPlans(),
          userApi.getMyCreditsLog({ page: 1, page_size: 30 })
        ])
        if (profileRes.status === 'fulfilled' && profileRes.value?.data?.billing) {
          this.billing = { ...this.billing, ...profileRes.value.data.billing }
        }
        if (plansRes.status === 'fulfilled' && plansRes.value?.data) {
          const d = plansRes.value.data
          this.plans = d.plans || {}
          this.paymentMethods = d.payment_methods || []
          if (d.billing) this.billing = { ...this.billing, ...d.billing }
        } else {
          this.plansLoadError = true
        }
        if (logRes.status === 'fulfilled' && logRes.value?.data) {
          this.log = logRes.value.data.items || logRes.value.data.list || []
        }
      } catch (err) {
        this.plansLoadError = true
        console.error('Load credits data failed:', err)
      } finally {
        this.loading = false
      }
    },
    /**
     * Step 1 of the v3.0.6+ purchase flow: open the chain picker.
     * We re-fetch the chain list each time so newly-enabled chains on
     * the backend show up without a refresh, mirroring PC behaviour.
     */
    async handlePurchase(plan) {
      this.pendingPlan = plan
      this.methodPickerVisible = true
    },
    closeMethodPicker() {
      this.methodPickerVisible = false
      this.pendingPlan = null
    },
    async choosePaymentMethod(method) {
      if (this.stripeCreating || this.creatingOrder) return
      this.methodPickerVisible = false
      if (method === 'STRIPE') {
        const isNative = Capacitor.isNativePlatform?.()
        const checkoutWindow = isNative ? null : window.open('about:blank', '_blank')
        if (!isNative && !checkoutWindow) {
          this.pendingPlan = null
          showToast({ message: this.$t('profile.pay_stripe_popup_blocked'), type: 'fail' })
          return
        }
        if (checkoutWindow) checkoutWindow.opener = null
        const planKey = this.pendingPlan?.key
        this.pendingPlan = null
        this.stripeCreating = true
        try {
          const res = await billingApi.createStripeCheckout(planKey)
          if (res?.code === 1 && res?.data?.checkout_url) {
            if (isNative) {
              await Browser.open({ url: res.data.checkout_url, presentationStyle: 'fullscreen' })
            } else if (!checkoutWindow.closed) {
              checkoutWindow.location.replace(res.data.checkout_url)
            } else {
              showToast({ message: this.$t('profile.pay_stripe_popup_blocked'), type: 'fail' })
            }
            return
          }
          checkoutWindow?.close()
          showToast({ message: res?.msg || this.$t('profile.pay_create_fail'), type: 'fail' })
        } catch (err) {
          checkoutWindow?.close()
          showToast({ message: err?.response?.data?.msg || this.$t('profile.pay_create_fail'), type: 'fail' })
        } finally {
          this.stripeCreating = false
        }
        return
      }
      this.selectedCurrency = method
      this.selectedChain = null
      this.availableChains = []
      this.chainsLoadError = ''
      this.chainsLoading = true
      this.chainPickerVisible = true
      try {
        const res = await billingApi.listCryptoChains(method)
        if (res?.code === 1 && Array.isArray(res?.data?.chains)) {
          this.availableChains = res.data.chains
          const rec = this.availableChains.find((c) => c.recommended)
          this.selectedChain = (rec || this.availableChains[0] || {}).code || null
        } else {
          this.chainsLoadError = res?.msg || this.$t('profile.pay_chain_load_fail')
        }
      } catch (err) {
        this.chainsLoadError = err?.response?.data?.msg || this.$t('profile.pay_chain_load_fail')
      } finally {
        this.chainsLoading = false
      }
    },
    closeChainPicker() {
      if (this.creatingOrder) return
      this.chainPickerVisible = false
      this.pendingPlan = null
      this.selectedChain = null
    },
    async confirmChain() {
      if (!this.pendingPlan || !this.selectedChain) return
      this.creatingOrder = true
      try {
        const res = await billingApi.createCryptoOrder(this.pendingPlan.key, this.selectedChain, this.selectedCurrency)
        if (res?.code === 1 && res?.data) {
          this.order = res.data
          this.chainPickerVisible = false
          this.pendingPlan = null
          this.payVisible = true
          if (res.data.reused) {
            showToast({ message: this.$t('profile.pay_reused_hint'), type: 'success' })
          }
          await this.generateQr()
          this.startPolling()
        } else {
          showToast({ message: res?.msg || this.$t('profile.pay_create_fail'), type: 'fail' })
        }
      } catch (err) {
        const msg = err?.response?.data?.msg || this.$t('profile.pay_create_fail')
        showToast({ message: msg, type: 'fail' })
      } finally {
        this.creatingOrder = false
      }
    },
    async generateQr() {
      if (!this.order) return
      // PC parity: prefer payment_uri (EIP-681 / Solana Pay / tron:) so
      // mobile wallets can auto-fill both recipient and amount. Fall
      // back to raw address so legacy wallets still scan.
      const qrText = this.order.payment_uri || this.order.address
      if (!qrText) return
      try {
        this.qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 220,
          margin: 1,
          color: { dark: '#181818', light: '#ffffff' }
        })
      } catch {
        this.qrDataUrl = ''
      }
    },
    startPolling() {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        this.refreshOrder(true)
      }, 5000)
    },
    stopPolling() {
      this.pollGeneration += 1
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async refreshOrder(isPolling = false) {
      if (!this.order?.order_id || this.pollRequestInFlight) return
      const generation = this.pollGeneration
      const orderId = this.order.order_id
      this.pollRequestInFlight = true
      if (!isPolling) this.refreshing = true
      try {
        const res = await billingApi.getCryptoOrder(orderId, true)
        if (res?.code === 1 && res?.data) {
          if (generation !== this.pollGeneration || this.order?.order_id !== orderId) return
          this.order = res.data
          const status = this.order.status
          if (status === 'confirmed') {
            showToast({ message: this.$t('profile.pay_success_tip'), type: 'success' })
            this.stopPolling()
            await this.load()
          } else if (['expired', 'failed', 'cancelled'].includes(status)) {
            this.stopPolling()
          }
        }
      } catch {
        /* ignore */
      } finally {
        this.pollRequestInFlight = false
        this.refreshing = false
      }
    },
    closePay() {
      this.payVisible = false
      this.stopPolling()
      this.order = null
      this.qrDataUrl = ''
    },
    async copy(text) {
      try {
        const t = String(text || '')
        if (!t) return
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(t)
        } else {
          const input = document.createElement('textarea')
          input.value = t
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast({ message: this.$t('profile.pay_copied'), type: 'success' })
      } catch {
        /* ignore */
      }
    },
    actionLabel(action) {
      const key = `profile.action_${String(action || '').toLowerCase()}`
      const fallbackMap = {
        recharge: 'profile.action_recharge',
        consume: 'profile.action_consume',
        register_bonus: 'profile.action_register_bonus',
        referral_bonus: 'profile.action_referral_bonus',
        admin_adjust: 'profile.action_admin_adjust',
        refund: 'profile.action_refund',
        membership_bonus: 'profile.action_membership_bonus',
        membership_monthly: 'profile.action_membership_monthly',
        membership_purchase: 'profile.action_membership_purchase',
        vip_grant: 'profile.action_vip_grant',
        vip_revoke: 'profile.action_vip_revoke'
      }
      const mapped = fallbackMap[String(action || '').toLowerCase()] || key
      const text = this.$t(mapped)
      return text === mapped ? (action || '-') : text
    },
    featureLabel(feature, action) {
      const value = String(feature || '').trim()
      if (!value || value.toLowerCase() === String(action || '').trim().toLowerCase()) return ''
      const key = `profile.feature_${value.toLowerCase()}`
      const text = this.$t(key)
      return text === key ? value : text
    },
    formatCredits(value) {
      return new Intl.NumberFormat('en-US').format(Number(value || 0))
    },
    formatDate(value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    formatDateTime(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString()
    },
    formatTime(value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    formatSigned(value) {
      const num = Number(value || 0)
      const sign = num > 0 ? '+' : ''
      return `${sign}${num}`
    }
  }
}
</script>

<style scoped>
.credits-page {
  min-height: 100vh;
  padding: 0 0 calc(40px + var(--safe-area-bottom, 0px));
}

.balance-card {
  margin: 10px var(--page-gutter) 16px;
  padding: 24px 22px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  position: relative;
  overflow: hidden;
}
.balance-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(320px 220px at 100% 0%, var(--c-amber-soft), transparent 62%);
}
.balance-card > * { position: relative; }

.balance-label {
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-3);
  text-transform: uppercase;
}
.balance-value {
  margin-top: 6px;
  font-size: 36px;
  font-weight: 800;
  color: var(--c-amber);
  letter-spacing: -0.03em;
}
.balance-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-2);
}

.section { margin: 0 var(--page-gutter) 18px; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}
.plans-loading,
.plans-error {
  min-height: 108px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  font-size: 13px;
}
.plans-error > i { color: var(--warn); font-size: 22px; }

.plan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.plan-card {
  width: 100%;
  min-width: 0;
  position: relative;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  appearance: none;
  transition: transform .16s ease, border-color .16s ease, background .16s ease;
}
.plan-card:active { transform: scale(.985); border-color: var(--accent); }
.plan-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.plan-card.popular {
  background: var(--c-amber-soft);
  border-color: transparent;
}
.plan-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--c-red);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.plan-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.plan-price { margin-top: 8px; color: var(--c-amber); }
.plan-price .currency { font-size: 12px; margin-right: 2px; }
.plan-price .amount { font-size: 22px; font-weight: 800; }
.plan-price .unit {
  margin-left: 4px;
  font-size: 10px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.plan-credits,
.plan-vip {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-2);
}
.plan-desc {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.4;
}
.plan-action {
  min-height: 32px;
  margin-top: 12px;
  padding-top: 9px;
  border-top: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.log-list {
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 4px 14px;
}
.log-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid var(--hairline);
}
.log-row:first-child { border-top: none; }
.col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.col-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  font-size: 11px;
  color: var(--text-3);
  display: flex;
  gap: 6px;
}
.sub .remark {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.time {
  font-size: 11px;
  color: var(--text-4);
}
.amount {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.amount.up { color: var(--up); }
.amount.down { color: var(--down); }
.balance-tag {
  font-size: 10px;
  color: var(--text-4);
}

.method-popup {
  background: var(--bg-elevated) !important;
  color: var(--text);
  bottom: var(--shell-tabbar-height, calc(62px + var(--safe-area-bottom, 0px))) !important;
}
.method-sheet { position: relative; padding: 18px 16px calc(18px + var(--safe-area-bottom, 0px)); }
.method-list { display: grid; gap: 10px; }
.method-option {
  width: 100%;
  min-height: 84px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-raised);
  color: var(--text);
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  text-align: left;
  font: inherit;
  box-shadow: 0 4px 14px rgba(15, 23, 42, .04);
}
.method-option:active { border-color: var(--accent); background: var(--accent-soft); }
.method-option:focus-visible,
.chain-option:focus-visible,
.icon-close:focus-visible,
.chain-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.method-brand {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--hairline);
}
.method-brand img { width: 27px; height: 27px; display: block; }
.method-brand.brand-usdt { background: #26a17b; box-shadow: none; }
.method-brand.brand-usdc { background: #2775ca; box-shadow: none; }
.method-brand.brand-stripe { background: #635bff; box-shadow: none; }
.method-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.method-copy strong { color: var(--text); font-size: 14px; line-height: 1.35; }
.method-copy small { color: var(--text-2); font-size: 12px; line-height: 1.4; }
.method-arrow { color: var(--text-4); }
.mobile-card-brands { display: flex; align-items: center; gap: 5px; margin-top: 4px; min-height: 18px; }
.card-brand {
  width: 30px;
  height: 18px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.card-brand img { width: 20px; height: 12px; display: block; }
.card-brand.visa { background: #1434cb; }
.card-brand.mastercard { background: #eb001b; }
.stripe-word { margin-left: 2px; color: #7d75ff; font-size: 11px; font-weight: 800; letter-spacing: -.02em; }

/* Chain picker (v3.0.6+) */
.chain-popup {
  background: var(--bg-elevated) !important;
  color: var(--text);
  bottom: var(--shell-tabbar-height, calc(62px + var(--safe-area-bottom, 0px))) !important;
  max-height: calc(100vh - var(--shell-tabbar-height, calc(62px + var(--safe-area-bottom, 0px))) - 24px);
}
.chain-sheet {
  padding: 18px 16px calc(18px + var(--safe-area-bottom, 0px));
  position: relative;
}
.chain-head { margin-bottom: 14px; }
.chain-title { font-size: 16px; font-weight: 700; color: var(--text); }
.chain-desc { margin-top: 4px; font-size: 12px; color: var(--text-2); }
.chain-close {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 44px;
  height: 44px;
  font-size: 20px;
  color: var(--text-2);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chain-loading,
.chain-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  color: var(--text-2);
  font-size: 13px;
}
.chain-error {
  color: var(--warn);
}
.chain-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: min(44vh, 360px);
  overflow-y: auto;
  padding-bottom: 2px;
}
.chain-option {
  width: 100%;
  min-height: 68px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  color: inherit;
  font: inherit;
  text-align: left;
  appearance: none;
}
.chain-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.chain-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chain-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-weight: 700;
  font-size: 14px;
}
.chain-tag {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.chain-tag.recommended {
  color: var(--up);
  background: var(--up-soft);
}
.picked-icon {
  color: var(--accent);
  font-size: 18px;
}
.chain-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-2);
}
.meta-addr {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.chain-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding-top: 10px;
  background: linear-gradient(180deg, transparent 0%, var(--bg-elevated) 28%);
}
.chain-actions :deep(.van-button) { border-radius: 12px; }

/* USDT popup */
.usdt-popup {
  width: calc(100% - 24px);
  max-width: 420px;
  max-height: calc(100dvh - var(--shell-tabbar-height, calc(62px + var(--safe-area-bottom, 0px))) - 24px);
  background: var(--bg-elevated) !important;
  color: var(--text);
  overflow-y: auto;
  border: 1px solid var(--border);
}
.usdt-modal {
  padding: 20px 18px calc(18px + var(--safe-area-bottom, 0px));
  color: var(--text);
}
.usdt-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--hairline);
}
.usdt-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #26a17b;
  border-radius: 50%;
  flex-shrink: 0;
}
.usdt-head.is-usdc .usdt-logo { background: #2775ca; }
.usdt-logo img { width: 23px; height: 23px; display: block; }
.usdt-head-text { flex: 1; min-width: 0; }
.usdt-title { font-size: 15px; font-weight: 700; color: var(--text); }
.usdt-desc {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.45;
}
.usdt-close {
  width: 44px;
  height: 44px;
  margin: -8px -10px 0 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-2);
  padding: 0;
}

.usdt-status {
  margin: 14px 0;
  padding: 10px 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.usdt-status.pending { background: var(--warn-soft); color: var(--warn); }
.usdt-status.processing { background: var(--c-blue-soft); color: var(--c-blue); }
.usdt-status.success { background: var(--up-soft); color: var(--up); }
.usdt-status.error { background: var(--down-soft); color: var(--down); }

.usdt-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14px;
}
.qr-frame {
  padding: 10px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--border);
  transition: all 0.3s;
}
.qr-frame.confirmed {
  border-color: var(--up);
  box-shadow: 0 0 0 4px var(--up-soft);
}
.qr-frame img {
  width: 180px;
  height: 180px;
  display: block;
}
.qr-amount {
  margin-top: 10px;
  font-weight: 800;
  color: var(--c-amber);
  font-variant-numeric: tabular-nums;
}
.qr-amount .num { font-size: 22px; }
.qr-amount .cur { font-size: 11px; margin-left: 4px; color: var(--text-2); letter-spacing: 0.06em; }
.qr-chain {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}

.usdt-info {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--hairline);
}
.info-row:first-child { border-top: none; }
.info-label {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.info-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text);
  max-width: 70%;
}
.info-value.addr span {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
}
.info-value :deep(.van-button) {
  min-width: 44px;
  min-height: 36px;
}
.info-value.sub { color: var(--text-2); }

.usdt-warn {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--warn-soft);
  border: 1px solid transparent;
  color: var(--warn);
  font-size: 11px;
  line-height: 1.5;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.usdt-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin-top: 16px;
  padding-top: 10px;
  background: linear-gradient(180deg, transparent 0%, var(--bg-elevated) 30%);
}
</style>
