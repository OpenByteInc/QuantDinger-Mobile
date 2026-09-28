export function notificationPayload(item) {
  let value = item?.payload ?? item?.payload_json ?? {}
  if (typeof value === 'string') { try { value = JSON.parse(value) } catch { return {} } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function notificationFields(item) {
  const p = notificationPayload(item), d = p.display?.params || {}, s = p.signal || {}, instrument = p.instrument || {}, order = p.order || {}
  const security = p.display?.template === 'security.login' || item?.signal_type === 'security_login' || p.event === 'security.login'
  const rows = [
    ['account', d.nickname ?? p.nickname ?? p.details?.nickname],
    ['method', d.action ?? p.action ?? p.details?.action],
    ['source', d.strategyName ?? d.indicatorName ?? p.strategy?.name ?? p.indicator?.name ?? p.strategy_name],
    ['symbol', d.symbol ?? instrument.symbol ?? p.symbol ?? item?.symbol],
    ['signal', d.signalLabel ?? d.signalType ?? s.label ?? s.type ?? p.signal_type ?? p.action],
    ['timeframe', d.timeframe ?? instrument.timeframe ?? p.timeframe],
    ['reference', d.price ?? order.ref_price ?? s.price ?? p.trigger_price ?? p.price],
    ['mode', d.mode ?? p.trace?.mode],
    ['signalBar', d.signalBarTime ?? s.bar_time],
    ['notifyBar', d.notifyBarTime ?? s.notify_bar_time],
    ['stake', d.stake ?? order.stake_amount ?? p.stake_amount],
    ['quantity', p.quantity ?? order.quantity],
    ['orderId', d.pendingOrderId ?? p.trace?.pending_order_id ?? p.order_id],
    ['decision', p.final_decision], ['confidence', p.confidence], ['reasoning', p.reasoning],
    ['device', d.device ?? p.device ?? p.details?.device_label],
    ['location', d.location ?? p.location ?? p.details?.location],
    ['ip', d.ip ?? p.ip ?? p.ip_address]
  ]
  return rows.filter(([key])=>security ? ['account','method','device','location','ip'].includes(key) : !['account','method'].includes(key)).filter(([,value])=>value !== null && value !== undefined && String(value).trim() !== '' && value !== '-').map(([key,value])=>({key,value:String(value)}))
}

export function notificationCategory(item) {
  const p = notificationPayload(item)
  const kind = `${item.signal_type || ''} ${item.event_type || ''} ${p.event || ''} ${p.display?.template || ''}`.toLowerCase()
  if (/security|login|profile|system/.test(kind)) return 'system'
  if (/risk|error|fail|alert|expired|liquidat/.test(kind)) return 'alert'
  if (/trade|filled|order/.test(kind) && !/signal/.test(kind)) return 'trade'
  if (/signal|open_|close_|buy|sell|hold|monitor/.test(kind)) return 'signal'
  return 'system'
}

export function notificationTime(value) {
  if(value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value))
  const date = new Date(numeric ? Number(value) * (Number(value) < 1e12 ? 1000 : 1) : value)
  return Number.isFinite(date.getTime()) ? date : null
}
