import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('mobile fast analysis shows final risk reward and low-ratio warning', () => {
  const analysis = read('src/views/ai-analysis/index.vue')
  const zh = read('src/locales/zh-CN.js')
  const en = read('src/locales/en-US.js')

  assert.match(analysis, /tp\.risk_reward_ratio \?\? tp\.riskRewardRatio/)
  assert.match(analysis, /tp\.rr_warning \?\? tp\.rrWarning/)
  assert.match(analysis, /hasLowRiskReward/)
  assert.match(analysis, /ai_analysis\.rr_warning_title/)
  assert.match(zh, /rr_warning_desc: '潜在收益低于计划风险/)
  assert.match(en, /rr_warning_desc: 'Potential reward is lower than planned risk/)
})
