<template>
  <div class="credits-page">
    <van-nav-bar :title="$t('profile.credits_recharge')" left-arrow @click-left="$router.back()" />

    <div class="balance-card">
      <div class="balance-label">{{ $t('profile.credits') }}</div>
      <div class="balance-value">{{ formatCredits(billing.credits) }}</div>
      <div class="balance-sub">
        <span v-if="isVip">{{ $t('profile.vip_active', { date: formatDate(billing.vip_expires_at) }) }}</span>
        <span v-else-if="billing.vip_expires_at">{{ $t('profile.vip_expired') }}</span>
        <span v-else>{{ $t('profile.vip_none') }}</span>
      </div>
    </div>

    <div class="section" v-if="planItems.length">
      <div class="section-title">{{ $t('profile.credits_recharge') }}</div>
      <div class="plan-grid">
        <div
          v-for="plan in planItems"
          :key="plan.key"
          class="plan-card"
          :class="{ popular: plan.popular }"
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
        </div>
      </div>
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
              <span v-if="item.feature">{{ item.feature }}</span>
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
          <van-icon
            v-if="!creatingOrder"
            class="chain-close"
            name="cross"
            @click="closeChainPicker"
          />
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
          <span>{{ $t('profile.pay_no_chains') }}</span>
        </div>
        <div v-else class="chain-list">
          <div
            v-for="c in availableChains"
            :key="c.code"
            class="chain-option"
            :class="{ selected: selectedChain === c.code }"
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
          </div>
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

    <!-- USDT Pay Modal -->
    <van-popup
      v-model:show="payVisible"
      position="center"
      round
      :close-on-click-overlay="false"
      class="usdt-popup"
    >
      <div class="usdt-modal" v-if="order">
        <div class="usdt-head">
          <div class="usdt-logo">
            <van-icon name="gold-coin-o" />
          </div>
          <div class="usdt-head-text">
            <div class="usdt-title">{{ $t('profile.pay_title') }}</div>
            <div class="usdt-desc">{{ $t('profile.pay_desc', { chain: order.chain || 'TRC20' }) }}</div>
          </div>
          <van-icon class="usdt-close" name="cross" @click="closePay" />
        </div>

        <div :class="['usdt-status', statusClass]">
          <van-icon :name="statusIcon" />
          <span>{{ statusLabel }}</span>
        </div>

        <div class="usdt-qr">
          <div class="qr-frame" :class="{ confirmed: order.status === 'confirmed' }">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="USDT QR" />
          </div>
          <div class="qr-amount">
            <span class="num">{{ order.amount_usdt }}</span>
            <span class="cur">USDT</span>
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
              <span>{{ order.amount_usdt }} USDT</span>
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
import { billingApi, userApi } from '@/api'

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
      log: [],
      loading: false,

      payVisible: false,
      order: null,
      qrDataUrl: '',
      pollTimer: null,
      refreshing: false,

      /* Chain picker state (v3.0.6+ parity with PC billing flow) */
      chainPickerVisible: false,
      chainsLoading: false,
      chainsLoadError: '',
      availableChains: [],
      selectedChain: null,
      pendingPlan: null,
      creatingOrder: false
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
      const hot = 'yearly'
      return entries.map(([key, value]) => ({
        key,
        name: this.planName(key, value),
        price_usd: value?.price_usd,
        price_cny: value?.price_cny || value?.price,
        credits: value?.credits_once || value?.credits,
        vip_days: value?.vip_days,
        description: value?.description || value?.subtitle,
        popular: key === hot || !!value?.popular,
        raw: value
      }))
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
    this.load()
  },
  beforeUnmount() {
    this.stopPolling()
  },
  methods: {
    planName(key, value) {
      if (value?.name || value?.title) return value.name || value.title
      const loc = this.$i18n?.locale
      const picks = {
        monthly: { 'en-US': 'Monthly', 'ja-JP': '月額', 'ko-KR': '월간', default: '包月' },
        yearly: { 'en-US': 'Yearly', 'ja-JP': '年額', 'ko-KR': '연간', default: '包年' },
        lifetime: { 'en-US': 'Lifetime', 'ja-JP': '永久', 'ko-KR': '영구', default: '永久' }
      }
      const map = {
        monthly: picks.monthly[loc] || picks.monthly.default,
        yearly: picks.yearly[loc] || picks.yearly.default,
        lifetime: picks.lifetime[loc] || picks.lifetime.default
      }
      return map[key] || key
    },
    async load() {
      this.loading = true
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
          if (d.billing) this.billing = { ...this.billing, ...d.billing }
        }
        if (logRes.status === 'fulfilled' && logRes.value?.data) {
          this.log = logRes.value.data.items || logRes.value.data.list || []
        }
      } catch (err) {
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
      this.selectedChain = null
      this.availableChains = []
      this.chainsLoadError = ''
      this.chainsLoading = true
      this.chainPickerVisible = true
      try {
        const res = await billingApi.listUsdtChains()
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
        const res = await billingApi.createUsdtOrder(this.pendingPlan.key, this.selectedChain)
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
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async refreshOrder(isPolling = false) {
      if (!this.order?.order_id) return
      if (!isPolling) this.refreshing = true
      try {
        const res = await billingApi.getUsdtOrder(this.order.order_id, true)
        if (res?.code === 1 && res?.data) {
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
        this.refreshing = false
      }
    },
    closePay() {
      this.payVisible = false
      this.stopPolling()
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
  padding-bottom: 40px;
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.balance-card {
  margin: 18px 16px 16px;
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

.section { margin: 0 16px 18px; }
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

.plan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.plan-card {
  position: relative;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  cursor: pointer;
}
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

/* Chain picker (v3.0.6+) */
.chain-popup {
  background: var(--bg-elevated) !important;
  color: var(--text);
}
.chain-sheet {
  padding: 18px 16px 22px;
  position: relative;
}
.chain-head { margin-bottom: 14px; }
.chain-title { font-size: 16px; font-weight: 700; color: var(--text); }
.chain-desc { margin-top: 4px; font-size: 12px; color: var(--text-2); }
.chain-close {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 20px;
  color: var(--text-2);
  padding: 4px;
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
  max-height: 50vh;
  overflow-y: auto;
}
.chain-option {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
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
  font-size: 11px;
  color: var(--text-3);
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
}
.chain-actions :deep(.van-button) { border-radius: 12px; }

/* USDT popup */
.usdt-popup {
  width: calc(100% - 40px);
  max-width: 420px;
  background: var(--bg-elevated) !important;
  color: var(--text);
  overflow: hidden;
  border: 1px solid var(--border);
}
.usdt-modal {
  padding: 20px 18px 18px;
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
  color: #ffffff;
  border-radius: 10px;
  font-size: 18px;
}
.usdt-head-text { flex: 1; min-width: 0; }
.usdt-title { font-size: 15px; font-weight: 700; color: var(--text); }
.usdt-desc {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.45;
}
.usdt-close {
  font-size: 20px;
  color: var(--text-2);
  padding: 2px;
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

.usdt-actions { margin-top: 16px; }
</style>
