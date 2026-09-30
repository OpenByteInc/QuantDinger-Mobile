import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { maskEmail } from '../../src/utils/privacy.js'
import appearance from '../../src/locales/appearance.js'

const creditsSource = await readFile(new URL('../../src/views/profile/Credits.vue', import.meta.url), 'utf8')
const languageSource = await readFile(new URL('../../src/views/profile/Language.vue', import.meta.url), 'utf8')
const profileSource = await readFile(new URL('../../src/views/v2/ProfileHub.vue', import.meta.url), 'utf8')

test('credit history uses backend pagination instead of a fixed first-page list', () => {
  assert.match(creditsSource, /<van-pagination/)
  assert.match(creditsSource, /page_size: this\.logPageSize/)
  assert.match(creditsSource, /async loadCreditsLog\(page = 1\)/)
  assert.match(creditsSource, /this\.logTotal = Number\(data\.total/)
})

test('display modes use visible icons and localized mode names', () => {
  assert.match(languageSource, /icon: 'bulb-o'/)
  assert.match(languageSource, /icon: 'closed-eye'/)
  assert.equal(appearance['zh-CN'].light, '白日模式')
  assert.equal(appearance['zh-CN'].dark, '暗黑模式')
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']) {
    assert.ok(appearance[locale].light)
    assert.ok(appearance[locale].dark)
  }
})

test('profile email is masked by default and can be revealed explicitly', () => {
  assert.equal(maskEmail('33@168.com'), '3***@168.com')
  assert.equal(maskEmail('administrator@example.com'), 'a******@example.com')
  assert.equal(maskEmail('invalid'), '******')
  assert.match(profileSource, /const emailVisible=ref\(false\)/)
  assert.match(profileSource, /emailVisible \? 'eye-o' : 'closed-eye'/)
  assert.match(profileSource, /profile_detail\.showEmail/)
})
