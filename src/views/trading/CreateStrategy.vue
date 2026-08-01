<template>
  <div class="page">
    <van-nav-bar :title="$t('script_strategy.title')" left-arrow @click-left="$router.back()" />

    <div class="source-card">
      <div class="source-icon"><van-icon name="description" /></div>
      <div class="source-copy">
        <div class="source-label">{{ isEditMode ? $t('bot_create.edit_banner') : $t('script_strategy.source_label') }}</div>
        <div class="source-title">{{ sourceName }}</div>
        <p>{{ sourceDescription }}</p>
      </div>
    </div>

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else>
      <div v-if="!sourceId" class="warning-card">
        <van-icon name="warning-o" />
        <span>{{ $t('script_strategy.source_missing') }}</span>
      </div>
      <div v-else-if="contractError" class="warning-card">
        <van-icon name="warning-o" />
        <span>{{ $t('script_strategy.contract_error') }}</span>
      </div>

      <div v-if="sourceId && !contractError" class="contract-card">
        <div><span>{{ $t('script_strategy.market') }}</span><strong>{{ marketCategory }}</strong></div>
        <div><span>{{ $t('script_strategy.frequency') }}</span><strong>{{ manifestFrequency }}</strong></div>
        <div><span>{{ $t('script_strategy.strategy_type') }}</span><strong>{{ strategyTypeLabel }}</strong></div>
      </div>

      <div v-if="hasTriggerContract" class="trigger-card">
        <div class="trigger-card-icon"><van-icon name="fire-o" /></div>
        <div>
          <strong>{{ triggerModeTitle }}</strong>
          <p>{{ triggerModeHint }}</p>
          <span>{{ $t('script_strategy.trigger_risk_realtime') }}</span>
          <span>{{ $t('script_strategy.trigger_fill_reconciled') }}</span>
        </div>
      </div>

      <div v-if="hasEquityRisk" class="risk-summary-card">
        <div class="risk-summary-title">
          <van-icon name="shield-o" />
          <span>{{ $t('script_strategy.equity_risk_title') }}</span>
          <em>{{ $t('script_strategy.system_preset') }}</em>
        </div>
        <div class="risk-summary-grid">
          <div>
            <span>{{ $t('script_strategy.equity_take_profit') }}</span>
            <strong>{{ formatRiskPercent(equityRisk.takeProfitPct) }}</strong>
          </div>
          <div>
            <span>{{ $t('script_strategy.equity_stop_loss') }}</span>
            <strong>{{ formatRiskPercent(equityRisk.stopLossPct) }}</strong>
          </div>
          <div class="risk-summary-wide">
            <span>{{ $t('script_strategy.equity_trailing') }}</span>
            <strong v-if="equityRisk.trailingEnabled">
              {{ $t('script_strategy.equity_trailing_value', {
                activation: formatRiskPercent(equityRisk.trailingActivationPct),
                callback: formatRiskPercent(equityRisk.trailingCallbackPct)
              }) }}
            </strong>
            <strong v-else>{{ $t('common.disabled') }}</strong>
          </div>
        </div>
        <p>{{ $t('script_strategy.equity_risk_hint') }}</p>
      </div>

      <div v-if="parameterDefinitions.length" class="section">
        <div class="section-title">{{ $t('script_strategy.parameters') }}</div>
        <van-cell-group inset>
          <template v-for="parameter in parameterDefinitions" :key="parameter.name">
            <van-cell v-if="parameter.type === 'boolean'" :title="parameterLabel(parameter)">
              <template #right-icon>
                <van-switch v-model="params[parameter.name]" size="22" />
              </template>
            </van-cell>
            <van-field
              v-else-if="isNumericParameter(parameter)"
              v-model.number="params[parameter.name]"
              type="number"
              :label="parameterLabel(parameter)"
              :placeholder="parameterDescription(parameter)"
            />
            <van-field
              v-else
              v-model="params[parameter.name]"
              :label="parameterLabel(parameter)"
              :placeholder="parameterDescription(parameter)"
            />
          </template>
        </van-cell-group>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('bot_create.base_config') }}</div>
        <van-cell-group inset>
          <van-field
            v-model="form.name"
            :label="$t('bot_create.bot_name')"
            :placeholder="$t('bot_create.bot_name_placeholder')"
          />
          <van-field
            v-model.number="form.initialCapital"
            type="number"
            :label="$t('bot_create.initial_capital')"
            :placeholder="$t('bot_create.initial_capital_placeholder')"
          />
          <div class="field-hint capital-hint">
            {{ $t('bot_create.initial_capital_hint') }}
          </div>
          <van-cell :title="$t('indicator_bot.execution_mode')">
            <template #right-icon>
              <van-radio-group v-model="form.executionMode" direction="horizontal">
                <van-radio name="signal">{{ $t('indicator_bot.execution_mode_signal') }}</van-radio>
                <van-radio name="live" :disabled="!supportsLive">{{ $t('indicator_bot.execution_mode_live') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">
            {{ executionModeHint }}
          </div>
          <div class="notification-config">
            <div class="notification-config-head">
              <div>
                <strong>{{ $t('script_strategy.notification_channels') }}</strong>
                <span>{{ $t('script_strategy.required') }}</span>
              </div>
              <button type="button" @click="openNotificationSettings">
                {{ $t('script_strategy.manage_notification_channels') }}
                <van-icon name="arrow" />
              </button>
            </div>
            <p>{{ $t('script_strategy.notification_channels_hint') }}</p>
            <van-checkbox-group v-model="notificationChannels" class="notification-channel-grid">
              <van-checkbox
                v-for="channel in notificationChannelOptions"
                :key="channel.value"
                :name="channel.value"
                :disabled="!channel.available"
                :class="{ 'notification-channel--selected': notificationChannels.includes(channel.value) }"
                shape="square"
              >
                <div class="notification-channel-option">
                  <van-icon :name="channel.icon" :class="['notification-channel-icon', channel.value]" />
                  <div>
                    <strong>{{ channel.label }}</strong>
                    <small>{{ channel.available ? $t('script_strategy.channel_ready') : $t('script_strategy.channel_not_configured') }}</small>
                  </div>
                </div>
              </van-checkbox>
            </van-checkbox-group>
            <div v-if="!activeNotificationChannels.length" class="notification-channel-error">
              <van-icon name="warning-o" />
              {{ $t('script_strategy.notification_channel_required') }}
            </div>
          </div>
          <van-cell
            v-if="form.executionMode === 'live'"
            :title="$t('bot_create.exchange_account')"
            :value="credentialLabel"
            is-link
            @click="openCredentialPicker"
          />
          <van-cell v-if="form.executionMode === 'live'" :title="$t('bot_create.leverage')">
            <template #right-icon>
              <van-switch v-model="form.leverageEnabled" size="22" :disabled="!supportsLeverage" />
            </template>
          </van-cell>
          <div v-if="form.executionMode === 'live' && !supportsLeverage" class="field-hint">{{ $t('script_strategy.leverage_unavailable') }}</div>
          <van-field
            v-if="form.executionMode === 'live' && form.leverageEnabled"
            v-model.number="form.leverage"
            type="number"
            :label="$t('bot_create.leverage')"
            :placeholder="$t('script_strategy.max_leverage', { value: maxLeverage })"
          />
          <van-cell v-if="form.executionMode === 'live' && requiresPositionSide" :title="$t('script_strategy.position_side')">
            <template #right-icon>
              <van-radio-group v-model="form.positionSide" direction="horizontal">
                <van-radio name="long">{{ $t('trading.side_long') }}</van-radio>
                <van-radio name="short">{{ $t('trading.side_short') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div class="submit-wrap">
        <van-button
          type="primary"
          block
          round
          :disabled="!formValid"
          :loading="submitting"
          @click="submit"
        >{{ isEditMode ? $t('bot_create.update') : $t('bot_create.submit') }}</van-button>
      </div>
    </template>

    <van-popup v-model:show="showCredentialPicker" position="bottom" round>
      <van-picker
        :columns="credentialColumns"
        @cancel="showCredentialPicker = false"
        @confirm="onCredentialSelect"
      />
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { credentialsApi, scriptSourceApi, strategyApi, userApi } from '@/api'
import { useCredentialsStore } from '@/stores'

const LIVE_CRYPTO_EXCHANGES = new Set(['binance', 'okx', 'bitget', 'bybit', 'gate', 'htx'])
const DEFAULT_NOTIFICATION_CHANNELS = ['browser']
const SUPPORTED_NOTIFICATION_CHANNELS = new Set(['browser', 'email', 'telegram', 'phone', 'discord', 'webhook'])

export default {
  name: 'CreateStrategy',
  data() {
    return {
      loading: false,
      submitting: false,
      editId: null,
      sourceId: null,
      source: null,
      manifest: {},
      contractError: false,
      params: {},
      notificationSettings: {},
      notificationChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
      form: {
        name: '',
        initialCapital: 1000,
        executionMode: 'signal',
        credentialId: null,
        leverageEnabled: false,
        leverage: 1,
        positionSide: ''
      },
      showCredentialPicker: false
    }
  },
  computed: {
    credentialsStore() { return useCredentialsStore() },
    credentials() {
      return this.credentialsStore.items.filter(item => {
        const exchange = String(item.exchange_id || '').toLowerCase()
        if (this.manifest?.strategyType === 'portfolio') return exchange === 'alpaca'
        if (this.marketCategory === 'Crypto') return LIVE_CRYPTO_EXCHANGES.has(exchange)
        if (this.marketCategory === 'USStock') return ['alpaca', 'ibkr'].includes(exchange)
        return false
      })
    },
    isEditMode() { return !!this.editId },
    sourceName() {
      return this.source?.name || this.form.name || this.$route.query?.name || this.$t('script_strategy.untitled')
    },
    sourceDescription() {
      const description = String(this.source?.description || '').trim()
      if (!description || /strategy api|script source|visual builder|robot generated/i.test(description)) {
        return this.$t('script_strategy.customer_desc')
      }
      return description
    },
    marketCategory() {
      const markets = Array.isArray(this.manifest?.markets) ? this.manifest.markets : []
      return markets.length === 1 ? String(markets[0]) : (markets.length ? this.$t('script_strategy.mixed_market') : '-')
    },
    manifestFrequency() {
      return String(this.manifest?.primaryFrequency || this.manifest?.subscriptions?.[0]?.frequency || '-')
    },
    strategyTypeLabel() {
      const type = this.manifest?.strategyType === 'portfolio' ? 'portfolio' : 'cta'
      return this.$t(`script_strategy.type_${type}`)
    },
    supportsLive() {
      if (this.manifest?.strategyType === 'portfolio') return this.marketCategory === 'USStock'
      return ['Crypto', 'USStock'].includes(this.marketCategory)
    },
    instruments() {
      return Array.isArray(this.manifest?.universe?.instruments) ? this.manifest.universe.instruments : []
    },
    supportsLeverage() {
      return Boolean(this.manifest?.leverageAllowed) && this.instruments.length > 0 && this.instruments.every(item => (
        item.market === 'Crypto' && String(item.market_type || '').toLowerCase() === 'swap'
      ))
    },
    maxLeverage() {
      return Math.max(1, Number(this.manifest?.maxLeverage || 1))
    },
    requiresPositionSide() {
      return this.marketCategory === 'Crypto' && this.instruments.length > 0 && this.instruments.every(item => (
        String(item.market_type || '').toLowerCase() === 'swap'
      ))
    },
    executionModeHint() {
      if (!this.supportsLive) return this.$t('script_strategy.live_unavailable')
      return this.form.executionMode === 'live'
        ? this.$t('indicator_bot.execution_mode_live_desc')
        : this.$t('indicator_bot.execution_mode_signal_desc')
    },
    notificationChannelOptions() {
      return [
        { value: 'browser', label: this.$t('notif_settings.ch_browser'), icon: 'bell', available: true },
        { value: 'email', label: this.$t('notif_settings.ch_email'), icon: 'envelop-o', available: this.hasNotificationTarget('email') },
        { value: 'telegram', label: 'Telegram', icon: 'chat-o', available: this.hasNotificationTarget('telegram') },
        { value: 'phone', label: this.$t('notif_settings.ch_sms'), icon: 'phone-o', available: this.hasNotificationTarget('phone') },
        { value: 'discord', label: 'Discord', icon: 'comment-o', available: this.hasNotificationTarget('discord') },
        { value: 'webhook', label: 'Webhook', icon: 'link-o', available: this.hasNotificationTarget('webhook') }
      ]
    },
    activeNotificationChannels() {
      return [...new Set(this.notificationChannels)]
        .filter(channel => SUPPORTED_NOTIFICATION_CHANNELS.has(channel) && this.hasNotificationTarget(channel))
    },
    triggerContract() {
      const metadata = this.parseObject(this.source?.metadata)
      return this.parseObject(metadata.trigger_contract)
    },
    hasTriggerContract() {
      return Boolean(this.triggerContract.entry)
    },
    triggerModeTitle() {
      const entry = String(this.triggerContract.entry || '').toLowerCase()
      if (entry === 'exchange_resting_orders') return this.$t('script_strategy.trigger_exchange_resting')
      if (entry === 'realtime_price') return this.$t('script_strategy.trigger_realtime_price')
      if (entry === 'schedule') return this.$t('script_strategy.trigger_schedule')
      return this.$t('script_strategy.trigger_closed_bar')
    },
    triggerModeHint() {
      const entry = String(this.triggerContract.entry || '').toLowerCase()
      if (entry === 'exchange_resting_orders') return this.$t('script_strategy.trigger_exchange_resting_hint')
      if (entry === 'realtime_price') return this.$t('script_strategy.trigger_realtime_price_hint')
      if (entry === 'schedule') return this.$t('script_strategy.trigger_schedule_hint')
      return this.$t('script_strategy.trigger_closed_bar_hint')
    },
    equityRisk() {
      const metadata = this.parseObject(this.source?.metadata)
      const direct = this.parseObject(metadata.equity_risk)
      const config = this.parseObject(metadata.executor_config)
      const value = (directKey, configKey, camelKey) => {
        if (direct[directKey] !== undefined) return direct[directKey]
        if (config[configKey] !== undefined) return config[configKey]
        if (config[camelKey] !== undefined) return config[camelKey]
        return 0
      }
      return {
        isPreset: metadata.source === 'robot_builder' || Object.keys(direct).length > 0,
        takeProfitPct: Number(value('take_profit_pct', 'equity_take_profit_pct', 'equityTakeProfitPct')) || 0,
        stopLossPct: Number(value('stop_loss_pct', 'equity_stop_loss_pct', 'equityStopLossPct')) || 0,
        trailingEnabled: Boolean(
          direct.trailing_enabled !== undefined
            ? direct.trailing_enabled
            : (config.equity_trailing_enabled ?? config.equityTrailingEnabled)
        ),
        trailingActivationPct: Number(value(
          'trailing_activation_pct',
          'equity_trailing_activation_pct',
          'equityTrailingActivationPct'
        )) || 0,
        trailingCallbackPct: Number(value(
          'trailing_callback_pct',
          'equity_trailing_callback_pct',
          'equityTrailingCallbackPct'
        )) || 0
      }
    },
    hasEquityRisk() {
      return this.equityRisk.isPreset && (
        this.equityRisk.takeProfitPct > 0
        || this.equityRisk.stopLossPct > 0
        || this.equityRisk.trailingEnabled
      )
    },
    parameterDefinitions() {
      const schema = this.parseObject(this.source?.param_schema)
      if (Array.isArray(schema.params) && schema.params.length) {
        return schema.params.filter(item => item?.name)
      }
      const values = this.parseObject(this.source?.template_params)
      return Object.keys(values).map(name => ({
        name,
        type: Number.isInteger(values[name]) ? 'integer' : (typeof values[name] === 'number' ? 'number' : typeof values[name]),
        default: values[name]
      }))
    },
    credentialColumns() {
      return this.credentials.map(item => ({
        text: `${item.name || item.exchange_id} (${String(item.exchange_id || '').toUpperCase()})`,
        value: item.id
      }))
    },
    credentialLabel() {
      const item = this.credentials.find(row => row.id === this.form.credentialId)
      return item
        ? `${item.name || item.exchange_id} (${String(item.exchange_id || '').toUpperCase()})`
        : this.$t('bot_create.exchange_account_placeholder')
    },
    formValid() {
      if (!this.sourceId || this.contractError || !this.form.name.trim()) return false
      const initialCapital = Number(this.form.initialCapital)
      if (!Number.isFinite(initialCapital) || initialCapital < 10 || initialCapital > 1000000) return false
      if (!this.activeNotificationChannels.length) return false
      if (this.form.executionMode !== 'live') return true
      if (!this.form.credentialId) return false
      if (this.requiresPositionSide && !this.form.positionSide) return false
      return true
    }
  },
  async mounted() {
    this.loading = true
    try {
      await Promise.all([this.loadCredentials(), this.loadNotificationSettings()])
      await this.loadEdit()
      if (!this.isEditMode) await this.loadSourceFromRoute()
    } finally {
      this.loading = false
    }
  },
  methods: {
    async loadCredentials() {
      try {
        const response = await credentialsApi.list()
        this.credentialsStore.setItems(response.data || [])
      } catch {
        this.credentialsStore.setItems([])
      }
    },
    async loadNotificationSettings() {
      try {
        const response = await userApi.getNotificationSettings()
        this.notificationSettings = response?.data || {}
        this.applyNotificationChannelDefaults(this.notificationSettings.default_channels)
      } catch {
        this.notificationSettings = {}
        this.applyNotificationChannelDefaults(DEFAULT_NOTIFICATION_CHANNELS)
      }
    },
    async loadEdit() {
      const id = Number(this.$route.query?.edit)
      if (!Number.isFinite(id) || id <= 0) return
      const response = await strategyApi.getDetail(id)
      const deployment = response?.data
      if (!deployment) return
      const config = deployment.trading_config || {}
      const exchange = deployment.exchange_config || {}
      this.editId = id
      this.sourceId = Number(config.script_source_id) || null
      this.params = { ...(config.params || {}) }
      this.form.name = deployment.strategy_name || ''
      this.form.initialCapital = Number(deployment.initial_capital) || 1000
      this.form.executionMode = deployment.execution_mode || 'signal'
      this.form.credentialId = config.credential_id || exchange.credential_id || null
      this.form.leverageEnabled = Boolean(config.leverage_enabled)
      this.form.leverage = Number(config.leverage || deployment.leverage) || 1
      this.form.positionSide = config.position_side || ''
      const channels = deployment.notification_config?.channels
      if (Array.isArray(channels)) this.applyNotificationChannelDefaults(channels)
      if (this.sourceId) await this.loadSource(this.sourceId)
    },
    async loadSourceFromRoute() {
      const id = Number(this.$route.query?.source_id) || null
      if (id) {
        await this.loadSource(id)
      }
    },
    async loadSource(id) {
      this.contractError = false
      try {
        const sourceResponse = await scriptSourceApi.getDetail(id)
        this.source = sourceResponse?.data || null
        this.sourceId = Number(this.source?.id || id)
        const manifestResponse = await scriptSourceApi.compile(id)
        this.manifest = manifestResponse?.data || {}
        if (!this.form.name) this.form.name = this.source?.name || ''
        this.applyParameterDefaults()
        this.normalizeContractFields()
      } catch (error) {
        this.contractError = true
        this.manifest = {}
        throw error
      }
    },
    parseObject(value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (typeof value !== 'string' || !value.trim()) return {}
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        return {}
      }
    },
    applyParameterDefaults() {
      const templateParams = this.parseObject(this.source?.template_params)
      const next = { ...templateParams }
      this.parameterDefinitions.forEach(parameter => {
        if (next[parameter.name] === undefined && parameter.default !== undefined) {
          next[parameter.name] = parameter.default
        }
      })
      this.params = { ...next, ...this.params }
    },
    normalizeContractFields() {
      if (!this.supportsLive) {
        this.form.executionMode = 'signal'
        this.form.credentialId = null
      }
      if (!this.supportsLeverage) {
        this.form.leverageEnabled = false
        this.form.leverage = 1
      } else if (Number(this.form.leverage) > this.maxLeverage) {
        this.form.leverage = this.maxLeverage
      }
      if (!this.requiresPositionSide) this.form.positionSide = ''
      if (!this.credentials.some(item => item.id === this.form.credentialId)) this.form.credentialId = null
    },
    isNumericParameter(parameter) {
      return ['integer', 'number', 'float'].includes(String(parameter?.type || '').toLowerCase())
    },
    parameterLabel(parameter) {
      return parameter?.label || String(parameter?.name || '').replace(/_/g, ' ')
    },
    parameterDescription(parameter) {
      return parameter?.description || ''
    },
    formatRiskPercent(value) {
      const ratio = Math.max(0, Number(value) || 0)
      return `${Number((ratio * 100).toFixed(2))}%`
    },
    hasNotificationTarget(channel) {
      if (channel === 'browser') return true
      const targetFields = {
        email: ['email'],
        telegram: ['telegram_chat_id'],
        phone: ['phone'],
        discord: ['discord_webhook'],
        webhook: ['webhook_url']
      }
      return (targetFields[channel] || []).some(field => String(this.notificationSettings?.[field] || '').trim())
    },
    applyNotificationChannelDefaults(channels) {
      const requested = Array.isArray(channels) ? channels : DEFAULT_NOTIFICATION_CHANNELS
      const available = [...new Set(requested.map(channel => String(channel || '').toLowerCase()))]
        .filter(channel => SUPPORTED_NOTIFICATION_CHANNELS.has(channel) && this.hasNotificationTarget(channel))
      this.notificationChannels = available.length ? available : [...DEFAULT_NOTIFICATION_CHANNELS]
    },
    openNotificationSettings() {
      this.$router.push('/profile/notification-settings')
    },
    openCredentialPicker() {
      if (!this.credentials.length) {
        showToast({ message: this.$t('script_strategy.no_compatible_credential'), type: 'fail' })
        this.$router.push('/profile/credentials/new')
        return
      }
      this.showCredentialPicker = true
    },
    onCredentialSelect(payload) {
      const selected = payload?.selectedOptions?.[0]
      if (selected) this.form.credentialId = selected.value
      this.showCredentialPicker = false
    },
    payload() {
      const targets = {
        email: this.notificationSettings.email || '',
        phone: this.notificationSettings.phone || '',
        telegram: this.notificationSettings.telegram_chat_id || '',
        telegram_bot_token: this.notificationSettings.telegram_bot_token || '',
        discord: this.notificationSettings.discord_webhook || '',
        webhook: this.notificationSettings.webhook_url || '',
        webhook_token: this.notificationSettings.webhook_token || ''
      }
      return {
        sourceId: this.sourceId,
        name: this.form.name || this.sourceName,
        initialCapital: Number(this.form.initialCapital) || 0,
        executionMode: this.form.executionMode,
        credentialId: this.form.executionMode === 'live' ? this.form.credentialId : null,
        leverageEnabled: Boolean(this.form.executionMode === 'live' && this.form.leverageEnabled && this.supportsLeverage),
        leverage: this.form.executionMode === 'live' && this.form.leverageEnabled
          ? Math.min(this.maxLeverage, Number(this.form.leverage) || 1)
          : 1,
        params: this.params,
        positionSide: this.requiresPositionSide ? this.form.positionSide : undefined,
        notificationChannels: [...this.activeNotificationChannels],
        notificationTargets: targets
      }
    },
    async submit() {
      if (!this.sourceId) {
        showToast({ message: this.$t('script_strategy.source_missing'), type: 'fail' })
        return
      }
      if (!this.activeNotificationChannels.length) {
        showToast({ message: this.$t('script_strategy.notification_channel_required'), type: 'fail' })
        return
      }
      if (this.form.executionMode === 'live' && !this.form.credentialId) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        return
      }
      if (!this.form.name.trim()) {
        showToast({ message: this.$t('script_strategy.name_required'), type: 'fail' })
        return
      }
      const initialCapital = Number(this.form.initialCapital)
      if (!Number.isFinite(initialCapital) || initialCapital < 10 || initialCapital > 1000000) {
        showToast({ message: this.$t('script_strategy.capital_required'), type: 'fail' })
        return
      }
      if (this.form.executionMode === 'live' && this.requiresPositionSide && !this.form.positionSide) {
        showToast({ message: this.$t('script_strategy.position_side_required'), type: 'fail' })
        return
      }
      this.submitting = true
      try {
        if (this.isEditMode) {
          await strategyApi.update(this.editId, this.payload())
          showToast({ message: this.$t('bot_create.update_success'), type: 'success' })
        } else {
          await strategyApi.create(this.payload())
          showToast({ message: this.$t('bot_create.create_success'), type: 'success' })
        }
        this.$router.replace('/trading')
      } catch (error) {
        showToast({
          message: error?.localizedMessage || error?.message || this.$t('bot_create.create_fail'),
          type: 'fail'
        })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100%; padding-bottom: 80px; color: var(--text); }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.source-card,
.warning-card,
.section {
  margin: 12px var(--page-gutter);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.source-card { display: flex; gap: 14px; padding: 16px; }
.source-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b6cff;
  background: rgba(124, 92, 255, 0.16);
  font-size: 22px;
}
.source-copy { flex: 1; min-width: 0; }
.source-label { color: var(--accent); font-size: 11px; font-weight: 800; margin-bottom: 4px; }
.source-title { color: var(--text); font-size: 17px; font-weight: 900; }
.source-copy p { color: var(--text-2); font-size: 12px; line-height: 1.55; margin: 6px 0 0; }
.warning-card { padding: 12px 14px; display: flex; align-items: center; gap: 8px; color: var(--down); }
.contract-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px var(--page-gutter);
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.contract-card div { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.contract-card span { color: var(--text-3); font-size: 11px; }
.contract-card strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.trigger-card {
  display: flex;
  gap: 11px;
  margin: 12px var(--page-gutter);
  padding: 13px;
  border: 1px solid rgba(45, 145, 255, 0.24);
  border-radius: var(--radius-lg);
  background: linear-gradient(145deg, rgba(45, 145, 255, 0.09), var(--bg-elevated) 66%);
}
.trigger-card-icon {
  display: flex;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #55a8ff;
  background: rgba(45, 145, 255, 0.12);
}
.trigger-card strong { display: block; color: var(--text); font-size: 13px; }
.trigger-card p { margin: 4px 0 8px; color: var(--text-3); font-size: 11px; line-height: 1.5; }
.trigger-card span { display: inline-block; margin: 0 5px 4px 0; padding: 3px 7px; border-radius: 999px; color: #7bbdff; background: rgba(45, 145, 255, 0.1); font-size: 10px; }
.risk-summary-card {
  margin: 12px var(--page-gutter);
  padding: 14px;
  border: 1px solid rgba(246, 187, 35, 0.28);
  border-radius: var(--radius-lg);
  background: linear-gradient(145deg, rgba(246, 187, 35, 0.08), var(--bg-elevated) 62%);
}
.risk-summary-title { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 14px; font-weight: 850; }
.risk-summary-title :deep(.van-icon) { color: var(--accent); font-size: 17px; }
.risk-summary-title em {
  margin-left: auto;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(246, 187, 35, 0.12);
  font-size: 10px;
  font-style: normal;
}
.risk-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.risk-summary-grid > div { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.025); }
.risk-summary-grid span { color: var(--text-3); font-size: 11px; }
.risk-summary-grid strong { color: var(--text); font-size: 12px; line-height: 1.4; }
.risk-summary-wide { grid-column: 1 / -1; }
.risk-summary-card p { margin: 10px 2px 0; color: var(--text-3); font-size: 11px; line-height: 1.55; }
.section { padding: 14px 0 4px; }
.section-title { padding: 0 16px 12px; color: var(--text); font-weight: 800; }
:deep(.van-cell-group--inset) { margin: 0; background: transparent; }
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-field__control),
:deep(.van-cell__value) { color: var(--text); }
:deep(.van-field__label) { width: 112px; flex: 0 0 112px; color: var(--text-2); }
:deep(.van-field__body) { min-width: 0; }
:deep(.van-field__control) { min-width: 0; text-align: right; }
:deep(.van-radio-group--horizontal) { justify-content: flex-end; row-gap: 8px; }
.capital-hint { padding-top: 2px; }
.field-hint { padding: 0 16px 12px; color: var(--text-3); font-size: 12px; line-height: 1.5; }
.notification-config { margin: 0 12px 12px; padding: 13px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255, 255, 255, 0.018); }
.notification-config-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.notification-config-head > div { display: flex; align-items: center; gap: 7px; }
.notification-config-head strong { color: var(--text); font-size: 13px; }
.notification-config-head span { padding: 2px 6px; border-radius: 999px; color: var(--accent); background: rgba(246, 187, 35, 0.12); font-size: 10px; }
.notification-config-head button { display: inline-flex; align-items: center; gap: 3px; padding: 0; border: 0; color: var(--accent); background: transparent; font-size: 11px; }
.notification-config > p { margin: 7px 0 11px; color: var(--text-3); font-size: 11px; line-height: 1.5; }
.notification-channel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.notification-channel-grid :deep(.van-checkbox) { min-width: 0; padding: 9px; border: 1px solid var(--border); border-radius: 11px; }
.notification-channel-grid :deep(.notification-channel--selected) { border-color: rgba(246, 187, 35, 0.42); background: rgba(246, 187, 35, 0.06); }
.notification-channel-grid :deep(.van-checkbox__label) { min-width: 0; margin-left: 7px; }
.notification-channel-option { display: flex; min-width: 0; align-items: center; gap: 7px; }
.notification-channel-option > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.notification-channel-option strong { overflow: hidden; color: var(--text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.notification-channel-option small { color: var(--text-3); font-size: 9px; white-space: nowrap; }
.notification-channel-icon { display: inline-flex; flex: 0 0 24px; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 8px; background: var(--c-slate-soft); color: var(--c-slate); }
.notification-channel-icon.browser { background: var(--c-indigo-soft); color: var(--c-indigo); }
.notification-channel-icon.email { background: var(--c-violet-soft); color: var(--c-violet); }
.notification-channel-icon.telegram { background: var(--c-blue-soft); color: var(--c-blue); }
.notification-channel-icon.phone { background: var(--c-green-soft); color: var(--c-green); }
.notification-channel-icon.discord { background: var(--c-indigo-soft); color: var(--c-indigo); }
.notification-channel-icon.webhook { background: var(--c-orange-soft); color: var(--c-orange); }
.notification-channel-error { display: flex; align-items: center; gap: 5px; margin-top: 10px; color: var(--down); font-size: 11px; }
.loading { margin-top: 80px; color: var(--text-2); }
.submit-wrap { padding: 16px var(--page-gutter); }
</style>
