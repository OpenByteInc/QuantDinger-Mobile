<template>
  <div class="ai-page">
    <van-nav-bar :title="$t('ai_analysis.title')" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="clock-o" size="20" @click="$router.push('/ai-analysis/history')" />
      </template>
    </van-nav-bar>

    <section class="hero-card">
      <span class="hero-badge">{{ $t('ai_analysis.hero_badge') }}</span>
      <h1>{{ $t('professional_report.title') }}</h1>
      <p>{{ $t('ai_analysis.hero_hint') }}</p>

      <button type="button" class="symbol-picker-row" @click="showSymbolPicker = true">
        <span>
          <small>{{ $t('ai_analysis.symbol_label') }}</small>
          <strong>{{ form.symbol || $t('ai_analysis.symbol_select') }}</strong>
          <em v-if="form.symbol">{{ form.market }} · {{ form.timeframe }}</em>
        </span>
        <span class="live-quote">
          <strong v-if="livePrice != null">{{ formatPrice(livePrice) }}</strong>
          <em v-if="liveChange != null" :class="liveChange >= 0 ? 'up' : 'down'">
            {{ liveChange >= 0 ? '+' : '' }}{{ liveChange.toFixed(2) }}%
          </em>
          <van-icon v-if="livePrice == null" name="arrow" />
        </span>
      </button>

      <van-button
        type="primary"
        block
        round
        :loading="analyzing"
        :loading-text="$t('ai_analysis.analyzing')"
        @click="runAnalysis"
      >
        <van-icon name="flash" /> {{ $t('ai_analysis.analyze') }}
      </van-button>
    </section>

    <section v-if="analyzing" class="loading-card">
      <van-icon name="loading" class="spinning" />
      <strong>{{ $t('ai_analysis.analyzing') }}</strong>
      <p>{{ $t('ai_analysis.please_wait') }}</p>
      <van-progress :percentage="progressPercent" :show-pivot="false" color="#7c5cff" />
      <small>{{ $t('ai_analysis.elapsed') }}: {{ elapsedSeconds }}s</small>
    </section>

    <section v-else-if="analysisError" class="error-card">
      <van-icon name="warning-o" />
      <strong>{{ analysisError }}</strong>
      <van-button size="small" type="primary" @click="runAnalysis">{{ $t('ai_analysis.retry') }}</van-button>
    </section>

    <main v-else-if="result" class="report-wrap">
      <ProfessionalAnalysisReport :value="result" @regenerate="runAnalysis" />

      <section v-if="report" class="next-step-card">
        <div>
          <strong>{{ $t('ai_analysis.next_step') }}</strong>
          <span>{{ instrument.market }}:{{ instrument.canonical_symbol || instrument.symbol }}</span>
        </div>
        <van-button size="small" type="primary" @click="chooseStrategy">
          {{ $t('ai_analysis.choose_strategy') }}
        </van-button>
      </section>

      <section v-if="runtime.memory_id" class="feedback-card">
        <strong>{{ $t('ai_analysis.feedback_title') }}</strong>
        <div>
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
        <small>
          {{ $t('ai_analysis.analysis_time') }}: {{ runtime.analysis_time_ms || 0 }}ms ·
          {{ $t('ai_analysis.id_label') }}: #{{ runtime.memory_id }}
        </small>
      </section>
    </main>

    <van-empty v-else :description="$t('ai_analysis.no_result')" />

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
import { aiAnalysisApi, klineApi } from '@/api'
import ProfessionalAnalysisReport from '@/components/ProfessionalAnalysisReport.vue'
import SymbolPicker from '@/components/SymbolPicker.vue'
import { useAiAnalysisStore, useSettingsStore } from '@/stores'
import {
  professionalReportArtifact,
  professionalReportEnvelope,
  reportInstrument
} from '@/utils/professionalReport'

export default {
  name: 'AiAnalysis',
  components: { ProfessionalAnalysisReport, SymbolPicker },
  data() {
    return {
      form: { market: 'Crypto', symbol: 'BTC/USDT', timeframe: '1D', language: 'zh-CN' },
      analyzing: false,
      analysisError: '',
      showSymbolPicker: false,
      livePrice: null,
      liveChange: null,
      livePriceTimer: null,
      progress: 0,
      elapsedSeconds: 0,
      progressTimer: null,
      elapsedTimer: null,
      userFeedback: null,
      feedbackLoading: null
    }
  },
  computed: {
    aiStore() { return useAiAnalysisStore() },
    settingsStore() { return useSettingsStore() },
    result() { return this.aiStore.lastResult },
    report() { return professionalReportArtifact(this.result) },
    runtime() { return this.result?.runtime || {} },
    instrument() { return reportInstrument(this.result) },
    progressPercent() { return Math.round(this.progress * 10) / 10 }
  },
  created() {
    this.form.language = this.settingsStore.locale || 'zh-CN'
    if (this.$route.query.market) this.form.market = String(this.$route.query.market)
    if (this.$route.query.symbol) this.form.symbol = String(this.$route.query.symbol)
  },
  mounted() {
    this.applyResultToForm(this.result)
    this.refreshLivePrice()
    this.livePriceTimer = window.setInterval(() => this.refreshLivePrice(), 20000)
  },
  activated() {
    this.applyResultToForm(this.result)
    this.refreshLivePrice()
  },
  beforeUnmount() {
    this.stopProgress()
    if (this.livePriceTimer) window.clearInterval(this.livePriceTimer)
  },
  methods: {
    applyResultToForm(value) {
      const report = professionalReportArtifact(value)
      const instrument = report?.instrument || {}
      if (instrument.market) this.form.market = instrument.market
      if (instrument.canonical_symbol || instrument.symbol) this.form.symbol = instrument.canonical_symbol || instrument.symbol
      if (report?.evidence_snapshot?.timeframe) this.form.timeframe = report.evidence_snapshot.timeframe
      if (report?.language) this.form.language = report.language
    },
    onSymbolPicked(item) {
      if (!item) return
      this.form.market = item.market || this.form.market
      this.form.symbol = item.symbol || this.form.symbol
      this.showSymbolPicker = false
      this.refreshLivePrice()
    },
    startProgress() {
      this.progress = 8
      this.elapsedSeconds = 0
      this.progressTimer = window.setInterval(() => {
        if (this.progress < 92) this.progress += this.progress < 50 ? 1.1 : 0.35
      }, 500)
      this.elapsedTimer = window.setInterval(() => { this.elapsedSeconds += 1 }, 1000)
    },
    stopProgress() {
      if (this.progressTimer) window.clearInterval(this.progressTimer)
      if (this.elapsedTimer) window.clearInterval(this.elapsedTimer)
      this.progressTimer = null
      this.elapsedTimer = null
    },
    async runAnalysis() {
      if (this.analyzing) return
      if (!this.form.symbol?.trim()) {
        showToast({ message: this.$t('ai_analysis.symbol_placeholder'), type: 'fail' })
        return
      }
      this.analyzing = true
      this.analysisError = ''
      this.userFeedback = null
      this.startProgress()
      try {
        const response = await aiAnalysisApi.analyze({
          market: this.form.market,
          symbol: this.form.symbol.trim(),
          timeframe: this.form.timeframe,
          language: this.form.language,
          response_contract: 'professional_report_v1'
        })
        const envelope = professionalReportEnvelope(response)
        if (!envelope) throw new Error(this.$t('professional_report.contract_required_desc'))
        this.progress = 100
        this.aiStore.setLastResult(envelope)
        this.applyResultToForm(envelope)
        this.refreshLivePrice()
      } catch (error) {
        this.analysisError = error?.response?.data?.msg || error?.message || this.$t('ai_analysis.error_tip')
      } finally {
        this.stopProgress()
        this.analyzing = false
      }
    },
    async refreshLivePrice() {
      if (!this.form.market || !this.form.symbol) return
      try {
        const response = await klineApi.getPrice({ market: this.form.market, symbol: this.form.symbol })
        const row = response?.data
        this.livePrice = row?.price == null ? null : Number(row.price)
        this.liveChange = row?.changePercent == null ? null : Number(row.changePercent)
      } catch {
        this.livePrice = null
        this.liveChange = null
      }
    },
    async submitFeedback(type) {
      if (!this.runtime.memory_id) return
      this.feedbackLoading = type
      try {
        await aiAnalysisApi.submitFeedback({ memory_id: this.runtime.memory_id, feedback: type })
        this.userFeedback = type
        showToast({ message: this.$t('ai_analysis.feedback_thanks'), type: 'success' })
      } catch {
        showToast({ message: this.$t('ai_analysis.feedback_failed'), type: 'fail' })
      } finally {
        this.feedbackLoading = null
      }
    },
    chooseStrategy() {
      this.$router.push({ name: 'BotCreate' })
    },
    formatPrice(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      if (Math.abs(number) < 1) return number.toFixed(6)
      return number.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }
  }
}
</script>

<style scoped>
.ai-page { min-height: 100%; padding-bottom: 40px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title), :deep(.van-nav-bar .van-icon) { color: var(--text); }
.hero-card, .loading-card, .error-card, .feedback-card, .next-step-card { margin: 10px var(--page-gutter); padding: 17px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); }
.hero-card h1 { margin: 7px 0 5px; color: var(--text); font-size: 21px; }
.hero-card > p { margin: 0 0 14px; color: var(--text-2); font-size: 12px; line-height: 1.5; }
.hero-badge { padding: 4px 8px; border-radius: 999px; color: var(--accent); background: var(--accent-soft); font-size: 9px; font-weight: 800; letter-spacing: .08em; }
.symbol-picker-row { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 14px; padding: 13px; border: 1px solid var(--border); border-radius: 13px; color: inherit; background: var(--bg); text-align: left; }
.symbol-picker-row > span { display: grid; gap: 2px; }
.symbol-picker-row small, .symbol-picker-row em { color: var(--text-3); font-size: 10px; font-style: normal; }
.symbol-picker-row strong { color: var(--text); font-size: 16px; }
.live-quote { justify-items: end; }
.live-quote .up { color: var(--c-green); }
.live-quote .down { color: var(--c-red); }
.loading-card, .error-card { display: grid; justify-items: center; gap: 10px; color: var(--text-2); text-align: center; }
.loading-card .van-icon, .error-card .van-icon { color: var(--accent); font-size: 30px; }
.loading-card .van-progress { width: 100%; }
.loading-card p { margin: 0; font-size: 12px; }
.loading-card small { color: var(--text-3); }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.report-wrap { display: grid; gap: 10px; margin: 10px var(--page-gutter); }
.next-step-card, .feedback-card { margin: 0; }
.next-step-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.next-step-card > div { display: grid; gap: 3px; }
.next-step-card strong, .feedback-card > strong { color: var(--text); font-size: 13px; }
.next-step-card span, .feedback-card small { color: var(--text-3); font-size: 10px; }
.feedback-card { display: grid; gap: 10px; }
.feedback-card > div { display: flex; gap: 8px; }
</style>
