<template>
  <div class="app-container">
    <main class="app-main" :class="{ 'with-bottom-nav': showBottomNav }">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Trading', 'AiHub', 'Profile', 'IndicatorChart']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <nav v-if="showBottomNav" class="shell-tabbar" :aria-label="t('tabs.navigation')">
      <button
        v-for="item in tabs"
        :key="item.key"
        type="button"
        :class="['shell-tab', { active: isActive(item) }]"
        @click="goTab(item)"
      >
        <span class="tab-icon">
          <van-icon :name="item.icon" />
          <small v-if="item.key === 'profile' && unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</small>
        </span>
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationStore = useNotificationStore()

const unreadCount = computed(() => notificationStore.unreadCount)
const showBottomNav = computed(() => !route.meta.public)
const tabs = computed(() => [
  { key: 'ai', label: t('tabs.ai'), icon: 'cluster-o', path: '/ai' },
  { key: 'market', label: t('tabs.market'), icon: 'shop-o', path: '/market' },
  { key: 'chart', label: t('tabs.chart'), icon: 'chart-trending-o', path: '/indicators/chart' },
  { key: 'strategy', label: t('tabs.strategy'), icon: 'apps-o', path: '/trading' },
  { key: 'profile', label: t('tabs.profile'), icon: 'contact-o', path: '/profile' }
])

const isActive = (item) => {
  const current = route.path
  if (item.key === 'chart') return current === '/indicators/chart'
  if (item.key === 'strategy') return current === '/trading' || current.startsWith('/trading/')
  if (item.key === 'profile') return current === '/profile' || current.startsWith('/profile/')
  if (item.key === 'market') return current === '/market' || current.startsWith('/market/')
  return current === item.path
}

const goTab = (item) => {
  if (route.path === item.path) return
  router.push(item.path)
}
</script>

<style scoped>
.app-container {
  --shell-tabbar-height: calc(62px + var(--safe-area-bottom));
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--bg);
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.app-main.with-bottom-nav {
  padding-bottom: var(--shell-tabbar-height);
}

.shell-tabbar {
  position: fixed;
  z-index: 100;
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--shell-tabbar-height);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 5px 4px var(--safe-area-bottom);
  border-top: 1px solid var(--border-strong);
  background: color-mix(in srgb, var(--bg-elevated) 96%, transparent);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .18);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.shell-tab {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

.tab-icon {
  position: relative;
  width: 30px;
  height: 27px;
  display: grid;
  place-items: center;
  border-radius: 8px;
}

.tab-icon .van-icon { font-size: 19px; }
.shell-tab.active { color: var(--accent); }
.shell-tab.active .tab-icon { background: var(--accent-soft); }
.tab-icon small {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 15px;
  height: 15px;
  display: grid;
  place-items: center;
  padding: 0 3px;
  border: 2px solid var(--bg-elevated);
  border-radius: 999px;
  background: var(--down);
  color: #fff;
  font-size: 8px;
}
</style>
