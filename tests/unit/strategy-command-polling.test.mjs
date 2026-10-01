import assert from 'node:assert/strict'
import test from 'node:test'
import { waitForStrategyCommand } from '../../src/utils/strategyCommandPolling.js'

test('stop command polling resolves only after worker confirmation', async () => {
  const responses = [
    { code: 1, data: { status: 'stopping' } },
    { code: 1, data: { status: 'stopped', command_status: 'succeeded' } }
  ]
  let clock = 0
  const result = await waitForStrategyCommand(
    async () => responses.shift(),
    {
      timeoutMs: 1000,
      intervalMs: 10,
      now: () => clock,
      sleep: async milliseconds => { clock += milliseconds }
    }
  )

  assert.equal(result.data.status, 'stopped')
  assert.equal(result.data.command_status, 'succeeded')
})

test('stop command polling returns null on timeout', async () => {
  let clock = 0
  const result = await waitForStrategyCommand(
    async () => ({ code: 1, data: { status: 'stopping' } }),
    {
      timeoutMs: 20,
      intervalMs: 10,
      now: () => clock,
      sleep: async milliseconds => { clock += milliseconds }
    }
  )

  assert.equal(result, null)
})

test('stop command polling cancels when the view is destroyed', async () => {
  let active = true
  let requests = 0
  const result = await waitForStrategyCommand(
    async () => {
      requests += 1
      return { code: 1, data: { status: 'stopping' } }
    },
    {
      timeoutMs: 1000,
      intervalMs: 10,
      now: () => requests * 10,
      sleep: async () => { active = false },
      shouldContinue: () => active
    }
  )

  assert.equal(result, null)
  assert.equal(requests, 1)
})
