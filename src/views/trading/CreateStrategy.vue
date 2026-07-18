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
          />
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
          <van-cell
            v-if="form.executionMode === 'live'"
            :title="$t('bot_create.exchange_account')"
            :value="credentialLabel"
            is-link
            @click="openCredentialPicker"
          />
          <van-cell :title="$t('bot_create.leverage')">
            <template #right-icon>
              <van-switch v-model="form.leverageEnabled" size="22" :disabled="!supportsLeverage" />
            </template>
          </van-cell>
          <div v-if="!supportsLeverage" class="field-hint">{{ $t('script_strategy.leverage_unavailable') }}</div>
          <van-field
            v-if="form.leverageEnabled"
            v-model.number="form.leverage"
            type="number"
            :label="$t('bot_create.leverage')"
            :placeholder="$t('script_strategy.max_leverage', { value: maxLeverage })"
          />
          <van-cell v-if="requiresPositionSide" :title="$t('script_strategy.position_side')">
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
          :disabled="!sourceId || contractError"
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
const DEFAULT_NOTIFICATION_CHANNELS = ['browser', 'email']

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
      return this.source?.description || this.$t('script_strategy.desc')
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
        if (Array.isArray(this.notificationSettings.default_channels) && this.notificationSettings.default_channels.length) {
          this.notificationChannels = [...this.notificationSettings.default_channels]
        }
      } catch {
        this.notificationSettings = {}
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
      if (Array.isArray(channels) && channels.length) this.notificationChannels = [...channels]
      if (this.sourceId) await this.loadSource(this.sourceId)
    },
    async loadSourceFromRoute() {
      const id = Number(this.$route.query?.source_id) || null
      if (id) {
        await this.loadSource(id)
      } else if (this.$route.query?.prompt) {
        await this.generateSourceFromPrompt(String(this.$route.query.prompt))
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
    async generateSourceFromPrompt(prompt) {
      const generated = await strategyApi.generate({ prompt })
      const code = String(generated?.data?.code || '').trim()
      if (!code) throw new Error(this.$t('script_strategy.ai_generate_failed'))
      const symbol = String(this.$route.query?.symbol || '').trim()
      const created = await scriptSourceApi.create({
        name: this.$t('script_strategy.ai_generated_name', { symbol: symbol || this.$t('script_strategy.untitled') }),
        description: this.$t('script_strategy.ai_generated_desc'),
        code,
        metadata: { generated_by: 'mobile_ai_analysis' }
      })
      const id = Number(created?.data?.id)
      if (!id) throw new Error(this.$t('script_strategy.ai_generate_failed'))
      await this.loadSource(id)
      showToast({ message: this.$t('script_strategy.ai_generate_success'), type: 'success' })
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
        leverageEnabled: Boolean(this.form.leverageEnabled && this.supportsLeverage),
        leverage: this.form.leverageEnabled ? Math.min(this.maxLeverage, Number(this.form.leverage) || 1) : 1,
        params: this.params,
        positionSide: this.requiresPositionSide ? this.form.positionSide : undefined,
        notificationChannels: [...this.notificationChannels],
        notificationTargets: targets
      }
    },
    async submit() {
      if (!this.sourceId) {
        showToast({ message: this.$t('script_strategy.source_missing'), type: 'fail' })
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
      if (!(Number(this.form.initialCapital) > 0)) {
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
  margin: 12px 16px;
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
  margin: 12px 16px;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.contract-card div { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.contract-card span { color: var(--text-3); font-size: 11px; }
.contract-card strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.section { padding: 14px 0 4px; }
.section-title { padding: 0 16px 12px; color: var(--text); font-weight: 800; }
:deep(.van-cell-group--inset) { margin: 0; background: transparent; }
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-field__control),
:deep(.van-cell__value) { color: var(--text); }
.field-hint { padding: 0 16px 12px; color: var(--text-3); font-size: 12px; line-height: 1.5; }
.loading { margin-top: 80px; color: var(--text-2); }
.submit-wrap { padding: 16px; }
</style>
