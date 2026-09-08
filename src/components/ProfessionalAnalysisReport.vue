<template>
  <section class="professional-report">
    <div v-if="!report" class="contract-warning">
      <van-icon name="warning-o" />
      <strong>{{ $t('professional_report.contract_required') }}</strong>
      <p>{{ $t('professional_report.contract_required_desc') }}</p>
      <van-button v-if="showRegenerate" size="small" type="primary" @click="$emit('regenerate')">
        {{ $t('professional_report.regenerate') }}
      </van-button>
    </div>

    <template v-else>
      <header :class="['report-header', decisionTone]">
        <div>
          <span class="kicker">{{ $t('professional_report.title') }}</span>
          <h2>{{ instrument.market }}:{{ instrument.canonical_symbol || instrument.symbol }}</h2>
          <p>{{ instrument.name || instrument.symbol }} · {{ tierLabel }}</p>
        </div>
        <div class="decision-panel">
          <strong>{{ decisionLabel }}</strong>
          <span>{{ formatNumber(decision.confidence, 0) }}%</span>
          <small>{{ $t('professional_report.model_strength') }}</small>
        </div>
      </header>

      <article class="market-snapshot">
        <div>
          <span>{{ $t('professional_report.current_price') }}</span>
          <strong>{{ money(currentPrice) }}</strong>
        </div>
        <div>
          <span>{{ $t('professional_report.price_change') }}</span>
          <strong :class="changeTone">{{ signedPercent(priceChange) }}</strong>
        </div>
        <div>
          <span>{{ $t('professional_report.timeframe') }}</span>
          <strong>{{ report.evidence_snapshot?.timeframe || '--' }}</strong>
        </div>
      </article>

      <article class="report-card summary-card">
        <h3><van-icon name="description" />{{ $t('professional_report.executive_summary') }}</h3>
        <p>{{ cleanText(report.executive_summary || decision.rationale) || '--' }}</p>
      </article>

      <article class="report-card quality-card">
        <h3><van-icon name="shield-o" />{{ $t('professional_report.data_quality') }}</h3>
        <div class="quality-top">
          <van-circle
            :current-rate="qualityPercent"
            :rate="qualityPercent"
            :color="qualityColor"
            :text="`${qualityPercent}%`"
            size="68px"
            layer-color="var(--border)"
          />
          <div class="quality-grid">
            <div><span>{{ $t('professional_report.coverage') }}</span><strong>{{ formatRatio(quality.coverage_ratio) }}</strong></div>
            <div><span>{{ $t('professional_report.freshness') }}</span><strong>{{ formatRatio(quality.freshness_ratio) }}</strong></div>
            <div><span>{{ $t('professional_report.conflict') }}</span><strong>{{ formatRatio(quality.conflict_ratio) }}</strong></div>
            <div><span>{{ $t('professional_report.conclusion_strength') }}</span><strong>{{ strengthLabel(quality.max_conclusion_strength) }}</strong></div>
          </div>
        </div>
        <div class="quality-meta">
          <span>{{ $t('professional_report.data_as_of') }}: {{ formatTime(safeDataAsOf) }}</span>
          <span>{{ instrument.timezone || 'UTC' }}</span>
        </div>
      </article>

      <div v-if="quality.directional_conclusion_allowed === false" class="quality-gate">
        <van-icon name="warning-o" />
        <div>
          <strong>{{ $t('professional_report.direction_blocked') }}</strong>
          <p>{{ $t('professional_report.direction_blocked_desc') }}</p>
        </div>
      </div>

      <article v-if="auditWarnings.length" class="report-card audit-card">
        <h3><van-icon name="warning-o" />{{ $t('professional_report.audit_warnings') }}</h3>
        <div class="tag-list risk-warnings">
          <span v-for="warning in auditWarnings" :key="warning" class="data-tag warning">{{ warningLabel(warning) }}</span>
        </div>
      </article>

      <article v-if="missingItems.length" class="report-card">
        <h3><van-icon name="warning-o" />{{ $t('professional_report.missing_data') }}</h3>
        <div class="tag-list">
          <span v-for="item in missingItems" :key="item" class="data-tag warning">{{ labelFor(item, 'capability') }}</span>
        </div>
      </article>

      <article v-if="dimensions.length" class="report-card">
        <h3><van-icon name="chart-trending-o" />{{ $t('professional_report.dimensions') }}</h3>
        <div class="dimension-list">
          <section v-for="item in dimensions" :key="item.key" class="dimension-item">
            <div class="item-head">
              <strong>{{ labelFor(item.key, 'dimension') }}</strong>
              <span :class="scoreTone(item.score)">{{ item.status === 'available' ? formatNumber(item.score, 0) : $t('professional_report.insufficient') }}</span>
            </div>
            <p>{{ cleanText(item.narrative) || $t('professional_report.no_narrative') }}</p>
            <div v-if="item.missing_data?.length" class="tag-list compact">
              <span v-for="missing in item.missing_data" :key="missing" class="data-tag">{{ labelFor(missing, 'capability') }}</span>
            </div>
          </section>
        </div>
      </article>

      <article v-if="scenarios.length" class="report-card">
        <h3><van-icon name="cluster-o" />{{ $t('professional_report.scenarios') }}</h3>
        <div class="scenario-list">
          <section v-for="scenario in scenarios" :key="scenario.case" :class="['scenario-item', `scenario-${scenario.case}`]">
            <div class="item-head">
              <strong>{{ labelFor(scenario.case, 'scenario') }}</strong>
              <span>{{ scenario.probability == null ? '--' : formatRatio(scenario.probability) }}</span>
            </div>
            <p>{{ scenarioText(scenario) }}</p>
            <div class="scenario-levels">
              <span>{{ $t('professional_report.target') }}: {{ money(scenario.target_price) }}</span>
              <span v-if="scenario.invalidation != null">{{ $t('professional_report.invalidation') }}: {{ invalidationText(scenario.invalidation) }}</span>
            </div>
          </section>
        </div>
      </article>

      <article v-if="riskPlan" class="report-card">
        <h3><van-icon name="shield-o" />{{ $t('professional_report.risk_plan') }}</h3>
        <div class="risk-grid">
          <div><span>{{ $t('ai_analysis.entry') }}</span><strong>{{ actionableMoney(riskPlan.entry_price) }}</strong></div>
          <div><span>{{ $t('ai_analysis.stop_loss') }}</span><strong>{{ actionableMoney(riskPlan.stop_loss) }}</strong></div>
          <div><span>{{ $t('ai_analysis.take_profit') }}</span><strong>{{ actionableMoney(riskPlan.take_profit) }}</strong></div>
          <div><span>{{ $t('professional_report.gross_rr') }}</span><strong>{{ riskReward(riskPlan.gross_risk_reward) }}</strong></div>
          <div :class="{ danger: hasLowRiskReward }"><span>{{ $t('professional_report.net_rr') }}</span><strong>{{ riskReward(riskPlan.net_risk_reward) }}</strong></div>
          <div><span>{{ $t('professional_report.position_cap') }}</span><strong>{{ percent(riskPlan.recommended_position_pct) }}</strong></div>
          <div><span>{{ $t('professional_report.risk_budget') }}</span><strong>{{ percent(riskPlan.risk_budget_pct) }}</strong></div>
          <div><span>{{ $t('professional_report.cost') }}</span><strong>{{ bps(riskPlan.estimated_roundtrip_cost_bps) }}</strong></div>
        </div>
        <div v-if="riskWarnings.length" class="tag-list risk-warnings">
          <span v-for="warning in riskWarnings" :key="warning" class="data-tag warning">{{ labelFor(warning, 'warning') }}</span>
        </div>
      </article>

      <article v-if="claims.length" class="report-card">
        <h3><van-icon name="link-o" />{{ $t('professional_report.claims') }}</h3>
        <section v-for="(claim, index) in claims" :key="claim.claim_id || index" class="claim-item">
          <span :class="['claim-kind', claim.kind]">{{ labelFor(claim.kind, 'claim') }}</span>
          <p>{{ cleanText(claim.text) }}</p>
          <small>{{ $t('professional_report.evidence_references') }}: {{ (claim.evidence_refs || []).join(', ') }}</small>
        </section>
      </article>

      <van-collapse v-if="evidence.length" v-model="activeEvidence" class="evidence-collapse">
        <van-collapse-item :title="$t('professional_report.evidence')" name="evidence">
          <section v-for="item in evidence" :key="item.evidence_id" class="evidence-item">
            <div class="item-head">
              <strong>{{ labelFor(item.metric, 'capability') }}</strong>
              <span>{{ evidenceValue(item) }}</span>
            </div>
            <small>{{ item.source }} · {{ formatTime(item.as_of) }}</small>
            <a v-if="safeUrl(item.source_url)" :href="safeUrl(item.source_url)" target="_blank" rel="noopener noreferrer">
              {{ $t('professional_report.open_source') }}
            </a>
          </section>
        </van-collapse-item>
      </van-collapse>

      <footer class="report-footer">
        <span>{{ report.schema_version }}</span>
        <span>{{ report.report_id }}</span>
        <span v-if="runtime.analysis_time_ms">{{ $t('ai_analysis.analysis_time') }}: {{ runtime.analysis_time_ms }}ms</span>
      </footer>
    </template>
  </section>
</template>

<script>
import {
  professionalReportArtifact,
  reportChangePercent,
  reportCurrentPrice,
  reportHasRiskRewardWarning
} from '@/utils/professionalReport'

export default {
  name: 'ProfessionalAnalysisReport',
  emits: ['regenerate'],
  props: {
    value: { type: Object, default: null },
    showRegenerate: { type: Boolean, default: true }
  },
  data() {
    return { activeEvidence: [] }
  },
  computed: {
    report() { return professionalReportArtifact(this.value) },
    runtime() { return this.value?.runtime || {} },
    instrument() { return this.report?.instrument || {} },
    decision() { return this.report?.decision_profile || {} },
    quality() { return this.report?.data_quality || {} },
    dimensions() { return Array.isArray(this.report?.dimensions) ? this.report.dimensions : [] },
    scenarios() { return Array.isArray(this.report?.scenarios) ? this.report.scenarios : [] },
    claims() { return Array.isArray(this.report?.claims) ? this.report.claims : [] },
    riskPlan() { return this.report?.risk_plan || null },
    riskWarnings() { return Array.isArray(this.riskPlan?.warnings) ? this.riskPlan.warnings : [] },
    auditWarnings() {
      return [...new Set([
        ...(this.quality.warnings || []),
        ...(this.decision.quality_gate_reasons || []),
        ...(this.report?.warnings || [])
      ])]
    },
    hasLowRiskReward() { return reportHasRiskRewardWarning(this.report) },
    currentPrice() { return reportCurrentPrice(this.report) },
    priceChange() { return reportChangePercent(this.report) },
    changeTone() {
      const value = Number(this.priceChange)
      if (!Number.isFinite(value) || value === 0) return ''
      return value > 0 ? 'score-good' : 'score-weak'
    },
    evidence() {
      const rows = this.report?.evidence_snapshot?.observations
      if (!Array.isArray(rows)) return []
      const referenced = new Set(this.claims.flatMap((claim) => claim.evidence_refs || []))
      return [...rows]
        .sort((a, b) => Number(referenced.has(b.evidence_id)) - Number(referenced.has(a.evidence_id)))
        .slice(0, 40)
    },
    missingItems() {
      return [...new Set([
        ...(this.quality.missing_metrics || []),
        ...(this.report?.market_features?.missing_capabilities || [])
      ])]
    },
    qualityPercent() {
      const direct = Number(this.quality.overall_score)
      if (Number.isFinite(direct)) return Math.max(0, Math.min(100, Math.round(direct)))
      const ratio = Number(this.quality.quality_score)
      return Number.isFinite(ratio) ? Math.max(0, Math.min(100, Math.round(ratio * 100))) : 0
    },
    qualityColor() {
      if (this.qualityPercent >= 85) return '#22c55e'
      if (this.qualityPercent >= 65) return '#f59e0b'
      return '#ef4444'
    },
    safeDataAsOf() {
      const asOf = new Date(this.report?.as_of).getTime()
      const generated = new Date(this.report?.generated_at).getTime()
      return Number.isFinite(asOf) && Number.isFinite(generated) && asOf > generated
        ? this.report.generated_at
        : this.report?.as_of
    },
    decisionTone() { return `decision-${String(this.decision.decision || 'HOLD').toLowerCase()}` },
    decisionLabel() {
      const key = `ai_analysis.decision_${String(this.decision.decision || 'HOLD').toLowerCase()}`
      return this.$t(key)
    },
    tierLabel() {
      return this.$t(this.report?.data_tier === 'professional' ? 'professional_report.professional_tier' : 'professional_report.community_tier')
    },
    quoteCurrency() { return this.instrument.quote_currency || 'USD' }
  },
  methods: {
    formatNumber(value, digits = 2) {
      const number = Number(value)
      return Number.isFinite(number) ? number.toFixed(digits) : '--'
    },
    formatRatio(value) {
      const number = Number(value)
      return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '--'
    },
    formatTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    },
    formatPrice(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      if (Math.abs(number) < 1) return number.toFixed(6)
      return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    },
    money(value) {
      const formatted = this.formatPrice(value)
      return formatted === '--' ? '--' : `${formatted} ${this.quoteCurrency}`
    },
    actionableMoney(value) {
      return String(this.decision.decision || '').toUpperCase() === 'HOLD' ? '--' : this.money(value)
    },
    percent(value) {
      return value == null || value === '' ? '--' : `${this.formatNumber(value, 2)}%`
    },
    signedPercent(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
    },
    bps(value) {
      return value == null || value === '' ? '--' : `${this.formatNumber(value, 0)} ${this.$t('professional_report.unit.bps')}`
    },
    riskReward(value) {
      return value == null || value === '' ? '--' : `1 : ${this.formatNumber(value, 2)}`
    },
    strengthLabel(value) { return this.labelFor(value || 'none', 'strength') },
    warningLabel(value) {
      const raw = String(value || '')
      if (raw.startsWith('confidence_capped:')) {
        return `${this.$t('professional_report.warning.confidence_capped')}: ${this.strengthLabel(raw.split(':')[1])}`
      }
      if (/^claim_\d+_/.test(raw)) return this.$t('professional_report.warning.claim_validation_failed')
      return this.labelFor(raw, 'warning')
    },
    labelFor(value, group) {
      const raw = String(value || '').trim()
      if (!raw) return '--'
      const normalized = this.normalizeToken(raw.replace(/^missing[._\s-]+/i, ''))
      const aliases = { crypto_funding_rate: 'funding_rate', crypto_open_interest: 'open_interest' }
      const key = `professional_report.${group}.${aliases[normalized] || normalized}`
      const translated = this.$t(key)
      if (translated !== key) return translated
      if (group === 'capability') {
        return raw.replace(/^missing[._\s-]+/i, '').split('.').filter(Boolean).map((part) => this.metricPartLabel(part)).join(' · ')
      }
      return raw.replace(/[._]/g, ' ')
    },
    normalizeToken(value) {
      return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    },
    metricPartLabel(value) {
      const raw = String(value || '').trim()
      if (!raw) return '--'
      const key = `professional_report.metric_part.${this.normalizeToken(raw)}`
      const translated = this.$t(key)
      if (translated !== key) return translated
      if (/^(?:ma|ema|sma|rsi|macd|s|r)\d+$/i.test(raw)) return raw.toUpperCase()
      return raw.replace(/_/g, ' ')
    },
    scoreTone(score) {
      const number = Number(score)
      if (number >= 70) return 'score-good'
      if (number >= 50) return 'score-neutral'
      return 'score-weak'
    },
    cleanText(value) {
      return String(value || '')
        .replace(/\s*\[(?:ev_[a-f0-9]+(?:\s*,\s*)?)+\]/gi, '')
        .replace(/\bstrong_downtrend\b/gi, this.enumLabel('strong_downtrend'))
        .replace(/\bstrong_uptrend\b/gi, this.enumLabel('strong_uptrend'))
        .replace(/\bbearish_alignment\b/gi, this.enumLabel('bearish_alignment'))
        .replace(/\bbullish_alignment\b/gi, this.enumLabel('bullish_alignment'))
        .replace(/\bbearish\b/gi, this.enumLabel('bearish'))
        .replace(/\bbullish\b/gi, this.enumLabel('bullish'))
        .replace(/\bGreed\b/g, this.enumLabel('greed'))
        .replace(/â€”|â€“/g, '—')
        .replace(/ï¿½|�/g, '')
    },
    scenarioText(scenario) {
      const direct = scenario?.trigger || (Array.isArray(scenario?.triggers) ? scenario.triggers.join('; ') : '') || scenario?.thesis
      const normalized = String(direct || '').trim().toLowerCase()
      const generatedDefaults = {
        'price and evidence confirm the upside thesis.': 'bull',
        'current evidence remains mixed or follows the central path.': 'base',
        'downside catalyst or technical breakdown is confirmed.': 'bear'
      }
      if (generatedDefaults[normalized]) return this.$t(`professional_report.scenario_trigger.${generatedDefaults[normalized]}`)
      if (direct) return this.cleanText(direct)
      return this.$t(`professional_report.scenario_trigger.${scenario?.case || 'base'}`)
    },
    invalidationText(value) {
      return typeof value === 'number' ? this.money(value) : this.cleanText(value)
    },
    evidenceValue(item) {
      const rawValue = item?.value
      if (rawValue && typeof rawValue === 'object') return this.structuredEvidenceValue(rawValue)
      const value = this.scalarEvidenceValue(rawValue)
      const isNumeric = typeof rawValue === 'number' || (typeof rawValue === 'string' && rawValue.trim() !== '' && Number.isFinite(Number(rawValue)))
      const unit = isNumeric ? this.evidenceUnit(item?.unit, item?.currency, item?.metric) : ''
      const currency = item?.currency && !unit.includes(item.currency) ? ` ${item.currency}` : ''
      return `${value}${unit}${currency}`
    },
    enumLabel(value) {
      const key = `professional_report.evidence_value.${this.normalizeToken(value)}`
      const translated = this.$t(key)
      return translated === key ? String(value || '--') : translated
    },
    scalarEvidenceValue(value) {
      if (value === null || value === undefined || value === '') return '--'
      if (typeof value === 'boolean') return this.enumLabel(value ? 'true' : 'false')
      if (typeof value !== 'string') return String(value)
      return this.enumLabel(value)
    },
    structuredEvidenceValue(value) {
      return Object.entries(value || {})
        .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== '')
        .map(([field, fieldValue]) => `${this.metricPartLabel(field)} ${this.scalarEvidenceValue(fieldValue)}`)
        .join(' · ') || '--'
    },
    evidenceUnit(value, currency, metric) {
      const normalized = this.normalizeToken(value)
      if (/(^|\.)rsi(\.|$)/i.test(String(metric || ''))) return ''
      if (!normalized || ['price', 'currency', 'ohlcv', 'mixed_earnings'].includes(normalized)) return ''
      if (normalized === 'percent') return '%'
      if (normalized === 'multiple') return '×'
      if (normalized === 'usd') return currency === 'USD' ? '' : ' USD'
      if (normalized === 'currency_per_share') return currency ? ` ${currency}/${this.$t('professional_report.unit.share')}` : `/${this.$t('professional_report.unit.share')}`
      const key = `professional_report.unit.${normalized}`
      const translated = this.$t(key)
      return translated === key ? ` ${value}` : ` ${translated}`
    },
    safeUrl(value) {
      try {
        const url = new URL(String(value || ''))
        return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
      } catch {
        return ''
      }
    }
  }
}
</script>

<style scoped>
.professional-report { display: grid; gap: 12px; }
.report-header { display: flex; justify-content: space-between; gap: 14px; padding: 18px; border-radius: 16px; color: #fff; background: linear-gradient(140deg, #12243c, #1f4169); }
.report-header > div:first-child { min-width: 0; }
.report-header h2 { margin: 4px 0; color: #fff; font-size: 20px; overflow-wrap: anywhere; }
.report-header p { margin: 0; color: rgb(255 255 255 / 68%); font-size: 12px; }
.kicker { color: #8cc8ff; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.decision-panel { display: grid; align-content: center; min-width: 92px; text-align: right; }
.decision-panel strong { font-size: 18px; }
.decision-panel span { font-size: 22px; font-weight: 800; }
.decision-panel small { color: rgb(255 255 255 / 60%); font-size: 9px; }
.decision-buy .decision-panel strong { color: #6ee7b7; }
.decision-sell .decision-panel strong { color: #fca5a5; }
.decision-hold .decision-panel strong { color: #fcd34d; }
.market-snapshot { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--border); border-radius: 13px; background: var(--border); }
.market-snapshot div { display: grid; gap: 4px; min-width: 0; padding: 12px; background: var(--bg-elevated); }
.market-snapshot span { color: var(--text-3); font-size: 9px; }
.market-snapshot strong { color: var(--text); font-size: 12px; overflow-wrap: anywhere; }
.report-card, .evidence-collapse, .contract-warning { padding: 15px; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-elevated); }
.report-card h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 12px; color: var(--text); font-size: 15px; }
.report-card h3 .van-icon { color: var(--accent); }
.report-card p { margin: 7px 0 0; color: var(--text-2); font-size: 13px; line-height: 1.7; }
.quality-top { display: grid; grid-template-columns: 76px 1fr; gap: 12px; align-items: center; }
.quality-grid, .risk-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.quality-grid div, .risk-grid div { display: grid; gap: 3px; padding: 9px; border-radius: 10px; background: var(--bg); }
.quality-grid span, .risk-grid span { color: var(--text-3); font-size: 10px; }
.quality-grid strong, .risk-grid strong { color: var(--text); font-size: 12px; overflow-wrap: anywhere; }
.quality-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; color: var(--text-3); font-size: 10px; }
.quality-gate { display: flex; gap: 10px; padding: 13px; border: 1px solid rgb(245 158 11 / 35%); border-radius: 12px; color: #f59e0b; background: rgb(245 158 11 / 9%); }
.quality-gate p { margin: 4px 0 0; color: var(--text-2); font-size: 12px; line-height: 1.5; }
.dimension-list, .scenario-list { display: grid; gap: 9px; }
.dimension-item, .scenario-item, .claim-item, .evidence-item { padding: 11px; border: 1px solid var(--border); border-radius: 11px; background: var(--bg); }
.item-head { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
.item-head strong { color: var(--text); font-size: 13px; }
.item-head span { color: var(--text-2); font-size: 12px; text-align: right; }
.scenario-item { border-left-width: 3px; }
.scenario-bull { border-left-color: #22c55e; }
.scenario-base { border-left-color: #f59e0b; }
.scenario-bear { border-left-color: #ef4444; }
.scenario-levels { display: grid; gap: 3px; margin-top: 8px; color: var(--text-3); font-size: 11px; }
.score-good { color: #22c55e !important; }
.score-neutral { color: #60a5fa !important; }
.score-weak, .danger strong { color: #fb7185 !important; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-list.compact, .risk-warnings { margin-top: 8px; }
.data-tag, .claim-kind { padding: 4px 7px; border-radius: 999px; color: var(--text-2); background: var(--bg); font-size: 10px; }
.data-tag.warning { color: #f59e0b; background: rgb(245 158 11 / 10%); }
.claim-item { display: grid; gap: 5px; margin-top: 8px; }
.claim-item p { margin: 0; }
.claim-item small, .evidence-item small { color: var(--text-3); font-size: 9px; overflow-wrap: anywhere; }
.claim-kind { width: fit-content; color: #60a5fa; background: rgb(96 165 250 / 10%); }
.claim-kind.risk { color: #fb923c; background: rgb(251 146 60 / 10%); }
.evidence-collapse { padding: 0; overflow: hidden; }
.evidence-collapse :deep(.van-cell) {
  color: var(--text);
  background: var(--bg-elevated);
}
.evidence-collapse :deep(.van-cell::after) { border-color: var(--border); }
.evidence-collapse :deep(.van-cell__right-icon) { color: var(--text-3); }
.evidence-collapse :deep(.van-collapse-item__content) {
  color: var(--text);
  background: var(--bg-elevated);
}
.evidence-item { margin-bottom: 8px; }
.evidence-item a { display: inline-block; margin-top: 5px; color: var(--accent); font-size: 11px; }
.report-footer { display: flex; flex-wrap: wrap; gap: 5px 12px; padding: 0 5px 14px; color: var(--text-3); font-size: 9px; overflow-wrap: anywhere; }
.contract-warning { display: grid; justify-items: start; gap: 8px; color: #f59e0b; }
.contract-warning .van-icon { font-size: 26px; }
.contract-warning p { margin: 0; color: var(--text-2); font-size: 12px; line-height: 1.6; }
@media (max-width: 360px) {
  .report-header { display: grid; }
  .report-header > div:first-child { min-width: 0; }
  .report-header h2 { overflow-wrap: anywhere; }
  .decision-panel { text-align: left; }
  .quality-top { grid-template-columns: 1fr; }
  .quality-grid, .risk-grid { grid-template-columns: 1fr; }
  .market-snapshot { grid-template-columns: 1fr; }
}
</style>
