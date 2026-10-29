import axios from 'axios'
import { showToast } from 'vant'
import { resolveServerUrl } from '@/config'
import router from '@/router'
import { useUserStore } from '@/stores'
import { getLocale, t } from '@/locales'
import { apiErrorMessage } from '@/utils/apiError'

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

const unwrapItems = (data, key = 'items') => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

const asObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (_) {
    return {}
  }
}

const normalizeStrategy = (raw = {}) => {
  const tradingConfig = asObject(raw?.trading_config)
  const exchangeConfig = asObject(raw?.exchange_config)
  const notificationConfig = asObject(raw?.notification_config)

  const name = raw.strategy_name || raw.name || (raw.id ? t('trading.strategy_fallback', { id: raw.id }) : '')

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
    symbol: raw.symbol || tradingConfig.symbol || '',
    timeframe: raw.timeframe || tradingConfig.timeframe || '',
    initial_capital: raw.initial_capital ?? tradingConfig.initial_capital ?? 0,
    execution_mode: raw.execution_mode || tradingConfig.execution_mode || 'signal',
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
    const referralRewardErrors = {
      invalid_withdrawal_address: 'referral_rewards.invalidAddress',
      withdrawal_below_minimum: 'referral_rewards.invalidAmount',
      insufficient_reward_balance: 'referral_rewards.invalidAmount',
      unsupported_withdrawal_channel: 'referral_rewards.noCurrency',
      referral_program_disabled: 'referral_rewards.loadFailed'
    }
    if (referralRewardErrors[value]) return t(referralRewardErrors[value])
    if (/^(no data found[.!]?|No K-line data)$/i.test(value)) return t('api_errors.no_data')
    if (/^[a-zA-Z_]\w*(?:\.\w+)+$/.test(value)) {
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
    const full = router.currentRoute.value.fullPath || '/ai'
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
    const message = localizedApiMessage(apiErrorMessage(res))
    if (!response.config?.suppressErrorToast) showToast({ message, type: 'fail' })
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
          message = localizedApiMessage(apiErrorMessage(error.response.data))
      }
    } else if (error.message?.includes('timeout')) {
      message = t('api_errors.timeout')
    } else if (error.message?.includes('Network Error')) {
      message = t('api_errors.connection_failed')
    }

    if (!error.config?.suppressErrorToast) showToast({ message, type: 'fail' })
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

export const credentialsApi = {
  snapshot: (id) => http.get('/api/account/snapshot', {params:{credential_id:id},timeout:60000}),
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
  test: (data) => http.post('/api/credentials/test', data),
  updateName: (id, name) => http.put('/api/credentials/update-name', { id, name }),
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

export const quickTradeApi = {
  getBalance: async (credentialId, marketType = 'swap', product = null) => {
    const res = await http.get('/api/quick-trade/balance', {
      params: { credential_id: credentialId, market_type: marketType }
    })
    return {
      ...res,
      data: res.data || { available: 0, total: 0, currency: 'USDT' }
    }
  },
  getPosition: async ({ credentialId, symbol, marketType = 'swap', product = null }) => {
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
  cancelOrder: (tradeId) => http.post('/api/quick-trade/cancel-order', { trade_id: tradeId }),
  getHistory: async (params = {}) => {
    const res = await http.get('/api/quick-trade/history', { params })
    return {
      ...res,
      data: unwrapItems(res.data, 'trades')
    }
  },
  getPositionHistory: async (params = {}) => {
    const res = await http.get('/api/quick-trade/position-history', { params })
    return {
      ...res,
      data: {
        supported: res.data?.supported !== false,
        positions: unwrapItems(res.data, 'positions')
      }
    }
  },
  getPositionProtection: async (params = {}) => {
    const res = await http.get('/api/quick-trade/position-protection', { params })
    return {
      ...res,
      data: {
        supported: res.data?.supported !== false,
        orders: unwrapItems(res.data, 'orders')
      }
    }
  },
  updatePositionProtection: (payload) => http.post('/api/quick-trade/position-protection', payload)
}

export const strategyApi = {
  create: (payload) => http.post('/api/strategies', payload),
  update: (id, payload) => http.put(`/api/strategies/${id}`, payload),
  delete: (id) => http.delete(`/api/strategies/${id}`),
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
  stop: (id, closePositions = false) => http.post(`/api/strategies/${id}/stop`, {
    close_positions: Boolean(closePositions)
  }),
  getCommandStatus: (id, commandId) => http.get(
    `/api/strategies/${id}/commands/${commandId}`,
    { suppressErrorToast: true }
  ),
  getTradeLedger: async (id, limit = 100) => {
    const res = await http.get('/api/strategies/trades', {
      params: { id, limit }
    })
    const payload = res.data && typeof res.data === 'object' ? res.data : {}
    return {
      ...res,
      data: {
        items: unwrapItems(payload, 'trades').map(normalizeTrade),
        cost_summary: payload.cost_summary && typeof payload.cost_summary === 'object' ? payload.cost_summary : {},
        ledger_mode: payload.ledger_mode || ''
      }
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
  getPositionOwnership: async (id) => {
    const res = await http.get('/api/strategies/position-ownership', {
      params: { id }
    })
    return {
      ...res,
      data: res.data || { items: [], status: 'ok' }
    }
  },
  getGridRestingOrders: async (id, sync = false) => {
    const res = await http.get('/api/strategies/grid-resting-orders', {
      params: { id, sync: sync ? '1' : undefined }
    })
    return {
      ...res,
      data: res.data || { items: [], orders: [], summary: {} }
    }
  },
  repairPositionOwnership: (payload) => http.post('/api/strategies/position-ownership/repair', payload),
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
  getAiDecisions: async (id, limit = 100) => {
    const res = await http.get('/api/strategies/ai-decisions', {
      params: { id, limit }
    })
    return {
      ...res,
      data: ensureArray(res.data)
    }
  },
  getReviewHistory: async (id, params = {}) => {
    const res = await http.get('/api/strategies/review-report/history', {
      params: { id, ...params }
    })
    return {
      ...res,
      data: params.report_id ? (res.data || null) : ensureArray(res.data)
    }
  },
  generateReview: (id, payload = {}) => http.post('/api/strategies/review-report', payload, {
    params: { id },
    timeout: 180000
  }),
  getLogs: async (id, limit = 100) => {
    const res = await http.get('/api/strategies/logs', {
      params: { id, limit }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'logs')
    }
  },
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
  markAllNotificationsRead: () => http.post('/api/strategies/notifications/read-all')
}

export const aiAnalysisApi = {
  analyze: (payload) => http.post('/api/fast-analysis/analyze', payload, { timeout: 300000 }),
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
  deleteHistory: (memoryId) => http.delete(`/api/fast-analysis/history/${memoryId}`)
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
        page_size: Number(res.data?.page_size || 12),
        total_pages: Number(res.data?.total_pages || 0),
        asset_type_counts: {
          indicator: res.data?.asset_type_counts?.indicator === undefined
            ? undefined
            : Number(res.data.asset_type_counts.indicator || 0),
          script_template: res.data?.asset_type_counts?.script_template === undefined
            ? undefined
            : Number(res.data.asset_type_counts.script_template || 0)
        }
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
  getMyComment: async (id) => {
    const res = await http.get(`/api/community/indicators/${id}/my-comment`)
    return {
      ...res,
      data: res.data || null
    }
  },
  addComment: (id, payload = {}) => http.post(`/api/community/indicators/${id}/comments`, payload),
  updateComment: (id, commentId, payload = {}) => http.put(`/api/community/indicators/${id}/comments/${commentId}`, payload),
  getIndicatorPerformance: async (id) => {
    const res = await http.get(`/api/community/indicators/${id}/performance`)
    return {
      ...res,
      data: res.data || {}
    }
  },
  checkStrategyCompatibility: async (id, params = {}) => {
    const res = await http.get(`/api/community/indicators/${id}/compatibility`, { params })
    return { ...res, data: res.data || {} }
  },
  adaptStrategy: async (id, payload = {}) => {
    const res = await http.post(`/api/community/indicators/${id}/adapt`, payload)
    return { ...res, data: res.data || {} }
  }
}

export const watchlistApi = {
  getList: async () => {
    const res = await http.get('/api/market/watchlist/get')
    return {
      ...res,
      data: ensureArray(res.data?.watchlist || res.data).map((item) => ({
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
  }
}

export const aiChatApi = {
  getPreflight: () => http.get('/api/ai/agent/preflight'),
  sendMessage: (payload) => http.post('/api/ai/chat/message', payload, { timeout: 600000 }),
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
    let streamComplete = false
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
      return event
    }

    try {
      while (!streamComplete) {
        const { value, done } = await reader.read()
        if (done) {
          buffer += decoder.decode()
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split(/\r?\n\r?\n/)
        buffer = parts.pop() || ''
        for (const part of parts) {
          if (await handlePart(part) === 'done') {
            streamComplete = true
            break
          }
        }
        if (streamComplete) {
          try {
            await reader.cancel()
          } catch (_) {}
        }
      }
      if (!streamComplete && buffer.trim()) {
        streamComplete = await handlePart(buffer) === 'done'
      }
    } catch (error) {
      try {
        await reader.cancel()
      } catch (_) {}
      throw error
    }
    return { completed: streamComplete }
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
  deleteSession: (sessionId) => http.delete(`/api/ai/chat/sessions/${sessionId}`),
  getSessionMemory: (sessionId) => http.get(`/api/ai/chat/sessions/${sessionId}/memory`),
  clearSessionMemory: (sessionId) => http.delete(`/api/ai/chat/sessions/${sessionId}/memory`),
  getUserMemory: async () => {
    const res = await http.get('/api/ai/memory')
    return { ...res, data: ensureArray(res.data?.memories || res.data) }
  },
  updateUserMemory: (memoryId, payload) => http.patch(`/api/ai/memory/${memoryId}`, payload),
  deleteUserMemory: (memoryId) => http.delete(`/api/ai/memory/${memoryId}`)
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
  },
  previewChart: async (payload) => {
    const res = await http.post('/api/indicator/chart-preview', payload, { timeout: 45000 })
    return {
      ...res,
      data: res.data || null
    }
  }
}

export const userApi = {
  getProfile: () => http.get('/api/users/profile'),
  updateProfile: (data) => http.put('/api/users/profile/update', data),
  getNotificationSettings: () => http.get('/api/users/notification-settings'),
  updateNotificationSettings: (data) => http.put('/api/users/notification-settings', data),
  testNotificationSettings: () => http.post('/api/users/notification-settings/test'),
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

export const billingApi = {
  getReferralRewards: async (params = {}) => {
    const res = await http.get('/api/billing/referral-rewards', { params })
    return {
      ...res,
      data: {
        enabled: Boolean(res.data?.enabled),
        account: res.data?.account || {},
        ledger: ensureArray(res.data?.ledger),
        ledger_total: Number(res.data?.ledger_total || 0),
        withdrawals: ensureArray(res.data?.withdrawals),
        channels: ensureArray(res.data?.channels),
        minimum_withdrawal: Number(res.data?.minimum_withdrawal || 0),
        rates: ensureArray(res.data?.rates).map(Number).filter(Number.isFinite)
      }
    }
  },
  createReferralWithdrawal: (payload) => http.post('/api/billing/referral-rewards/withdrawals', payload),
  listCryptoChains: async (currency = 'USDT') => {
    const res = await http.get('/api/billing/crypto/chains', { params: { currency } })
    return {
      ...res,
      data: res.data || { chains: [], currency }
    }
  },
  getPlans: async () => {
    const res = await http.get('/api/billing/plans')
    return {
      ...res,
      data: res.data || {}
    }
  },
  createCryptoOrder: (plan, chain, currency = 'USDT') => http.post('/api/billing/crypto/create', {
    plan,
    chain,
    currency
  }),
  getCryptoOrder: (orderId, refresh = true) => http.get(`/api/billing/crypto/order/${orderId}`, {
    params: { refresh: refresh ? 1 : 0 }
  }),
  createStripeCheckout: (plan) => http.post('/api/billing/stripe/create', { plan, client: 'mobile' })
}

export default http

async function alpacaRequest(method, path, data = {}) {
  const response = await http.request({method, url: `/api/alpaca/${path}`, raw: true, ...(method === 'get' || method === 'delete' ? {params: data} : {data})})
  if (response?.success !== true) throw new Error(localizedApiMessage(response?.error || response?.message || 'api_errors.request_failed'))
  return response
}
export const alpacaApi = {
  account: params => alpacaRequest('get', 'account', {...params, include_counts: false}),
  positions: params => alpacaRequest('get', 'positions', params),
  orders: params => alpacaRequest('get', 'orders', params),
  placeOrder: payload => alpacaRequest('post', 'order', payload),
  cancelOrder: (id, params) => alpacaRequest('delete', `order/${encodeURIComponent(id)}`, params)
}

const DIRECT_BROKER_IDS = new Set(['tiger', 'webull'])

/**
 * @typedef {Object} BrokerOrderPayload
 * @property {string} symbol
 * @property {'buy'|'sell'} side
 * @property {number} quantity
 * @property {'market'|'limit'} orderType
 * @property {number=} price
 * @property {'USStock'|'HKStock'=} marketType
 */

/**
 * @typedef {Object} BrokerConnectionStatus
 * @property {boolean} connected
 * @property {number=} credential_id
 * @property {string=} environment
 * @property {boolean=} paper
 * @property {string=} error
 */

const brokerId = (value) => {
  const id = String(value || '').trim().toLowerCase()
  if (!DIRECT_BROKER_IDS.has(id)) throw new Error(t('broker_mobile.unsupported'))
  return id
}

async function brokerRequest(id, method, path, payload = {}) {
  const broker = brokerId(id)
  const response = await http.request({
    method,
    url: `/api/${broker}/${path}`,
    raw: true,
    ...(method === 'get' || method === 'delete' ? { params: payload } : { data: payload })
  })
  if (response?.success !== true) {
    throw new Error(localizedApiMessage(response?.error || response?.message || 'api_errors.request_failed'))
  }
  return { code: 1, data: response.data, message: response.message }
}

export const brokerApi = {
  accounts: (id) => brokerRequest(id, 'get', 'accounts'),
  status: (id, credentialId) => brokerRequest(id, 'get', 'status', { credential_id: credentialId }),
  connect: (id, payload) => brokerRequest(id, 'post', 'connect', payload),
  disconnect: (id, credentialId) => brokerRequest(id, 'post', 'disconnect', { credential_id: credentialId }),
  account: (id, credentialId) => brokerRequest(id, 'get', 'account', { credential_id: credentialId }),
  positions: (id, credentialId) => brokerRequest(id, 'get', 'positions', { credential_id: credentialId }),
  orders: (id, credentialId, params = {}) => brokerRequest(id, 'get', 'orders', { credential_id: credentialId, ...params }),
  fills: (id, credentialId, params = {}) => brokerRequest(id, 'get', 'fills', { credential_id: credentialId, ...params }),
  /** @param {string} id @param {number} credentialId @param {BrokerOrderPayload} payload */
  placeOrder: (id, credentialId, payload) => brokerRequest(id, 'post', 'order', { credential_id: credentialId, ...payload }),
  cancelOrder: (id, credentialId, orderId) => brokerRequest(id, 'delete', `order/${encodeURIComponent(orderId)}`, { credential_id: credentialId })
}
