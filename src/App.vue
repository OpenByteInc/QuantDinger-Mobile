<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Home', 'Trading', 'QuickTrade', 'Profile']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
    
    <van-tabbar 
      v-if="showTabbar" 
      v-model="activeTab" 
      @change="onTabChange"
      :safe-area-inset-bottom="true"
      :border="false"
    >
      <van-tabbar-item
        v-for="tab in tabs"
        :key="tab.name"
        :name="tab.name"
        :badge="tab.name === 'profile' && unreadCount > 0 ? unreadCount : ''"
      >
        <template #icon>
          <div class="tab-icon-shell">
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
import { useNotificationStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()

// 当前激活的 Tab
const activeTab = ref('home')

// 未读通知数量
const unreadCount = computed(() => notificationStore.unreadCount)

// 是否显示底部导航
const showTabbar = computed(() => route.meta.showTabbar !== false)

const tabs = [
  { name: 'home', label: '总览', icon: 'home-o' },
  { name: 'trading', label: '自动化', icon: 'apps-o' },
  { name: 'quick-trade', label: '闪电交易', icon: 'exchange' },
  { name: 'profile', label: '我的', icon: 'contact-o' }
]

// Tab 与路由的映射
const tabRouteMap = {
  home: '/home',
  trading: '/trading',
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
  background-color: var(--bg-primary);
}

:deep(.van-tabbar) {
  height: calc(62px + var(--safe-area-bottom));
  padding: 8px 10px calc(8px + var(--safe-area-bottom));
  background: rgba(10, 10, 12, 0.94);
  backdrop-filter: blur(22px);
}

:deep(.van-tabbar-item) {
  color: var(--text-muted);
  transition: transform 0.2s ease, color 0.2s ease;
}

:deep(.van-tabbar-item--active) {
  color: var(--primary-color);
}

:deep(.van-tabbar-item--active .tab-icon-shell) {
  background: linear-gradient(180deg, rgba(212, 176, 106, 0.22), rgba(212, 176, 106, 0.08));
  border-color: rgba(212, 176, 106, 0.28);
  color: var(--primary-light);
  box-shadow: 0 10px 24px rgba(212, 176, 106, 0.14);
}

:deep(.van-tabbar-item--active) {
  transform: translateY(-1px);
}

:deep(.van-tabbar-item__icon) {
  margin-bottom: 4px;
}

:deep(.van-tabbar-item__text) {
  font-size: 11px;
  margin-top: 0;
  font-weight: 600;
  letter-spacing: 0.02em;
}

:deep(.van-tabbar-item__icon) {
  font-size: 20px;
}

.tab-icon-shell {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  color: currentColor;
  transition: all 0.2s ease;
}
</style>
