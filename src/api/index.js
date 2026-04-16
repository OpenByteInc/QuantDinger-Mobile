import axios from 'axios'
import { showToast } from 'vant'
import { DEFAULT_SERVER_URL } from '@/config'

const http = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const getBaseUrl = () => {
  const serverUrl = localStorage.getItem('serverUrl')?.trim()
  if (serverUrl) {
    return serverUrl.replace(/\/$/, '')
  }
  return DEFAULT_SERVER_URL
}

const ensureArray = (value) => Array.isArray(value) ? value : []

const unwrapItems = (data, key = 'items') => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

const normalizeStrategy = (raw = {}) => {
  const tradingConfig = raw?.trading_config && typeof raw.trading_config === 'object' ? raw.trading_config : {}
  const indicatorConfig = raw?.indicator_config && typeof raw.indicator_config === 'object' ? raw.indicator_config : {}
  const exchangeConfig = raw?.exchange_config && typeof raw.exchange_config === 'object' ? raw.exchange_config : {}
  const notificationConfig = raw?.notification_config && typeof raw.notification_config === 'object' ? raw.notification_config : {}

  const name = raw.name || raw.strategy_name || raw.group_base_name || (raw.id ? `策略 #${raw.id}` : '未命名策略')
  const indicatorName = raw.indicator_name ||
    indicatorConfig.indicator_name ||
    indicatorConfig.name ||
    indicatorConfig.display_name ||
    indicatorConfig.indicator ||
    tradingConfig.bot_name ||
    ''

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
    strategy_name: raw.strategy_name || name,
    type: raw.type || raw.strategy_type || '',
    symbol: raw.symbol || tradingConfig.symbol || '',
    timeframe: raw.timeframe || tradingConfig.timeframe || '',
    indicator_name: indicatorName,
    indicator: {
      ...(raw.indicator || {}),
      name: raw?.indicator?.name || indicatorName
    },
    trading_config: {
      ...tradingConfig,
      symbol: tradingConfig.symbol || raw.symbol || '',
      timeframe: tradingConfig.timeframe || raw.timeframe || '',
      initial_capital: tradingConfig.initial_capital || raw.initial_capital || 0,
      leverage: tradingConfig.leverage || raw.leverage || 1,
      market_type: tradingConfig.market_type || raw.market_type || ''
    },
    exchange_config: exchangeConfig,
    notification_config: notificationConfig,
    performance
  }
}

http.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseUrl()

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res?.code === 1 || res?.code === 200 || res?.success) {
      return res
    }
    if (response.status === 200 && !res?.code) {
      return { code: 1, data: res }
    }
    showToast({
      message: res?.msg || res?.message || '请求失败',
      type: 'fail'
    })
    return Promise.reject(new Error(res?.msg || res?.message || '请求失败'))
  },
  (error) => {
    let message = '网络错误'
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '未授权，请重新登录'
          localStorage.removeItem('token')
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求地址不存在'
          break
        case 500:
          message = '服务器错误'
          break
        default:
          message = error.response.data?.message || error.response.data?.msg || '请求失败'
      }
    } else if (error.message?.includes('timeout')) {
      message = '请求超时'
    } else if (error.message?.includes('Network Error')) {
      message = '网络连接失败，请检查服务器地址'
    }

    showToast({ message, type: 'fail' })
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => http.post('/api/auth/login', data),
  getSecurityConfig: () => http.get('/api/auth/security-config'),
  getInfo: () => http.get('/api/auth/info'),
  logout: () => http.post('/api/auth/logout')
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
  getList: async () => {
    const res = await http.get('/api/strategies')
    return {
      ...res,
      data: ensureArray(res.data?.strategies).map(normalizeStrategy)
    }
  },
  getDetail: async (id) => {
    const res = await http.get('/api/strategies/detail', {
      params: { id }
    })
    return {
      ...res,
      data: res.data ? normalizeStrategy(res.data) : null
    }
  },
  start: (id) => http.post('/api/strategies/start', null, {
    params: { id }
  }),
  stop: (id) => http.post('/api/strategies/stop', null, {
    params: { id }
  }),
  getTrades: async (id, limit = 50) => {
    const res = await http.get('/api/strategies/trades', {
      params: { id, limit }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'trades')
    }
  },
  getPositions: async (id) => {
    const res = await http.get('/api/strategies/positions', {
      params: { id }
    })
    return {
      ...res,
      data: unwrapItems(res.data, 'positions')
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
  testConnection: (data) => http.post('/api/strategies/test-connection', data),
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
  getBalance: async (credentialId, marketType = 'spot') => {
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
  getPosition: async ({ credentialId, symbol, marketType = 'spot' }) => {
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

export const userApi = {
  getProfile: () => http.get('/api/users/profile'),
  updateProfile: (data) => http.put('/api/users/profile/update', data),
  getNotificationSettings: () => http.get('/api/users/notification-settings'),
  updateNotificationSettings: (data) => http.put('/api/users/notification-settings', data),
  testNotificationSettings: () => http.post('/api/users/notification-settings/test'),
  changePassword: (data) => http.post('/api/users/change-password', data)
}

export default http
