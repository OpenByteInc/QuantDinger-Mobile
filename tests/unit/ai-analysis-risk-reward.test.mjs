import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  evidenceProviderTokens,
  formatEvidenceObservation,
  professionalReportArtifact,
  professionalReportEnvelope,
  reportHasRiskRewardWarning,
  reportRiskReward
} from '../../src/utils/professionalReport.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const report = (decision = 'BUY', ratio = 1.5) => ({
  schema_version: 'professional_report_v1',
  instrument: { market: 'Crypto', symbol: 'BTC/USDT', canonical_symbol: 'BTC/USDT' },
  decision_profile: { decision, confidence: 70 },
  risk_plan: { net_risk_reward: ratio, gross_risk_reward: 2, warnings: ratio < 1 ? ['net_risk_reward_below_one'] : [] }
})

test('mobile evidence values format money, percentages, ratios and metadata consistently', () => {
  const options = { locale: 'zh-CN', shareLabel: '股', countLabel: '项', bpsLabel: '个基点' }
  assert.equal(formatEvidenceObservation({ metric: 'financial.total_assets', value: 148524000000, unit: 'USD', currency: 'USD' }, options).display, '148.52B USD')
  assert.equal(formatEvidenceObservation({ metric: 'financial.shares_outstanding', value: 3949547394, unit: 'shares' }, options).display, '3.95B 股')
  assert.equal(formatEvidenceObservation({ metric: 'financial.revenue_growth', value: 9.5, unit: 'percent' }, options).display, '9.5%')
  assert.equal(formatEvidenceObservation({ metric: 'crypto.funding_rate', value: 0.005, unit: 'percent' }, options).display, '0.005%')
  assert.equal(formatEvidenceObservation({ metric: 'financial.current_ratio', value: 1.23456, unit: 'ratio' }, options).display, '1.235×')
  assert.equal(formatEvidenceObservation({ metric: 'indicator.rsi.value', value: 43.191, unit: 'percent' }, options).display, '43.191')
  assert.equal(formatEvidenceObservation({ metric: 'financial.source', value: 'yfinance', unit: 'USD', currency: 'USD' }, options), null)
  assert.deepEqual(evidenceProviderTokens('finnhub+yfinance+yfinance_statements'), ['finnhub', 'yfinance_statements'])
})

test('mobile analysis and AI hub negotiate and render only professional_report_v1', () => {
  const analysis = read('src/views/ai-analysis/index.vue')
  const hub = read('src/views/ai-hub/index.vue')
  const component = read('src/components/ProfessionalAnalysisReport.vue')

  assert.match(analysis, /<ProfessionalAnalysisReport/)
  assert.match(analysis, /:show-regenerate="false"/)
  assert.doesNotMatch(analysis, /runAnalysis|aiAnalysisApi|startProgress|SymbolPicker|ai_analysis\.analyze/)
  assert.match(hub, /response_contract: 'professional_report_v1'/)
  assert.match(hub, /professionalReportEnvelope/)
  assert.match(component, /evidence_snapshot/)
  assert.match(component, /data_quality/)
  assert.match(component, /decision_profile/)
  assert.match(component, /risk_plan/)
  assert.match(component, /reportCurrentPrice/)
  assert.match(component, /auditWarnings/)
  assert.doesNotMatch(analysis, /trading_plan|detailed_analysis|crypto_factors|trend_outlook/)
  assert.doesNotMatch(hub, /trading_plan|tradingPlan|report\?\.scores/)
})

test('professional envelope unwraps API and persisted-history shapes', () => {
  const direct = report()
  assert.equal(professionalReportArtifact(direct), direct)
  assert.equal(professionalReportArtifact({ professional_report: direct }), direct)
  assert.equal(professionalReportEnvelope({ code: 1, data: { report: direct, runtime: { memory_id: 7 } } }).runtime.memory_id, 7)
  assert.equal(professionalReportEnvelope({ decision: 'BUY', trading_plan: {} }), null)
})

test('net risk reward is used and compact HOLD summaries stay non-actionable', () => {
  assert.equal(reportRiskReward(report('BUY', 0.8)), 0.8)
  assert.equal(reportHasRiskRewardWarning(report('BUY', 0.8)), true)
  assert.equal(reportHasRiskRewardWarning(report('HOLD', 0.2)), false)
  const hold = report('HOLD', null)
  hold.risk_plan.candidate_setup = {
    net_risk_reward: 0.48,
    warnings: ['candidate_net_risk_reward_below_one']
  }
  assert.equal(reportHasRiskRewardWarning(hold), false)
})

test('history no longer invents entry, stop or take-profit values', () => {
  const history = read('src/utils/aiAnalysisHistory.js')

  assert.match(history, /Only a persisted/)
  assert.doesNotMatch(history, /buildTradingPlanFallback|price \* 1\.05|price \* 0\.95/)
  assert.doesNotMatch(history, /trading_plan|market_data/)
})

test('professional report localizes the common evidence and quality audit codes', () => {
  const locale = read('src/locales/professional-report.js')
  const component = read('src/components/ProfessionalAnalysisReport.vue')
  const hub = read('src/views/ai-hub/index.vue')

  for (const key of [
    'indicator_rsi_value',
    'indicator_moving_averages_trend',
    'insufficient_coverage',
    'stale_data',
    'conflicting_evidence',
    'instrument_identity_unverified',
    'crypto_scope_or_unit_validation_failed'
  ]) {
    assert.match(locale, new RegExp(`${key}:`))
  }

  for (const key of [
    'signal_line', 'suggested_stop_loss', 'bearish_alignment',
    'strong_uptrend', 'heuristic_estimate', 'previous_20_bars'
  ]) {
    assert.match(locale, new RegExp(`${key}:`))
  }

  assert.match(component, /metricPartLabel\(value\)/)
  assert.match(component, /scalarEvidenceValue\(value\)/)
  assert.match(component, /evidenceFormatOptions\(\)/)
  assert.match(component, /generatedDefaults/)
  assert.match(component, /riskPlan\?\.candidate_setup/)
  assert.match(component, /candidate_setup_desc/)
  assert.match(component, /@media \(max-width: 360px\)[\s\S]*?\.quality-grid, \.risk-grid \{ grid-template-columns: 1fr; \}[\s\S]*?\.market-snapshot \{ grid-template-columns: 1fr; \}/)
  assert.match(component, /\.evidence-collapse :deep\(\.van-cell\)[\s\S]*?color: var\(--text\)[\s\S]*?background: var\(--bg-elevated\)/)
  assert.match(component, /\.van-collapse-item__content[\s\S]*?background: var\(--bg-elevated\)/)
  assert.match(hub, /reportSummary\(report\)[\s\S]*?replace\(\/\\s\*\\\[/)
  assert.match(hub, /const displayPlan = plan\.candidate_setup \|\| plan/)
  assert.match(hub, /reportPlanIsCandidate\(report\)/)
})
