<template>
  <div class="app-container">
    <button
      v-if="showFloatingNavButton"
      type="button"
      class="shell-menu-floating"
      aria-label="Open navigation"
      @click="openSidebar"
    >
      <van-icon name="wap-nav" />
    </button>

    <div class="app-main" :class="{ 'with-floating-menu': showFloatingNavButton }">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Home', 'Trading', 'AiHub', 'QuickTrade', 'Profile']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <van-popup
      v-model:show="sidebarOpen"
      position="left"
      class="shell-sidebar-popup"
      :style="{ width: 'min(318px, 84vw)', height: '100%' }"
      teleport="body"
    >
      <aside class="shell-sidebar">
        <div class="sidebar-brand">
          <img src="/slogo.png" alt="QuantDinger" />
          <div class="brand-copy">
            <strong>QuantDinger</strong>
            <span class="brand-line">{{ displayName }} · {{ userEmail }}</span>
            <span>{{ displayName }} · {{ userEmail }}</span>
          </div>
          <button
            type="button"
            :class="['sidebar-notification', { active: route.path.startsWith('/profile/notifications') }]"
            :aria-label="t('sidebar.notifications')"
            @click="goNav('/profile/notifications')"
          >
            <van-icon name="bell" />
            <small v-if="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</small>
          </button>
        </div>

        <div class="credits-card" @click="goNav('/profile/credits')">
          <div>
            <span class="credits-label">{{ t('profile.credits') }}</span>
            <strong>{{ formattedCredits }}</strong>
            <small v-if="isVip">{{ vipText }}</small>
          </div>
          <button type="button" @click.stop="goNav('/profile/credits')">
            <van-icon name="plus" />
            {{ t('profile.credits_recharge') }}
          </button>
        </div>

        <div class="sidebar-groups">
          <section
            v-for="(group, groupIndex) in navGroups"
            :key="group.key"
            class="sidebar-group"
          >
            <div :class="['sidebar-section', { first: groupIndex === 0 }]">{{ group.title }}</div>
            <nav class="sidebar-nav">
              <button
                v-for="item in group.items"
                :key="item.name"
                type="button"
                :class="['nav-item', { active: isActive(item) }]"
                @click="handleNav(item)"
              >
                <van-icon :name="item.icon" />
                <span>{{ item.label }}</span>
                <small v-if="item.badge">{{ item.badge }}</small>
              </button>
            </nav>
          </section>
        </div>
      </aside>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore, useSettingsStore, useUserStore } from '@/stores'
import { userApi } from '@/api'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const sidebarOpen = ref(false)
const billing = ref({
  credits: 0,
  is_vip: false,
  vip_expires_at: null
})

const unreadCount = computed(() => notificationStore.unreadCount)
const showShellNav = computed(() => !route.meta.public)
const showFloatingNavButton = computed(() => showShellNav.value && route.path !== '/ai')

const displayName = computed(() => userStore.userInfo?.nickname || userStore.userInfo?.username || 'QuantDinger')
const userEmail = computed(() => userStore.userInfo?.email || t('profile.account_subtitle'))
const formattedCredits = computed(() => Number(billing.value.credits || 0).toLocaleString())
const isVip = computed(() => {
  if (!billing.value.vip_expires_at) return !!billing.value.is_vip
  const ts = new Date(billing.value.vip_expires_at).getTime()
  return !Number.isNaN(ts) && ts > Date.now()
})
const vipText = computed(() => isVip.value ? 'VIP' : '')
const themeLabel = computed(() => (
  settingsStore.theme === 'light' ? t('profile.theme_light') : t('profile.theme_dark')
))

const navGroups = computed(() => ([
  {
    key: 'workspace',
    title: t('sidebar.workspace'),
    items: [
      { name: 'ai', label: t('sidebar.ai_analysis'), icon: 'cluster-o', path: '/ai' },
      { name: 'indicator-market', label: t('sidebar.indicator_market'), icon: 'chart-trending-o', path: '/market' },
      { name: 'create-bot', label: t('sidebar.create_bot'), icon: 'plus', path: '/trading/create' },
      { name: 'trading', label: t('sidebar.strategy_lab'), icon: 'apps-o', path: '/trading' },
      { name: 'quick-trade', label: t('sidebar.quick_trade'), icon: 'exchange', path: '/quick-trade' },
      { name: 'credentials', label: t('sidebar.exchange_config'), icon: 'shield-o', path: '/profile/credentials' }
    ]
  },
  {
    key: 'account',
    title: t('sidebar.account_security'),
    items: [
      { name: 'profile', label: t('sidebar.profile'), icon: 'contact-o', path: '/profile' },
      { name: 'theme', label: t('sidebar.theme_toggle'), icon: 'bulb-o', action: 'theme', badge: themeLabel.value },
      { name: 'language', label: t('sidebar.language'), icon: 'font-o', path: '/profile/language' }
    ]
  }
]))

const openSidebar = async () => {
  sidebarOpen.value = true
  await refreshBilling()
}

const goNav = (path) => {
  if (!path) return
  sidebarOpen.value = false
  if (route.path !== path) router.push(path)
}

const handleNav = (item) => {
  if (item.action === 'theme') {
    toggleTheme()
    return
  }
  goNav(item.path)
}

const toggleTheme = () => {
  const next = settingsStore.theme === 'light' ? 'dark' : 'light'
  settingsStore.setTheme(next)
}

const isActive = (item) => {
  if (!item.path) return false
  const current = route.path
  if (item.path === '/profile') return current === '/profile'
  if (item.path === '/ai') return current === '/ai'
  if (item.path === '/trading/create') {
    return current === '/trading/create' || current.startsWith('/trading/create/')
  }
  if (item.path === '/trading') {
    return current === '/trading' || current.startsWith('/trading/strategy/')
  }
  if (item.path === '/profile/credentials') {
    return current === '/profile/credentials' || current.startsWith('/profile/credentials/')
  }
  return current === item.path || current.startsWith(`${item.path}/`)
}

const refreshBilling = async () => {
  try {
    const res = await userApi.getProfile()
    const profile = res?.data || {}
    if (profile.billing) billing.value = { ...billing.value, ...profile.billing }
    if (profile.user) userStore.setUserInfo(profile.user)
  } catch (err) {
    // Sidebar should remain usable even if the balance refresh fails.
  }
}

provide('openAppNav', openSidebar)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg);
  overflow: hidden;
}

.app-main {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  background: var(--bg);
}

.app-main.with-floating-menu {
  padding-top: 0;
}

.app-main.with-floating-menu :deep(.van-nav-bar) {
  background: transparent;
}

.app-main.with-floating-menu :deep(.van-nav-bar__content) {
  min-height: 58px;
  height: 58px;
}

.app-main.with-floating-menu :deep(.van-nav-bar__left) {
  display: none;
}

.app-main.with-floating-menu :deep(.van-nav-bar__title) {
  max-width: calc(100% - 144px);
  color: var(--text);
  font-weight: 900;
}

.app-main.with-floating-menu :deep(.van-nav-bar__right) {
  right: 16px;
  height: 58px;
}

.shell-menu-floating {
  position: fixed;
  top: calc(10px + var(--safe-area-top, 0px));
  left: 16px;
  z-index: 120;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.shell-sidebar-popup :deep(.van-popup) {
  background: transparent;
}

.shell-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(18px + var(--safe-area-top, 0px)) 14px calc(18px + var(--safe-area-bottom, 0px));
  color: var(--text);
  background:
    radial-gradient(circle at 10% 0%, rgba(251, 191, 36, 0.14), transparent 34%),
    var(--bg-elevated);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sidebar-brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 12px;
}

.sidebar-brand img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

.brand-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sidebar-brand strong {
  color: var(--text);
  font-size: 15px;
  font-weight: 900;
}

.sidebar-brand span {
  color: var(--text-3);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy span:not(.brand-line) {
  display: none;
}

.sidebar-notification {
  position: relative;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-2);
  background: color-mix(in srgb, var(--surface-raised) 86%, transparent);
}

.sidebar-notification.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
  background: var(--accent-soft);
}

.sidebar-notification .van-icon {
  font-size: 18px;
}

.sidebar-notification small {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  background: var(--accent-crimson);
  border: 2px solid var(--bg-elevated);
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  box-sizing: border-box;
}

.credits-card {
  flex: 0 0 auto;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  margin-bottom: 14px;
  min-height: 84px;
  box-sizing: border-box;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--accent-gold) 24%, var(--border));
  background:
    radial-gradient(circle at 0% 0%, rgba(245, 181, 27, 0.24), transparent 42%),
    linear-gradient(135deg, rgba(245, 181, 27, 0.12), rgba(56, 189, 248, 0.04)),
    var(--surface-raised);
}

.credits-card::after {
  content: "";
  position: absolute;
  right: -24px;
  top: -28px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: rgba(245, 181, 27, 0.12);
}

.credits-card > div {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.credits-label {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 800;
}

.credits-card strong {
  color: var(--text);
  font-size: 24px;
  font-weight: 950;
  line-height: 1;
}

.credits-card small {
  width: max-content;
  padding: 2px 7px;
  border-radius: 999px;
  color: #1f1300;
  background: var(--accent-gold);
  font-size: 10px;
  font-weight: 900;
}

.credits-card button {
  position: relative;
  z-index: 1;
  height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  color: #1f1300;
  background: linear-gradient(135deg, #ffd166, #f59e0b);
  font-size: 12px;
  font-weight: 950;
}

.sidebar-groups {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 10px;
}

.sidebar-group {
  flex: 0 0 auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-section {
  margin: 18px 8px 8px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.sidebar-section.first {
  margin-top: 2px;
}

.nav-item {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 15px;
  color: var(--text-2);
  background: transparent;
  text-align: left;
  font-size: 14px;
  font-weight: 800;
}

.nav-item .van-icon {
  width: 22px;
  font-size: 18px;
}

.nav-item span {
  flex: 1;
}

.nav-item small {
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--accent-crimson);
  font-size: 10px;
}

.nav-item.active {
  color: var(--accent);
  border-color: var(--border);
  background: var(--accent-soft);
}

.nav-item:active {
  transform: scale(0.99);
}
</style>
