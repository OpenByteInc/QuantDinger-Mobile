import assert from 'node:assert/strict'
import test from 'node:test'
import { strategyStopFeedback } from '../../src/utils/strategyStopFeedback.js'

const t = key => key

test('queued stop and close remains informational', () => {
  const result = strategyStopFeedback({
    code: 1,
    data: { status: 'stopping', close_requested: true, command_id: 7 }
  }, t, true)

  assert.equal(result.type, 'loading')
  assert.equal(result.message, 'strategyV2.stopAndCloseQueued')
})

test('empty-position stop reports confirmed completion', () => {
  const result = strategyStopFeedback({
    code: 1,
    data: {
      status: 'stopped',
      close_requested: true,
      close_positions_found: 0,
      close_orders_queued: 0
    }
  }, t, true)

  assert.equal(result.type, 'success')
  assert.equal(result.message, 'strategyV2.stoppedNoPositions')
})

test('failed command never claims the strategy stopped', () => {
  const result = strategyStopFeedback({
    code: 0,
    data: { status: 'running', close_requested: true }
  }, t, true)

  assert.equal(result.type, 'fail')
  assert.equal(result.message, 'strategyV2.stopFailed')
})

test('backend lifecycle error keys remain localized by the caller', () => {
  const result = strategyStopFeedback({
    code: 0,
    msg: 'strategyV2.commandStatusUnavailable',
    data: null
  }, key => `translated:${key}`, true)

  assert.equal(result.type, 'fail')
  assert.equal(result.message, 'translated:strategyV2.commandStatusUnavailable')
})
