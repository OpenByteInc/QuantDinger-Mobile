<template>
  <div class="page">
    <van-nav-bar :title="$t('script_strategy.title')" left-arrow @click-left="$router.back()" />

    <div class="source-card">
      <div class="source-icon"><van-icon name="description" /></div>
      <div class="source-copy">
        <div class="source-label">{{ isEditMode ? $t('bot_create.edit_banner') : $t('script_strategy.source_label') }}</div>
        <div class="source-title">{{ sourceName }}</div>
        <p>{{ sourceDesc }}</p>
      </div>
    </div>

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else>
      <div v-if="sourceMissing" class="warning-card">
        <van-icon name="warning-o" />
        <span>{{ $t('script_strategy.source_missing') }}</span>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('bot_create.base_config') }}</div>
        <van-cell-group inset>
          <van-field
            v-model="form.strategyName"
            :label="$t('bot_create.bot_name')"
            :placeholder="$t('bot_create.bot_name_placeholder')"
          />
          <van-cell :title="$t('bot_create.exchange_account')" :value="credentialLabel" is-link @click="openCredentialPicker" />
          <van-cell
            :title="$t('quick_trade.symbol')"
            :value="form.symbol || $t('watchlist.tap_to_select')"
            is-link
            @click="showSymbolPicker = true"
          />
          <van-cell :title="$t('bot_create.timeframe')" :value="form.timeframe" is-link @click="showTfPicker = true" />
          <van-cell :title="$t('bot_create.market_type')">
            <template #right-icon>
              <van-radio-group v-model="form.marketType" direction="horizontal">
                <van-radio name="swap">{{ $t('bot_create.market_type_swap') }}</van-radio>
                <van-radio name="spot">{{ $t('bot_create.market_type_spot') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <van-field
            v-if="form.marketType === 'swap'"
            v-model.number="form.leverage"
            type="digit"
            :label="$t('bot_create.leverage')"
            placeholder="5"
          />
          <van-field
            v-model.number="form.initialCapital"
            type="number"
            :label="$t('bot_create.initial_capital')"
            placeholder="1000"
          />
          <van-cell :title="$t('indicator_bot.execution_mode')">
            <template #right-icon>
              <van-radio-group v-model="form.executionMode" direction="horizontal">
                <van-radio name="signal">{{ $t('indicator_bot.execution_mode_signal') }}</van-radio>
                <van-radio name="live">{{ $t('indicator_bot.execution_mode_live') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">
            {{ form.executionMode === 'live' ? $t('indicator_bot.execution_mode_live_desc') : $t('indicator_bot.execution_mode_signal_desc') }}
          </div>
        </van-cell-group>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('bot_create.risk_params') }}</div>
        <van-cell-group inset>
          <van-cell :title="$t('bot_create.direction')">
            <template #right-icon>
              <van-radio-group v-model="form.direction" direction="horizontal">
                <van-radio name="long">{{ $t('bot_create.direction_long') }}</van-radio>
                <van-radio v-if="form.marketType !== 'spot'" name="short">{{ $t('bot_create.direction_short') }}</van-radio>
                <van-radio v-if="form.marketType !== 'spot'" name="both">{{ $t('bot_create.direction_both') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <van-field v-model.number="form.stopLossPct" type="number" :label="$t('bot_create.stop_loss_pct')" />
          <van-field v-model.number="form.takeProfitPct" type="number" :label="$t('bot_create.take_profit_pct')" />
          <van-field v-model.number="form.maxPosition" type="number" :label="$t('bot_create.max_position')" />
          <van-field v-model.number="form.maxDailyLoss" type="number" :label="$t('bot_create.max_daily_loss')" />
        </van-cell-group>
      </div>

      <div class="submit-wrap">
        <van-button
          type="primary"
          block
          round
          :disabled="sourceMissing"
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
    <van-popup v-model:show="showTfPicker" position="bottom" round>
      <van-picker
        :columns="timeframeColumns"
        @cancel="showTfPicker = false"
        @confirm="onTfSelect"
      />
    </van-popup>
    <SymbolPicker
      v-model:show="showSymbolPicker"
      :only-crypto="true"
      :title="$t('watchlist.picker_title')"
      @pick="onPickSymbol"
    />
  </div>
</template>

<script>
import { showToast } from 'vant'
import { credentialsApi, marketApi, scriptSourceApi, strategyApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import SymbolPicker from '@/components/SymbolPicker.vue'

export default {
  name: 'CreateScriptStrategy',
  components: { SymbolPicker },
  data() {
    return {
      loading: false,
      submitting: false,
      source: null,
      editing: null,
      editId: null,
      sourceId: null,
      form: {
        strategyName: '',
        credentialId: null,
        symbol: '',
        timeframe: '1h',
        marketType: 'swap',
        leverage: 5,
        direction: 'long',
        initialCapital: 1000,
        executionMode: 'live',
        stopLossPct: 3,
        takeProfitPct: 6,
        maxPosition: 1000,
        maxDailyLoss: 100
      },
      showCredentialPicker: false,
      showTfPicker: false,
      showSymbolPicker: false
    }
  },
  computed: {
    credentialsStore() { return useCredentialsStore() },
    credentials() { return this.credentialsStore.items },
    isEditMode() {
      return !!this.editId
    },
    sourceMissing() {
      return !this.isEditMode && !this.sourceId
    },
    sourceName() {
      return this.source?.name || this.editing?.strategy_name || this.$route.query?.name || this.$t('script_strategy.untitled')
    },
    sourceDesc() {
      return this.source?.description || this.$t('script_strategy.desc')
    },
    credentialColumns() {
      return this.credentials.map((c) => ({
        text: `${c.name || c.exchange_id} (${(c.exchange_id || '').toUpperCase()})`,
        value: c.id
      }))
    },
    credentialLabel() {
      const c = this.credentials.find((i) => i.id === this.form.credentialId)
      return c ? `${c.name || c.exchange_id} (${(c.exchange_id || '').toUpperCase()})` : this.$t('bot_create.exchange_account_placeholder')
    },
    currentCredential() {
      return this.credentials.find((i) => i.id === this.form.credentialId) || null
    },
    currentExchangeId() {
      return String(this.currentCredential?.exchange_id || '').toLowerCase()
    },
    timeframeColumns() {
      return ['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((v) => ({ value: v, text: v }))
    }
  },
  watch: {
    'form.marketType'(val) {
      if (val === 'spot') {
        this.form.direction = 'long'
        this.form.leverage = 1
      }
    },
    'form.initialCapital'(val) {
      const capital = Number(val) || 0
      if (capital > 0) {
        if (!this.form.maxPosition) this.form.maxPosition = capital
        if (!this.form.maxDailyLoss) this.form.maxDailyLoss = Math.round(capital * 0.1)
      }
    }
  },
  async mounted() {
    this.loading = true
    try {
      await this.loadCredentials()
      await this.hydrateFromEdit()
      if (!this.isEditMode) await this.loadSourceFromQuery()
      if (!this.form.credentialId && this.credentials.length) {
        this.form.credentialId = this.credentials[0].id
      }
    } finally {
      this.loading = false
    }
  },
  methods: {
    async loadCredentials() {
      try {
        const res = await credentialsApi.list()
        this.credentialsStore.setItems(res.data || [])
      } catch {
        this.credentialsStore.setItems([])
      }
    },
    async hydrateFromEdit() {
      const editId = Number(this.$route.query?.edit)
      if (!editId || !Number.isFinite(editId)) return
      const res = await strategyApi.getDetail(editId)
      const detail = res?.data
      if (!detail) return
      this.editId = editId
      this.editing = detail
      const tc = detail.trading_config || {}
      const ec = detail.exchange_config || {}
      this.sourceId = tc.script_source_id || tc.scriptSourceId || null
      this.form.strategyName = detail.strategy_name || detail.name || ''
      if (ec.credential_id != null) this.form.credentialId = ec.credential_id
      this.form.executionMode = detail.execution_mode || (ec.credential_id ? 'live' : 'signal')
      if (tc.symbol) this.form.symbol = tc.symbol
      if (tc.timeframe) this.form.timeframe = tc.timeframe
      if (tc.market_type) this.form.marketType = tc.market_type
      if (tc.leverage) this.form.leverage = Number(tc.leverage) || this.form.leverage
      if (tc.initial_capital) this.form.initialCapital = Number(tc.initial_capital) || this.form.initialCapital
      if (tc.trade_direction) this.form.direction = tc.trade_direction
      this.form.stopLossPct = pctToUi(tc.stop_loss_pct, this.form.stopLossPct)
      this.form.takeProfitPct = pctToUi(tc.take_profit_pct, this.form.takeProfitPct)
      if (tc.max_position != null) this.form.maxPosition = Number(tc.max_position) || 0
      if (tc.max_daily_loss != null) this.form.maxDailyLoss = Number(tc.max_daily_loss) || 0
      if (this.sourceId) await this.loadSource(this.sourceId)
    },
    async loadSourceFromQuery() {
      let id = this.$route.query?.source_id || this.$route.query?.script_source_id
      if (!id && this.$route.query?.source_indicator_id) {
        try {
          const res = await marketApi.syncIndicator(this.$route.query.source_indicator_id)
          id = res?.data?.script_source_id || res?.data?.purchased_script_source_id
        } catch {
          id = null
        }
      }
      if (!id) return
      await this.loadSource(id)
    },
    async loadSource(id) {
      const sid = Number(id)
      if (!sid || !Number.isFinite(sid)) return
      const res = await scriptSourceApi.getDetail(sid)
      this.source = res?.data || null
      this.sourceId = this.source?.id || sid
      if (this.source && !this.form.strategyName) {
        this.form.strategyName = this.source.name || ''
      }
    },
    openCredentialPicker() {
      if (!this.credentials.length) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        this.$router.push('/profile/credentials/new')
        return
      }
      this.showCredentialPicker = true
    },
    onCredentialSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.form.credentialId = selected.value
      this.showCredentialPicker = false
    },
    onTfSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.form.timeframe = selected.value
      this.showTfPicker = false
    },
    onPickSymbol(item) {
      this.form.symbol = item?.symbol || ''
    },
    buildPayload() {
      const marketType = this.form.marketType
      const leverage = marketType === 'spot' ? 1 : (Number(this.form.leverage) || 1)
      const direction = marketType === 'spot' ? 'long' : this.form.direction
      const isLive = this.form.executionMode === 'live'
      const prevTc = this.editing?.trading_config && typeof this.editing.trading_config === 'object'
        ? { ...this.editing.trading_config }
        : {}
      const tradingConfig = {
        ...prevTc,
        symbol: this.form.symbol,
        timeframe: this.form.timeframe,
        market_type: marketType,
        leverage,
        trade_direction: direction,
        initial_capital: Number(this.form.initialCapital) || 0,
        stop_loss_pct: pct(this.form.stopLossPct),
        take_profit_pct: pct(this.form.takeProfitPct),
        max_position: Number(this.form.maxPosition) || 0,
        max_daily_loss: Number(this.form.maxDailyLoss) || 0,
        order_mode: 'market',
        script_source_id: this.sourceId ? Number(this.sourceId) : undefined,
        script_role: 'runtime'
      }
      if (this.source?.template_key || this.source?.script_template_key || this.editing?.trading_config?.script_template_key) {
        tradingConfig.script_template_key = this.source?.template_key || this.source?.script_template_key || this.editing?.trading_config?.script_template_key
      }
      return {
        strategy_name: this.form.strategyName || `${this.sourceName} ${this.form.symbol}`,
        strategy_type: 'ScriptStrategy',
        strategy_mode: 'script',
        strategy_code: this.sourceId ? '' : (this.editing?.strategy_code || ''),
        market_category: 'Crypto',
        execution_mode: isLive ? 'live' : 'signal',
        exchange_config: isLive ? {
          credential_id: this.form.credentialId,
          exchange_id: this.currentExchangeId || undefined
        } : undefined,
        trading_config: tradingConfig,
        notification_config: { channels: ['browser'], targets: {} }
      }
    },
    async submit() {
      if (this.form.executionMode === 'live' && !this.form.credentialId) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        return
      }
      if (!this.form.symbol?.trim()) {
        showToast({ message: this.$t('bot_create.need_symbol'), type: 'fail' })
        return
      }
      if (!this.sourceId && !this.isEditMode) {
        showToast({ message: this.$t('script_strategy.source_missing'), type: 'fail' })
        return
      }
      this.submitting = true
      try {
        const payload = this.buildPayload()
        if (this.isEditMode) {
          await strategyApi.update(this.editId, payload)
          showToast({ message: this.$t('bot_create.update_success'), type: 'success' })
        } else {
          await strategyApi.create(payload)
          showToast({ message: this.$t('bot_create.create_success'), type: 'success' })
        }
        this.$router.replace('/trading')
      } catch (err) {
        showToast({
          message: err?.response?.data?.msg || err?.message || this.$t('bot_create.create_fail'),
          type: 'fail'
        })
      } finally {
        this.submitting = false
      }
    }
  }
}

function pct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return +(n / 100).toFixed(6)
}

function pctToUi(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return +(n * 100).toFixed(4)
}
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 80px;
  color: var(--text);
}
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
.source-card {
  display: flex;
  gap: 14px;
  padding: 16px;
}
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
.source-label {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
}
.source-title {
  color: var(--text);
  font-size: 17px;
  font-weight: 900;
}
.source-copy p {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.55;
  margin: 6px 0 0;
}
.warning-card {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--down);
}
.section { padding: 14px 0 4px; }
.section-title {
  padding: 0 16px 12px;
  color: var(--text);
  font-weight: 800;
}
:deep(.van-cell-group--inset) {
  margin: 0;
  background: transparent;
}
:deep(.van-cell) {
  background: transparent;
  color: var(--text);
}
:deep(.van-field__control),
:deep(.van-cell__value) {
  color: var(--text);
}
.field-hint {
  padding: 0 16px 12px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
}
.loading { margin-top: 80px; color: var(--text-2); }
.submit-wrap {
  padding: 16px;
}
</style>
