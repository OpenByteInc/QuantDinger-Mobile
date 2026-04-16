import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', showTabbar: false, public: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home/index.vue'),
    meta: { title: '总览', showTabbar: true }
  },
  {
    path: '/trading',
    name: 'Trading',
    component: () => import('@/views/trading/index.vue'),
    meta: { title: '自动化', showTabbar: true }
  },
  {
    path: '/trading/strategy/:id',
    name: 'StrategyDetail',
    component: () => import('@/views/trading/StrategyDetail.vue'),
    meta: { title: '策略详情', showTabbar: false }
  },
  {
    path: '/quick-trade',
    name: 'QuickTrade',
    component: () => import('@/views/quick-trade/index.vue'),
    meta: { title: '闪电交易', showTabbar: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { title: '我的', showTabbar: true }
  },
  {
    path: '/profile/notifications',
    name: 'Notifications',
    component: () => import('@/views/profile/Notifications.vue'),
    meta: { title: '消息通知', showTabbar: false }
  },
  {
    path: '/profile/server',
    name: 'ServerConfig',
    component: () => import('@/views/profile/ServerConfig.vue'),
    meta: { title: '服务器配置', showTabbar: false }
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
  },
  {
    path: '/market',
    redirect: '/trading'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} | Mobile` : 'Mobile'
  
  // 登录校验
  const userStore = useUserStore()
  if (!to.meta.public && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  
  next()
})

export default router
