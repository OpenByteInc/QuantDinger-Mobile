<template>
  <div class="app-container">
    <div class="app-main" :class="{ 'has-tabbar': showTabbar }">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Home', 'Trading', 'AiHub', 'QuickTrade', 'Profile']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <van-tabbar
      v-if="showTabbar"
      v-model="activeTab"
      @change="onTabChange"
      :safe-area-inset-bottom="true"
      :border="false"
      class="app-tabbar"
    >
      <van-tabbar-item
        v-for="tab in tabs"
        :key="tab.name"
        :name="tab.name"
        :class="{ 'center-fab': tab.name === 'ai' }"
        :badge="tab.name === 'profile' && unreadCount > 0 ? unreadCount : ''"
      >
        <template #icon>
          <div :class="['tab-icon-shell', { ai: tab.name === 'ai' }]">
            <van-icon :name="tab.icon" />
          </div>
        </template>
        {{ tab.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const notificationStore = useNotificationStore()

const activeTab = ref('home')

const unreadCount = computed(() => notificationStore.unreadCount)

const showTabbar = computed(() => route.meta.showTabbar !== false)

const tabs = computed(() => ([
  { name: 'home', label: t('tabs.home'), icon: 'home-o' },
  { name: 'trading', label: t('tabs.trading'), icon: 'apps-o' },
  { name: 'ai', label: t('tabs.ai'), icon: 'fire-o' },
  { name: 'quick-trade', label: t('tabs.quick_trade'), icon: 'exchange' },
  { name: 'profile', label: t('tabs.profile'), icon: 'contact-o' }
]))

// Tab 与路由的映射
const tabRouteMap = {
  home: '/home',
  trading: '/trading',
  ai: '/ai',
  'quick-trade': '/quick-trade',
  profile: '/profile'
}

// Tab 切换
const onTabChange = (name) => {
  const path = tabRouteMap[name]
  if (path && route.path !== path) {
    router.push(path)
  }
}

// 监听路由变化，同步 Tab 状态
watch(
  () => route.path,
  (path) => {
    for (const [name, routePath] of Object.entries(tabRouteMap)) {
      if (path === routePath || path.startsWith(routePath + '/')) {
        activeTab.value = name
        break
      }
    }
  },
  { immediate: true }
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
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  background: var(--bg);
}

:deep(.van-tabbar) {
  height: calc(62px + var(--safe-area-bottom));
  padding: 8px 6px calc(8px + var(--safe-area-bottom));
  background: var(--bg-elevated);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border-top: 1px solid var(--border);
  overflow: visible;
}

:deep(.van-tabbar-item) {
  color: var(--text-3);
  transition: transform 0.2s ease, color 0.2s ease;
}

:deep(.van-tabbar-item--active) {
  color: var(--accent);
}

:deep(.van-tabbar-item--active .tab-icon-shell) {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
}

:deep(.van-tabbar-item--active) {
  transform: translateY(-1px);
}

:deep(.van-tabbar-item__icon) {
  margin-bottom: 4px;
  font-size: 20px;
}

:deep(.van-tabbar-item__text) {
  font-size: 11px;
  margin-top: 0;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tab-icon-shell {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: currentColor;
  transition: all 0.2s ease;
}

.tab-icon-shell.ai {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: var(--accent-crimson);
  color: #fff;
  font-size: 22px;
  box-shadow: 0 10px 24px -6px rgba(239, 68, 68, 0.55);
  border: 3px solid var(--bg-elevated);
  transform: translateY(-14px);
}
.tab-icon-shell.ai :deep(.van-icon) {
  font-size: 22px;
}

:deep(.center-fab .van-tabbar-item__icon) {
  margin-bottom: 0;
}
:deep(.center-fab .van-tabbar-item__text) {
  transform: translateY(-10px);
}
:deep(.van-tabbar-item--active.center-fab .tab-icon-shell.ai) {
  transform: translateY(-16px) scale(1.04);
}
:deep(.van-tabbar-item--active.center-fab) {
  color: var(--accent);
}
</style>
