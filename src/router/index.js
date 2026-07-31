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
    meta: { titleKey: 'login.title', public: true }
  },
  {
    path: '/home',
    redirect: '/ai'
  },
  {
    path: '/trading',
    name: 'Trading',
    component: () => import('@/views/trading/index.vue'),
    meta: { titleKey: 'trading.title' }
  },
  {
    path: '/trading/strategy/:id',
    name: 'StrategyDetail',
    component: () => import('@/views/trading/StrategyDetail.vue'),
    meta: { titleKey: 'trading.strategy_detail' }
  },
  {
    path: '/trading/create',
    name: 'BotCreate',
    component: () => import('@/views/trading/CreateBot.vue'),
    meta: { titleKey: 'bot_create.title' }
  },
  {
    path: '/trading/create/configure',
    name: 'StrategyCreate',
    component: () => import('@/views/trading/CreateStrategy.vue'),
    meta: { titleKey: 'script_strategy.title' }
  },
  {
    path: '/trading/create/script',
    redirect: '/trading/create/configure'
  },
  {
    path: '/ai',
    name: 'AiHub',
    component: () => import('@/views/ai-hub/index.vue'),
    meta: { titleKey: 'ai_hub.title' }
  },
  {
    path: '/quick-trade',
    redirect: '/trading'
  },
  {
    path: '/ai-analysis',
    name: 'AiAnalysis',
    component: () => import('@/views/ai-analysis/index.vue'),
    meta: { titleKey: 'ai_analysis.title' }
  },
  {
    path: '/ai-analysis/history',
    name: 'AiAnalysisHistory',
    component: () => import('@/views/ai-analysis/History.vue'),
    meta: { titleKey: 'ai_analysis.history_title' }
  },
  {
    path: '/market',
    name: 'Market',
    component: () => import('@/views/market/index.vue'),
    meta: { titleKey: 'market.title' }
  },
  {
    path: '/market/indicator/:id',
    name: 'MarketIndicatorDetail',
    component: () => import('@/views/market/Detail.vue'),
    meta: { titleKey: 'market.title' }
  },
  {
    path: '/market/my-purchases',
    name: 'MyPurchases',
    component: () => import('@/views/market/MyPurchases.vue'),
    meta: { titleKey: 'market.my_purchases' }
  },
  {
    path: '/indicators/chart',
    name: 'IndicatorChart',
    component: () => import('@/views/indicator/Chart.vue'),
    meta: { titleKey: 'indicator_chart.title' }
  },
  {
    path: '/indicators/monitor',
    redirect: '/indicators/chart'
  },
  {
    path: '/universes',
    redirect: '/ai'
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { titleKey: 'profile.title' }
  },
  {
    path: '/profile/notifications',
    name: 'Notifications',
    component: () => import('@/views/profile/Notifications.vue'),
    meta: { titleKey: 'profile.notifications' }
  },
  {
    path: '/profile/server',
    redirect: '/profile'
  },
  {
    path: '/profile/language',
    name: 'LanguageSetting',
    component: () => import('@/views/profile/Language.vue'),
    meta: { titleKey: 'profile.language' }
  },
  {
    path: '/profile/about',
    name: 'ProfileAbout',
    component: () => import('@/views/profile/About.vue'),
    meta: { titleKey: 'about.title' }
  },
  {
    path: '/profile/security',
    name: 'ProfileSecurity',
    component: () => import('@/views/profile/Security.vue'),
    meta: { titleKey: 'profile.change_password' }
  },
  {
    path: '/profile/mfa',
    name: 'ProfileMfa',
    component: () => import('@/views/profile/Mfa.vue'),
    meta: { titleKey: 'profile.mfa_manage' }
  },
  {
    path: '/profile/login-logs',
    name: 'ProfileLoginLogs',
    component: () => import('@/views/profile/LoginLogs.vue'),
    meta: { titleKey: 'profile.login_logs' }
  },
  {
    path: '/profile/referral',
    name: 'ProfileReferral',
    component: () => import('@/views/profile/Referral.vue'),
    meta: { titleKey: 'profile.referral' }
  },
  {
    path: '/profile/credits',
    name: 'ProfileCredits',
    component: () => import('@/views/profile/Credits.vue'),
    meta: { titleKey: 'profile.credits_recharge' }
  },
  {
    path: '/profile/notification-settings',
    name: 'ProfileNotificationSettings',
    component: () => import('@/views/profile/NotificationSettings.vue'),
    meta: { titleKey: 'profile.notif_settings' }
  },
  {
    path: '/profile/credentials',
    name: 'CredentialList',
    component: () => import('@/views/profile/Credentials.vue'),
    meta: { titleKey: 'credentials.title' }
  },
  {
    path: '/profile/credentials/new',
    name: 'CredentialCreate',
    component: () => import('@/views/profile/CredentialForm.vue'),
    meta: { titleKey: 'credentials.add_title' }
  },
  {
    path: '/assets',
    redirect: '/ai'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const title = to.meta.titleKey ? t(to.meta.titleKey) : to.meta.title
  const appName = t('common.app_name')
  document.title = title ? `${title} | ${appName}` : appName

  const userStore = useUserStore()
  if (!to.meta.public && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

export default router
