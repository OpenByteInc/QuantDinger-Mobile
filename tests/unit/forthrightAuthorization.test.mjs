import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

test('mobile restores saved authorization from the broker API response envelope', async () => {
  const source = fs.readFileSync(new URL('../../src/components/ForthrightUnlock.vue', import.meta.url), 'utf8')
  const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const scope = {
    ref: value => ({ value }), watch: () => {},
    defineProps: () => ({ credentialId: 18 }), useI18n: () => ({ t: key => key }),
    brokerApi: { authorization: async id => {
      assert.equal(id, 18)
      return { code: 1, data: { state: 'verified' } }
    }, unlock: () => { throw new Error('must not unlock on page load') } }
  }
  vm.runInNewContext(script + '\nresult = { restore, phase, busy }', scope)
  await scope.result.restore()
  assert.equal(scope.result.phase.value, 'unlocked')
  assert.equal(scope.result.busy.value, false)
})
