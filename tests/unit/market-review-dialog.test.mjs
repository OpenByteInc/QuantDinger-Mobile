import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('market detail exposes the purchased-user review flow', () => {
  const api = read('src/api/index.js')
  const detail = read('src/views/market/Detail.vue')

  assert.match(api, /getMyComment:\s*async/)
  assert.match(api, /indicators\/\$\{id\}\/comments\/\$\{commentId\}/)
  assert.match(detail, /canReview\(\)/)
  assert.match(detail, /this\.isPurchased\s*&&\s*!this\.indicator\?\.is_own/)
  assert.match(detail, /<van-rate\s+v-model="reviewRating"/)
  assert.match(detail, /async submitReview\(\)/)
})

test('confirmation dialogs share the mobile theme treatment', () => {
  const styles = read('src/styles/index.css')

  assert.match(styles, /\.van-dialog__header/)
  assert.match(styles, /\.van-dialog__footer/)
  assert.match(styles, /\.van-dialog__cancel/)
  assert.match(styles, /\.van-dialog__confirm/)
  assert.match(styles, /var\(--accent\)/)
})
