import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores'
import { t } from '@/locales'

const routes = [
  {
    path: '/',
    redirect: '/ai'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { titleKey: 'login.title', showTabbar: false, public: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home/index.vue'),
    meta: { titleKey: 'tabs.home', showTabbar: true }
  },
  {
    path: '/trading',
    name: 'Trading',
    component: () => import('@/views/trading/index.vue'),
    meta: { titleKey: 'trading.title', showTabbar: true }
  },
  {
    path: '/trading/strategy/:id',
    name: 'StrategyDetail',
    component: () => import('@/views/trading/StrategyDetail.vue'),
    meta: { title: '策略详情', showTabbar: false }
  },
  {
    path: '/trading/create',
    name: 'BotCreate',
    component: () => import('@/views/trading/CreateBot.vue'),
    meta: { titleKey: 'bot_create.title', showTabbar: false }
  },
  {
    path: '/trading/create/ai',
    name: 'BotCreateAI',
    component: () => import('@/views/trading/BotAIRecommend.vue'),
    meta: { titleKey: 'bot_create.title', showTabbar: false }
  },
  {
    path: '/trading/create/manual',
    name: 'BotCreateManual',
    component: () => import('@/views/trading/BotForm.vue'),
    meta: { titleKey: 'bot_create.title', showTabbar: false }
  },
  {
    path: '/trading/create/indicator',
    name: 'BotCreateIndicator',
    component: () => import('@/views/trading/BotFromIndicator.vue'),
    meta: { titleKey: 'indicator_bot.title', showTabbar: false }
  },
  {
    path: '/trading/create/script',
    name: 'BotCreateScript',
    component: () => import('@/views/trading/CreateScriptStrategy.vue'),
    meta: { titleKey: 'script_strategy.title', showTabbar: false }
  },
  {
    path: '/ai',
    name: 'AiHub',
    component: () => import('@/views/ai-hub/index.vue'),
    meta: { titleKey: 'ai_hub.title', showTabbar: true }
  },
  {
    path: '/quick-trade',
    name: 'QuickTrade',
    component: () => import('@/views/quick-trade/index.vue'),
    meta: { titleKey: 'quick_trade.title', showTabbar: true }
  },
  {
    path: '/ai-analysis',
    name: 'AiAnalysis',
    component: () => import('@/views/ai-analysis/index.vue'),
    meta: { titleKey: 'ai_analysis.title', showTabbar: false }
  },
  {
    path: '/ai-analysis/history',
    name: 'AiAnalysisHistory',
    component: () => import('@/views/ai-analysis/History.vue'),
    meta: { titleKey: 'ai_analysis.history_title', showTabbar: false }
  },
  {
    path: '/market',
    name: 'Market',
    component: () => import('@/views/market/index.vue'),
    meta: { titleKey: 'market.title', showTabbar: false }
  },
  {
    path: '/market/indicator/:id',
    name: 'MarketIndicatorDetail',
    component: () => import('@/views/market/Detail.vue'),
    meta: { titleKey: 'market.title', showTabbar: false }
  },
  {
    path: '/market/my-purchases',
    name: 'MyPurchases',
    component: () => import('@/views/market/MyPurchases.vue'),
    meta: { titleKey: 'market.my_purchases', showTabbar: false }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { titleKey: 'profile.title', showTabbar: true }
  },
  {
    path: '/profile/notifications',
    name: 'Notifications',
    component: () => import('@/views/profile/Notifications.vue'),
    meta: { titleKey: 'profile.notifications', showTabbar: false }
  },
  {
    path: '/profile/server',
    name: 'ServerConfig',
    component: () => import('@/views/profile/ServerConfig.vue'),
    meta: { titleKey: 'profile.server', showTabbar: false }
  },
  {
    path: '/profile/language',
    name: 'LanguageSetting',
    component: () => import('@/views/profile/Language.vue'),
    meta: { titleKey: 'profile.language', showTabbar: false }
  },
  {
    path: '/profile/about',
    name: 'ProfileAbout',
    component: () => import('@/views/profile/About.vue'),
    meta: { titleKey: 'about.title', showTabbar: false }
  },
  {
    path: '/profile/security',
    name: 'ProfileSecurity',
    component: () => import('@/views/profile/Security.vue'),
    meta: { titleKey: 'profile.change_password', showTabbar: false }
  },
  {
    path: '/profile/mfa',
    name: 'ProfileMfa',
    component: () => import('@/views/profile/Mfa.vue'),
    meta: { titleKey: 'profile.mfa_manage', showTabbar: false }
  },
  {
    path: '/profile/login-logs',
    name: 'ProfileLoginLogs',
    component: () => import('@/views/profile/LoginLogs.vue'),
    meta: { titleKey: 'profile.login_logs', showTabbar: false }
  },
  {
    path: '/profile/referral',
    name: 'ProfileReferral',
    component: () => import('@/views/profile/Referral.vue'),
    meta: { titleKey: 'profile.referral', showTabbar: false }
  },
  {
    path: '/profile/credits',
    name: 'ProfileCredits',
    component: () => import('@/views/profile/Credits.vue'),
    meta: { titleKey: 'profile.credits_recharge', showTabbar: false }
  },
  {
    path: '/profile/notification-settings',
    name: 'ProfileNotificationSettings',
    component: () => import('@/views/profile/NotificationSettings.vue'),
    meta: { titleKey: 'profile.notif_settings', showTabbar: false }
  },
  {
    path: '/profile/credentials',
    name: 'CredentialList',
    component: () => import('@/views/profile/Credentials.vue'),
    meta: { title: 'API Key 管理', showTabbar: false }
  },
  {
    path: '/profile/credentials/new',
    name: 'CredentialCreate',
    component: () => import('@/views/profile/CredentialForm.vue'),
    meta: { title: '添加 API Key', showTabbar: false }
  },
  {
    path: '/assets',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const title = to.meta.titleKey ? t(to.meta.titleKey) : to.meta.title
  document.title = title ? `${title} | Mobile` : 'Mobile'

  const userStore = useUserStore()
  if (!to.meta.public && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

export default router
