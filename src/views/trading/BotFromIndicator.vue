<template>
  <div class="page">
    <van-nav-bar :title="$t('indicator_bot.title')" left-arrow @click-left="onNavBack">
      <template #right>
        <van-icon v-if="currentStep === 0" name="replay" @click="loadIndicators" />
      </template>
    </van-nav-bar>

    <div class="hero">
      <div class="hero-steps">
        <div :class="['step-node', { active: currentStep === 0, done: currentStep > 0 }]">
          <div class="step-index">1</div>
          <div class="step-text">{{ $t('indicator_bot.step_pick') }}</div>
        </div>
        <div class="step-bar" :class="{ done: currentStep > 0 }"></div>
        <div :class="['step-node', { active: currentStep === 1 }]">
          <div class="step-index">2</div>
          <div class="step-text">{{ $t('indicator_bot.step_config') }}</div>
        </div>
      </div>
      <div class="hero-subtitle">{{ $t('indicator_bot.subtitle') }}</div>
    </div>

    <!-- Step 1: Pick indicator -->
    <template v-if="currentStep === 0">
      <div class="filter-tabs">
        <div
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: filter === tab.value }]"
          @click="filter = tab.value"
        >{{ tab.label }}</div>
      </div>

      <div v-if="loadingIndicators" class="loading"><van-loading color="#7c5cff" /></div>

      <template v-else>
        <div v-if="filteredIndicators.length === 0" class="empty-block">
          <van-empty :description="$t('indicator_bot.no_indicators')" />
          <div class="empty-actions">
            <van-button round type="primary" size="small" @click="$router.push('/market')">
              {{ $t('indicator_bot.browse_market') }}
            </van-button>
          </div>
        </div>

        <div v-else class="indicator-list">
          <div
            v-for="ind in filteredIndicators"
            :key="ind.id"
            class="ind-card"
            @click="pickIndicator(ind)"
          >
            <div class="ind-card-head">
              <div class="ind-title">{{ ind.name || 'Custom Indicator' }}</div>
              <van-tag
                :type="ind.is_buy ? 'warning' : 'primary'"
                plain
                size="mini"
              >{{ ind.is_buy ? $t('indicator_bot.purchased_tag') : $t('indicator_bot.custom_tag') }}</van-tag>
            </div>
            <p v-if="ind.description" class="ind-desc">{{ ind.description }}</p>
            <div class="ind-meta">
              <span v-if="ind.pricing_type === 'paid'" class="meta-price">
                <van-icon name="gold-coin-o" />
                {{ Number(ind.price || 0) }}
              </span>
              <span v-else class="meta-free">
                <van-icon name="checked" />
                {{ $t('market.price_free') }}
              </span>
              <span class="meta-time" v-if="ind.updatetime || ind.createtime">
                <van-icon name="clock-o" />
                {{ formatTime(ind.updatetime || ind.createtime) }}
              </span>
              <van-icon class="meta-arrow" name="arrow" />
            </div>
          </div>

          <div class="market-cta" @click="$router.push('/market')">
            <van-icon name="shop-o" />
            <span>{{ $t('indicator_bot.browse_market') }}</span>
            <van-icon class="cta-arrow" name="arrow" />
          </div>
        </div>
      </template>
    </template>

    <!-- Step 2: Configure -->
    <template v-else-if="currentStep === 1 && selectedIndicator">
      <div class="selected-card">
        <div class="selected-head">
          <div>
            <div class="selected-label">{{ $t('indicator_bot.pick_indicator') }}</div>
            <div class="selected-name">{{ selectedIndicator.name }}</div>
          </div>
          <van-button size="mini" plain round @click="changeIndicator">
            {{ $t('indicator_bot.change_indicator') }}
          </van-button>
        </div>
        <p v-if="selectedIndicator.description" class="selected-desc">{{ selectedIndicator.description }}</p>
        <div v-if="hasStrategyDefaults" class="strategy-hint">
          <van-icon name="info-o" />
          <div>
            <div class="hint-title">{{ $t('indicator_bot.strategy_defaults') }}</div>
            <div class="hint-desc">{{ $t('indicator_bot.strategy_defaults_hint') }}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('indicator_bot.base_config') }}</div>
        <van-cell-group inset>
          <van-field
            v-model="form.botName"
            :label="$t('bot_create.bot_name')"
            :placeholder="$t('bot_create.bot_name_placeholder')"
          />
          <van-cell :title="$t('indicator_bot.execution_mode')">
            <template #right-icon>
              <van-radio-group v-model="form.executionMode" direction="horizontal">
                <van-radio name="signal">{{ $t('indicator_bot.execution_mode_signal') }}</van-radio>
                <van-radio name="live">{{ $t('indicator_bot.execution_mode_live') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="cell-desc">
            {{ form.executionMode === 'live' ? $t('indicator_bot.execution_mode_live_desc') : $t('indicator_bot.execution_mode_signal_desc') }}
          </div>
          <van-cell
            v-if="form.executionMode === 'live'"
            :title="$t('bot_create.exchange_account')"
            :value="credentialLabel"
            is-link
            @click="openCredentialPicker"
          />
          <van-field
            v-model="form.symbol"
            :label="$t('quick_trade.symbol')"
            :placeholder="$t('bot_create.symbol_placeholder')"
          >
            <template #button>
              <van-button size="mini" type="primary" plain @click="showSymbolPicker = true">
                {{ $t('watchlist.my_list') }}
              </van-button>
            </template>
          </van-field>
          <div class="cell-desc">{{ $t('indicator_bot.symbols_multi') }}</div>
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
          />
          <van-cell :title="$t('bot_create.direction')">
            <template #right-icon>
              <van-radio-group v-model="form.direction" direction="horizontal">
                <van-radio name="long">{{ $t('bot_create.direction_long') }}</van-radio>
                <van-radio name="short">{{ $t('bot_create.direction_short') }}</van-radio>
                <van-radio name="both">{{ $t('bot_create.direction_both') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <van-field
            v-model.number="form.initialCapital"
            type="number"
            :label="$t('bot_create.initial_capital')"
          />
        </van-cell-group>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('indicator_bot.indicator_params') }}</div>
        <div v-if="loadingParams" class="loading"><van-loading color="#7c5cff" /></div>
        <template v-else>
          <van-cell-group v-if="params.length > 0" inset>
            <template v-for="p in params" :key="p.name">
              <van-field
                v-if="paramInputType(p) !== 'switch'"
                v-model="paramValues[p.name]"
                :type="paramInputType(p)"
                :label="p.label || p.name"
                :placeholder="String(p.default ?? '')"
              >
                <template v-if="p.description" #extra>
                  <van-icon name="info-o" :title="p.description" />
                </template>
              </van-field>
              <van-cell v-else :title="p.label || p.name">
                <template #right-icon>
                  <van-switch v-model="paramValues[p.name]" size="20" />
                </template>
              </van-cell>
            </template>
          </van-cell-group>
          <div v-else class="empty-block soft">
            <van-empty image="search" :description="$t('indicator_bot.indicator_params_empty')" />
          </div>
        </template>
      </div>

      <div class="section">
        <div class="section-title">{{ $t('indicator_bot.risk_params') }}</div>
        <van-cell-group inset>
          <van-field v-model.number="form.entryPct" type="number" :label="$t('indicator_bot.entry_pct')" />
          <van-field v-model.number="form.stopLossPct" type="number" :label="$t('bot_create.stop_loss_pct')" />
          <van-field v-model.number="form.takeProfitPct" type="number" :label="$t('bot_create.take_profit_pct')" />
          <van-cell :title="$t('indicator_bot.trailing_enabled')">
            <template #right-icon>
              <van-switch v-model="form.trailingEnabled" size="20" />
            </template>
          </van-cell>
          <template v-if="form.trailingEnabled">
            <van-field v-model.number="form.trailingActivationPct" type="number" :label="$t('indicator_bot.trailing_activation_pct')" />
            <van-field v-model.number="form.trailingStopPct" type="number" :label="$t('indicator_bot.trailing_stop_pct')" />
          </template>
          <van-field v-model.number="form.commission" type="number" :label="$t('indicator_bot.commission')" />
          <van-field v-model.number="form.slippage" type="number" :label="$t('indicator_bot.slippage')" />
          <van-cell :title="$t('indicator_bot.enable_ai_filter')">
            <template #right-icon>
              <van-switch v-model="form.enableAiFilter" size="20" />
            </template>
          </van-cell>
          <div class="cell-desc">{{ $t('indicator_bot.ai_filter_hint') }}</div>
        </van-cell-group>
      </div>

      <div class="submit-wrap">
        <van-button
          type="primary"
          block
          round
          :loading="submitting"
          :loading-text="$t('bot_create.creating')"
          @click="submit"
        >{{ $t('bot_create.submit') }}</van-button>
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
import { credentialsApi, indicatorApi, strategyApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import SymbolPicker from '@/components/SymbolPicker.vue'

export default {
  name: 'BotFromIndicator',
  components: { SymbolPicker },
  data() {
    return {
      currentStep: 0,
      filter: 'all',
      indicators: [],
      loadingIndicators: false,
      selectedIndicator: null,
      params: [],
      paramValues: {},
      loadingParams: false,
      strategyDefaults: {},
      form: {
        botName: '',
        executionMode: 'live',
        credentialId: null,
        symbol: '',
        timeframe: '1h',
        marketType: 'swap',
        leverage: 5,
        direction: 'long',
        initialCapital: 1000,
        entryPct: 50,
        stopLossPct: 5,
        takeProfitPct: 10,
        trailingEnabled: false,
        trailingStopPct: 1,
        trailingActivationPct: 2,
        commission: 0.05,
        slippage: 0.02,
        enableAiFilter: false
      },
      showCredentialPicker: false,
      showTfPicker: false,
      showSymbolPicker: false,
      submitting: false
    }
  },
  computed: {
    credentialsStore() { return useCredentialsStore() },
    credentials() { return this.credentialsStore.items },
    credentialColumns() {
      return this.credentials.map((c) => ({
        text: `${c.name || c.exchange_id} · ${(c.exchange_id || '').toUpperCase()}`,
        value: c.id
      }))
    },
    credentialLabel() {
      const c = this.credentials.find((i) => i.id === this.form.credentialId)
      return c ? `${c.name || c.exchange_id} · ${(c.exchange_id || '').toUpperCase()}` : this.$t('bot_create.exchange_account_placeholder')
    },
    timeframeColumns() {
      return ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'].map((v) => ({ value: v, text: v }))
    },
    filterTabs() {
      return [
        { value: 'all', label: this.$t('indicator_bot.filter_all') },
        { value: 'purchased', label: this.$t('indicator_bot.filter_purchased') },
        { value: 'custom', label: this.$t('indicator_bot.filter_custom') }
      ]
    },
    filteredIndicators() {
      if (this.filter === 'purchased') return this.indicators.filter((i) => Number(i.is_buy) === 1)
      if (this.filter === 'custom') return this.indicators.filter((i) => !Number(i.is_buy))
      return this.indicators
    },
    hasStrategyDefaults() {
      return !!this.strategyDefaults && Object.keys(this.strategyDefaults).length > 0
    }
  },
  async mounted() {
    await Promise.all([this.loadIndicators(), this.loadCredentials()])
    const query = this.$route.query || {}
    const preId = query.indicator_id || query.indicatorId
    const sourceId = query.source_indicator_id || query.sourceIndicatorId
    const preName = query.name
    let matched = null
    if (preId) {
      matched = this.indicators.find((i) => String(i.id) === String(preId))
    }
    if (!matched && sourceId) {
      matched = this.indicators.find(
        (i) => String(i.source_indicator_id || '') === String(sourceId)
      )
    }
    if (!matched && preName) {
      matched = this.indicators.find((i) => (i.name || '') === preName)
    }
    if (matched) {
      await this.pickIndicator(matched)
    } else if (preId || sourceId || preName) {
      showToast({
        message: this.$t('indicator_bot.not_purchased_hint') || 'Please purchase the indicator first',
        type: 'fail'
      })
    }
    if (!this.form.credentialId && this.credentials.length > 0) {
      this.form.credentialId = this.credentials[0].id
    }
  },
  methods: {
    onNavBack() {
      if (this.currentStep === 1) {
        this.currentStep = 0
        return
      }
      this.$router.back()
    },
    changeIndicator() {
      this.currentStep = 0
    },
    async loadIndicators() {
      this.loadingIndicators = true
      try {
        const res = await indicatorApi.getList()
        const list = res?.data
        this.indicators = Array.isArray(list) ? list : (list?.items || list?.list || [])
      } catch {
        this.indicators = []
      } finally {
        this.loadingIndicators = false
      }
    },
    async loadCredentials() {
      try {
        const res = await credentialsApi.list()
        this.credentialsStore.setItems(res.data || [])
      } catch {
        this.credentialsStore.setItems([])
      }
    },
    async pickIndicator(ind) {
      this.selectedIndicator = ind
      this.params = []
      this.paramValues = {}
      this.strategyDefaults = {}
      this.loadingParams = true
      try {
        const [paramRes, cfgRes] = await Promise.allSettled([
          indicatorApi.getParams(ind.id),
          ind.code ? indicatorApi.parseStrategyConfig(ind.code) : Promise.resolve({ data: {} })
        ])
        if (paramRes.status === 'fulfilled') {
          const list = paramRes.value?.data || []
          this.params = Array.isArray(list) ? list : []
          this.params.forEach((p) => {
            const t = (p.type || '').toLowerCase()
            let dv = p.default
            if (t === 'bool' || t === 'boolean') dv = !!dv
            this.paramValues[p.name] = dv ?? ''
          })
        }
        if (cfgRes.status === 'fulfilled') {
          const cfg = cfgRes.value?.data?.strategyConfig || {}
          this.strategyDefaults = cfg
          this.applyStrategyDefaults(cfg)
        }
      } finally {
        this.loadingParams = false
      }
      if (!this.form.botName) {
        this.form.botName = `${ind.name || 'Indicator'} Bot`
      }
      this.currentStep = 1
      window.scrollTo?.({ top: 0, behavior: 'smooth' })
    },
    applyStrategyDefaults(cfg) {
      if (!cfg) return
      const toPct = (v) => (typeof v === 'number' ? v * 100 : undefined)
      const maybe = (key, value) => {
        if (value === undefined || value === null || Number.isNaN(value)) return
        this.form[key] = value
      }
      maybe('stopLossPct', toPct(cfg.stopLossPct ?? cfg.stop_loss_pct))
      maybe('takeProfitPct', toPct(cfg.takeProfitPct ?? cfg.take_profit_pct))
      maybe('entryPct', toPct(cfg.entryPct ?? cfg.entry_pct))
      maybe('trailingEnabled', !!(cfg.trailingEnabled ?? cfg.trailing_enabled))
      maybe('trailingStopPct', toPct(cfg.trailingStopPct ?? cfg.trailing_stop_pct))
      maybe('trailingActivationPct', toPct(cfg.trailingActivationPct ?? cfg.trailing_activation_pct))
      const dir = cfg.tradeDirection || cfg.trade_direction
      if (dir && ['long', 'short', 'both'].includes(dir)) this.form.direction = dir
    },
    paramInputType(p) {
      const t = (p.type || '').toLowerCase()
      if (t === 'int' || t === 'integer') return 'digit'
      if (t === 'float' || t === 'number' || t === 'double') return 'number'
      if (t === 'bool' || t === 'boolean') return 'switch'
      return 'text'
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
      const s = payload?.selectedOptions?.[0] || payload?.[0]
      if (s) this.form.credentialId = s.value
      this.showCredentialPicker = false
    },
    onTfSelect(payload) {
      const s = payload?.selectedOptions?.[0] || payload?.[0]
      if (s) this.form.timeframe = s.value
      this.showTfPicker = false
    },
    onPickSymbol(item) {
      const sym = item?.symbol || ''
      if (!sym) return
      const current = (this.form.symbol || '').trim()
      if (!current) {
        this.form.symbol = sym
      } else {
        const list = current.split(/[,\s]+/).filter(Boolean)
        if (!list.includes(sym)) {
          list.push(sym)
          this.form.symbol = list.join(', ')
        }
      }
    },
    formatTime(value) {
      if (!value) return ''
      let d
      if (typeof value === 'number') {
        const ts = value < 1e12 ? value * 1000 : value
        d = new Date(ts)
      } else {
        d = new Date(value)
      }
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString()
    },
    parseSymbols(raw) {
      return String(raw || '')
        .split(/[,\s、;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    },
    buildPayload(symbols) {
      const ind = this.selectedIndicator
      const isLive = this.form.executionMode === 'live'
      const marketType = this.form.marketType
      const leverage = marketType === 'spot' ? 1 : (Number(this.form.leverage) || 1)
      const direction = marketType === 'spot' ? 'long' : this.form.direction

      const payload = {
        strategy_name: this.form.botName || `${ind.name || 'Indicator'} Bot`,
        market_category: 'Crypto',
        execution_mode: isLive ? 'live' : 'signal',
        indicator_config: {
          indicator_id: ind.id,
          indicator_name: ind.name,
          indicator_code: ind.code || ''
        },
        exchange_config: isLive ? {
          credential_id: this.form.credentialId
        } : undefined,
        trading_config: {
          initial_capital: Number(this.form.initialCapital) || 1000,
          leverage,
          trade_direction: direction,
          timeframe: this.form.timeframe,
          market_type: marketType,
          margin_mode: 'cross',
          signal_mode: 'confirmed',
          stop_loss_pct: pct(this.form.stopLossPct),
          take_profit_pct: pct(this.form.takeProfitPct),
          entry_pct: pct(this.form.entryPct),
          trailing_enabled: !!this.form.trailingEnabled,
          trailing_stop_pct: pct(this.form.trailingStopPct),
          trailing_activation_pct: pct(this.form.trailingActivationPct),
          commission: Number(this.form.commission) || 0,
          slippage: Number(this.form.slippage) || 0,
          enable_ai_filter: !!this.form.enableAiFilter,
          indicator_params: this.paramValues,
          strategy_type: 'single'
        },
        notification_config: { channels: ['browser'], targets: {} }
      }
      if (symbols.length > 1) {
        payload.user_id = 1
        payload.strategy_type = 'IndicatorStrategy'
        payload.symbols = symbols
      } else {
        payload.trading_config.symbol = symbols[0]
      }
      return payload
    },
    async submit() {
      if (!this.selectedIndicator) {
        showToast({ message: this.$t('indicator_bot.need_indicator'), type: 'fail' })
        return
      }
      const isLive = this.form.executionMode === 'live'
      if (isLive && !this.form.credentialId) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        return
      }
      const symbols = this.parseSymbols(this.form.symbol)
      if (symbols.length === 0) {
        showToast({ message: this.$t('indicator_bot.symbol_required'), type: 'fail' })
        return
      }

      this.submitting = true
      try {
        const payload = this.buildPayload(symbols)
        const res = symbols.length > 1
          ? await strategyApi.batchCreate(payload)
          : await strategyApi.create(payload)
        const msg = symbols.length > 1
          ? this.$t('indicator_bot.create_success_batch', { count: symbols.length })
          : this.$t('indicator_bot.create_success')
        showToast({ message: msg, type: 'success' })
        this.$router.replace('/trading')
        return res
      } catch (err) {
        showToast({
          message: err?.response?.data?.msg || err?.message || this.$t('indicator_bot.create_fail'),
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
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 40px;
  color: var(--text);
}
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.hero {
  margin: 4px 16px 14px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.hero-steps { display: flex; align-items: center; gap: 10px; }
.step-node {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
}
.step-index {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  color: var(--text-2);
  background: var(--surface-raised);
}
.step-text { font-size: 12px; font-weight: 600; }
.step-node.active .step-index,
.step-node.done .step-index {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}
.step-node.active .step-text,
.step-node.done .step-text { color: var(--text); }
.step-bar {
  flex: 1;
  height: 2px;
  background: var(--border-strong);
  border-radius: 2px;
}
.step-bar.done { background: var(--accent); }
.hero-subtitle {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
}

.filter-tabs {
  margin: 0 16px 12px;
  display: flex;
  gap: 8px;
  background: var(--surface-raised);
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--border);
}
.filter-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 12px;
  color: var(--text-2);
  border-radius: 10px;
  transition: all .2s;
}
.filter-tab.active {
  background: var(--accent);
  color: var(--text-on-accent);
  font-weight: 700;
}

.loading { padding: 32px; text-align: center; }
.empty-block { padding: 8px 16px 24px; }
.empty-block.soft { padding: 4px 16px 8px; }
.empty-actions { text-align: center; margin-top: 4px; }

.indicator-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ind-card {
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  transition: all .2s;
  cursor: pointer;
}
.ind-card:active {
  background: var(--surface-raised);
  border-color: var(--border-strong);
}
.ind-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ind-title {
  color: var(--text);
  font-weight: 700;
  font-size: 15px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ind-desc {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.6;
  margin: 4px 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ind-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 11px;
  color: var(--text-3);
}
.meta-price { color: var(--c-amber); font-weight: 700; display: inline-flex; gap: 4px; align-items: center; }
.meta-free { color: var(--up); font-weight: 600; display: inline-flex; gap: 4px; align-items: center; }
.meta-time { display: inline-flex; gap: 4px; align-items: center; }
.meta-arrow { margin-left: auto; color: var(--text-4); }

.market-cta {
  margin-top: 4px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px dashed var(--border-strong);
  background: var(--surface-raised);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.market-cta .cta-arrow { margin-left: auto; }

.selected-card {
  margin: 0 16px 14px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.selected-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(280px 180px at 100% 0%, var(--accent-soft), transparent 62%);
}
.selected-card > * { position: relative; }
.selected-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.selected-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); margin-bottom: 4px; }
.selected-name { color: var(--text); font-size: 16px; font-weight: 700; }
.selected-desc {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.strategy-hint {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.strategy-hint .van-icon { color: var(--accent); margin-top: 2px; }
.hint-title { font-size: 12px; font-weight: 700; color: var(--text); }
.hint-desc { font-size: 11px; color: var(--text-2); margin-top: 2px; line-height: 1.5; }

.section { margin: 14px 0 10px; }
.section-title {
  padding: 0 24px 8px;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}
.cell-desc {
  padding: 4px 20px 10px;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}

:deep(.van-cell-group--inset) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  margin: 0 16px;
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title),
:deep(.van-cell__value),
:deep(.van-field__label) { color: var(--text-2); }
:deep(.van-field__control) { color: var(--text); }
:deep(.van-radio__label) { color: var(--text); font-size: 12px; }

.submit-wrap { padding: 22px 16px calc(22px + var(--safe-area-bottom, 0px)); }
:deep(.van-button--primary) {
  background: var(--accent);
  border: none;
  color: var(--text-on-accent);
  font-weight: 700;
}
</style>
