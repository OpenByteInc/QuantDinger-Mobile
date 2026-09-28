import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('custom accent palette keeps the requested exact colors', async () => {
  const [styles, settings] = await Promise.all([
    read('src/styles/v2.css'),
    read('src/stores/index.js')
  ])
  const colors = {
    crimson: '#d4042d',
    sunrise: '#db7a0e',
    sky: '#5a92e5',
    mint: '#50c878',
    pink: '#eb6d98',
    cyan: '#41b5c2',
    yellow: '#faca2e',
    plum: '#722169'
  }

  Object.entries(colors).forEach(([name, color]) => {
    assert.match(styles, new RegExp(`data-accent='${name}'[\\s\\S]*?--theme-accent: ${color}`))
    assert.match(settings, new RegExp(`['\"]${name}['\"]`))
  })
})

test('market hero uses neutral colors independent of the accent palette', async () => {
  const source = await read('src/views/v2/StrategyHub.vue')

  assert.match(source, /\.welcome-hero\{[^}]*border:1px solid rgba\(255,255,255,\.28\)/)
  assert.match(source, /\.welcome-copy span\{[^}]*color:#fff/)
  assert.match(source, /data-theme='light'[^\n]*\.welcome-copy span\{[^}]*color:#17191e/)
  assert.doesNotMatch(source, /\.welcome-copy span\{[^}]*var\(--v2-brand\)/)
})
