export function strategyStopFeedback (response, translate, closePositions = false) {
  const data = (response && response.data) || {}
  const accepted = Boolean(response && (response.code === 1 || response.code === 200 || response.success))
  const closing = typeof data.close_requested === 'boolean' ? data.close_requested : closePositions
  const backendKey = typeof response?.msg === 'string' && response.msg.startsWith('strategyV2.')
    ? response.msg
    : ''
  let key = 'strategyV2.stopFailed'
  let type = 'fail'

  if (accepted && data.status === 'stopping') {
    key = closing ? 'strategyV2.stopAndCloseQueued' : 'strategyV2.stopQueued'
    type = 'loading'
  } else if (accepted) {
    const queued = Number(data.close_orders_queued || 0)
    const completed = Number(data.close_orders_completed || 0)
    if (closing && data.close_positions_found === 0) {
      key = 'strategyV2.stoppedNoPositions'
    } else {
      key = closing && completed > 0 && completed === queued
        ? 'strategyV2.stoppedAndVirtualCloseCompleted'
        : (closing ? 'strategyV2.stoppedAndCloseQueued' : 'strategyV2.paused')
    }
    type = 'success'
  } else if (data.status === 'stopped' && closing) {
    key = 'strategyV2.stopClosePartialFailure'
  }
  if (!accepted && backendKey) key = backendKey

  let message = translate(key)
  if (!accepted) {
    const details = Array.isArray(data.close_errors) ? data.close_errors : []
    const localized = details.map(reason => {
      const value = typeof reason === 'string' ? translate(reason) : ''
      return value && value !== reason ? value : ''
    }).filter(Boolean)
    if (localized.length) message += ` ${[...new Set(localized)].join(' ')}`
  }
  return { type, message }
}
