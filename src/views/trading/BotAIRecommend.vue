<template>
  <div class="page">
    <van-nav-bar :title="$t('bot_create.ai_title')" left-arrow @click-left="$router.back()" />

    <div v-if="!recommendation" class="intro">
      <div class="hero">
        <van-icon name="fire-o" class="hero-icon" />
        <div class="hero-title">{{ $t('bot_create.ai_hero_title') }}</div>
        <p class="hero-desc">{{ $t('bot_create.ai_hero_desc') }}</p>
      </div>

      <van-cell-group inset>
        <van-cell
          :title="$t('quick_trade.symbol')"
          :value="form.symbol || $t('watchlist.tap_to_select')"
          is-link
          @click="showSymbolPicker = true"
        />
        <van-cell :title="$t('bot_create.risk_preference')" :value="riskLabel" is-link @click="showRiskPicker = true" />
        <van-cell :title="$t('bot_create.market_view')" :value="marketViewLabel" is-link @click="showMarketPicker = true" />
        <van-field
          v-model.number="form.capital"
          type="number"
          :label="$t('bot_create.initial_capital')"
          placeholder="1000"
        />
        <van-field
          v-model="form.extra"
          rows="2"
          type="textarea"
          autosize
          :label="$t('bot_create.extra_notes')"
          :placeholder="$t('bot_create.extra_notes_placeholder')"
        />
      </van-cell-group>

      <div class="submit-wrap">
        <van-button
          type="primary"
          block
          round
          :loading="loading"
          :loading-text="$t('bot_create.ai_generating')"
          @click="generate"
        >{{ $t('bot_create.ai_generate') }}</van-button>
        <p class="hint">{{ $t('bot_create.ai_hint') }}</p>
      </div>
    </div>

    <div v-else class="result">
      <!-- 后端返回 ScriptStrategy Python（顶层字段 code 为源码字符串） -->
      <template v-if="recommendation.mode === 'script'">
        <div class="card recommendation">
          <div class="card-head">
            <van-icon name="star-o" />
            <span>{{ $t('bot_create.ai_script_title') }}</span>
          </div>
          <div class="strategy-name">{{ recommendation.botName || $t('bot_create.ai_script_default_name') }}</div>
          <div class="badges">
            <span v-if="recommendation.baseConfig?.symbol" class="badge">{{ recommendation.baseConfig.symbol }}</span>
            <span class="badge type">ScriptStrategy</span>
          </div>
          <div v-if="recommendation.reason" class="reason">
            <div class="label">{{ $t('bot_create.ai_reason') }}</div>
            <p>{{ recommendation.reason }}</p>
          </div>
          <p v-if="recommendation.debugNote" class="hint script-hint">{{ recommendation.debugNote }}</p>
        </div>
        <div class="card code-card">
          <div class="card-head">
            <van-icon name="description" />
            <span>{{ $t('bot_create.ai_script_preview') }}</span>
          </div>
          <pre class="code-pre">{{ recommendation.strategy_code }}</pre>
        </div>
      </template>

      <template v-else>
      <div class="card recommendation">
        <div class="card-head">
          <van-icon name="star-o" />
          <span>{{ $t('bot_create.ai_recommendation') }}</span>
        </div>
        <div class="strategy-name">{{ recommendation.botName || recommendation.strategyName }}</div>
        <div class="badges">
          <span class="badge type">{{ typeLabel(recommendation.botType) }}</span>
          <span v-if="recommendation.baseConfig?.symbol" class="badge">{{ recommendation.baseConfig.symbol }}</span>
          <span v-if="recommendation.baseConfig?.timeframe" class="badge">{{ recommendation.baseConfig.timeframe }}</span>
        </div>
        <div class="reason">
          <div class="label">{{ $t('bot_create.ai_reason') }}</div>
          <p>{{ recommendation.reason || recommendation.analysis }}</p>
        </div>
      </div>

      <div v-if="recommendation.strategyParams && Object.keys(recommendation.strategyParams).length" class="card">
        <div class="card-head">
          <van-icon name="setting-o" />
          <span>{{ $t('bot_create.strategy_params') }}</span>
        </div>
        <div class="param-grid">
          <div v-for="(val, key) in recommendation.strategyParams" :key="key" class="param-item">
            <div class="param-label">{{ key }}</div>
            <div class="param-value">{{ val }}</div>
          </div>
        </div>
      </div>

      <div v-if="recommendation.riskConfig && Object.keys(recommendation.riskConfig).length" class="card">
        <div class="card-head">
          <van-icon name="shield-o" />
          <span>{{ $t('bot_create.risk_params') }}</span>
        </div>
        <div class="param-grid">
          <div v-for="(val, key) in recommendation.riskConfig" :key="key" class="param-item">
            <div class="param-label">{{ key }}</div>
            <div class="param-value">{{ val }}</div>
          </div>
        </div>
      </div>
      </template>

      <div class="result-actions">
        <van-button plain round block @click="recommendation = null">{{ $t('bot_create.regenerate') }}</van-button>
        <van-button type="primary" round block @click="applyAndEdit">{{ applyEditLabel }}</van-button>
      </div>
    </div>

    <van-popup v-model:show="showRiskPicker" position="bottom" round>
      <van-picker
        :columns="riskColumns"
        @cancel="showRiskPicker = false"
        @confirm="onRiskSelect"
      />
    </van-popup>
    <van-popup v-model:show="showMarketPicker" position="bottom" round>
      <van-picker
        :columns="marketColumns"
        @cancel="showMarketPicker = false"
        @confirm="onMarketSelect"
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
import { strategyApi } from '@/api'
import SymbolPicker from '@/components/SymbolPicker.vue'

export default {
  name: 'BotAIRecommend',
  components: { SymbolPicker },
  data() {
    return {
      form: {
        symbol: 'BTC/USDT:USDT',
        risk: 'balanced',
        marketView: 'neutral',
        capital: 1000,
        extra: ''
      },
      recommendation: null,
      loading: false,
      showRiskPicker: false,
      showMarketPicker: false,
      showSymbolPicker: false
    }
  },
  created() {
    this.applyRouteQuery()
  },
  watch: {
    '$route.query': {
      handler() {
        this.applyRouteQuery()
      },
      deep: true
    }
  },
  computed: {
    riskColumns() {
      return [
        { value: 'conservative', text: this.$t('bot_create.risk_conservative') },
        { value: 'balanced', text: this.$t('bot_create.risk_balanced') },
        { value: 'aggressive', text: this.$t('bot_create.risk_aggressive') }
      ]
    },
    riskLabel() {
      return this.riskColumns.find((c) => c.value === this.form.risk)?.text || ''
    },
    marketColumns() {
      return [
        { value: 'bullish', text: this.$t('bot_create.market_bullish') },
        { value: 'neutral', text: this.$t('bot_create.market_neutral') },
        { value: 'bearish', text: this.$t('bot_create.market_bearish') },
        { value: 'volatile', text: this.$t('bot_create.market_volatile') }
      ]
    },
    marketViewLabel() {
      return this.marketColumns.find((c) => c.value === this.form.marketView)?.text || ''
    },
    applyEditLabel() {
      if (this.recommendation?.mode === 'script') return this.$t('bot_create.apply_ai_script')
      return this.$t('bot_create.apply_and_edit')
    }
  },
  methods: {
    applyRouteQuery() {
      const q = this.$route.query || {}
      if (q.symbol != null && String(q.symbol).trim()) {
        this.form.symbol = String(q.symbol).trim()
      }
      if (q.prompt != null && String(q.prompt).trim()) {
        this.form.extra = String(q.prompt).trim()
      }
    },
    typeLabel(t) {
      const map = {
        grid: this.$t('bot_create.type_grid'),
        martingale: this.$t('bot_create.type_martingale'),
        trend: this.$t('bot_create.type_trend'),
        dca: this.$t('bot_create.type_dca')
      }
      return map[t] || t
    },
    onRiskSelect(payload) {
      const s = payload?.selectedOptions?.[0] || payload?.[0]
      if (s) this.form.risk = s.value
      this.showRiskPicker = false
    },
    onMarketSelect(payload) {
      const s = payload?.selectedOptions?.[0] || payload?.[0]
      if (s) this.form.marketView = s.value
      this.showMarketPicker = false
    },
    onPickSymbol(item) {
      this.form.symbol = item?.symbol || ''
    },
    normalize(data) {
      if (!data) return null
      if (data.bot_recommend && typeof data.bot_recommend === 'object') {
        return this.normalize(data.bot_recommend)
      }
      if (data.recommendation) return this.normalize(data.recommendation)
      if (data.data && (data.data.botType || data.data.strategyParams || data.data.bot_recommend)) {
        return this.normalize(data.data)
      }

      const scriptFrom =
        typeof data.strategy_code === 'string'
          ? data.strategy_code
          : typeof data.python_code === 'string'
            ? data.python_code
            : typeof data.source_code === 'string'
              ? data.source_code
              : ''
      const topCode = typeof data.code === 'string' ? data.code : ''
      const codeStr = (topCode && (topCode.includes('def on_init') || topCode.includes('def on_bar')) ? topCode : scriptFrom).trim()
      if (codeStr.length > 40 && (codeStr.includes('def on_init') || codeStr.includes('def on_bar'))) {
        const hs = data.debug?.human_summary
        const debugNote =
          data.debug?.auto_fix_applied && hs?.title
            ? hs.title + (hs.returned_text ? ` — ${hs.returned_text}` : '')
            : ''
        const paramsObj =
          data.params && typeof data.params === 'object' && !Array.isArray(data.params) ? data.params : {}
        return {
          mode: 'script',
          strategy_code: codeStr,
          botType: 'grid',
          botName: data.botName || data.strategy_name || data.strategyName || '',
          reason: hs?.title || hs?.returned_text || data.summary || data.analysis || '',
          strategyParams: paramsObj,
          riskConfig: {},
          baseConfig: {
            symbol: data.symbol || this.form.symbol?.trim() || '',
            timeframe: data.timeframe || '1m',
            marketType: data.marketType || data.market_type || 'swap',
            leverage: data.leverage != null ? Number(data.leverage) : 5,
            initialCapital: data.initialCapital || data.initial_capital || Number(this.form.capital) || 1000
          },
          debugNote
        }
      }

      const botType = data.botType || data.bot_type || data.strategy_bot_type || 'grid'
      const botName = data.botName || data.strategyName || data.strategy_name || ''
      const reason = data.reason || data.analysis || data.ai_reason || data.summary || ''
      const strategyParams = data.strategyParams || data.strategy_params || data.params || {}
      const baseConfig = data.baseConfig || data.base_config || {
        symbol: data.symbol,
        timeframe: data.timeframe,
        marketType: data.marketType || data.market_type,
        leverage: data.leverage,
        initialCapital: data.initialCapital || data.initial_capital || this.form.capital
      }
      const riskConfig = data.riskConfig || data.risk_config || {
        stopLossPct: data.stopLossPct || data.stop_loss_pct,
        takeProfitPct: data.takeProfitPct || data.take_profit_pct,
        maxPosition: data.maxPosition || data.max_position
      }
      return { botType, botName, reason, strategyParams, baseConfig, riskConfig }
    },
    async generate() {
      if (!this.form.symbol?.trim()) {
        showToast({ message: this.$t('bot_create.need_symbol'), type: 'fail' })
        return
      }
      this.loading = true
      try {
        const userNotes = (this.form.extra || '').trim()
        const symbol = this.form.symbol.trim()
        const capital = Number(this.form.capital) || 1000
        const prompt =
          userNotes ||
          this.$t('bot_create.ai_default_prompt', {
            symbol,
            risk: this.riskLabel,
            market: this.marketViewLabel,
            capital
          })
        const res = await strategyApi.aiGenerate({
          intent: 'bot_recommend',
          prompt,
          user_prompt: prompt,
          symbol,
          risk_preference: this.form.risk,
          market_view: this.form.marketView,
          initial_capital: capital,
          language: this.$i18n?.locale || 'zh-CN'
        })
        const payload = res?.data || res?.result || res
        const norm = this.normalize(payload)
        if (!norm) {
          const m = String(res?.msg || '').toLowerCase()
          if (res?.msg && m !== 'success' && m !== 'ok') throw new Error(String(res.msg))
          throw new Error(this.$t('bot_create.ai_parse_fail'))
        }
        if (!norm.baseConfig.symbol) norm.baseConfig.symbol = this.form.symbol.trim()
        if (!norm.baseConfig.initialCapital) norm.baseConfig.initialCapital = Number(this.form.capital) || 1000
        this.recommendation = norm
      } catch (err) {
        showToast({ message: err?.message || this.$t('bot_create.ai_fail'), type: 'fail' })
      } finally {
        this.loading = false
      }
    },
    applyAndEdit() {
      const rec = this.recommendation
      if (!rec) return
      try {
        const preset = {
          botType: rec.botType,
          botName: rec.botName,
          reason: rec.reason,
          baseConfig: rec.baseConfig || {},
          strategyParams: rec.strategyParams || {},
          riskConfig: rec.riskConfig || {}
        }
        sessionStorage.setItem('qd_ai_strategy_preset', JSON.stringify(preset))
        if (rec.mode === 'script' && rec.strategy_code) {
          sessionStorage.setItem('qd_ai_strategy_code', rec.strategy_code)
        } else {
          sessionStorage.removeItem('qd_ai_strategy_code')
        }
      } catch {
        showToast({ message: this.$t('bot_create.ai_script_storage_fail'), type: 'fail' })
        return
      }
      this.$router.push({
        path: '/trading/create/manual',
        query: { fromAi: '1' }
      })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 40px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.intro { padding-bottom: 40px; }
.hero { padding: 20px 20px 8px; text-align: center; }
.hero-icon {
  font-size: 40px;
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
  padding: 18px;
  border-radius: 50%;
}
.hero-title { color: var(--text); font-size: 18px; font-weight: 800; margin-top: 12px; letter-spacing: -0.02em; }
.hero-desc { color: var(--text-2); font-size: 13px; margin-top: 6px; line-height: 1.6; }
:deep(.van-cell-group--inset) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  margin: 20px 16px 0;
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title), :deep(.van-cell__value), :deep(.van-field__label) { color: var(--text-2); }
:deep(.van-field__control) { color: var(--text); }
.submit-wrap { padding: 20px 16px; }
.hint { text-align: center; color: var(--text-3); font-size: 11px; margin-top: 10px; }
.result { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.card.recommendation {
  background: var(--bg-elevated);
  border-color: var(--border);
  position: relative;
  overflow: hidden;
}
.card.recommendation::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(280px 200px at 100% 0%, var(--c-indigo-soft), transparent 62%);
}
.card.recommendation > * { position: relative; }
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.strategy-name { color: var(--text); font-size: 18px; font-weight: 800; margin-top: 10px; letter-spacing: -0.02em; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 11px;
}
.badge.type { background: var(--c-indigo-soft); color: var(--c-indigo); }
.reason { margin-top: 14px; }
.reason .label { color: var(--text-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
.reason p { color: var(--text); font-size: 13px; line-height: 1.7; margin-top: 6px; }
.param-grid { margin-top: 10px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.param-item {
  padding: 10px 12px;
  background: var(--surface-raised);
  border-radius: 12px;
}
.param-label { color: var(--text-3); font-size: 11px; }
.param-value { color: var(--text); font-weight: 600; font-size: 14px; margin-top: 4px; word-break: break-all; }
.code-card { overflow: hidden; }
.code-pre {
  margin: 0;
  margin-top: 10px;
  padding: 12px;
  max-height: 240px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text);
  background: var(--surface-deep);
  border-radius: 10px;
  border: 1px solid var(--hairline);
  white-space: pre-wrap;
  word-break: break-word;
}
.script-hint { text-align: left; margin-top: 10px; line-height: 1.5; }
.result-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
</style>
