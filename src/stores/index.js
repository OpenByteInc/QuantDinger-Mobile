import { createPinia, defineStore } from 'pinia'
import { DEFAULT_SERVER_URL, DEFAULT_THEME } from '@/config'
import { initialLocale, setLocale as applyLocale } from '@/locales'

export const pinia = createPinia()

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: null,
    isLoggedIn: !!localStorage.getItem('token')
  }),

  actions: {
    setToken(token) {
      this.token = token
      this.isLoggedIn = !!token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    setUserInfo(info) {
      this.userInfo = info
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.isLoggedIn = false
      localStorage.removeItem('token')
    }
  }
})

export const useStrategyStore = defineStore('strategy', {
  state: () => ({
    strategies: [],
    loading: false
  }),

  getters: {
    statusCounts: (state) => {
      const counts = { running: 0, stopped: 0, error: 0, total: state.strategies.length }
      state.strategies.forEach((item) => {
        if (item.status === 'running') counts.running++
        else if (item.status === 'stopped') counts.stopped++
        else if (item.status === 'error') counts.error++
      })
      return counts
    },
    runningStrategies: (state) => state.strategies.filter((item) => item.status === 'running'),
    alertStrategies: (state) => state.strategies.filter((item) => item.status === 'error'),
    stoppedStrategies: (state) => state.strategies.filter((item) => item.status === 'stopped')
  },

  actions: {
    setStrategies(list) {
      this.strategies = Array.isArray(list) ? list : []
    },

    updateStrategy(id, patch) {
      const target = this.strategies.find((item) => item.id === id)
      if (target) {
        Object.assign(target, patch)
      }
    },

    setLoading(val) {
      this.loading = val
    }
  }
})

export const useCredentialsStore = defineStore('credentials', {
  state: () => ({
    items: [],
    egressIp: null,
    loading: false
  }),

  getters: {
    hasCredentials: (state) => state.items.length > 0,
    cryptoItems: (state) => state.items.filter((item) => !['ibkr', 'mt5'].includes(item.exchange_id))
  },

  actions: {
    setItems(list) {
      this.items = Array.isArray(list) ? list : []
    },

    setEgressIp(data) {
      this.egressIp = data || null
    },

    setLoading(val) {
      this.loading = val
    }
  }
})

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    summary: null,
    loading: false
  }),

  getters: {
    totalAssets: (state) => Number(state.summary?.total_equity || 0),
    totalPnl: (state) => Number(state.summary?.total_pnl || 0),
    realizedPnl: (state) => Number(state.summary?.total_realized_pnl || 0),
    unrealizedPnl: (state) => Number(state.summary?.total_unrealized_pnl || 0),
    positions: (state) => Array.isArray(state.summary?.current_positions) ? state.summary.current_positions : [],
    recentTrades: (state) => Array.isArray(state.summary?.recent_trades) ? state.summary.recent_trades : [],
    performance: (state) => (state.summary?.performance && typeof state.summary.performance === 'object') ? state.summary.performance : {},
    winRate: (state) => Number(state.summary?.performance?.win_rate || 0),
    totalTrades: (state) => Number(state.summary?.performance?.total_trades || 0),
    profitFactor: (state) => Number(state.summary?.performance?.profit_factor || 0),
    maxDrawdownPct: (state) => Number(state.summary?.performance?.max_drawdown_pct || 0),
    dailyPnlChart: (state) => Array.isArray(state.summary?.daily_pnl_chart) ? state.summary.daily_pnl_chart : [],
    todayPnl: (state) => {
      const list = Array.isArray(state.summary?.daily_pnl_chart) ? state.summary.daily_pnl_chart : []
      if (!list.length) return 0
      const today = new Date()
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const found = list.find((d) => d.date === key)
      return Number(found?.profit || 0)
    },
    aiStrategyCount: (state) => Number(state.summary?.ai_strategy_count || 0),
    indicatorStrategyCount: (state) => Number(state.summary?.indicator_strategy_count || 0)
  },

  actions: {
    setSummary(data) {
      this.summary = data
    },

    setLoading(val) {
      this.loading = val
    }
  }
})

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    serverUrl: localStorage.getItem('serverUrl') || DEFAULT_SERVER_URL,
    theme: localStorage.getItem('theme') || DEFAULT_THEME,
    locale: initialLocale
  }),

  actions: {
    setServerUrl(url) {
      this.serverUrl = url
      if (url) {
        localStorage.setItem('serverUrl', url)
      } else {
        localStorage.removeItem('serverUrl')
      }
    },

    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    },

    setLocale(locale) {
      this.locale = locale
      applyLocale(locale)
    }
  }
})

export const useAiAnalysisStore = defineStore('aiAnalysis', {
  state: () => ({
    history: [],
    total: 0,
    loading: false,
    lastResult: null
  }),

  actions: {
    setHistory(payload) {
      this.history = Array.isArray(payload?.list) ? payload.list : []
      this.total = Number(payload?.total || 0)
    },
    setLastResult(result) {
      this.lastResult = result || null
    },
    setLoading(val) {
      this.loading = val
    }
  }
})

export const useMarketStore = defineStore('market', {
  state: () => ({
    items: [],
    total: 0,
    loading: false,
    purchases: []
  }),

  actions: {
    setItems(list, total = 0) {
      this.items = Array.isArray(list) ? list : []
      this.total = Number(total || this.items.length)
    },
    setPurchases(list) {
      this.purchases = Array.isArray(list) ? list : []
    },
    setLoading(val) {
      this.loading = val
    }
  }
})

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0
  }),

  actions: {
    setNotifications(list) {
      this.notifications = Array.isArray(list) ? list : []
      this.unreadCount = this.notifications.filter((item) => !item.is_read && !item.read).length
    },

    setUnreadCount(count) {
      this.unreadCount = Number(count || 0)
    },

    markAsRead(id) {
      const notification = this.notifications.find((item) => item.id === id)
      if (notification && !notification.is_read && !notification.read) {
        notification.is_read = 1
        notification.read = true
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
    },

    markAllAsRead() {
      this.notifications.forEach((item) => {
        item.is_read = 1
        item.read = true
      })
      this.unreadCount = 0
    }
  }
})

export const useWatchlistStore = defineStore('watchlist', {
  state: () => ({
    items: [],
    activeSymbol: localStorage.getItem('watchlist_active_symbol') || '',
    activeMarket: localStorage.getItem('watchlist_active_market') || 'Crypto',
    loading: false
  }),

  getters: {
    cryptoItems: (state) => state.items.filter((i) => (i.market || '').toLowerCase() === 'crypto'),
    activeItem: (state) => state.items.find((i) => i.symbol === state.activeSymbol) || null
  },

  actions: {
    setItems(list) {
      this.items = Array.isArray(list) ? list : []
      if (!this.activeSymbol && this.items.length > 0) {
        const first = this.items.find((i) => (i.market || '').toLowerCase() === 'crypto') || this.items[0]
        if (first) {
          this.activeSymbol = first.symbol
          this.activeMarket = first.market || 'Crypto'
          localStorage.setItem('watchlist_active_symbol', this.activeSymbol)
          localStorage.setItem('watchlist_active_market', this.activeMarket)
        }
      }
    },

    setActive(symbol, market) {
      this.activeSymbol = symbol || ''
      if (market) this.activeMarket = market
      if (symbol) localStorage.setItem('watchlist_active_symbol', symbol)
      else localStorage.removeItem('watchlist_active_symbol')
      if (market) localStorage.setItem('watchlist_active_market', market)
    },

    setLoading(val) {
      this.loading = val
    }
  }
})

export const useQuickTradeStore = defineStore('quickTrade', {
  state: () => ({
    selectedCredentialId: null,
    marketType: 'swap',
    balance: null,
    positions: [],
    history: [],
    loading: false
  }),

  actions: {
    setSelectedCredential(id) {
      this.selectedCredentialId = id || null
    },

    setMarketType(type) {
      this.marketType = type || 'swap'
    },

    setBalance(data) {
      this.balance = data || null
    },

    setPositions(list) {
      this.positions = Array.isArray(list) ? list : []
    },

    setHistory(list) {
      this.history = Array.isArray(list) ? list : []
    },

    setLoading(val) {
      this.loading = val
    }
  }
})

export default pinia
