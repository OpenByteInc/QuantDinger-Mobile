<template>
  <div class="ai-page">
    <van-nav-bar :title="$t('ai_analysis.title')" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="clock-o" size="20" @click="$router.push('/ai-analysis/history')" />
      </template>
    </van-nav-bar>

    <!-- Hero + Symbol picker card -->
    <div class="hero-card">
      <div class="hero-badge">{{ $t('ai_analysis.hero_badge') }}</div>
      <div class="hero-title">{{ $t('ai_analysis.title') }}</div>
      <p class="hero-desc">{{ $t('ai_analysis.hero_hint') }}</p>

      <div class="symbol-picker-row" @click="openSymbolPicker">
        <div class="sp-left">
          <span class="sp-label">{{ $t('ai_analysis.symbol_label') }}</span>
          <span class="sp-sym">{{ form.symbol || $t('ai_analysis.symbol_select') }}</span>
          <span v-if="form.symbol" class="sp-market-tag">{{ form.market }} · {{ form.timeframe }}</span>
        </div>
        <div class="sp-right">
          <template v-if="livePrice != null">
            <span class="sp-price">{{ formatPrice(livePrice) }}</span>
            <span
              v-if="liveChange != null"
              :class="['sp-delta', liveChange >= 0 ? 'up' : 'down']"
            >
              {{ liveChange >= 0 ? '+' : '' }}{{ liveChange.toFixed(2) }}%
            </span>
          </template>
          <van-icon v-else name="arrow" />
        </div>
      </div>

      <van-button
        type="primary"
        block
        round
        class="analyze-btn"
        :loading="analyzing"
        :loading-text="$t('ai_analysis.analyzing')"
        @click="runAnalysis"
      >
        <van-icon name="flash" style="margin-right: 4px;" />
        {{ $t('ai_analysis.analyze') }}
      </van-button>
    </div>

    <!-- Loading state -->
    <div v-if="analyzing" class="loading-card">
      <div class="loading-head">
        <van-icon name="flash" class="loading-icon" />
        <span class="loading-title">{{ $t('ai_analysis.analyzing') }}</span>
      </div>
      <p class="loading-desc">{{ $t('ai_analysis.please_wait') }}</p>

      <div class="progress-wrap">
        <van-progress
          :percentage="progressPercent"
          :show-pivot="false"
          color="linear-gradient(90deg, #7c5cff 0%, #22d3ee 100%)"
          track-color="rgba(255,255,255,0.08)"
          stroke-width="6"
        />
        <span class="progress-text">{{ Math.round(progressPercent) }}%</span>
      </div>

      <div class="steps-list">
        <div class="step-item" v-for="(s, i) in stepList" :key="i" :class="stepClass(i + 1)">
          <span class="step-dot">
            <van-icon v-if="step > i + 1" name="success" />
            <van-icon v-else-if="step === i + 1" name="loading" class="spinning" />
          </span>
          <span class="step-text">{{ s }}</span>
        </div>
      </div>

      <div class="loading-footer">
        <span>{{ $t('ai_analysis.elapsed') }}: {{ elapsedSeconds }}s</span>
      </div>
    </div>

    <!-- Result -->
    <div v-else-if="result" class="result-wrapper">
      <!-- Decision card with circular confidence -->
      <div :class="['decision-card', decisionTone]">
        <div class="decision-main">
          <div class="decision-badge">
            <van-icon :name="decisionIcon" />
            <span class="decision-text">{{ decisionText }}</span>
          </div>
          <div class="confidence-ring">
            <svg viewBox="0 0 100 100" class="ring-svg">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                :stroke="confidenceColor"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                stroke-dasharray="263.89"
                :stroke-dashoffset="confidenceOffset"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="ring-inner">
              <span class="ring-value">{{ Number(result.confidence || 0).toFixed(0) }}<small>%</small></span>
              <span class="ring-label">{{ $t('ai_analysis.confidence') }}</span>
            </div>
          </div>
        </div>
        <p v-if="result.summary" class="decision-summary">{{ result.summary }}</p>

        <!-- Consensus strip -->
        <div v-if="consensusBlock" class="consensus-strip">
          <div class="consensus-title">
            <van-icon name="cluster-o" />
            <span>{{ $t('ai_analysis.consensus_title') }}</span>
          </div>
          <div class="consensus-row">
            <div class="c-item">
              <em>{{ $t('ai_analysis.consensus_decision') }}</em>
              <span>{{ consensusBlock.consensus_decision || '-' }}</span>
            </div>
            <div class="c-item">
              <em>{{ $t('ai_analysis.consensus_score') }}</em>
              <span>{{ formatNumber(consensusBlock.consensus_score, 1) }}</span>
            </div>
            <div class="c-item" v-if="consensusBlock.agreement_ratio != null">
              <em>{{ $t('ai_analysis.consensus_agreement') }}</em>
              <span>{{ formatNumber(Number(consensusBlock.agreement_ratio) * 100, 0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Next step action -->
      <div class="next-step-bar">
        <span class="ns-label">
          <van-icon name="flash" />
          {{ $t('ai_analysis.next_step') }}
        </span>
        <div class="ns-actions">
          <van-button size="small" type="primary" @click="generateStrategyFromResult">
            <van-icon name="cluster-o" /> {{ $t('ai_analysis.generate_strategy') }}
          </van-button>
        </div>
      </div>

      <!-- Price info row -->
      <div class="price-row">
        <div class="price-card">
          <span class="label">{{ $t('ai_analysis.current_price') }}</span>
          <span class="value">{{ formatPrice(result?.market_data?.current_price) }}</span>
          <span v-if="result?.market_data?.change_24h != null"
                :class="['delta', Number(result.market_data.change_24h) >= 0 ? 'up' : 'down']">
            {{ formatDelta(result.market_data.change_24h) }}%
          </span>
        </div>
        <template v-if="!isHoldDecision">
          <div class="price-card" v-if="tradingPlan.entry_price">
            <span class="label">{{ $t('ai_analysis.entry') }}</span>
            <span class="value">{{ formatPrice(tradingPlan.entry_price) }}</span>
          </div>
          <div class="price-card" v-if="tradingPlan.stop_loss">
            <span class="label">{{ $t('ai_analysis.stop_loss') }}</span>
            <span class="value down">{{ formatPrice(tradingPlan.stop_loss) }}</span>
            <span class="hint">{{ $t('ai_analysis.atr_based') }}</span>
          </div>
          <div class="price-card" v-if="tradingPlan.take_profit">
            <span class="label">{{ $t('ai_analysis.take_profit') }}</span>
            <span class="value up">{{ formatPrice(tradingPlan.take_profit) }}</span>
            <span class="hint">{{ $t('ai_analysis.atr_based') }}</span>
          </div>
        </template>
      </div>

      <!-- Scores -->
      <div class="section-card" v-if="result.scores">
        <div class="section-title">
          <van-icon name="chart-trending-o" />
          <span>{{ $t('ai_analysis.scores_title') }}</span>
        </div>
        <div class="scores-row">
          <div class="score-item" v-for="s in scoreList" :key="s.key">
            <div class="score-header">
              <van-icon :name="s.icon" />
              <span>{{ s.label }}</span>
              <span class="score-num">{{ s.value }}</span>
            </div>
            <van-progress
              :percentage="s.value"
              :show-pivot="false"
              :color="getScoreColor(s.value)"
              track-color="rgba(255,255,255,0.06)"
              stroke-width="4"
            />
          </div>
        </div>
      </div>

      <!-- Trend outlook -->
      <div class="section-card" v-if="trendOutlookBlocks.length || trendOutlookSummaryText">
        <div class="section-title">
          <van-icon name="calendar-o" />
          <span>{{ $t('ai_analysis.trend_outlook_title') }}</span>
        </div>
        <p v-if="trendOutlookSummaryText" class="outlook-summary">{{ trendOutlookSummaryText }}</p>
        <div v-if="trendOutlookBlocks.length" class="outlook-grid">
          <div v-for="row in trendOutlookBlocks" :key="row.key" class="outlook-item">
            <div class="outlook-label">{{ row.label }}</div>
            <div class="outlook-trend" :class="outlookTrendClass(row.trend)">
              {{ formatOutlookTrend(row.trend) }}
            </div>
            <div class="outlook-meta">
              <span v-if="row.score != null">{{ $t('ai_analysis.outlook_score') }}: {{ row.score }}</span>
              <span v-if="row.strength">· {{ row.strength }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed analysis -->
      <div class="section-card" v-if="hasDetailedAnalysis">
        <div class="section-title">
          <van-icon name="description" />
          <span>{{ $t('ai_analysis.detailed_title') }}</span>
        </div>
        <van-collapse v-model="activeDetailed" accordion>
          <van-collapse-item
            v-if="result.detailed_analysis?.technical"
            :title="$t('ai_analysis.detailed_technical')"
            name="technical"
          >
            {{ result.detailed_analysis.technical }}
          </van-collapse-item>
          <van-collapse-item
            v-if="result.detailed_analysis?.fundamental"
            :title="$t('ai_analysis.detailed_fundamental')"
            name="fundamental"
          >
            {{ result.detailed_analysis.fundamental }}
          </van-collapse-item>
          <van-collapse-item
            v-if="result.detailed_analysis?.sentiment"
            :title="$t('ai_analysis.detailed_sentiment')"
            name="sentiment"
          >
            {{ result.detailed_analysis.sentiment }}
          </van-collapse-item>
        </van-collapse>
      </div>

      <!-- Reasons & Risks -->
      <div class="section-card" v-if="reasons.length || risks.length">
        <div class="section-title">
          <van-icon name="bulb-o" />
          <span>{{ $t('ai_analysis.reasons') }} / {{ $t('ai_analysis.risks') }}</span>
        </div>
        <div class="reasons-block" v-if="reasons.length">
          <div class="block-head up">
            <van-icon name="arrow-up" />
            <span>{{ $t('ai_analysis.reasons') }}</span>
          </div>
          <ul class="list">
            <li v-for="(r, idx) in reasons" :key="'r-' + idx">{{ r }}</li>
          </ul>
        </div>
        <div class="reasons-block" v-if="risks.length">
          <div class="block-head down">
            <van-icon name="warning-o" />
            <span>{{ $t('ai_analysis.risks') }}</span>
          </div>
          <ul class="list">
            <li v-for="(r, idx) in risks" :key="'k-' + idx">{{ r }}</li>
          </ul>
        </div>
      </div>

      <!-- Crypto factors -->
      <div class="section-card" v-if="isCryptoResult && cryptoFactorRows.length">
        <div class="section-title">
          <van-icon name="fire-o" />
          <span>{{ $t('ai_analysis.crypto_factors_title') }}</span>
        </div>
        <div class="crypto-bias" :class="cryptoFactorScoreClass">
          {{ $t('ai_analysis.factor_bias') }}: <strong>{{ cryptoFactorScoreText }}</strong>
          <span v-if="result.crypto_factor_score != null" class="bias-num">
            {{ formatNumber(result.crypto_factor_score, 1) }}
          </span>
        </div>
        <p v-if="result.crypto_factor_summary" class="crypto-summary">{{ result.crypto_factor_summary }}</p>
        <div class="crypto-grid">
          <div v-for="row in cryptoFactorRows" :key="row.key" class="crypto-item">
            <div class="ci-label">{{ row.label }}</div>
            <div class="ci-value" :class="row.valueClass">{{ row.text }}</div>
          </div>
        </div>
      </div>

      <!-- Indicators -->
      <div class="section-card" v-if="hasIndicators">
        <div class="section-title">
          <van-icon name="chart-trending-o" />
          <span>{{ $t('ai_analysis.indicators_title') }}</span>
        </div>
        <div class="ind-grid">
          <div class="ind-cell" v-if="indicators.rsi">
            <div class="ind-name">RSI (14)</div>
            <div class="ind-val" :class="getRsiClass(indicators.rsi.value)">
              {{ formatNumber(indicators.rsi.value, 1) }}
            </div>
            <div class="ind-sig">{{ translateSignal(indicators.rsi.signal) }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.macd">
            <div class="ind-name">MACD</div>
            <div class="ind-val" :class="macdClass">{{ translateTrend(indicators.macd.trend) }}</div>
            <div class="ind-sig">{{ translateSignal(indicators.macd.signal) }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.moving_averages">
            <div class="ind-name">{{ $t('ai_analysis.ma_trend') }}</div>
            <div class="ind-val" :class="getMaTrendClass(indicators.moving_averages.trend)">
              {{ translateTrend(indicators.moving_averages.trend) }}
            </div>
          </div>
          <div class="ind-cell" v-if="indicators.volatility && indicators.volatility.atr != null">
            <div class="ind-name">ATR (14)</div>
            <div class="ind-val">{{ formatPrice(indicators.volatility.atr) }}</div>
            <div class="ind-sig">{{ $t('ai_analysis.atr_true_range') }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.bollinger && indicators.bollinger.BB_width != null">
            <div class="ind-name">{{ $t('ai_analysis.bb_width') }}</div>
            <div class="ind-val">{{ formatNumber(indicators.bollinger.BB_width, 2) }}%</div>
            <div class="ind-sig">{{ $t('ai_analysis.bb_width_hint') }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.price_position != null">
            <div class="ind-name">{{ $t('ai_analysis.range_pct') }}</div>
            <div class="ind-val">{{ formatNumber(indicators.price_position, 1) }}%</div>
          </div>
          <div class="ind-cell" v-if="indicators.volume_ratio != null">
            <div class="ind-name">{{ $t('ai_analysis.volume_ratio') }}</div>
            <div class="ind-val" :class="volumeRatioClass(indicators.volume_ratio)">
              {{ formatNumber(indicators.volume_ratio, 2) }}×
            </div>
          </div>
          <div class="ind-cell" v-if="indicators.levels?.support">
            <div class="ind-name">{{ $t('ai_analysis.support') }}</div>
            <div class="ind-val">{{ formatPrice(indicators.levels.support) }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.levels?.resistance">
            <div class="ind-name">{{ $t('ai_analysis.resistance') }}</div>
            <div class="ind-val">{{ formatPrice(indicators.levels.resistance) }}</div>
          </div>
          <div class="ind-cell" v-if="indicators.volatility?.level">
            <div class="ind-name">{{ $t('ai_analysis.volatility') }}</div>
            <div class="ind-val" :class="getVolatilityClass(indicators.volatility.level)">
              {{ translateVolatility(indicators.volatility.level) }}
            </div>
          </div>
        </div>

        <!-- Quant params (collapsible) -->
        <van-collapse v-if="professionalRows.length" v-model="activeQuant" class="quant-collapse">
          <van-collapse-item :title="$t('ai_analysis.quant_params_title')" name="quant">
            <div class="quant-grid">
              <div v-for="row in professionalRows" :key="row.key" class="quant-item">
                <span class="q-label">{{ row.label }}</span>
                <span class="q-val" :class="row.valueClass">{{ row.text }}</span>
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>
      </div>

      <!-- Feedback -->
      <div class="feedback-card" v-if="result.memory_id">
        <div class="fb-title">{{ $t('ai_analysis.feedback_title') }}</div>
        <div class="fb-actions">
          <van-button
            size="small"
            :type="userFeedback === 'helpful' ? 'primary' : 'default'"
            :loading="feedbackLoading === 'helpful'"
            @click="submitFeedback('helpful')"
          >
            <van-icon name="like-o" /> {{ $t('ai_analysis.feedback_helpful') }}
          </van-button>
          <van-button
            size="small"
            :type="userFeedback === 'not_helpful' ? 'danger' : 'default'"
            :loading="feedbackLoading === 'not_helpful'"
            @click="submitFeedback('not_helpful')"
          >
            <van-icon name="close" /> {{ $t('ai_analysis.feedback_not_helpful') }}
          </van-button>
        </div>
        <div class="fb-meta">
          <span v-if="result.analysis_time_ms != null">{{ $t('ai_analysis.analysis_time') }}: {{ result.analysis_time_ms }}ms</span>
          <span v-if="result.memory_id">{{ $t('ai_analysis.id_label') }}: #{{ result.memory_id }}</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-card">
      <van-icon name="flash" size="40" class="empty-icon" />
      <p>{{ $t('ai_analysis.no_result') }}</p>
    </div>

    <!-- Symbol picker -->
    <SymbolPicker
      v-model:show="showSymbolPicker"
      :default-market="form.market"
      :title="$t('ai_analysis.symbol_select')"
      @pick="onSymbolPicked"
    />
  </div>
</template>

<script>
import { showToast } from 'vant'
import { aiAnalysisApi, watchlistApi } from '@/api'
import { useAiAnalysisStore, useSettingsStore } from '@/stores'
import SymbolPicker from '@/components/SymbolPicker.vue'

const DEFAULT_TIMEFRAME = '4h'

export default {
  name: 'AiAnalysis',
  components: { SymbolPicker },
  data() {
    return {
      form: {
        market: 'Crypto',
        symbol: 'BTC/USDT',
        timeframe: DEFAULT_TIMEFRAME,
        language: 'zh-CN'
      },
      analyzing: false,
      showSymbolPicker: false,
      livePrice: null,
      liveChange: null,
      livePriceTimer: null,
      progress: 0,
      elapsedSeconds: 0,
      progressTimer: null,
      elapsedTimer: null,
      activeDetailed: 'technical',
      activeQuant: [],
      userFeedback: null,
      feedbackLoading: null
    }
  },
  computed: {
    aiStore() { return useAiAnalysisStore() },
    settingsStore() { return useSettingsStore() },
    result() { return this.aiStore.lastResult },
    stepList() {
      return [
        this.$t('ai_analysis.step_1'),
        this.$t('ai_analysis.step_2'),
        this.$t('ai_analysis.step_3'),
        this.$t('ai_analysis.step_4')
      ]
    },
    step() {
      if (this.progress < 25) return 1
      if (this.progress < 55) return 2
      if (this.progress < 85) return 3
      return 4
    },
    progressPercent() { return Math.round(this.progress * 10) / 10 },
    tradingPlan() {
      const r = this.result || {}
      const tp = r.trading_plan || {}
      return {
        entry_price: tp.entry_price ?? tp.entryPrice ?? r.entry_price,
        stop_loss: tp.stop_loss ?? tp.stopLoss ?? r.stop_loss,
        take_profit: tp.take_profit ?? tp.takeProfit ?? r.take_profit
      }
    },
    decisionText() {
      const d = String(this.result?.decision || '').toUpperCase()
      if (d.includes('BUY')) return this.$t('ai_analysis.decision_buy')
      if (d.includes('SELL')) return this.$t('ai_analysis.decision_sell')
      if (d) return this.$t('ai_analysis.decision_hold')
      return '-'
    },
    decisionTone() {
      const d = String(this.result?.decision || '').toUpperCase()
      if (d.includes('BUY')) return 'buy'
      if (d.includes('SELL')) return 'sell'
      return 'hold'
    },
    decisionIcon() {
      const d = String(this.result?.decision || '').toUpperCase()
      if (d.includes('BUY')) return 'arrow-up'
      if (d.includes('SELL')) return 'arrow-down'
      return 'pause-circle-o'
    },
    isHoldDecision() { return this.decisionTone === 'hold' },
    isCryptoResult() { return String(this.result?.market || '').toLowerCase() === 'crypto' },
    confidenceColor() {
      const c = Number(this.result?.confidence || 0)
      if (c >= 70) return '#34c759'
      if (c >= 50) return '#7c5cff'
      return '#ff9f0a'
    },
    confidenceOffset() {
      const c = Math.max(0, Math.min(100, Number(this.result?.confidence || 0)))
      const circumference = 2 * Math.PI * 42
      return (circumference * (100 - c) / 100).toFixed(2)
    },
    consensusBlock() {
      const c = this.result?.consensus
      if (!c || typeof c !== 'object') return null
      if (c.consensus_decision == null && c.consensus_score == null) return null
      return c
    },
    scoreList() {
      const s = this.result?.scores || {}
      return [
        { key: 'technical', label: this.$t('ai_analysis.score_technical'), icon: 'chart-trending-o', value: Number(s.technical || 50) },
        { key: 'fundamental', label: this.$t('ai_analysis.score_fundamental'), icon: 'gold-coin-o', value: Number(s.fundamental || 50) },
        { key: 'sentiment', label: this.$t('ai_analysis.score_sentiment'), icon: 'like-o', value: Number(s.sentiment || 50) },
        { key: 'overall', label: this.$t('ai_analysis.score_overall'), icon: 'medal-o', value: Number(s.overall || 50) }
      ]
    },
    trendOutlookRaw() { return this.result?.trend_outlook || this.result?.trendOutlook || null },
    trendOutlookSummaryText() {
      const s = this.result?.trend_outlook_summary || this.result?.trendOutlookSummary
      return s ? String(s).trim() : ''
    },
    trendOutlookBlocks() {
      const o = this.trendOutlookRaw
      if (!o || typeof o !== 'object') return []
      const keys = [
        { key: 'next_24h', labelKey: 'ai_analysis.outlook_24h' },
        { key: 'next_3d', labelKey: 'ai_analysis.outlook_3d' },
        { key: 'next_1w', labelKey: 'ai_analysis.outlook_1w' },
        { key: 'next_1m', labelKey: 'ai_analysis.outlook_1m' }
      ]
      return keys.map(({ key, labelKey }) => {
        const b = o[key] || {}
        return { key, label: this.$t(labelKey), trend: b.trend, score: b.score, strength: b.strength }
      }).filter((r) => {
        const b = o[r.key]
        return b && typeof b === 'object' && (b.trend != null || b.score != null)
      })
    },
    hasDetailedAnalysis() {
      const d = this.result?.detailed_analysis
      if (!d) return false
      return !!(d.technical || d.fundamental || d.sentiment)
    },
    reasons() {
      const r = this.result || {}
      if (Array.isArray(r.reasons)) return r.reasons
      return []
    },
    risks() {
      const r = this.result || {}
      if (Array.isArray(r.risks)) return r.risks
      if (Array.isArray(r.risk_factors)) return r.risk_factors
      return []
    },
    indicators() { return this.result?.indicators || {} },
    hasIndicators() {
      const ind = this.indicators
      return ind && Object.keys(ind).length > 0
    },
    macdClass() {
      const sig = this.indicators.macd?.signal
      if (sig === 'bullish') return 'up'
      if (sig === 'bearish') return 'down'
      return ''
    },
    professionalRows() {
      const ind = this.indicators
      const rows = []
      const add = (k, l, t, c = '') => {
        if (t === undefined || t === null || t === '') return
        rows.push({ key: k, label: l, text: String(t), valueClass: c })
      }
      const m = ind.macd || {}
      if (m.value != null) add('dif', 'MACD DIF', this.formatCompact(m.value))
      if (m.signal_line != null) add('dea', 'MACD DEA', this.formatCompact(m.signal_line))
      if (m.histogram != null) {
        const h = Number(m.histogram)
        add('hist', 'MACD Hist', this.formatCompact(m.histogram), h > 0 ? 'up' : h < 0 ? 'down' : '')
      }
      const ma = ind.moving_averages || {}
      if (ma.ma5 != null) add('ma5', 'MA(5)', this.formatPrice(ma.ma5))
      if (ma.ma10 != null) add('ma10', 'MA(10)', this.formatPrice(ma.ma10))
      if (ma.ma20 != null) add('ma20', 'MA(20)', this.formatPrice(ma.ma20))
      const bb = ind.bollinger || {}
      if (bb.BB_upper != null) add('bu', 'BB Upper', this.formatPrice(bb.BB_upper))
      if (bb.BB_middle != null) add('bm', 'BB Middle', this.formatPrice(bb.BB_middle))
      if (bb.BB_lower != null) add('bl', 'BB Lower', this.formatPrice(bb.BB_lower))
      const lv = ind.levels || {}
      if (lv.pivot != null) add('piv', 'Pivot', this.formatPrice(lv.pivot))
      if (lv.s1 != null) add('s1', 'S1', this.formatPrice(lv.s1))
      if (lv.r1 != null) add('r1', 'R1', this.formatPrice(lv.r1))
      if (lv.s2 != null) add('s2', 'S2', this.formatPrice(lv.s2))
      if (lv.r2 != null) add('r2', 'R2', this.formatPrice(lv.r2))
      const tl = ind.trading_levels || {}
      if (tl.risk_reward_ratio != null && Number(tl.risk_reward_ratio) > 0) {
        add('rr', 'R:R', '1 : ' + this.formatNumber(tl.risk_reward_ratio, 2))
      }
      return rows
    },
    cryptoFactorRows() {
      if (!this.isCryptoResult) return []
      const cf = this.result?.crypto_factors || {}
      const rows = []
      const add = (k, l, t, c = '') => {
        if (t === undefined || t === null || t === '') return
        rows.push({ key: k, label: l, text: String(t), valueClass: c })
      }
      const usd = (val) => {
        if (val == null || val === '') return '--'
        const num = parseFloat(val)
        if (Number.isNaN(num)) return '--'
        if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`
        if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`
        if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`
        return num.toFixed(2)
      }
      const pct = (val) => {
        if (val == null || val === '') return '--'
        const num = parseFloat(val)
        return Number.isNaN(num) ? '--' : `${num.toFixed(2)}%`
      }
      add('vol24', this.$t('ai_analysis.factor_volume'), usd(cf.volume_24h))
      add('volChg', this.$t('ai_analysis.factor_volume_change'), pct(cf.volume_change_24h),
        Number(cf.volume_change_24h) > 0 ? 'up' : Number(cf.volume_change_24h) < 0 ? 'down' : '')
      add('fund', this.$t('ai_analysis.factor_funding'), pct(cf.funding_rate),
        Number(cf.funding_rate) > 0 ? 'up' : Number(cf.funding_rate) < 0 ? 'down' : '')
      add('oi', this.$t('ai_analysis.factor_oi'), usd(cf.open_interest))
      add('oiChg', this.$t('ai_analysis.factor_oi_change'), pct(cf.open_interest_change_24h),
        Number(cf.open_interest_change_24h) > 0 ? 'up' : Number(cf.open_interest_change_24h) < 0 ? 'down' : '')
      add('lsr', this.$t('ai_analysis.factor_lsr'), this.formatCompact(cf.long_short_ratio))
      add('net', this.$t('ai_analysis.factor_netflow'), usd(cf.exchange_netflow),
        Number(cf.exchange_netflow) < 0 ? 'up' : Number(cf.exchange_netflow) > 0 ? 'down' : '')
      add('snet', this.$t('ai_analysis.factor_stable_netflow'), usd(cf.stablecoin_netflow),
        Number(cf.stablecoin_netflow) > 0 ? 'up' : Number(cf.stablecoin_netflow) < 0 ? 'down' : '')
      return rows
    },
    cryptoFactorScoreClass() {
      const score = Number(this.result?.crypto_factor_score)
      if (Number.isNaN(score)) return 'neutral'
      if (score >= 20) return 'up'
      if (score <= -20) return 'down'
      return 'neutral'
    },
    cryptoFactorScoreText() {
      const score = Number(this.result?.crypto_factor_score)
      if (Number.isNaN(score)) return '--'
      if (score >= 20) return this.$t('ai_analysis.outlook_bull')
      if (score <= -20) return this.$t('ai_analysis.outlook_bear')
      return this.$t('ai_analysis.outlook_neutral')
    }
  },
  created() {
    this.form.language = this.settingsStore.locale || 'zh-CN'
  },
  mounted() {
    this.refreshLivePrice()
    this.livePriceTimer = setInterval(() => this.refreshLivePrice(), 20000)
  },
  beforeUnmount() {
    this.stopProgress()
    if (this.livePriceTimer) {
      clearInterval(this.livePriceTimer)
      this.livePriceTimer = null
    }
  },
  methods: {
    openSymbolPicker() {
      this.showSymbolPicker = true
    },
    onSymbolPicked(item) {
      if (!item) return
      this.form.market = item.market || this.form.market
      this.form.symbol = item.symbol || this.form.symbol
      this.showSymbolPicker = false
      this.refreshLivePrice()
    },
    async refreshLivePrice() {
      const market = this.form.market
      const symbol = this.form.symbol
      if (!market || !symbol) {
        this.livePrice = null
        this.liveChange = null
        return
      }
      try {
        const res = await watchlistApi.getPrices([{ market, symbol }])
        const row = (res?.data || [])[0]
        if (row && row.price != null) {
          this.livePrice = Number(row.price)
          this.liveChange = row.changePercent != null ? Number(row.changePercent) : null
        } else {
          this.livePrice = null
          this.liveChange = null
        }
      } catch {
        this.livePrice = null
        this.liveChange = null
      }
    },
    startProgress() {
      this.progress = 0
      this.elapsedSeconds = 0
      this.progressTimer = setInterval(() => {
        const cap = 95
        if (this.progress < cap) {
          const delta = this.progress < 30 ? 1.5 : this.progress < 70 ? 0.9 : 0.3
          this.progress = Math.min(cap, this.progress + delta)
        }
      }, 400)
      this.elapsedTimer = setInterval(() => { this.elapsedSeconds += 1 }, 1000)
    },
    stopProgress() {
      if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null }
      if (this.elapsedTimer) { clearInterval(this.elapsedTimer); this.elapsedTimer = null }
    },
    stepClass(i) {
      if (this.step > i) return 'done'
      if (this.step === i) return 'active'
      return ''
    },
    async runAnalysis() {
      if (!this.form.symbol?.trim()) {
        showToast({ message: this.$t('ai_analysis.symbol_placeholder'), type: 'fail' })
        return
      }
      this.analyzing = true
      this.userFeedback = null
      this.startProgress()
      try {
        const res = await aiAnalysisApi.analyze({
          market: this.form.market,
          symbol: this.form.symbol.trim(),
          timeframe: this.form.timeframe,
          language: this.form.language
        })
        this.progress = 100
        this.aiStore.setLastResult(res?.data || null)
        this.refreshLivePrice()
      } catch (err) {
        const msg = err?.response?.data?.msg || err?.message || this.$t('ai_analysis.error_tip')
        showToast({ message: msg, type: 'fail' })
      } finally {
        this.stopProgress()
        this.analyzing = false
      }
    },
    async submitFeedback(type) {
      if (!this.result?.memory_id) {
        showToast({ message: this.$t('ai_analysis.feedback_failed'), type: 'fail' })
        return
      }
      this.feedbackLoading = type
      try {
        await aiAnalysisApi.submitFeedback({
          memory_id: this.result.memory_id,
          feedback: type
        })
        this.userFeedback = type
        showToast({ message: this.$t('ai_analysis.feedback_thanks'), type: 'success' })
      } catch (err) {
        showToast({ message: this.$t('ai_analysis.feedback_failed'), type: 'fail' })
      } finally {
        this.feedbackLoading = null
      }
    },
    formatPrice(val) {
      if (val == null) return '-'
      const n = Number(val)
      if (Number.isNaN(n)) return '-'
      if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
      if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
      return n.toFixed(6)
    },
    formatDelta(val) {
      const n = Number(val || 0)
      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
    },
    formatNumber(val, digits = 2) {
      const n = Number(val)
      if (!Number.isFinite(n)) return '--'
      return n.toFixed(digits)
    },
    formatCompact(val) {
      const n = Number(val)
      if (!Number.isFinite(n)) return '--'
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
      if (Math.abs(n) >= 1) return n.toFixed(2)
      return n.toPrecision(3)
    },
    getScoreColor(val) {
      const v = Number(val || 0)
      if (v >= 70) return '#34c759'
      if (v >= 50) return '#7c5cff'
      if (v >= 30) return '#ff9f0a'
      return '#ff5f57'
    },
    getRsiClass(val) {
      const v = Number(val)
      if (v >= 70) return 'down'
      if (v <= 30) return 'up'
      return ''
    },
    getMaTrendClass(trend) {
      const t = String(trend || '').toLowerCase()
      if (t.includes('up') || t.includes('golden') || t.includes('bull')) return 'up'
      if (t.includes('down') || t.includes('death') || t.includes('bear')) return 'down'
      return ''
    },
    getVolatilityClass(level) {
      const l = String(level || '').toLowerCase()
      if (l === 'high') return 'down'
      if (l === 'low') return 'up'
      return ''
    },
    volumeRatioClass(val) {
      const n = Number(val)
      if (n > 1.5) return 'up'
      if (n < 0.8) return 'down'
      return ''
    },
    translateSignal(sig) {
      const s = String(sig || '').toLowerCase()
      const map = {
        bullish: this.$t('ai_analysis.outlook_bull'),
        bearish: this.$t('ai_analysis.outlook_bear'),
        neutral: this.$t('ai_analysis.outlook_neutral'),
        overbought: '超买',
        oversold: '超卖'
      }
      return map[s] || sig || '--'
    },
    translateTrend(trend) {
      const t = String(trend || '').toLowerCase()
      if (t.includes('up') || t.includes('golden') || t.includes('bull')) return this.$t('ai_analysis.outlook_bull')
      if (t.includes('down') || t.includes('death') || t.includes('bear')) return this.$t('ai_analysis.outlook_bear')
      if (t) return this.$t('ai_analysis.outlook_neutral')
      return '--'
    },
    translateVolatility(level) {
      const l = String(level || '').toLowerCase()
      const locale = this.$i18n?.locale
      const isZh = locale === 'zh-CN' || locale === 'zh-TW'
      if (l === 'high') return isZh ? '高' : 'High'
      if (l === 'medium') return isZh ? '中' : 'Medium'
      if (l === 'low') return isZh ? '低' : 'Low'
      return '--'
    },
    formatOutlookTrend(trend) {
      const t = String(trend || '').toLowerCase()
      if (t.includes('bull') || t.includes('up')) return this.$t('ai_analysis.outlook_bull')
      if (t.includes('bear') || t.includes('down')) return this.$t('ai_analysis.outlook_bear')
      return this.$t('ai_analysis.outlook_neutral')
    },
    outlookTrendClass(trend) {
      const t = String(trend || '').toLowerCase()
      if (t.includes('bull') || t.includes('up')) return 'up'
      if (t.includes('bear') || t.includes('down')) return 'down'
      return 'neutral'
    },
    generateStrategyFromResult() {
      const sym = this.form.symbol.trim()
      const decision = String(this.result?.decision || '').toUpperCase()
      const locale = this.$i18n?.locale
      const isZh = locale === 'zh-CN' || locale === 'zh-TW'
      const prompt = isZh
        ? `基于 ${sym} (${this.form.timeframe}) 的 AI 分析建议 ${decision}，请生成一个合适的交易机器人参数。分析摘要：${this.result?.summary || ''}`
        : `Based on the AI analysis of ${sym} (${this.form.timeframe}) suggesting ${decision}, please generate suitable trading bot parameters. Summary: ${this.result?.summary || ''}`
      this.$router.push({ path: '/trading/create/ai', query: { prompt, symbol: sym } })
    }
  }
}
</script>

<style scoped>
.ai-page {
  min-height: 100%;
  padding-bottom: 40px;
}
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

/* Hero card */
.hero-card {
  margin: 8px 16px 14px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(320px 220px at 100% 0%, var(--c-red-soft), transparent 62%);
}
.hero-card > * { position: relative; }
.hero-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--c-red-soft);
  color: var(--c-red);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}
.hero-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}
.hero-desc {
  font-size: 12px;
  color: var(--text-2);
  margin: 0 0 14px;
  line-height: 1.5;
}
.symbol-picker-row {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}
.symbol-picker-row:active {
  background: var(--accent-soft);
}
.sp-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sp-label {
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sp-sym {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
}
.sp-market-tag {
  font-size: 11px;
  color: var(--text-3);
}
.sp-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--text-3);
}
.sp-price {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.sp-delta {
  font-size: 11px;
  font-weight: 700;
}
.sp-delta.up { color: var(--up); }
.sp-delta.down { color: var(--down); }

.analyze-btn {
  height: 48px;
  font-weight: 700;
  font-size: 15px;
}

/* Loading card */
.loading-card {
  margin: 0 16px 14px;
  padding: 22px 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.loading-head { display: flex; align-items: center; gap: 10px; }
.loading-icon { color: var(--accent); font-size: 22px; }
.loading-title { font-size: 15px; font-weight: 700; color: var(--text); }
.loading-desc { margin: 8px 0 18px; font-size: 12px; color: var(--text-2); }
.progress-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.progress-wrap .van-progress { flex: 1; }
.progress-text { font-size: 12px; color: var(--accent); font-weight: 700; min-width: 40px; text-align: right; }
.steps-list { display: flex; flex-direction: column; gap: 10px; }
.step-item { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-3); }
.step-item .step-dot {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px;
}
.step-item.done { color: var(--up); }
.step-item.done .step-dot { background: var(--up); border-color: var(--up); color: #ffffff; }
.step-item.active { color: var(--accent); }
.step-item.active .step-dot { border-color: var(--accent); color: var(--accent); }
.step-item.active .spinning { animation: spin 1.2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-footer { margin-top: 16px; font-size: 11px; color: var(--text-4); text-align: right; }

/* Result wrapper */
.result-wrapper { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }

/* Decision card */
.decision-card {
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.decision-card.buy {
  background: var(--up-soft);
  border-color: transparent;
}
.decision-card.sell {
  background: var(--down-soft);
  border-color: transparent;
}
.decision-card.hold {
  background: var(--warn-soft);
  border-color: transparent;
}
.decision-main { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.decision-badge {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--surface-deep);
  color: var(--text);
  font-size: 18px;
  font-weight: 700;
}
.decision-badge .van-icon { font-size: 20px; }
.decision-card.buy .decision-badge { color: var(--up); }
.decision-card.sell .decision-badge { color: var(--down); }
.decision-card.hold .decision-badge { color: var(--warn); }
.confidence-ring { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
.ring-svg { width: 100%; height: 100%; transform: rotate(0deg); }
.ring-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.ring-value { color: var(--text); font-weight: 800; font-size: 18px; line-height: 1; }
.ring-value small { font-size: 10px; color: var(--text-3); font-weight: 500; }
.ring-label { font-size: 9px; color: var(--text-3); margin-top: 3px; letter-spacing: 0.05em; }
.decision-summary {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--text);
  line-height: 1.7;
}
.consensus-strip {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--surface-deep);
  border-radius: 14px;
}
.consensus-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.consensus-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.c-item { display: flex; flex-direction: column; gap: 4px; }
.c-item em {
  font-style: normal; font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.c-item span { color: var(--text); font-weight: 700; font-size: 13px; }

/* Next step bar */
.next-step-bar {
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
}
.next-step-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(240px 160px at 0% 50%, var(--accent-soft), transparent 60%);
}
.next-step-bar > * { position: relative; }
.ns-label {
  display: flex; align-items: center; gap: 6px;
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
}
.ns-actions { display: flex; gap: 8px; }
.ns-actions .van-button { border-radius: 10px; font-weight: 600; }

/* Price row */
.price-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.price-card {
  padding: 14px;
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 6px;
}
.price-card .label {
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.price-card .value { font-size: 17px; font-weight: 700; color: var(--text); }
.price-card .value.up { color: var(--up); }
.price-card .value.down { color: var(--down); }
.price-card .delta { font-size: 11px; font-weight: 600; }
.price-card .delta.up { color: var(--up); }
.price-card .delta.down { color: var(--down); }
.price-card .hint { font-size: 10px; color: var(--text-4); }

/* Section card */
.section-card {
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
}
.section-title .van-icon { color: var(--accent); }

/* Scores */
.scores-row { display: flex; flex-direction: column; gap: 12px; }
.score-item .score-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 6px;
}
.score-item .score-num {
  margin-left: auto;
  color: var(--text);
  font-weight: 700;
}

/* Outlook */
.outlook-summary {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
}
.outlook-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.outlook-item {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.outlook-label { font-size: 10px; color: var(--text-3); margin-bottom: 4px; }
.outlook-trend { font-size: 14px; font-weight: 700; color: var(--text); }
.outlook-trend.up { color: var(--up); }
.outlook-trend.down { color: var(--down); }
.outlook-trend.neutral { color: var(--warn); }
.outlook-meta {
  display: flex; gap: 6px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-3);
}

/* Reasons / Risks */
.reasons-block + .reasons-block { margin-top: 14px; }
.block-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}
.block-head.up { color: var(--up); }
.block-head.down { color: var(--warn); }
.list {
  margin: 0; padding-left: 18px;
  color: var(--text);
  font-size: 12.5px;
  line-height: 1.7;
}
.list li { margin-bottom: 4px; }

/* Crypto */
.crypto-bias {
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--surface-deep);
  font-size: 12px;
  color: var(--text);
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}
.crypto-bias.up { border-left: 3px solid var(--up); }
.crypto-bias.down { border-left: 3px solid var(--down); }
.crypto-bias.neutral { border-left: 3px solid var(--warn); }
.bias-num { margin-left: auto; color: var(--text-2); font-weight: 700; }
.crypto-summary {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
}
.crypto-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.crypto-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.ci-label { font-size: 10px; color: var(--text-3); margin-bottom: 4px; }
.ci-value { font-size: 13px; font-weight: 700; color: var(--text); }
.ci-value.up { color: var(--up); }
.ci-value.down { color: var(--down); }

/* Indicators */
.ind-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.ind-cell {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 4px;
}
.ind-name { font-size: 10px; color: var(--text-3); }
.ind-val { font-size: 15px; font-weight: 700; color: var(--text); }
.ind-val.up { color: var(--up); }
.ind-val.down { color: var(--down); }
.ind-sig { font-size: 10px; color: var(--text-3); }

.quant-collapse { margin-top: 14px; }
:deep(.quant-collapse .van-collapse-item) {
  background: var(--surface-deep);
  border-radius: 12px;
  overflow: hidden;
}
:deep(.quant-collapse .van-cell),
:deep(.quant-collapse .van-collapse-item__content) {
  background: transparent;
  color: var(--text);
}
:deep(.quant-collapse .van-cell__title),
:deep(.quant-collapse .van-cell__value) { color: var(--text); }
.quant-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.quant-item {
  display: flex; justify-content: space-between; gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-raised);
  font-size: 11px;
}
.q-label { color: var(--text-3); }
.q-val { color: var(--text); font-weight: 600; }
.q-val.up { color: var(--up); }
.q-val.down { color: var(--down); }

/* Detailed analysis collapse */
:deep(.van-collapse) { border-radius: 12px; overflow: hidden; background: transparent; }
:deep(.van-collapse-item),
:deep(.van-collapse-item__title),
:deep(.van-collapse-item__content) { background: transparent; color: var(--text); }
:deep(.van-collapse-item__content) {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text);
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title) { color: var(--text); }

/* Feedback */
.feedback-card {
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: center;
}
.fb-title { font-size: 13px; color: var(--text); margin-bottom: 12px; }
.fb-actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
.fb-actions .van-button { border-radius: 10px; padding: 0 16px; }
.fb-meta {
  display: flex; justify-content: center; gap: 12px;
  font-size: 10px;
  color: var(--text-4);
}

/* Empty */
.empty-card {
  margin: 40px 24px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-strong);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-icon { color: var(--accent); opacity: 0.55; }
</style>
