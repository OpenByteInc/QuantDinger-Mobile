import axios from 'axios'
import { showToast } from 'vant'
import { resolveServerUrl } from '@/config'
import router from '@/router'
import { useUserStore } from '@/stores'
import { getLocale, t } from '@/locales'

const http = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const getBaseUrl = () => {
  return resolveServerUrl()
}

const ensureArray = (value) => Array.isArray(value) ? value : []

/** Global market calendar: API may return { list: [] } / { events: [] } etc. */
const unwrapCalendarList = (data) => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const keys = ['items', 'list', 'events', 'calendar', 'records', 'rows', 'data']
  for (const k of keys) {
    const v = data[k]
    if (Array.isArray(v)) return v
  }
  return []
}

const parseNumericMetric = (val) => {
  if (val == null || val === '') return { text: '', num: null }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? { text: String(val), num: val } : { text: '', num: null }
  }
  const text = String(val).trim()
  if (!text) return { text: '', num: null }
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  const num = match ? Number(match[0]) : null
  return { text, num: Number.isFinite(num) ? num : null }
}

// Gold-impact rules are evaluated from top to bottom.
const GOLD_IMPACT_RULES = [
  { kw: /unemploy|jobless|initial\s*claims|失业|申请失业/, higherIs: 'bullish' },
  { kw: /cpi|inflation|ppi|pce|消费者物价|生产者物价|通胀|通膨/, higherIs: 'bullish' },
  { kw: /nonfarm|payroll|non[- ]?farm|非农|就业/, higherIs: 'bearish' },
  { kw: /gdp|国内生产总值/, higherIs: 'bearish' },
  { kw: /retail\s*sales|零售销售/, higherIs: 'bearish' },
  { kw: /pmi|ism|制造业|采购经理/, higherIs: 'bearish' },
  { kw: /industrial\s*production|工业产出|工业生产/, higherIs: 'bearish' },
  { kw: /durable\s*goods|耐用品/, higherIs: 'bearish' },
  { kw: /consumer\s*confidence|消费者信心/, higherIs: 'bearish' },
  { kw: /trade\s*balance|贸易差额|贸易逆差/, higherIs: 'bearish' },
  { kw: /housing|home\s*sales|住房/, higherIs: 'bearish' },
  { kw: /dollar\s*index|dxy|美元指数/, higherIs: 'bearish' },
  { kw: /fed\s*funds|interest\s*rate|rate\s*decision|利率决议|基准利率|federal\s*funds/, higherIs: 'bearish' }
]

const decideGoldImpact = (titleRaw, surprise) => {
  if (!surprise || surprise === 'inline') return null
  const t = String(titleRaw || '').toLowerCase()
  if (!t) return null
  const rule = GOLD_IMPACT_RULES.find(r => r.kw.test(t))
  if (!rule) return null
  const opposite = rule.higherIs === 'bullish' ? 'bearish' : 'bullish'
  return surprise === 'higher' ? rule.higherIs : opposite
}

const normalizeCalendarEvent = (ev) => {
  if (!ev || typeof ev !== 'object') return null
  const title =
    ev.title ??
    ev.event_title ??
    ev.event_name ??
    ev.name ??
    ev.event ??
    ev.subject ??
    ev.indicator ??
    ev.indicator_name ??
    ev.description ??
    ev.holiday_name ??
    ''
  const titleEn =
    ev.title_en ??
    ev.name_en ??
    ev.event_name_en ??
    ev.event_title_en ??
    ev.indicator_en ??
    ''
  const titleZh =
    ev.title_zh ??
    ev.name_zh ??
    ev.event_name_zh ??
    ev.event_title_zh ??
    ''
  const time =
    ev.time ??
    ev.event_time ??
    ev.datetime ??
    ev.date_time ??
    ev.date ??
    ev.scheduled ??
    '--'
  const country =
    ev.country ??
    ev.region ??
    ev.currency ??
    ev.currency_code ??
    ev.ccy ??
    ''
  const id = ev.id ?? ev.event_id ?? `${String(time)}-${String(title)}-${String(country)}`
  const impact = String(ev.impact ?? ev.importance ?? ev.level ?? '').toLowerCase()

  const actualMetric = parseNumericMetric(
    ev.actual ?? ev.actual_value ?? ev.actualValue ?? ev.value ?? ev.result
  )
  const forecastMetric = parseNumericMetric(
    ev.forecast ?? ev.forecast_value ?? ev.forecastValue ?? ev.expected ?? ev.consensus ?? ev.estimate
  )
  const previousMetric = parseNumericMetric(
    ev.previous ?? ev.previous_value ?? ev.previousValue ?? ev.prior ?? ev.last
  )

  let surprise = null // 'higher' | 'lower' | 'inline'
  if (actualMetric.num != null && forecastMetric.num != null) {
    if (actualMetric.num > forecastMetric.num) surprise = 'higher'
    else if (actualMetric.num < forecastMetric.num) surprise = 'lower'
    else surprise = 'inline'
  }

  const goldImpact = decideGoldImpact(title, surprise) // 'bullish' | 'bearish' | null

  return {
    ...ev,
    id,
    time: String(time),
    country: String(country),
    title: String(title || '--'),
    title_en: String(titleEn || ''),
    title_zh: String(titleZh || ''),
    impact,
    actual: actualMetric.text,
    forecast: forecastMetric.text,
    previous: previousMetric.text,
    actualNum: actualMetric.num,
    forecastNum: forecastMetric.num,
    previousNum: previousMetric.num,
    surprise,
    goldImpact
  }
}

/** Fear & Greed: PC/alternative.me often returns { value, classification } not fear_greed. */
const normalizeGlobalSentiment = (raw) => {
  if (raw == null) return null
  let d = raw
  if (typeof raw === 'string') {
    try {
      d = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof d !== 'object') return null
  if (d.data != null && typeof d.data === 'object' && !Array.isArray(d.data)) {
    const nested = d.data
    if (
      nested.value != null ||
      nested.fear_greed != null ||
      nested.classification != null ||
      (typeof nested.fear_greed === 'object' && nested.fear_greed !== null)
    ) {
      d = nested
    }
  }
  const inner =
    typeof d.fear_greed === 'object' && d.fear_greed !== null && !Array.isArray(d.fear_greed)
      ? d.fear_greed
      : d
  const fromNumber = typeof d.fear_greed === 'number' ? d.fear_greed : NaN
  const n = Number(
    inner.value ??
      inner.fear_greed ??
      (Number.isFinite(fromNumber) ? fromNumber : NaN) ??
      d.value ??
      NaN
  )
  if (!Number.isFinite(n)) return null
  return {
    fear_greed: Math.round(Math.max(0, Math.min(100, n))),
    classification: String(
      inner.classification ?? d.classification ?? inner.label ?? ''
    ).trim(),
    source: String(inner.source ?? d.source ?? ''),
    timestamp: inner.timestamp ?? d.timestamp
  }
}

const unwrapItems = (data, key = 'items') => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

const normalizeStrategy = (raw = {}) => {
  const tradingConfig = raw?.trading_config && typeof raw.trading_config === 'object' ? raw.trading_config : {}
  const exchangeConfig = raw?.exchange_config && typeof raw.exchange_config === 'object' ? raw.exchange_config : {}
  const notificationConfig = raw?.notification_config && typeof raw.notification_config === 'object' ? raw.notification_config : {}

  const name = raw.strategy_name || (raw.id ? t('trading.strategy_fallback', { id: raw.id }) : '')

  const performance = raw.performance && typeof raw.performance === 'object'
    ? raw.performance
    : {
        total_pnl: Number(raw.total_pnl || raw.total_profit || raw.pnl || 0),
        win_rate: Number(raw.win_rate || 0),
        total_trades: Number(raw.total_trades || 0),
        profit_factor: Number(raw.profit_factor || 0)
      }

  return {
    ...raw,
    name,
    symbol: raw.symbol || '',
    timeframe: raw.timeframe || '',
    trading_config: tradingConfig,
    exchange_config: exchangeConfig,
    notification_config: notificationConfig,
    performance
  }
}

const normalizePosition = (raw = {}) => ({
  ...raw,
  quantity: Number(raw.quantity ?? raw.qty ?? raw.size ?? raw.amount ?? 0),
  entry_price: Number(raw.entry_price ?? raw.avg_price ?? 0),
  current_price: Number(raw.current_price ?? raw.mark_price ?? raw.price ?? 0),
  unrealized_pnl: Number(raw.unrealized_pnl ?? raw.pnl ?? 0)
})

const normalizeTrade = (raw = {}) => ({
  ...raw,
  side: raw.side || raw.type || '',
  quantity: Number(raw.quantity ?? raw.qty ?? raw.amount ?? 0),
  trade_price: Number(raw.trade_price ?? raw.price ?? raw.entry_price ?? 0),
  pnl: Number(raw.net_pnl ?? raw.profit ?? raw.pnl ?? 0),
  value: Number(raw.value ?? raw.notional_value ?? 0),
  commission: Number(raw.total_commission ?? raw.commission ?? 0)
})

const localizedApiMessage = (message, fallbackKey = 'api_errors.request_failed') => {
  const value = String(message || '').trim()
  if (value) {
    if (/^no data found[.!]?$/i.test(value)) return t('api_errors.no_data')
    if (value.includes('.')) {
      const translated = t(value)
      if (translated && translated !== value) return translated
    }
    return value
  }
  return t(fallbackKey)
}

/** Credential submission failures must not redirect the whole app. */
const isAuthCredentialRequest = (url) =>
  /\/api\/auth\/(login|login-code|register|send-code|reset-password|mfa\/verify-login)(?:\?|$)/i.test(String(url || ''))

function clearAuthSession() {
  try {
    localStorage.removeItem('token')
    useUserStore().logout()
  } catch (_) {
    localStorage.removeItem('token')
  }
}

/** Clear an expired session and return to login when needed. */
function redirectToLoginIfNeeded(requestUrl) {
  if (isAuthCredentialRequest(requestUrl)) {
    clearAuthSession()
    return
  }
  clearAuthSession()
  try {
    if (router.currentRoute.value.path === '/login') return
    const full = router.currentRoute.value.fullPath || '/home'
    router.replace({ path: '/login', query: { redirect: full } })
  } catch (_) {
    // The router may not be ready during app bootstrap.
  }
}

/** Detect session-expiry envelopes returned with HTTP 200. */
function isSessionExpiredBusinessResponse(res) {
  if (!res || typeof res !== 'object') return false
  const code = res.code
  const msg = String(res.msg || res.message || '')
  if (code === 401) return true
  if (code === -1 || code === 403) {
    return /未登录|请重新登录|请登录|登录失效|登录过期|token|Token|会话|过期|失效|鉴权|unauthorized|invalid\s*token|挤掉|elsewhere|session/i.test(
      msg
    )
  }
  return false
}

http.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseUrl()

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const locale = getLocale()
    config.headers['Accept-Language'] = locale
    config.headers['X-App-Lang'] = locale
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => {
    const res = response.data
    if (response.config?.raw) {
      return res
    }
    if (res?.code === 1 || res?.code === 200 || res?.success) {
      return res
    }
    if (response.status === 200 && (res?.code === undefined || res?.code === null)) {
      return { code: 1, data: res }
    }
    const reqUrl = String(response.config?.url || '')
    if (isSessionExpiredBusinessResponse(res) && !isAuthCredentialRequest(reqUrl)) {
      redirectToLoginIfNeeded(reqUrl)
    }
    const message = localizedApiMessage(res?.msg || res?.message)
    showToast({ message, type: 'fail' })
    const error = new Error(message)
    error.backendMessage = res?.msg || res?.message || ''
    return Promise.reject(error)
  },
  (error) => {
    let message = t('api_errors.network_error')
    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (isAuthCredentialRequest(error.config?.url)) {
            message = localizedApiMessage(error.response.data?.message || error.response.data?.msg)
          } else {
            message = t('api_errors.unauthorized')
            redirectToLoginIfNeeded(error.config?.url)
          }
          break
        case 403:
          message = t('api_errors.forbidden')
          break
        case 404:
          message = t('api_errors.not_found')
          break
        case 500:
          message = localizedApiMessage(
            error.response.data?.message || error.response.data?.msg,
            'api_errors.server_error'
          )
          break
        default:
          message = localizedApiMessage(error.response.data?.message || error.response.data?.msg)
      }
    } else if (error.message?.includes('timeout')) {
      message = t('api_errors.timeout')
    } else if (error.message?.includes('Network Error')) {
      message = t('api_errors.connection_failed')
    }

    showToast({ message, type: 'fail' })
    error.localizedMessage = message
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => http.post('/api/auth/login', data),
  loginWithCode: (data) => http.post('/api/auth/login-code', data),
  verifyLoginMfa: (data) => http.post('/api/auth/mfa/verify-login', data),
  register: (data) => http.post('/api/auth/register', data),
  sendCode: (data) => http.post('/api/auth/send-code', data),
  resetPassword: (data) => http.post('/api/auth/reset-password', data),
  issueTurnstileClearance: (data) => http.post('/api/auth/turnstile-clearance', data),
  getSecurityConfig: () => http.get('/api/auth/security-config'),
  getInfo: () => http.get('/api/auth/info'),
  logout: () => http.post('/api/auth/logout'),
  changePassword: (data) => http.post('/api/auth/change-password', data)
}

export const dashboardApi = {
  getSummary: async () => {
    const res = await http.get('/api/dashboard/summary')
    return {
      ...res,
      data: res.data || {}
    }
  },
  getPendingOrders: async (params = {}) => {
    const res = await http.get('/api/dashboard/pendingOrders', { params })
    return {
      ...res,
      data: res.data || { items: [], total: 0 }
    }
  }
}

export const credentialsApi = {
  list: async () => {
    const res = await http.get('/api/credentials/list')
    return {
      ...res,
      data: unwrapItems(res.data)
    }
  },
  get: async (id) => {
    const res = await http.get('/api/credentials/get', {
      params: { id }
    })
    return {
      ...res,
      data: res.data || null
    }
  },
  create: (data) => http.post('/api/credentials/create', data),
  delete: (id) => http.delete('/api/credentials/delete', {
    params: { id }
  }),
  getEgressIp: async () => {
    const res = await http.get('/api/credentials/egress-ip')
    return {
      ...res,
      data: res.data || {}
    }
  }
}

export const strategyApi = {
  getTemplates: async (params = {}) => {
    const res = await http.get('/api/templates', { params })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getTemplate: async (key) => {
    const res = await http.get(`/api/templates/${key}`)
    return {
      ...res,
      data: res.data || null
    }
  },
  create: (payload) => http.post('/api/strategies', payload),
  update: (id, payload) => http.put(`/api/strategies/${id}`, payload),
  delete: (id) => http.delete(`/api/strategies/${id}`),
  generate: (payload) => http.post('/api/strategies/generate', payload, { timeout: 180000 }),
  getList: async () => {
    const res = await http.get('/api/strategies')
    return {
      ...res,
      data: ensureArray(res.data).map(normalizeStrategy)
    }
  },
  getDetail: async (id) => {
    const res = await http.get(`/api/strategies/${id}`)
    return {
      ...res,
      data: res.data ? normalizeStrategy(res.data) : null
    }
  },
  start: (id) => http.post(`/api/strategies/${id}/start`),
  stop: (id) => http.post(`/api/strategies/${id}/stop`),
  getTrades: async (id, limit = 50) => {
    const res = await http.get('/api/strategies/trades', {
      params: { id, limit }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'trades').map(normalizeTrade)
    }
  },
  getPositions: async (id) => {
    const res = await http.get('/api/strategies/positions', {
      params: { id }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'positions').map(normalizePosition)
    }
  },
  getEquityCurve: async (id) => {
    const res = await http.get('/api/strategies/equityCurve', {
      params: { id }
    })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getPerformance: async (id) => {
    const res = await http.get('/api/strategies/performance', {
      params: { id }
    })
    return {
      ...res,
      data: res.data || {}
    }
  },
  getLogs: async (id, limit = 100) => {
    const res = await http.get('/api/strategies/logs', {
      params: { id, limit }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'logs')
    }
  },
  testConnection: (data) => http.post('/api/strategies/exchange/test', data),
  getNotifications: async (params = {}) => {
    const res = await http.get('/api/strategies/notifications', { params })
    return {
      ...res,
      data: unwrapItems(res.data)
    }
  },
  getUnreadNotificationCount: async () => {
    const res = await http.get('/api/strategies/notifications/unread-count')
    return {
      ...res,
      data: res.data?.unread || 0
    }
  },
  markNotificationRead: (id) => http.post('/api/strategies/notifications/read', { id }),
  markAllNotificationsRead: () => http.post('/api/strategies/notifications/read-all'),
  clearNotifications: () => http.delete('/api/strategies/notifications/clear')
}

export const quickTradeApi = {
  getBalance: async (credentialId, marketType = 'swap') => {
    const res = await http.get('/api/quick-trade/balance', {
      params: {
        credential_id: credentialId,
        market_type: marketType
      }
    })
    return {
      ...res,
      data: res.data || { available: 0, total: 0, currency: 'USDT' }
    }
  },
  getPosition: async ({ credentialId, symbol, marketType = 'swap' }) => {
    const res = await http.get('/api/quick-trade/position', {
      params: {
        credential_id: credentialId,
        symbol,
        market_type: marketType
      }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'positions')
    }
  },
  placeOrder: (payload) => http.post('/api/quick-trade/place-order', payload),
  closePosition: (payload) => http.post('/api/quick-trade/close-position', payload),
  getHistory: async (params = {}) => {
    const res = await http.get('/api/quick-trade/history', { params })
    return {
      ...res,
      data: unwrapItems(res.data, 'trades')
    }
  }
}

export const aiAnalysisApi = {
  analyze: (payload) => http.post('/api/fast-analysis/analyze', payload, { timeout: 300000 }),
  getHistory: async (params = {}) => {
    const res = await http.get('/api/fast-analysis/history', { params })
    return {
      ...res,
      data: unwrapItems(res.data)
    }
  },
  getAllHistory: async (params = {}) => {
    const res = await http.get('/api/fast-analysis/history/all', { params })
    return {
      ...res,
      data: {
        list: ensureArray(res.data?.list),
        total: Number(res.data?.total || 0),
        page: Number(res.data?.page || 1),
        pagesize: Number(res.data?.pagesize || 20)
      }
    }
  },
  deleteHistory: (memoryId) => http.delete(`/api/fast-analysis/history/${memoryId}`),
  getPerformance: async (params = {}) => {
    const res = await http.get('/api/fast-analysis/performance', { params })
    return {
      ...res,
      data: res.data || {}
    }
  },
  submitFeedback: (payload) => http.post('/api/fast-analysis/feedback', payload),
  getSimilarPatterns: async (params = {}) => {
    const res = await http.get('/api/fast-analysis/similar-patterns', { params })
    return {
      ...res,
      data: res.data || {}
    }
  }
}

export const scriptSourceApi = {
  getList: async () => {
    const res = await http.get('/api/strategies/script-sources')
    return {
      ...res,
      data: unwrapItems(res.data, 'items')
    }
  },
  getDetail: async (id) => {
    const res = await http.get('/api/strategies/script-sources/detail', {
      params: { id }
    })
    return {
      ...res,
      data: res.data || null
    }
  },
  create: (payload) => http.post('/api/strategies/script-sources/create', payload),
  compile: async (sourceId) => {
    const res = await http.post('/api/strategies/script-sources/compile', { sourceId })
    return {
      ...res,
      data: res.data?.manifest || null
    }
  }
}

export const marketApi = {
  getIndicators: async (params = {}) => {
    const res = await http.get('/api/community/indicators', { params })
    return {
      ...res,
      data: {
        items: ensureArray(res.data?.items),
        total: Number(res.data?.total || 0),
        page: Number(res.data?.page || 1),
        page_size: Number(res.data?.page_size || 12)
      }
    }
  },
  getIndicator: async (id) => {
    const res = await http.get(`/api/community/indicators/${id}`)
    return {
      ...res,
      data: res.data || null
    }
  },
  purchase: (id) => http.post(`/api/community/indicators/${id}/purchase`),
  syncIndicator: (id) => http.post(`/api/community/indicators/${id}/sync`),
  getMyPurchases: async (params = {}) => {
    const res = await http.get('/api/community/my-purchases', { params })
    return {
      ...res,
      data: {
        items: ensureArray(res.data?.items),
        total: Number(res.data?.total || 0)
      }
    }
  },
  getComments: async (id, params = {}) => {
    const res = await http.get(`/api/community/indicators/${id}/comments`, { params })
    return {
      ...res,
      data: {
        items: ensureArray(res.data?.items),
        total: Number(res.data?.total || 0)
      }
    }
  },
  getIndicatorPerformance: async (id) => {
    const res = await http.get(`/api/community/indicators/${id}/performance`)
    return {
      ...res,
      data: res.data || {}
    }
  }
}

export const watchlistApi = {
  getList: async () => {
    const res = await http.get('/api/market/watchlist/get')
    return {
      ...res,
      data: ensureArray(res.data).map((item) => ({
        ...item,
        name: item.name || item.symbol
      }))
    }
  },
  add: (payload) => http.post('/api/market/watchlist/add', payload),
  remove: (item) => http.post('/api/market/watchlist/remove', typeof item === 'string' ? { symbol: item } : item),
  search: async (params) => {
    const res = await http.get('/api/market/symbols/search', { params })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getHot: async (params) => {
    const res = await http.get('/api/market/symbols/hot', { params })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getPrices: async (list) => {
    const res = await http.get('/api/market/watchlist/prices', {
      params: { watchlist: JSON.stringify(list || []) }
    })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  }
}

export const klineApi = {
  getKline: async ({
    market = 'Crypto',
    symbol,
    timeframe = '1h',
    limit = 200,
    beforeTime,
    exchangeId,
    marketType,
    instrumentId
  } = {}) => {
    const params = { market, symbol, timeframe, limit }
    if (beforeTime) params.before_time = beforeTime
    if (exchangeId) params.exchange_id = exchangeId
    if (marketType) params.market_type = marketType
    if (instrumentId) params.instrument_id = instrumentId
    const res = await http.get('/api/indicator/kline', { params })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getPrice: async ({ market = 'Crypto', symbol, exchangeId, marketType, instrumentId } = {}) => {
    const params = { market, symbol }
    if (exchangeId) params.exchange_id = exchangeId
    if (marketType) params.market_type = marketType
    if (instrumentId) params.instrument_id = instrumentId
    const res = await http.get('/api/market/price', { params })
    return {
      ...res,
      data: res.data || null
    }
  },
  getTicker: (symbol, market = 'Crypto') => klineApi.getPrice({ market, symbol })
}

export const aiChatApi = {
  sendMessage: (payload) => http.post('/api/ai/chat/message', payload, { timeout: 180000 }),
  streamMessage: async (payload, onEvent) => {
    const language = payload?.language || 'zh-CN'
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': language,
      'X-App-Lang': language,
      'Cache-Control': 'no-cache'
    }
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${getBaseUrl()}/api/ai/chat/message/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!response.ok || !response.body) {
      let message = `Stream API ${response.status}`
      try {
        const errorBody = await response.json()
        message = errorBody?.msg || errorBody?.message || message
      } catch (_) {}
      throw new Error(message)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    const handlePart = async (part) => {
      const lines = String(part || '').split(/\r?\n/)
      let event = 'message'
      const dataLines = []
      lines.forEach((line) => {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      })
      if (!dataLines.length) return
      let data = dataLines.join('\n')
      try {
        data = JSON.parse(data)
      } catch (_) {}
      if (typeof onEvent === 'function') await onEvent(event, data)
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() || ''
      for (const part of parts) {
        await handlePart(part)
      }
    }
    if (buffer.trim()) await handlePart(buffer)
  },
  saveLocalMessage: (payload) => http.post('/api/ai/chat/message/local', payload),
  getSessions: async (params = {}) => {
    const res = await http.get('/api/ai/chat/sessions', { params })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getHistory: async (params = {}) => {
    const res = await http.get('/api/ai/chat/history', { params })
    const data = res.data || {}
    return {
      ...res,
      data: {
        session: data.session || null,
        messages: ensureArray(data.messages || data)
      }
    }
  },
  deleteSession: (sessionId) => http.delete(`/api/ai/chat/sessions/${sessionId}`)
}

export const indicatorApi = {
  getList: async () => {
    const res = await http.get('/api/indicator/getIndicators')
    return {
      ...res,
      data: ensureArray(res.data?.indicators || res.data)
    }
  },
  getParams: async (id) => {
    const res = await http.get('/api/indicator/getIndicatorParams', { params: { indicator_id: id } })
    return {
      ...res,
      data: Array.isArray(res.data) ? res.data : (res.data?.params || [])
    }
  }
}

export const userApi = {
  getProfile: () => http.get('/api/users/profile'),
  updateProfile: (data) => http.put('/api/users/profile/update', data),
  getNotificationSettings: () => http.get('/api/users/notification-settings'),
  updateNotificationSettings: (data) => http.put('/api/users/notification-settings', data),
  testNotificationSettings: () => http.post('/api/users/notification-settings/test'),
  changePassword: (data) => http.post('/api/users/change-password', data),
  getMfaStatus: () => http.get('/api/users/mfa/status'),
  startMfaSetup: () => http.post('/api/users/mfa/setup/start', {}),
  confirmMfaSetup: (data) => http.post('/api/users/mfa/setup/confirm', data),
  disableMfa: (data) => http.post('/api/users/mfa/disable', data),
  getLoginLogs: async (params = {}) => {
    const res = await http.get('/api/users/login-logs', { params })
    const items = ensureArray(res.data?.items || res.data?.list)
    return {
      ...res,
      data: {
        list: items,
        items,
        total: Number(res.data?.total || 0),
        page: Number(res.data?.page || 1),
        page_size: Number(res.data?.page_size || 20),
        total_pages: Number(res.data?.total_pages || 0)
      }
    }
  },
  getMyCreditsLog: async (params = {}) => {
    const res = await http.get('/api/users/my-credits-log', { params })
    const items = ensureArray(res.data?.items || res.data?.list)
    return {
      ...res,
      data: {
        list: items,
        items,
        total: Number(res.data?.total || 0),
        page: Number(res.data?.page || 1),
        page_size: Number(res.data?.page_size || 20),
        total_pages: Number(res.data?.total_pages || 0)
      }
    }
  },
  getMyReferrals: async (params = {}) => {
    const res = await http.get('/api/users/my-referrals', { params })
    return {
      ...res,
      data: {
        list: ensureArray(res.data?.list),
        total: Number(res.data?.total || 0),
        referral_code: res.data?.referral_code || '',
        referral_bonus: Number(res.data?.referral_bonus || 0),
        register_bonus: Number(res.data?.register_bonus || 0)
      }
    }
  }
}

export const globalMarketApi = {
  getOverview: async () => {
    const res = await http.get('/api/global-market/overview')
    return {
      ...res,
      data: res.data || { indices: [] }
    }
  },
  getCalendar: async (params = {}) => {
    const res = await http.get('/api/global-market/calendar', { params })
    const list = unwrapCalendarList(res.data)
      .map(normalizeCalendarEvent)
      .filter(Boolean)
    return {
      ...res,
      data: list
    }
  },
  getSentiment: async () => {
    const res = await http.get('/api/global-market/sentiment')
    const normalized = normalizeGlobalSentiment(res.data)
    return {
      ...res,
      data: normalized
    }
  }
}

export const billingApi = {
  /**
   * v3.0.6+ — list enabled USDT chains so the chain picker can render
   * before the order is created. Chains without a configured receiving
   * address are filtered out by the backend, so the response can be
   * rendered verbatim.
   */
  listUsdtChains: async () => {
    const res = await http.get('/api/billing/usdt/chains')
    return {
      ...res,
      data: res.data || { chains: [] }
    }
  },
  getPlans: async () => {
    const res = await http.get('/api/billing/plans')
    return {
      ...res,
      data: res.data || {}
    }
  },
  purchase: (plan) => http.post('/api/billing/purchase', { plan }),
  createUsdtOrder: (plan, chain) => {
    const payload = { plan }
    if (chain) payload.chain = chain
    return http.post('/api/billing/usdt/create', payload)
  },
  getUsdtOrder: (orderId, refresh = true) => http.get(`/api/billing/usdt/order/${orderId}`, {
    params: { refresh: refresh ? 1 : 0 }
  })
}

export default http
