import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  renderMobileMarkdown,
  renderMarkdownText,
  splitMarkdownTableRow
} from '../../src/utils/mobileMarkdown.mjs'

const aiHubSource = fs.readFileSync(new URL('../../src/views/ai-hub/index.vue', import.meta.url), 'utf8')
const chartSource = fs.readFileSync(new URL('../../src/components/ResearchChart.vue', import.meta.url), 'utf8')
const chartRuntimeSource = fs.readFileSync(new URL('../../src/utils/mobileEcharts.mjs', import.meta.url), 'utf8')

test('AI replies render GFM tables instead of exposing pipe syntax', () => {
  const html = renderMarkdownText([
    '| Scenario | Trigger | Target |',
    '|:---|:---:|---:|',
    '| Long | **78,251** | 81,075 |',
    '| Neutral | `74,888–78,251` | Wait |'
  ].join('\n'))

  assert.match(html, /class="md-table-wrap"/)
  assert.match(html, /<th class="md-align-left">Scenario<\/th>/)
  assert.match(html, /<th class="md-align-center">Trigger<\/th>/)
  assert.match(html, /<td class="md-align-right">81,075<\/td>/)
  assert.match(html, /<strong>78,251<\/strong>/)
  assert.doesNotMatch(html, /\|:---/)
})

test('table rows preserve escaped pipes and inline code pipes', () => {
  assert.deepEqual(splitMarkdownTableRow('| A \\| B | `x|y` | C |'), ['A | B', '`x|y`', 'C'])
})

test('Mermaid and JSON chart fences become chart blocks', () => {
  const labels = { series: 'Series', line: 'Line', bar: 'Bar' }
  const mermaid = renderMobileMarkdown([
    'Overview',
    '```mermaid',
    'xychart-beta',
    'x-axis [Mon, Tue, Wed]',
    'line [1, 3, 2]',
    '```'
  ].join('\n'), labels)
  assert.equal(mermaid[1].type, 'chart')
  assert.equal(mermaid[1].spec.type, 'line')

  const json = renderMobileMarkdown('```chart\n{"type":"bar","categories":["A","B"],"data":[2,4]}\n```', labels)
  assert.equal(json[0].type, 'chart')
  assert.equal(json[0].spec.type, 'bar')
})

test('unsafe HTML stays escaped and unsupported charts fall back to code', () => {
  const blocks = renderMobileMarkdown('<script>alert(1)</script>\n```mermaid\nsequenceDiagram\nA->>B: Hi\n```')
  assert.match(blocks[0].html, /&lt;script&gt;/)
  assert.equal(blocks[1].type, 'code')
})

test('AI research mounts responsive native chart rendering and scrollable tables', () => {
  assert.match(aiHubSource, /<ResearchChart/)
  assert.match(aiHubSource, /renderMobileMarkdown\(content/)
  assert.match(aiHubSource, /\.md-table-wrap/)
  assert.match(aiHubSource, /markdown_capabilities/)
  assert.match(chartSource, /ResizeObserver/)
  assert.match(chartSource, /import\('@\/utils\/mobileEcharts\.mjs'\)/)
  assert.match(chartRuntimeSource, /echarts\.use/)
})
