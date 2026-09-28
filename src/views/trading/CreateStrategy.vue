<template>
  <div class="page">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="pageTitle" left-arrow @click-left="$router.back()" />

    <section v-if="!isEditMode" :class="['source-card', 'source-selector', { empty: !sourceId }]">
      <template v-if="sourceId">
        <div :class="['source-icon', isPortfolioSource(source) ? 'portfolio' : 'script']"><van-icon :name="isPortfolioSource(source) ? 'cluster-o' : 'description'" /></div>
        <div class="source-copy">
          <div class="source-label">{{ $t('script_strategy.source_label') }}</div>
          <div class="source-title">{{ sourceName }}</div>
          <p>{{ sourceDescription }}</p>
        </div>
        <button type="button" class="source-change-action" @click="showSourcePicker = true">
          {{ $t('script_strategy.source_change_action') }}
          <van-icon name="arrow" />
        </button>
      </template>
      <template v-else>
        <div class="source-empty-icon"><van-icon name="description" /></div>
        <div class="source-empty-copy">
          <div class="source-label">{{ $t('script_strategy.source_label') }}</div>
          <div class="source-title">{{ $t('script_strategy.source_empty_title') }}</div>
          <p>{{ sourceDescription }}</p>
        </div>
        <button type="button" class="source-primary-action" @click="showSourcePicker = true">
          {{ $t('script_strategy.source_choose_action') }}
          <van-icon name="arrow" />
        </button>
        <button type="button" class="source-market-action" @click="goToStrategyMarket">
          {{ $t('trading.create_market_cta') }}
        </button>
      </template>
    </section>
    <div v-else class="source-card">
      <div :class="['source-icon', isPortfolioSource(source) ? 'portfolio' : 'script']"><van-icon :name="isPortfolioSource(source) ? 'cluster-o' : 'description'" /></div>
      <div class="source-copy">
        <div class="source-label">{{ $t('bot_create.edit_banner') }}</div>
        <div class="source-title">{{ sourceName }}</div>
        <p>{{ sourceDescription }}</p>
      </div>
    </div>

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else>
      <div v-if="sourceChanged" class="warning-card source-change"><p>{{ sourceChangeDescription }}</p><van-checkbox v-model="sourceChangeAccepted">{{ $t('audit.acceptSourceChange') }}</van-checkbox></div>
      <div v-if="requiresBacktest" class="warning-card backtest-required-card">
        <van-icon name="shield-o" />
        <span>{{ $t('market.adaptation_backtest_required') }}</span>
      </div>
      <div v-if="sourceId && contractError" class="warning-card">
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
            <strong v-else>{{ $t('profile.disabled') }}</strong>
          </div>
        </div>
        <p>{{ $t('script_strategy.equity_risk_hint') }}</p>
      </div>

      <template v-if="sourceId && !contractError">
      <div v-if="parameterDefinitions.length" class="section">
        <div class="section-heading">
          <span class="section-index">1</span>
          <div><strong>{{ $t('script_strategy.parameters') }}</strong><small>{{ $t('script_strategy.parameters_hint') }}</small></div>
        </div>
        <van-cell-group inset>
          <template v-for="parameter in parameterDefinitions" :key="parameter.name">
            <van-cell v-if="parameter.type === 'boolean'" :title="parameterLabel(parameter)">
              <template #right-icon>
                <van-switch v-model="params[parameter.name]" size="22" />
              </template>
            </van-cell>
            <div v-else-if="parameterOptions(parameter).length" class="parameter-choice">
              <strong>{{ parameterLabel(parameter) }}</strong>
              <van-radio-group v-model="params[parameter.name]" direction="horizontal">
                <van-radio v-for="option in parameterOptions(parameter)" :key="String(option.value)" :name="option.value">
                  {{ parameterOptionLabel(parameter, option) }}
                </van-radio>
              </van-radio-group>
              <small v-if="parameterDescription(parameter)">{{ parameterDescription(parameter) }}</small>
            </div>
            <van-field
              v-else-if="isNumericParameter(parameter)"
              :model-value="parameterInputValue(parameter)"
              type="number"
              :label="parameterLabel(parameter)"
              :placeholder="parameterDescription(parameter)"
              :min="parameterInputLimit(parameter, 'min')"
              :max="parameterInputLimit(parameter, 'max')"
              :step="parameterInputStep(parameter)"
              @update:model-value="setNumericParameter(parameter, $event)"
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
        <div class="section-heading">
          <span class="section-index">{{ parameterDefinitions.length ? 2 : 1 }}</span>
          <div><strong>{{ $t('bot_create.base_config') }}</strong><small>{{ $t('script_strategy.runtime_hint') }}</small></div>
        </div>
        <van-cell-group inset>
          <van-field
            v-model="form.name"
            :label="$t('bot_create.bot_name')"
            :placeholder="$t('bot_create.bot_name_placeholder')"
          />
          <van-field
            v-model.number="form.initialCapital"
            type="number"
            :label="capitalLabel"
            :placeholder="$t('script_strategy.capital_placeholder')"
          />
          <div class="field-hint capital-hint">
            {{ capitalHint }}
          </div>
        </van-cell-group>
      </div>

      <div class="section">
        <div class="section-heading">
          <span class="section-index">{{ parameterDefinitions.length ? 3 : 2 }}</span>
          <div><strong>{{ $t('indicator_bot.execution_mode') }}</strong><small>{{ executionModeHint }}</small></div>
        </div>
        <div class="execution-mode-grid">
          <button type="button" :class="{ active: form.executionMode === 'live', disabled: !supportsLive }" :disabled="!supportsLive" @click="form.executionMode = 'live'">
            <van-icon name="fire-o" />
            <span><strong>{{ $t('indicator_bot.execution_mode_live') }}</strong><small>{{ $t('script_strategy.execution_live_hint') }}</small></span>
            <van-icon v-if="form.executionMode === 'live'" name="success" />
          </button>
          <button type="button" :class="{ active: form.executionMode === 'signal' }" @click="form.executionMode = 'signal'">
            <van-icon name="bell" />
            <span><strong>{{ $t('indicator_bot.execution_mode_signal') }}</strong><small>{{ $t('script_strategy.execution_signal_hint') }}</small></span>
            <van-icon v-if="form.executionMode === 'signal'" name="success" />
          </button>
        </div>

        <div v-if="form.executionMode === 'live'" class="live-config">
          <label class="live-disclaimer" :class="{ accepted: form.disclaimer }">
            <van-icon name="shield-o" />
            <span><strong>{{ $t('script_strategy.live_disclaimer_title') }}</strong><small>{{ $t('script_strategy.live_disclaimer_content') }}</small></span>
            <van-checkbox v-model="form.disclaimer" shape="square">{{ $t('script_strategy.live_disclaimer_agree') }}</van-checkbox>
          </label>
          <van-cell
            :title="$t('bot_create.exchange_account')"
            :value="credentialLabel"
            is-link
            @click="openCredentialPicker"
          />
          <div v-if="!credentials.length" class="field-hint field-hint--warning">{{ $t('script_strategy.no_compatible_credential') }}</div>
          <div v-if="supportsLeverage" class="leverage-config">
            <div><strong>{{ $t('script_strategy.leverage_title') }}</strong><small>{{ $t('script_strategy.leverage_auto_hint', { value: maxLeverage }) }}</small></div>
            <van-stepper v-model="form.leverage" integer :min="1" :max="maxLeverage" />
          </div>
          <div v-else class="field-hint">{{ $t('script_strategy.leverage_unavailable') }}</div>
          <div v-if="requiresDirectionMode" class="direction-config">
            <div class="direction-config-head">
              <strong>{{ $t('script_strategy.direction_mode') }}</strong>
              <span v-if="manifestDirectionMode" class="direction-mode-badge">
                {{ directionModeLabel(manifestDirectionMode) }}
              </span>
              <span v-else class="required-badge">{{ $t('script_strategy.required') }}</span>
            </div>
            <template v-if="manifestDirectionMode">
              <p>{{ $t('script_strategy.direction_detected_hint') }}</p>
            </template>
            <template v-else>
              <van-radio-group v-model="form.directionMode" class="direction-mode-grid">
                <van-radio name="long_only">{{ $t('script_strategy.direction_long_only') }}</van-radio>
                <van-radio name="short_only">{{ $t('script_strategy.direction_short_only') }}</van-radio>
                <van-radio name="one_way">{{ $t('script_strategy.direction_one_way') }}</van-radio>
                <van-radio name="both">{{ $t('script_strategy.direction_both') }}</van-radio>
                <van-radio name="neutral">{{ $t('script_strategy.direction_neutral') }}</van-radio>
              </van-radio-group>
              <p>{{ $t('script_strategy.direction_legacy_hint') }}</p>
            </template>
            <div v-if="requiresHedgeAccount" class="hedge-mode-warning">
              <van-icon name="warning-o" />
              <span>{{ hedgeModeHint }}</span>
            </div>
          </div>
          <div class="ai-filter-card" :class="{ disabled: !supportsAiDecisionFilter }">
            <van-icon name="shield-o" />
            <span><strong>{{ $t('script_strategy.ai_filter_title') }}</strong><small>{{ aiDecisionFilterHint }}</small></span>
            <van-switch v-model="form.aiDecisionFilter" size="22" :disabled="!supportsAiDecisionFilter" />
          </div>
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
    </template>

    <van-popup v-model:show="showCredentialPicker" position="bottom" round>
      <van-picker
        :columns="credentialColumns"
        @cancel="showCredentialPicker = false"
        @confirm="onCredentialSelect"
      />
    </van-popup>

    <van-popup v-model:show="showSourcePicker" position="bottom" round class="source-picker-popup">
      <div class="source-picker-head">
        <div>
          <strong>{{ $t('trading.create_choice_script_title') }}</strong>
          <small>{{ $t('trading.create_source_count', { count: sources.length }) }}</small>
        </div>
        <button type="button" :aria-label="$t('common.close')" @click="showSourcePicker = false">
          <van-icon name="cross" />
        </button>
      </div>
      <van-search
        v-model="sourceSearchText"
        shape="round"
        :placeholder="$t('trading.create_source_search')"
      />
      <div class="source-picker-filters" role="tablist" :aria-label="$t('trading.create_source_filter')">
        <button
          v-for="filter in sourceFilters"
          :key="filter.value"
          type="button"
          role="tab"
          :aria-selected="sourceType === filter.value"
          :class="{ active: sourceType === filter.value }"
          @click="sourceType = filter.value"
        >{{ filter.label }}</button>
      </div>
      <van-loading v-if="loadingSources" class="source-picker-loading" vertical>{{ $t('common.loading') }}</van-loading>
      <div v-else-if="filteredSources.length" class="source-picker-list">
        <button
          v-for="item in filteredSources"
          :key="item.id"
          type="button"
          :class="['source-picker-item', { active: Number(item.id) === Number(sourceId) }]"
          @click="selectSource(item)"
        >
          <span :class="['source-picker-icon', isPortfolioSource(item) ? 'portfolio' : 'script']">
            <van-icon :name="isPortfolioSource(item) ? 'cluster-o' : 'description'" />
          </span>
          <span class="source-picker-copy">
            <span class="source-picker-title">
              <strong>{{ sourceItemName(item) }}</strong>
              <small v-if="isRecentSource(item)">{{ $t('trading.recently_used') }}</small>
              <small>{{ sourceItemTypeLabel(item) }}</small>
            </span>
            <span>{{ sourceItemDescription(item) }}</span>
          </span>
          <van-icon :name="Number(item.id) === Number(sourceId) ? 'success' : 'arrow'" class="source-picker-state" />
        </button>
      </div>
      <van-empty v-else :description="sourcePickerEmptyDescription">
        <van-button round type="primary" size="small" @click="goToStrategyMarket">
          {{ $t('trading.create_market_cta') }}
        </van-button>
      </van-empty>
    </van-popup>
  </div>
</template>

<script>
import { contractChanged } from '@/utils/strategyDisplay'
import { showToast } from 'vant'
import { credentialsApi, scriptSourceApi, strategyApi, userApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { ASSET_TYPES } from '@/utils/marketRoutes'

const LIVE_CRYPTO_EXCHANGES = new Set(['binance', 'okx', 'bitget', 'bybit', 'gate', 'htx'])
const DEFAULT_NOTIFICATION_CHANNELS = ['browser', 'email']
const SUPPORTED_NOTIFICATION_CHANNELS = new Set(['browser', 'email', 'telegram', 'phone', 'discord', 'webhook'])
const DIRECTION_MODES = new Set(['long_only', 'short_only', 'one_way', 'both', 'neutral'])
const AI_FILTER_UNSUPPORTED_AUTOMATIONS = new Set(['grid', 'dca', 'martingale', 'layered_martingale'])
const DIRECTION_MODE_ALIASES = {
  long: 'long_only',
  longonly: 'long_only',
  short: 'short_only',
  shortonly: 'short_only',
  net: 'one_way',
  oneway: 'one_way',
  net_position: 'one_way',
  single_position: 'one_way',
  dual: 'both',
  hedged: 'both',
  bidirectional: 'both',
  two_way: 'both'
}

const normalizeAutomationType = (value) => String(value || '').trim().toLowerCase().replace(/-/g, '_')

const sourceUsesUnsupportedAutomation = (source = {}, manifest = {}) => {
  const sourceMetadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {}
  const candidates = [
    manifest.bot_type,
    manifest.executor_type,
    manifestMetadata.bot_type,
    manifestMetadata.executor_type,
    manifestMetadata.strategy_family,
    source.bot_type,
    source.executor_type,
    sourceMetadata.bot_type,
    sourceMetadata.executor_type,
    sourceMetadata.strategy_family
  ].map(normalizeAutomationType)
  if (candidates.some(value => AI_FILTER_UNSUPPORTED_AUTOMATIONS.has(value))) return true
  const template = normalizeAutomationType(source.template_key || sourceMetadata.template_key)
  return [...AI_FILTER_UNSUPPORTED_AUTOMATIONS].some(value => template.includes(value))
}

const normalizeDirectionMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_')
  const result = DIRECTION_MODE_ALIASES[normalized] || normalized
  return DIRECTION_MODES.has(result) ? result : ''
}

const directionModePositionSide = (value) => {
  const mode = normalizeDirectionMode(value)
  if (mode === 'long_only') return 'long'
  if (mode === 'short_only') return 'short'
  if (mode === 'both' || mode === 'neutral') return 'neutral'
  return ''
}

export default {
  name: 'CreateStrategy',
  data() {
    return {
      loading: false,
      submitting: false,
      editId: null,
      sourceId: null,
      source: null,
      sources: [],
      sourceSearchText: '',
      sourceType: 'all',
      recentSourceIds: [],
      manifest: {},
      deployedContext: null,
      sourceChangeAccepted: false,
      contractError: false,
      params: {},
      notificationSettings: {},
      notificationChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
      form: {
        name: '',
        initialCapital: 1000,
        executionMode: 'live',
        credentialId: null,
        leverageEnabled: false,
        leverage: 1,
        directionMode: '',
        disclaimer: false,
        aiDecisionFilter: false
      },
      showCredentialPicker: false,
      showSourcePicker: false,
      loadingSources: false
    }
  },
  computed: {
    pageTitle() {
      return this.$t(this.isEditMode ? 'script_strategy.edit_title' : 'script_strategy.create_title')
    },
    requiresBacktest() {
      return String(this.$route.query?.requires_backtest || '') === '1'
    },
    credentialsStore() { return useCredentialsStore() },
    credentials() {
      return this.credentialsStore.items.filter(item => {
        const exchange = String(item.exchange_id || '').toLowerCase()
        if (this.marketCategory === 'Crypto') return LIVE_CRYPTO_EXCHANGES.has(exchange)
        if (this.marketCategory === 'USStock') return ['alpaca', 'ibkr'].includes(exchange)
        return false
      })
    },
    isEditMode() { return Boolean(this.editId || Number(this.$route.query?.edit) > 0) },
    sourceName() {
      if (!this.sourceId && !this.isEditMode) return this.$t('trading.create_choice_script_title')
      return this.source?.name || this.form.name || this.$route.query?.name || this.$t('script_strategy.untitled')
    },
    sourceDescription() {
      if (!this.sourceId && !this.isEditMode) return this.$t('script_strategy.source_select_hint')
      const description = String(this.source?.description || '').trim()
      if (!description || /strategy api|script source|visual builder|robot generated/i.test(description)) {
        return this.$t('script_strategy.customer_desc')
      }
      return description
    },
    sourceFilters() {
      return [
        { value: 'all', label: this.$t('common.all') },
        { value: 'script', label: this.$t('script_strategy.type_cta') },
        { value: 'portfolio_strategy', label: this.$t('script_strategy.type_portfolio') }
      ]
    },
    filteredSources() {
      const keyword = this.sourceSearchText.trim().toLowerCase()
      return [...this.sources]
        .filter((item) => {
          const type = String(item.asset_type || 'script').toLowerCase()
          const hitType = this.sourceType === 'all' || type === this.sourceType
          const hitKeyword = !keyword || `${this.sourceItemName(item)} ${this.sourceItemDescription(item)}`
            .toLowerCase()
            .includes(keyword)
          return hitType && hitKeyword
        })
        .sort((a, b) => this.recentSourceRank(a) - this.recentSourceRank(b))
    },
    sourcePickerEmptyDescription() {
      return this.sourceSearchText || this.sourceType !== 'all'
        ? this.$t('trading.create_source_filter_empty')
        : this.$t('trading.create_source_empty')
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
    capitalCurrency() {
      const currencies = new Set(this.instruments.map(item => {
        if (item.market === 'USStock') return 'USD'
        const symbol = String(item.symbol || '').toUpperCase()
        return symbol.includes('/') ? symbol.split('/').pop() : ''
      }).filter(Boolean))
      return currencies.size === 1 ? [...currencies][0] : ''
    },
    capitalLabel() {
      return this.$t(this.supportsLeverage ? 'script_strategy.initial_margin' : 'script_strategy.initial_capital')
    },
    capitalHint() {
      if (this.supportsLeverage) {
        const notional = (Number(this.form.initialCapital) || 0) * (Number(this.form.leverage) || 1)
        return this.$t('script_strategy.margin_capacity_hint', {
          currency: this.capitalCurrency || 'USDT',
          leverage: Number(this.form.leverage) || 1,
          notional: notional.toLocaleString(undefined, { maximumFractionDigits: 2 })
        })
      }
      return this.$t('script_strategy.capital_currency_hint', { currency: this.capitalCurrency || '-' })
    },
    requiresDirectionMode() {
      return this.marketCategory === 'Crypto' && this.instruments.length > 0 && this.instruments.every(item => (
        String(item.market_type || '').toLowerCase() === 'swap'
      ))
    },
    manifestDirectionMode() {
      const metadata = this.parseObject(this.manifest?.metadata)
      return normalizeDirectionMode(
        this.manifest?.directionMode
        || this.manifest?.direction_mode
        || metadata.direction_mode
        || metadata.directionMode
        || metadata.trade_direction
        || metadata.position_side
        || metadata.side
      )
    },
    effectiveDirectionMode() {
      return this.manifestDirectionMode || normalizeDirectionMode(this.form.directionMode)
    },
    selectedCredentialExchange() {
      return String(this.credentials.find(item => item.id === this.form.credentialId)?.exchange_id || '').toLowerCase()
    },
    requiresHedgeAccount() {
      return this.requiresDirectionMode && ['both', 'neutral'].includes(this.effectiveDirectionMode)
    },
    hedgeModeHint() {
      const exchange = this.selectedCredentialExchange
      if (exchange === 'okx') return this.$t('script_strategy.hedge_mode_hint_okx')
      return this.$t('script_strategy.hedge_mode_hint')
    },
    executionModeHint() {
      if (!this.supportsLive) return this.$t('script_strategy.live_unavailable')
      return this.form.executionMode === 'live'
        ? this.$t('indicator_bot.execution_mode_live_desc')
        : this.$t('indicator_bot.execution_mode_signal_desc')
    },
    supportsAiDecisionFilter() {
      return !sourceUsesUnsupportedAutomation(
        { ...this.source, metadata: this.parseObject(this.source?.metadata) },
        { ...this.manifest, metadata: this.parseObject(this.manifest?.metadata) }
      )
    },
    aiDecisionFilterHint() {
      return this.$t(this.supportsAiDecisionFilter
        ? 'script_strategy.ai_filter_hint'
        : 'script_strategy.ai_filter_unsupported')
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
      const item = this.credentials.find(row => String(row.id) === String(this.form.credentialId))
      return item
        ? `${item.name || item.exchange_id} (${String(item.exchange_id || '').toUpperCase()})`
        : this.$t('bot_create.exchange_account_placeholder')
    },
    currentContext() { return {symbol:this.instruments.map(item=>item.symbol).filter(Boolean).join(', '),timeframe:this.manifestFrequency,marketType:this.instruments[0]?.market_type} },
    sourceChanged() { return contractChanged(this.deployedContext,this.currentContext) },
    sourceChangeDescription() { const format=context=>[context?.symbol,context?.timeframe,context?.marketType].filter(Boolean).join(' · ');return this.$t('audit.sourceChanged',{before:format(this.deployedContext),after:format(this.currentContext)}) },
    formValid() {
      if (this.sourceChanged && !this.sourceChangeAccepted) return false
      if (!this.sourceId || this.contractError || !this.form.name.trim()) return false
      const initialCapital = Number(this.form.initialCapital)
      if (!Number.isFinite(initialCapital) || initialCapital < 1 || initialCapital > 1000000000) return false
      if (!this.activeNotificationChannels.length) return false
      if (this.form.executionMode !== 'live') return true
      if (!this.form.disclaimer) return false
      if (!this.form.credentialId) return false
      if (this.requiresDirectionMode && !this.effectiveDirectionMode) return false
      return true
    }
  },
  async mounted() {
    this.loading = true
    try {
      this.loadRecentSources()
      const editing = Number(this.$route.query?.edit) > 0
      await Promise.all([
        this.loadCredentials(),
        this.loadNotificationSettings(),
        editing ? Promise.resolve() : this.loadSources()
      ])
      await this.loadEdit()
      if (!this.isEditMode) await this.loadSourceFromRoute()
    } finally {
      this.loading = false
    }
  },
  methods: {
    async loadSources() {
      if (this.loadingSources) return
      this.loadingSources = true
      try {
        const response = await scriptSourceApi.getList()
        this.sources = (Array.isArray(response?.data) ? response.data : [])
          .filter(item => item?.id && ['script', 'portfolio_strategy'].includes(String(item.asset_type || 'script').toLowerCase()))
      } catch {
        this.sources = []
        showToast({ message: this.$t('trading.create_source_load_failed'), type: 'fail' })
      } finally {
        this.loadingSources = false
      }
    },
    async selectSource(item) {
      const id = Number(item?.id)
      if (!id || id === Number(this.sourceId)) {
        this.showSourcePicker = false
        return
      }
      const previousName = String(this.source?.name || '').trim()
      const keepsCustomName = Boolean(this.form.name.trim() && this.form.name.trim() !== previousName)
      this.params = {}
      this.source = null
      this.manifest = {}
      this.sourceId = id
      if (!keepsCustomName) this.form.name = ''
      this.showSourcePicker = false
      this.loading = true
      try {
        await this.loadSource(id)
        this.rememberSource(id)
        await this.$router.replace({
          path: '/trading/create',
          query: { source_id: String(id), name: this.sourceItemName(item) }
        })
      } catch {
        showToast({ message: this.$t('script_strategy.contract_error'), type: 'fail' })
      } finally {
        this.loading = false
      }
    },
    isPortfolioSource(item) {
      return String(item?.asset_type || '').toLowerCase() === 'portfolio_strategy'
    },
    sourceItemName(item) {
      return item?.name || item?.strategy_name || this.$t('script_strategy.untitled')
    },
    sourceItemDescription(item) {
      const description = String(item?.description || '').trim()
      if (!description || /strategy api|script source|cta strategy|visual builder|robot generated/i.test(description)) {
        return this.$t('script_strategy.customer_desc')
      }
      return description
    },
    sourceItemTypeLabel(item) {
      return this.$t(this.isPortfolioSource(item) ? 'script_strategy.type_portfolio' : 'script_strategy.type_cta')
    },
    loadRecentSources() {
      try {
        const parsed = JSON.parse(localStorage.getItem('recent_strategy_sources') || '[]')
        this.recentSourceIds = Array.isArray(parsed) ? parsed.map(Number).filter(Boolean).slice(0, 5) : []
      } catch {
        this.recentSourceIds = []
      }
    },
    rememberSource(id) {
      const value = Number(id)
      this.recentSourceIds = [value, ...this.recentSourceIds.filter(item => item !== value)].slice(0, 5)
      localStorage.setItem('recent_strategy_sources', JSON.stringify(this.recentSourceIds))
    },
    isRecentSource(item) {
      return this.recentSourceIds.includes(Number(item?.id))
    },
    recentSourceRank(item) {
      const index = this.recentSourceIds.indexOf(Number(item?.id))
      return index < 0 ? Number.MAX_SAFE_INTEGER : index
    },
    goToStrategyMarket() {
      this.showSourcePicker = false
      this.$router.push({ path: '/market/all', query: { asset_type: ASSET_TYPES.SCRIPT_TEMPLATE } })
    },
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
      this.deployedContext = {symbol:deployment.symbol,timeframe:deployment.timeframe,marketType:deployment.market_type || config.market_type}
      this.editId = id
      this.sourceId = Number(config.script_source_id) || null
      this.params = { ...(config.params || {}) }
      this.form.name = deployment.strategy_name || ''
      this.form.initialCapital = Number(config.initial_capital || deployment.initial_capital) || 1000
      this.form.executionMode = deployment.execution_mode === 'live' ? 'live' : 'signal'
      this.form.credentialId = config.credential_id || exchange.credential_id || null
      this.form.leverageEnabled = Boolean(config.leverage_enabled)
      this.form.leverage = Number(config.leverage || deployment.leverage) || 1
      this.form.directionMode = normalizeDirectionMode(config.direction_mode || config.position_side)
      this.form.disclaimer = deployment.execution_mode === 'live'
      this.form.aiDecisionFilter = Boolean(config.ai_decision_filter)
      const channels = deployment.notification_config?.channels
      if (Array.isArray(channels)) this.applyNotificationChannelDefaults(channels)
      if (this.sourceId) await this.loadSource(this.sourceId)
    },
    async loadSourceFromRoute() {
      const id = Number(this.$route.query?.source_id) || null
      if (id) {
        await this.loadSource(id)
        this.rememberSource(id)
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
    directionModeLabel(mode) {
      const normalized = normalizeDirectionMode(mode)
      const key = {
        long_only: 'direction_long_only',
        short_only: 'direction_short_only',
        one_way: 'direction_one_way',
        both: 'direction_both',
        neutral: 'direction_neutral'
      }[normalized]
      return key ? this.$t(`script_strategy.${key}`) : '-'
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
        this.form.disclaimer = false
      }
      if (!this.supportsLeverage) {
        this.form.leverageEnabled = false
        this.form.leverage = 1
      } else {
        this.form.leverageEnabled = true
        this.form.leverage = Math.min(this.maxLeverage, Math.max(1, Number(this.form.leverage) || 1))
      }
      if (!this.supportsAiDecisionFilter) this.form.aiDecisionFilter = false
      if (!this.requiresDirectionMode) this.form.directionMode = ''
      if (!this.credentials.some(item => String(item.id) === String(this.form.credentialId))) this.form.credentialId = null
    },
    isNumericParameter(parameter) {
      return ['integer', 'number', 'float', 'percent'].includes(String(parameter?.type || '').toLowerCase())
    },
    parameterInputValue(parameter) {
      const value = this.params[parameter?.name]
      if (String(parameter?.type || '').toLowerCase() !== 'percent') return value
      const numeric = Number(value)
      return Number.isFinite(numeric) ? Number((numeric * 100).toFixed(6)) : value
    },
    setNumericParameter(parameter, value) {
      if (value === '' || value == null) {
        this.params[parameter.name] = value
        return
      }
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return
      const type = String(parameter?.type || '').toLowerCase()
      this.params[parameter.name] = type === 'percent' ? numeric / 100 : (type === 'integer' ? Math.round(numeric) : numeric)
    },
    parameterInputLimit(parameter, key) {
      const value = Number(parameter?.[key])
      if (!Number.isFinite(value)) return undefined
      return String(parameter?.type || '').toLowerCase() === 'percent' ? value * 100 : value
    },
    parameterInputStep(parameter) {
      const type = String(parameter?.type || '').toLowerCase()
      const value = Number(parameter?.step)
      if (Number.isFinite(value) && value > 0) return type === 'percent' ? value * 100 : value
      return type === 'integer' ? 1 : 0.01
    },
    parameterLabel(parameter) {
      if (parameter?.label_key && this.$te(parameter.label_key)) return this.$t(parameter.label_key)
      if (this.$te('audit.params.' + parameter?.name)) return this.$t('audit.params.' + parameter.name)
      return parameter?.label || String(parameter?.name || '').replace(/_/g, ' ')
    },
    parameterDescription(parameter) {
      const keyed = parameter?.descriptionKey || parameter?.description_key
      if (keyed && this.$te(keyed)) return this.$t(keyed)
      const standard = `strategyBuilder.params.${parameter?.name}.description`
      if (this.$te(standard)) return this.$t(standard)
      return String(this.$i18n?.locale || '').toLowerCase().startsWith('en') ? (parameter?.description || '') : ''
    },
    parameterOptions(parameter) {
      if (Array.isArray(parameter?.options)) {
        return parameter.options.map(option => option && typeof option === 'object' ? option : { value: option, label: option })
      }
      if (Array.isArray(parameter?.values)) return parameter.values.map(value => ({ value, label: value }))
      return []
    },
    parameterOptionLabel(parameter, option) {
      const value = option && typeof option === 'object' ? option.value : option
      const labelKey = option && typeof option === 'object' ? (option.labelKey || option.label_key) : ''
      if (labelKey && this.$te(labelKey)) return this.$t(labelKey)
      const standard = `strategyBuilder.params.${parameter?.name}.options.${value}`
      if (this.$te(standard)) return this.$t(standard)
      return option && typeof option === 'object' ? (option.label || value) : value
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
      this.notificationChannels = available.length ? available : ['browser']
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
        credentialId: this.form.executionMode === 'live' ? this.form.credentialId : undefined,
        leverageEnabled: Boolean(this.form.executionMode === 'live' && this.form.leverageEnabled && this.supportsLeverage),
        leverage: this.form.executionMode === 'live' && this.form.leverageEnabled
          ? Math.min(this.maxLeverage, Number(this.form.leverage) || 1)
          : 1,
        params: this.params,
        directionMode: this.requiresDirectionMode ? this.effectiveDirectionMode : undefined,
        positionSide: this.requiresDirectionMode ? directionModePositionSide(this.effectiveDirectionMode) : undefined,
        notificationChannels: [...this.activeNotificationChannels],
        notificationTargets: targets,
        aiDecisionFilter: Boolean(this.form.aiDecisionFilter && this.supportsAiDecisionFilter)
      }
    },
    async submit() {
      if (this.submitting || this.contractError || (this.sourceChanged && !this.sourceChangeAccepted)) return
      if (!this.sourceId) {
        showToast({ message: this.$t('script_strategy.source_missing'), type: 'fail' })
        return
      }
      if (!this.activeNotificationChannels.length) {
        showToast({ message: this.$t('script_strategy.notification_channel_required'), type: 'fail' })
        return
      }
      if (this.form.executionMode === 'live' && !this.form.disclaimer) {
        showToast({ message: this.$t('script_strategy.live_disclaimer_required'), type: 'fail' })
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
      if (!Number.isFinite(initialCapital) || initialCapital < 1 || initialCapital > 1000000000) {
        showToast({ message: this.$t('script_strategy.capital_required'), type: 'fail' })
        return
      }
      if (this.form.executionMode === 'live' && this.requiresDirectionMode && !this.effectiveDirectionMode) {
        showToast({ message: this.$t('script_strategy.direction_mode_required'), type: 'fail' })
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
.page { min-height: 100%; padding-bottom: 80px; color: var(--text); background: var(--bg); }
:deep(.van-nav-bar) { background: var(--bg); }
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
.source-card { display: flex; width: calc(100% - (var(--page-gutter) * 2)); align-items: center; gap: 14px; padding: 16px; color: inherit; text-align: left; }
.source-selector.empty { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px 14px; padding: 20px; }
.source-empty-icon { display: inline-flex; width: 50px; height: 50px; align-items: center; justify-content: center; border-radius: 15px; color: var(--accent); background: var(--accent-soft); font-size: 23px; }
.source-empty-copy { min-width: 0; }
.source-empty-copy p { margin: 6px 0 0; color: var(--text-2); font-size: 12px; line-height: 1.55; }
.source-primary-action { display: inline-flex; grid-column: 1 / -1; width: 100%; min-height: 46px; align-items: center; justify-content: center; gap: 7px; border: 0; border-radius: 13px; color: #16120a; background: var(--accent); font-size: 14px; font-weight: 900; }
.source-market-action { grid-column: 1 / -1; justify-self: center; padding: 3px 8px; border: 0; color: var(--text-2); background: transparent; font-size: 11px; }
.source-change-action { display: inline-flex; min-height: 36px; flex: 0 0 auto; align-items: center; gap: 5px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border)); border-radius: 10px; color: var(--accent); background: var(--accent-soft); font-size: 11px; font-weight: 800; }
.source-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.source-icon.script { color: #8b6cff; background: rgba(124, 92, 255, 0.16); }
.source-icon.portfolio { color: #40a9ff; background: rgba(24, 144, 255, 0.16); }
.source-copy { flex: 1; min-width: 0; }
.source-label { color: var(--accent); font-size: 11px; font-weight: 800; margin-bottom: 4px; }
.source-title { color: var(--text); font-size: 17px; font-weight: 900; }
.source-copy p { color: var(--text-2); font-size: 12px; line-height: 1.55; margin: 6px 0 0; }
.warning-card { padding: 12px 14px; display: flex; align-items: center; gap: 8px; color: var(--down); }
.backtest-required-card { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.26); background: var(--c-amber-soft); }
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
  background: var(--bg-elevated);
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
  background: var(--bg-elevated);
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
.section-heading { display: flex; align-items: center; gap: 10px; padding: 0 16px 13px; }
.section-index { display: inline-flex; width: 25px; height: 25px; flex: 0 0 25px; align-items: center; justify-content: center; border-radius: 8px; color: #141414; background: var(--accent); font-size: 11px; font-weight: 900; }
.section-heading > div { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.section-heading strong { color: var(--text); font-size: 14px; }
.section-heading small { color: var(--text-3); font-size: 10px; line-height: 1.4; }
:deep(.van-cell-group--inset) { margin: 0; background: transparent; }
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-field__control),
:deep(.van-cell__value) { color: var(--text); }
:deep(.van-field__label) { width: 112px; flex: 0 0 112px; color: var(--text-2); }
:deep(.van-field__body) { min-width: 0; }
:deep(.van-field__control) { min-width: 0; text-align: right; }
:deep(.van-radio-group--horizontal) { justify-content: flex-end; row-gap: 8px; }
.parameter-choice { padding: 12px 16px; border-top: 1px solid var(--border); }
.parameter-choice > strong { display: block; margin-bottom: 9px; color: var(--text-2); font-size: 12px; }
.parameter-choice :deep(.van-radio-group) { justify-content: flex-start; gap: 8px 14px; }
.parameter-choice :deep(.van-radio__label) { color: var(--text); font-size: 12px; }
.parameter-choice > small { display: block; margin-top: 8px; color: var(--text-3); font-size: 10px; line-height: 1.45; }
.capital-hint { padding-top: 2px; }
.field-hint { padding: 0 16px 12px; color: var(--text-3); font-size: 12px; line-height: 1.5; }
.field-hint--warning { padding-top: 10px; color: var(--warn); }
.execution-mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 12px 12px; }
.execution-mode-grid button { min-width: 0; min-height: 82px; padding: 12px; display: flex; align-items: flex-start; gap: 9px; border: 1px solid var(--border); border-radius: 13px; color: var(--text-2); background: var(--bg); text-align: left; }
.execution-mode-grid button > .van-icon:first-child { margin-top: 2px; color: var(--text-3); font-size: 18px; }
.execution-mode-grid button > .van-icon:last-child { margin-left: auto; color: var(--accent); }
.execution-mode-grid button span { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 4px; }
.execution-mode-grid button strong { color: var(--text); font-size: 12px; }
.execution-mode-grid button small { color: var(--text-3); font-size: 9px; line-height: 1.4; }
.execution-mode-grid button.active { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); background: var(--accent-soft); }
.execution-mode-grid button.active > .van-icon:first-child { color: var(--accent); }
.execution-mode-grid button.disabled { opacity: .42; }
.live-config { margin: 0 12px 12px; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: var(--bg); }
.live-config :deep(.van-cell) { padding-left: 12px; padding-right: 12px; }
.live-disclaimer { display: grid; grid-template-columns: auto 1fr; gap: 9px; padding: 12px; border-bottom: 1px solid var(--border); color: var(--warn); background: color-mix(in srgb, var(--warn) 8%, transparent); }
.live-disclaimer.accepted { color: var(--up); background: color-mix(in srgb, var(--up) 8%, transparent); }
.live-disclaimer > .van-icon { margin-top: 2px; font-size: 18px; }
.live-disclaimer > span { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.live-disclaimer strong { color: var(--text); font-size: 12px; }
.live-disclaimer small { color: var(--text-3); font-size: 10px; line-height: 1.45; }
.live-disclaimer :deep(.van-checkbox) { grid-column: 2; }
.live-disclaimer :deep(.van-checkbox__label) { color: var(--text-2); font-size: 11px; }
.leverage-config,.ai-filter-card { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border); }
.leverage-config > div,.ai-filter-card > span { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 3px; }
.leverage-config strong,.ai-filter-card strong { color: var(--text); font-size: 12px; }
.leverage-config small,.ai-filter-card small { color: var(--text-3); font-size: 9px; line-height: 1.45; }
.leverage-config :deep(.van-stepper) { display: inline-flex; flex: 0 0 auto; flex-direction: row; align-items: center; gap: 4px; }
.leverage-config :deep(.van-stepper__minus),
.leverage-config :deep(.van-stepper__plus) { width: 32px; height: 32px; border-radius: 9px; color: var(--text); background: var(--surface-raised); }
.leverage-config :deep(.van-stepper__input) { width: 44px; height: 32px; margin: 0; border-radius: 9px; color: var(--text); background: var(--surface-raised); font-weight: 800; }
.ai-filter-card > .van-icon { display: inline-flex; width: 30px; height: 30px; flex: 0 0 30px; align-items: center; justify-content: center; border-radius: 9px; color: var(--accent); background: var(--accent-soft); }
.ai-filter-card.disabled { opacity: .55; }
.direction-config { margin: 0 12px 12px; padding: 13px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255, 255, 255, 0.018); }
.direction-config-head { display: flex; align-items: center; gap: 8px; }
.direction-config-head strong { color: var(--text); font-size: 13px; }
.direction-mode-badge,
.required-badge { margin-left: auto; padding: 3px 8px; border-radius: 999px; color: var(--accent); background: rgba(246, 187, 35, 0.12); font-size: 10px; font-weight: 800; }
.direction-config > p { margin: 8px 0 0; color: var(--text-3); font-size: 11px; line-height: 1.5; }
.direction-mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 11px; }
.direction-mode-grid :deep(.van-radio) { min-width: 0; min-height: 42px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 11px; background: var(--surface); }
.direction-mode-grid :deep(.van-radio[aria-checked='true']) { border-color: rgba(246, 187, 35, 0.48); background: rgba(246, 187, 35, 0.07); }
.direction-mode-grid :deep(.van-radio__label) { margin-left: 7px; color: var(--text-2); font-size: 12px; }
.hedge-mode-warning { display: flex; align-items: flex-start; gap: 6px; margin-top: 10px; padding: 9px 10px; border: 1px solid rgba(246, 187, 35, 0.25); border-radius: 10px; color: var(--accent); background: rgba(246, 187, 35, 0.06); font-size: 11px; line-height: 1.5; }
.hedge-mode-warning :deep(.van-icon) { flex: 0 0 auto; margin-top: 2px; }
.notification-config { margin: 0 12px 12px; padding: 13px; border: 1px solid var(--border); border-radius: 14px; background: var(--bg); }
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
.source-picker-popup { height: min(76vh, 720px); overflow: hidden; background: var(--bg-elevated); }
.source-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 18px 8px; }
.source-picker-head > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.source-picker-head strong { color: var(--text); font-size: 17px; }
.source-picker-head small { color: var(--text-3); font-size: 11px; }
.source-picker-head button { display: inline-flex; width: 34px; height: 34px; flex: 0 0 34px; align-items: center; justify-content: center; border: 0; border-radius: 10px; color: var(--text-2); background: var(--surface-raised); font-size: 18px; }
.source-picker-popup :deep(.van-search) { padding: 8px 16px; background: transparent; }
.source-picker-popup :deep(.van-search__content) { border: 1px solid var(--border); background: var(--bg); }
.source-picker-filters { display: flex; gap: 8px; padding: 4px 16px 12px; overflow-x: auto; }
.source-picker-filters button { min-height: 34px; padding: 0 12px; flex: 0 0 auto; border: 1px solid var(--border); border-radius: 999px; color: var(--text-2); background: var(--surface-raised); font-size: 11px; }
.source-picker-filters button.active { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); color: var(--accent); background: var(--accent-soft); }
.source-picker-loading { padding: 70px 0; color: var(--text-2); }
.source-picker-list { height: calc(100% - 148px); padding: 0 16px calc(18px + env(safe-area-inset-bottom)); overflow-y: auto; }
.source-picker-item { display: flex; width: 100%; min-width: 0; align-items: center; gap: 11px; margin-bottom: 9px; padding: 13px; border: 1px solid var(--border); border-radius: 14px; color: inherit; background: var(--bg); text-align: left; }
.source-picker-item.active { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); background: var(--accent-soft); }
.source-picker-icon { display: inline-flex; width: 40px; height: 40px; flex: 0 0 40px; align-items: center; justify-content: center; border-radius: 12px; font-size: 19px; }
.source-picker-icon.script { color: #8b6cff; background: rgba(124, 92, 255, 0.16); }
.source-picker-icon.portfolio { color: #40a9ff; background: rgba(24, 144, 255, 0.16); }
.source-picker-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.source-picker-title { display: flex; min-width: 0; align-items: center; gap: 6px; }
.source-picker-title strong { overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.source-picker-title small { flex: 0 0 auto; padding: 2px 6px; border-radius: 999px; color: var(--accent); background: var(--surface-raised); font-size: 8px; font-weight: 800; }
.source-picker-copy > span:last-child { display: -webkit-box; overflow: hidden; color: var(--text-3); font-size: 10px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.source-picker-state { flex: 0 0 auto; color: var(--text-3); }
.source-picker-item.active .source-picker-state { color: var(--accent); }
@media (min-width: 720px) {
  .source-card,.warning-card,.contract-card,.trigger-card,.risk-summary-card,.section,.submit-wrap { width: calc(100% - 32px); max-width: 980px; margin-left: auto; margin-right: auto; }
}
</style>

<style scoped>.source-change{display:block;line-height:1.6}.source-change p{margin:0 0 12px}.source-copy p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}</style>
