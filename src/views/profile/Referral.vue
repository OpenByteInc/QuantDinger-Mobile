<template>
  <div class="referral-page account-page">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="$t('referral_rewards.title')" left-arrow @click-left="$router.back()" />

    <van-pull-refresh v-model="refreshing" @refresh="refresh">
      <main class="referral-content">
        <p class="page-intro">{{ $t('referral_rewards.intro') }}</p>

        <div v-if="initialLoading" class="initial-loading"><van-loading /></div>

        <section v-else-if="loadFailed" class="state-card">
          <van-icon name="replay" />
          <p>{{ $t('referral_rewards.loadFailed') }}</p>
          <van-button size="small" plain @click="loadAll">{{ $t('common.retry') }}</van-button>
        </section>

        <template v-else>
          <section v-if="reward.enabled" class="reward-summary">
            <div class="balance-head">
              <div>
                <span class="eyebrow">{{ $t('referral_rewards.available') }}</span>
                <div class="balance-value">
                  {{ formatAmount(reward.account.available_balance) }}
                  <small>{{ $t('referral_rewards.currencyUnit') }}</small>
                </div>
              </div>
              <van-button type="primary" size="small" :disabled="!reward.channels.length" @click="openWithdrawal">
                {{ $t('referral_rewards.withdraw') }}
              </van-button>
            </div>
            <div class="reward-metrics">
              <div><strong>{{ formatAmount(reward.account.pending_reward_balance) }}</strong><span>{{ $t('referral_rewards.pendingReward') }}</span></div>
              <div><strong>{{ formatAmount(reward.account.pending_withdrawal_balance) }}</strong><span>{{ $t('referral_rewards.pendingWithdrawal') }}</span></div>
              <div><strong>{{ formatAmount(reward.account.lifetime_earned) }}</strong><span>{{ $t('referral_rewards.lifetimeEarned') }}</span></div>
            </div>
            <p v-if="!reward.channels.length" class="availability-note">{{ $t('referral_rewards.noCurrency') }}</p>
          </section>

          <section class="invite-card">
            <div class="section-heading">
              <div class="section-icon"><van-icon name="friends-o" /></div>
              <div>
                <h2>{{ $t('referral_rewards.inviteLink') }}</h2>
                <span>{{ $t('referral_rewards.invitedCount', { count: referral.total }) }}</span>
              </div>
            </div>
            <button class="copy-row" type="button" :disabled="!referralLink" @click="copyLink">
              <span>{{ referralLink || '-' }}</span><van-icon name="description" /><b>{{ $t('referral_rewards.copy') }}</b>
            </button>
            <div class="benefit-list">
              <div v-if="referral.register_bonus > 0" class="benefit-row">
                <van-icon name="gift-o" /><span>{{ $t('referral_rewards.registerBonus', { count: referral.register_bonus }) }}</span>
              </div>
              <div v-if="reward.enabled && maxRate > 0" class="benefit-row">
                <van-icon name="medal-o" /><span>{{ $t('referral_rewards.membershipReward', { rate: formatRate(maxRate) }) }}</span>
              </div>
            </div>
          </section>

          <section class="records-section">
            <nav class="plain-tabs referral-tabs" :aria-label="$t('referral_rewards.title')">
              <button :class="{ active: activeTab === 'referrals' }" type="button" @click="activeTab = 'referrals'">{{ $t('referral_rewards.referralsTab') }}</button>
              <button v-if="reward.enabled" :class="{ active: activeTab === 'rewards' }" type="button" @click="activeTab = 'rewards'">{{ $t('referral_rewards.rewardsTab') }}</button>
              <button v-if="reward.enabled" :class="{ active: activeTab === 'withdrawals' }" type="button" @click="activeTab = 'withdrawals'">{{ $t('referral_rewards.withdrawalsTab') }}</button>
            </nav>

            <div v-if="activeTab === 'referrals'" class="record-list">
              <article v-for="item in referrals" :key="item.id" class="record-row referral-row">
                <div class="avatar">
                  <img v-if="item.avatar && !failedAvatars.includes(item.id)" :src="item.avatar" :alt="item.nickname || item.username" @error="failedAvatars.push(item.id)">
                  <span v-else>{{ initialFor(item) }}</span>
                </div>
                <div class="record-main"><strong>{{ item.nickname || item.username }}</strong><span>{{ formatDateTime(item.created_at) }}</span></div>
              </article>
              <p v-if="!referrals.length" class="plain-empty">{{ $t('referral_rewards.emptyReferrals') }}</p>
              <van-button v-if="referrals.length < referralTotal" class="load-more" block plain :loading="loadingMoreReferrals" @click="loadMoreReferrals">{{ $t('referral_rewards.loadMore') }}</van-button>
            </div>

            <div v-else-if="activeTab === 'rewards'" class="record-list">
              <article v-for="item in reward.ledger" :key="item.id" class="record-row">
                <div class="record-main">
                  <div class="record-title-line"><strong>{{ actionLabel(item.action) }}</strong><span :class="['status', statusClass(item.status)]">{{ statusLabel(item.status) }}</span></div>
                  <span>{{ formatDateTime(item.created_at) }}<template v-if="item.reward_level"> · {{ $t('referral_rewards.level', { level: item.reward_level }) }}</template></span>
                  <small>{{ $t('referral_rewards.balanceAfter', { amount: formatAmount(item.available_balance_after) }) }} {{ $t('referral_rewards.currencyUnit') }}</small>
                </div>
                <b :class="['record-amount', deltaClass(item)]">{{ signedAmount(item) }}</b>
              </article>
              <p v-if="!reward.ledger.length" class="plain-empty">{{ $t('referral_rewards.emptyRewards') }}</p>
              <van-button v-if="reward.ledger.length < reward.ledger_total" class="load-more" block plain :loading="loadingMoreLedger" @click="loadMoreLedger">{{ $t('referral_rewards.loadMore') }}</van-button>
            </div>

            <div v-else class="record-list">
              <article v-for="item in reward.withdrawals" :key="item.id" class="record-row withdrawal-row">
                <div class="record-main">
                  <div class="record-title-line"><strong>{{ item.currency }} · {{ item.chain }}</strong><span :class="['status', statusClass(item.status)]">{{ statusLabel(item.status) }}</span></div>
                  <span>{{ formatDateTime(item.created_at) }}</span>
                  <small class="mono">{{ $t('referral_rewards.receivingAddress') }} · {{ compactValue(item.address) }}</small>
                  <small v-if="item.tx_hash" class="mono">{{ $t('referral_rewards.transactionHash') }} · {{ compactValue(item.tx_hash) }}</small>
                </div>
                <b class="record-amount">{{ formatAmount(item.amount) }}</b>
              </article>
              <p v-if="!reward.withdrawals.length" class="plain-empty">{{ $t('referral_rewards.emptyWithdrawals') }}</p>
            </div>
          </section>
        </template>
      </main>
    </van-pull-refresh>

    <van-popup v-if="reward.enabled" v-model:show="withdrawalVisible" class="withdrawal-sheet" position="bottom" round safe-area-inset-bottom teleport="body">
      <div class="sheet-handle" />
      <header class="sheet-header"><h2>{{ $t('referral_rewards.withdrawalTitle') }}</h2><button type="button" @click="withdrawalVisible = false"><van-icon name="cross" /></button></header>
      <p class="sheet-notice"><van-icon name="warning-o" />{{ $t('referral_rewards.withdrawalNotice') }}</p>

      <div class="form-block">
        <label>{{ $t('referral_rewards.currency') }}</label>
        <div class="choice-grid">
          <button v-for="currency in currencies" :key="currency" :class="{ active: withdrawal.currency === currency }" type="button" @click="selectCurrency(currency)">{{ currency }}</button>
        </div>
      </div>

      <div class="form-block">
        <label>{{ $t('referral_rewards.network') }}</label>
        <div class="choice-grid">
          <button v-for="channel in networks" :key="`${channel.currency}:${channel.code}`" :class="{ active: withdrawal.chain === channel.code }" type="button" @click="withdrawal.chain = channel.code">{{ channel.label || channel.code }}</button>
        </div>
      </div>

      <div class="form-block">
        <label for="reward-address">{{ $t('referral_rewards.address') }}</label>
        <van-field id="reward-address" v-model.trim="withdrawal.address" clearable :placeholder="$t('referral_rewards.addressPlaceholder')" />
      </div>

      <div class="form-block">
        <label for="reward-amount">{{ $t('referral_rewards.amount') }}</label>
        <van-field id="reward-amount" v-model="withdrawal.amount" type="number" inputmode="decimal" clearable :placeholder="$t('referral_rewards.amountPlaceholder')">
          <template #button><span class="field-unit">{{ $t('referral_rewards.currencyUnit') }}</span></template>
        </van-field>
        <div class="amount-hints">
          <span>{{ $t('referral_rewards.minimum', { amount: formatAmount(reward.minimum_withdrawal) }) }}</span>
          <span>{{ $t('referral_rewards.availableHint', { amount: formatAmount(reward.account.available_balance) }) }}</span>
        </div>
      </div>

      <van-button block type="primary" :loading="withdrawalSubmitting" @click="submitWithdrawal">{{ $t('referral_rewards.submit') }}</van-button>
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { billingApi, userApi } from '@/api'
import { PUBLIC_WEB_BASE_URL } from '@/config'
import { getLocale } from '@/locales'

const emptyAccount = () => ({
  available_balance: 0,
  pending_reward_balance: 0,
  pending_withdrawal_balance: 0,
  lifetime_earned: 0,
  lifetime_paid: 0
})

export default {
  name: 'ProfileReferral',
  data() {
    return {
      initialLoading: true,
      refreshing: false,
      loadFailed: false,
      loadingMoreReferrals: false,
      loadingMoreLedger: false,
      failedAvatars: [],
      activeTab: 'referrals',
      referralPage: 1,
      referralTotal: 0,
      referral: { total: 0, referral_code: '', referral_bonus: 0, register_bonus: 0 },
      referrals: [],
      ledgerPage: 1,
      reward: {
        enabled: false,
        account: emptyAccount(),
        ledger: [],
        ledger_total: 0,
        withdrawals: [],
        channels: [],
        minimum_withdrawal: 0,
        rates: []
      },
      withdrawalVisible: false,
      withdrawalSubmitting: false,
      withdrawal: { currency: '', chain: '', address: '', amount: '' }
    }
  },
  computed: {
    referralLink() {
      if (!this.referral.referral_code) return ''
      const base = String(PUBLIC_WEB_BASE_URL || '').replace(/\/$/, '')
      return `${base}/login?ref=${encodeURIComponent(this.referral.referral_code)}`
    },
    maxRate() {
      return this.reward.rates.length ? Math.max(...this.reward.rates) : 0
    },
    currencies() {
      return [...new Set(this.reward.channels.map((channel) => channel.currency).filter(Boolean))]
    },
    networks() {
      return this.reward.channels.filter((channel) => channel.currency === this.withdrawal.currency)
    }
  },
  mounted() {
    this.loadAll()
  },
  methods: {
    applyReferralData(data = {}) {
      this.referral = {
        total: Number(data.total || 0),
        referral_code: data.referral_code || '',
        referral_bonus: Number(data.referral_bonus || 0),
        register_bonus: Number(data.register_bonus || 0)
      }
      this.referrals = Array.isArray(data.list) ? data.list : []
      this.referralTotal = Number(data.total || 0)
      this.referralPage = 1
    },
    applyRewardData(data = {}, appendLedger = false) {
      const enabled = Boolean(data.enabled)
      this.reward = {
        enabled,
        account: { ...emptyAccount(), ...(data.account || {}) },
        ledger: appendLedger ? [...this.reward.ledger, ...(data.ledger || [])] : (data.ledger || []),
        ledger_total: Number(data.ledger_total || 0),
        withdrawals: data.withdrawals || [],
        channels: data.channels || [],
        minimum_withdrawal: Number(data.minimum_withdrawal || 0),
        rates: data.rates || []
      }
      if (!enabled && this.activeTab !== 'referrals') this.activeTab = 'referrals'
    },
    async loadAll() {
      this.initialLoading = true
      this.loadFailed = false
      const [referralResult, rewardResult] = await Promise.allSettled([
        userApi.getMyReferrals({ page: 1, page_size: 20 }),
        billingApi.getReferralRewards({ page: 1, page_size: 20 })
      ])
      if (referralResult.status === 'fulfilled') this.applyReferralData(referralResult.value.data || {})
      else this.loadFailed = true
      if (rewardResult.status === 'fulfilled') {
        this.applyRewardData(rewardResult.value.data || {})
        this.ledgerPage = 1
      } else this.applyRewardData({ enabled: false })
      this.initialLoading = false
    },
    async refresh() {
      await this.loadAll()
      this.refreshing = false
    },
    async loadMoreReferrals() {
      if (this.loadingMoreReferrals || this.referrals.length >= this.referralTotal) return
      this.loadingMoreReferrals = true
      try {
        const nextPage = this.referralPage + 1
        const res = await userApi.getMyReferrals({ page: nextPage, page_size: 20 })
        const data = res.data || {}
        this.referrals = [...this.referrals, ...(data.list || [])]
        this.referralPage = nextPage
        this.referralTotal = Number(data.total || this.referralTotal)
      } catch (error) {
        console.error('Load more referrals failed:', error)
      } finally {
        this.loadingMoreReferrals = false
      }
    },
    async loadMoreLedger() {
      if (this.loadingMoreLedger || this.reward.ledger.length >= this.reward.ledger_total) return
      this.loadingMoreLedger = true
      try {
        const nextPage = this.ledgerPage + 1
        const res = await billingApi.getReferralRewards({ page: nextPage, page_size: 20 })
        this.applyRewardData(res.data || {}, true)
        this.ledgerPage = nextPage
      } catch (error) {
        console.error('Load more reward ledger failed:', error)
      } finally {
        this.loadingMoreLedger = false
      }
    },
    async copyLink() {
      if (!this.referralLink) return
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(this.referralLink)
        else {
          const input = document.createElement('input')
          input.value = this.referralLink
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast({ message: this.$t('referral_rewards.copied'), type: 'success' })
      } catch (error) {
        console.error('Copy referral link failed:', error)
      }
    },
    openWithdrawal() {
      const first = this.reward.channels[0]
      if (!first) return
      this.withdrawal = { currency: first.currency, chain: first.code, address: '', amount: this.reward.minimum_withdrawal ? String(this.reward.minimum_withdrawal) : '' }
      this.withdrawalVisible = true
    },
    selectCurrency(currency) {
      const first = this.reward.channels.find((channel) => channel.currency === currency)
      this.withdrawal.currency = currency
      this.withdrawal.chain = first?.code || ''
    },
    validAddress(chain, address) {
      if (['BEP20', 'ERC20'].includes(chain)) return /^0x[0-9a-fA-F]{40}$/.test(address)
      if (chain === 'TRC20') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
      if (chain === 'SOL') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      return false
    },
    async submitWithdrawal() {
      const { currency, chain, address } = this.withdrawal
      const amount = Number(this.withdrawal.amount)
      if (!currency || !chain || !address || !Number.isFinite(amount)) {
        showToast(this.$t('referral_rewards.completeFields'))
        return
      }
      if (!this.validAddress(chain, address)) {
        showToast(this.$t('referral_rewards.invalidAddress'))
        return
      }
      if (amount < this.reward.minimum_withdrawal || amount > Number(this.reward.account.available_balance) || amount <= 0) {
        showToast(this.$t('referral_rewards.invalidAmount'))
        return
      }
      this.withdrawalSubmitting = true
      try {
        await billingApi.createReferralWithdrawal({ currency, chain, address, amount })
        showToast({ message: this.$t('referral_rewards.submitted'), type: 'success' })
        this.withdrawalVisible = false
        const res = await billingApi.getReferralRewards({ page: 1, page_size: 20 })
        this.applyRewardData(res.data || {})
        this.ledgerPage = 1
      } catch (error) {
        console.error('Submit reward withdrawal failed:', error)
      } finally {
        this.withdrawalSubmitting = false
      }
    },
    actionLabel(action) {
      const keys = { membership_reward: 'actionMembership', reward_release: 'actionRelease', withdrawal_requested: 'actionRequested', withdrawal_paid: 'actionPaid', withdrawal_rejected: 'actionRejected' }
      return this.$t(`referral_rewards.${keys[action] || 'record'}`)
    },
    statusLabel(status) {
      const keys = { pending: 'statusPending', released: 'statusReleased', posted: 'statusPosted', processing: 'statusProcessing', paid: 'statusPaid', rejected: 'statusRejected' }
      return this.$t(`referral_rewards.${keys[status] || 'statusPending'}`)
    },
    statusClass(status) {
      return `status--${['pending', 'processing', 'paid', 'posted', 'released', 'rejected'].includes(status) ? status : 'pending'}`
    },
    signedAmount(item) {
      const direction = this.actionDirection(item)
      const sign = direction > 0 ? '+' : direction < 0 ? '-' : ''
      return `${sign}${this.formatAmount(Math.abs(Number(item.amount || 0)))}`
    },
    deltaClass(item) {
      const direction = this.actionDirection(item)
      return direction > 0 ? 'positive' : direction < 0 ? 'negative' : ''
    },
    actionDirection(item) {
      if (['membership_reward', 'reward_release', 'withdrawal_rejected'].includes(item.action)) return 1
      if (['withdrawal_requested', 'withdrawal_paid'].includes(item.action)) return -1
      return Math.sign(Number(item.available_delta || item.pending_reward_delta || item.pending_withdrawal_delta || 0))
    },
    formatAmount(value) {
      return Number(value || 0).toFixed(2)
    },
    formatRate(value) {
      const rate = Number(value || 0)
      return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    },
    formatDateTime(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return new Intl.DateTimeFormat(getLocale(), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
    },
    compactValue(value) {
      const text = String(value || '')
      if (text.length <= 20) return text
      return `${text.slice(0, 9)}…${text.slice(-7)}`
    },
    initialFor(item) {
      return String(item.nickname || item.username || '?').slice(0, 1).toUpperCase()
    }
  }
}
</script>

<style scoped>
.referral-page { min-height: 100vh; padding-bottom: 36px; }
.referral-content { min-height: calc(100vh - 46px); }
.page-intro { margin-bottom: 16px !important; }
.initial-loading,.state-card { min-height: 220px; display: flex; align-items: center; justify-content: center; }
.state-card { margin: 16px; flex-direction: column; gap: 12px; color: var(--v2-muted); border: 1px solid var(--v2-line); border-radius: 12px; background: var(--v2-surface); }
.state-card > .van-icon { font-size: 28px; }
.state-card p { margin: 0; font-size: 13px; }
.reward-summary,.invite-card,.records-section { margin: 0 16px 14px; border: 1px solid var(--v2-line); border-radius: 12px; background: var(--v2-surface); overflow: hidden; }
.reward-summary { padding: 18px 16px 14px; }
.balance-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.eyebrow { display: block; margin-bottom: 5px; color: var(--v2-muted); font-size: 12px; }
.balance-value { color: var(--v2-text); font-size: 30px; font-weight: 720; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }
.balance-value small { margin-left: 3px; color: var(--v2-muted); font-size: 11px; font-weight: 600; letter-spacing: 0; }
.reward-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--v2-line); }
.reward-metrics > div { min-width: 0; padding: 0 10px; border-left: 1px solid var(--v2-line); }
.reward-metrics > div:first-child { padding-left: 0; border-left: 0; }
.reward-metrics > div:last-child { padding-right: 0; }
.reward-metrics strong,.reward-metrics span { display: block; }
.reward-metrics strong { color: var(--v2-text); font-size: 14px; font-variant-numeric: tabular-nums; }
.reward-metrics span { margin-top: 4px; color: var(--v2-muted); font-size: 10px; line-height: 1.35; }
.availability-note { margin: 12px 0 0; color: var(--v2-muted); font-size: 11px; }
.invite-card { padding: 16px; }
.section-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }
.section-icon { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 8px; color: var(--v2-brand); background: var(--v2-surface-2); font-size: 18px; }
.section-heading h2 { margin: 0; color: var(--v2-text); font-size: 14px; font-weight: 650; }
.section-heading span { display: block; margin-top: 3px; color: var(--v2-muted); font-size: 11px; }
.copy-row { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--v2-line); border-radius: 8px; color: var(--v2-text); background: var(--v2-surface-2); text-align: left; }
.copy-row > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.copy-row > .van-icon { color: var(--v2-muted); }
.copy-row > b { color: var(--v2-brand); font-size: 12px; font-weight: 600; }
.copy-row:disabled { opacity: .55; }
.benefit-list { margin-top: 12px; }
.benefit-row { display: flex; align-items: flex-start; gap: 8px; padding-top: 9px; color: var(--v2-muted); font-size: 12px; line-height: 1.5; }
.benefit-row .van-icon { margin-top: 2px; flex-shrink: 0; color: var(--v2-brand); }
.records-section { min-height: 210px; }
.referral-tabs { padding: 0 14px; gap: 20px; }
.referral-tabs button { flex: 1; min-width: max-content; }
.record-list { padding: 0 14px; }
.record-row { display: flex; align-items: center; gap: 11px; min-height: 70px; padding: 13px 0; border-bottom: 1px solid var(--v2-line); }
.record-row:last-of-type { border-bottom: 0; }
.avatar { width: 36px; height: 36px; display: grid; place-items: center; flex-shrink: 0; overflow: hidden; border-radius: 50%; color: var(--v2-text); background: var(--v2-surface-2); font-size: 13px; font-weight: 650; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.record-main { flex: 1; min-width: 0; }
.record-main > strong,.record-main > span,.record-main > small { display: block; }
.record-main > strong,.record-title-line strong { color: var(--v2-text); font-size: 13px; font-weight: 620; }
.record-main > span { margin-top: 4px; color: var(--v2-muted); font-size: 11px; line-height: 1.4; }
.record-main > small { margin-top: 4px; color: var(--v2-muted); font-size: 10px; line-height: 1.4; }
.record-title-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.status { flex-shrink: 0; padding: 2px 6px; border-radius: 4px; color: var(--v2-muted); background: var(--v2-surface-2); font-size: 10px; }
.status--paid,.status--posted,.status--released { color: var(--v2-green); }
.status--rejected { color: var(--v2-red); }
.record-amount { align-self: flex-start; margin-top: 2px; color: var(--v2-text); font-size: 13px; font-variant-numeric: tabular-nums; }
.record-amount.positive { color: var(--v2-green); }
.record-amount.negative { color: var(--v2-red); }
.mono { overflow-wrap: anywhere; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; }
.load-more { margin: 10px 0 14px; height: 38px; }
.plain-empty { padding: 42px 12px !important; }
.withdrawal-sheet { width: min(100%,520px); left: 50% !important; right: auto !important; max-height: 88vh; padding: 8px 18px 20px; transform: translateX(-50%); overflow-y: auto; background: var(--v2-surface); color: var(--v2-text); }
.sheet-handle { width: 34px; height: 4px; margin: 2px auto 12px; border-radius: 2px; background: var(--v2-line); }
.sheet-header { display: flex; align-items: center; justify-content: space-between; }
.sheet-header h2 { margin: 0; font-size: 17px; }
.sheet-header button { width: 36px; height: 36px; border: 0; color: var(--v2-muted); background: transparent; font-size: 18px; }
.sheet-notice { display: flex; align-items: flex-start; gap: 7px; margin: 10px 0 18px; padding: 10px 11px; border-radius: 8px; color: var(--v2-muted); background: var(--v2-surface-2); font-size: 11px; line-height: 1.5; }
.sheet-notice .van-icon { margin-top: 2px; flex-shrink: 0; }
.form-block { margin-bottom: 16px; }
.form-block > label { display: block; margin-bottom: 8px; color: var(--v2-text); font-size: 12px; font-weight: 600; }
.choice-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.choice-grid button { min-width: 82px; height: 38px; padding: 0 13px; border: 1px solid var(--v2-line); border-radius: 8px; color: var(--v2-text); background: var(--v2-surface-2); font-size: 12px; }
.choice-grid button.active { border-color: var(--v2-brand); color: var(--v2-brand); }
.form-block :deep(.van-field) { padding: 10px 12px; border: 1px solid var(--v2-line); border-radius: 8px; background: var(--v2-surface-2); }
.form-block :deep(.van-field::after) { display: none; }
.field-unit { color: var(--v2-muted); font-size: 11px; }
.amount-hints { display: flex; justify-content: space-between; gap: 8px; margin-top: 7px; color: var(--v2-muted); font-size: 10px; }
@media (max-width:360px) { .reward-metrics > div { padding-inline: 6px; } .referral-tabs { gap: 12px; } .balance-value { font-size: 27px; } }
</style>
