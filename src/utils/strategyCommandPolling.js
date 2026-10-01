const delay = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds))

export async function waitForStrategyCommand (
  fetchStatus,
  {
    timeoutMs = 60000,
    intervalMs = 1000,
    sleep = delay,
    now = () => Date.now(),
    shouldContinue = () => true
  } = {}
) {
  const deadline = now() + timeoutMs
  while (shouldContinue() && now() < deadline) {
    const response = await fetchStatus()
    const data = (response && response.data) || {}
    if (String(data.status || '') !== 'stopping') return response
    await sleep(intervalMs)
  }
  return null
}
