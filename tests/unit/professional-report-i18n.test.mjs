import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import messages from '../../src/locales/professional-report.js'

const source = readFileSync(new URL('../../src/components/ProfessionalAnalysisReport.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"]\s*$/gm, '')
const scope = {}
runInNewContext(script.replace('export default', 'component ='), scope)
const component = scope.component
const flatten = (value, prefix = '') => Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
  child && typeof child === 'object'
    ? Object.entries(flatten(child, `${prefix}${key}.`))
    : [[`${prefix}${key}`, child]]
)))

function reportView(locale) {
  const translations = flatten(messages[locale])
  const view = { $t: key => translations[key.replace('professional_report.', '')] || key }
  for (const [key, method] of Object.entries(component.methods)) view[key] = method.bind(view)
  return view
}

test('report copy is complete and translated in all five mobile languages', () => {
  const english = flatten(messages['en-US'])
  const abbreviations = new Set(['metric_part.rsi', 'metric_part.macd', 'metric_part.atr', 'capability.indicator_rsi_value'])
  assert.deepEqual(Object.keys(messages).sort(), ['en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'])
  for (const [locale, bundle] of Object.entries(messages)) {
    const actual = flatten(bundle)
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(english).sort(), locale)
    for (const [key, value] of Object.entries(actual)) {
      assert.equal(typeof value, 'string', `${locale}.${key}`)
      assert.ok(value.trim(), `${locale}.${key}`)
      assert.doesNotMatch(value, /undefined|\uFFFD/, `${locale}.${key}`)
      if (locale !== 'en-US' && !abbreviations.has(key)) {
        assert.notEqual(value, english[key], `${locale}.${key} still falls back to English`)
        assert.match(value, /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/, `${locale}.${key} must contain localized copy`)
      }
    }
  }
  assert.match(messages['zh-TW'].scenario_trigger.bull, /價格/)
  assert.match(messages['zh-TW'].quality_scope_note, /資料/)
})

test('legacy and current generated scenarios localize without replacing authored analysis', () => {
  const defaults = {
    bull: ['Price and evidence confirm the upside thesis.', '价格走势与支持证据共同确认乐观情景。'],
    base: ['Current evidence remains mixed or follows the central path.', '当前证据仍然分化，维持基准路径。'],
    bear: ['Downside catalyst or technical breakdown is confirmed.', '下行催化因素出现，或技术形态确认破位。']
  }
  for (const locale of Object.keys(messages)) {
    const view = reportView(locale)
    for (const [scenario, triggers] of Object.entries(defaults)) {
      for (const trigger of triggers) {
        assert.equal(view.scenarioText({ case: scenario, trigger }), messages[locale].scenario_trigger[scenario])
      }
      assert.equal(view.scenarioText({ case: scenario }), messages[locale].scenario_trigger[scenario])
    }
    const custom = 'Issuer-specific demand recovers above the documented threshold.'
    assert.equal(view.scenarioText({ case: 'bull', trigger: custom }), custom)
    assert.equal(view.researchNarrative({ kind: 'catalyst', text: custom }), custom)
  }
  assert.match(source, /item.kind === 'scenario' \? scenarioText\(\{ \.\.\.item, trigger: item.text \}\)/)
})

test('A-share workflow, quality scope, readiness and capability gaps use localized labels', () => {
  const capabilities = ['cn_equity_deep_dive_v1', 'company_profile', 'company.name', 'company_news', 'exchange_disclosures', 'northbound_flow', 'margin_financing', 'financial_statements', 'cn_macro', 'decision_ready', 'conditional', 'insufficient']
  for (const locale of Object.keys(messages)) {
    const view = reportView(locale)
    for (const capability of capabilities) {
      assert.equal(view.labelFor(capability, 'capability'), messages[locale].capability[capability.replace('.', '_')])
    }
  }
  const gaps = component.computed.missingItems.call({
    quality: { missing_metrics: ['company.name'] },
    report: { market_features: { missing_capabilities: ['company_news'] } },
    researchIntelligence: { missing_required_capabilities: ['company_profile'], missing_optional_capabilities: ['cn_macro', 'company_news'] }
  })
  assert.deepEqual(Array.from(gaps), ['company.name', 'company_news', 'company_profile', 'cn_macro'])
  assert.match(source, /professional_report\.quality_scope_note/)
})
