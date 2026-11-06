<template>
  <div class="app-container" :class="{ 'ivory-shell': isIvoryShell }" :style="!showBottomNav ? {'--shell-tabbar-height':'var(--safe-area-bottom)'} : undefined">
    <main ref="main" class="app-main" :class="{ 'with-bottom-nav': showBottomNav }">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['StrategyHubV2', 'LiveOverviewV2', 'AiResearchV2', 'ProfileV2', 'IndicatorChart']">
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
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationStore = useNotificationStore()

const main=ref(null)
watch(()=>route.fullPath,async()=>{await nextTick();main.value?.scrollTo({top:0})})
const unreadCount = computed(() => notificationStore.unreadCount)
const showBottomNav = computed(() => !route.meta.public && ['/market','/trading','/ai','/indicators/chart','/profile'].includes(route.path))
const isIvoryShell = computed(() => !route.meta.public)
const tabs = computed(() => [
  { key: 'strategy', label: t('v2.nav.strategy'), icon: 'wap-home', path: '/market' },
  { key: 'live', label: t('v2.nav.live'), icon: 'play-circle', path: '/trading' },
  { key: 'research', label: t('v2.nav.research'), icon: 'chat', path: '/ai' },
  { key: 'indicator', label: t('v2.nav.indicator'), icon: 'graphic', path: '/indicators/chart' },
  { key: 'profile', label: t('v2.nav.profile'), icon: 'manager', path: '/profile' }
])

const isActive = (item) => {
  const current = route.path
  if (item.key === 'indicator') return current === '/indicators/chart'
  if (item.key === 'live') return current === '/trading' || current.startsWith('/trading/strategy/')
  if (item.key === 'profile') return current === '/profile' || current.startsWith('/profile/')
  if (item.key === 'strategy') return current === '/market' || current.startsWith('/market/') || current.startsWith('/trading/create')
  return current === item.path
}

const goTab = (item) => {
  if (route.path === item.path) return
  router.push(item.path)
}
</script>

<style scoped>
.app-container {
  --shell-tabbar-height: calc(68px + var(--safe-area-bottom));
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
  padding: 6px 6px var(--safe-area-bottom);
  border-top: 1px solid var(--border-strong);
  background: var(--v2-surface);
  box-shadow: none;
}

.shell-tab {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.tab-icon {
  position: relative;
  width: 30px;
  height: 27px;
  display: grid;
  place-items: center;
  border-radius: 0;
}

.tab-icon .van-icon { font-size: 22px; }
.shell-tab.active { color: var(--v2-brand-strong); }
.shell-tab.active .tab-icon { color: var(--v2-brand-strong); }
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

<style scoped>
.app-container {
  --shell-tabbar-height: calc(64px + var(--safe-area-bottom));
}

.shell-tabbar {
  padding: 4px 8px var(--safe-area-bottom);
  border-top-color: var(--v2-line);
  background: var(--v2-surface);
}

.shell-tab {
  position: relative;
  gap: 3px;
  color: var(--v2-soft);
  font-size: 11px;
  font-weight: 400;
  transition: color 160ms cubic-bezier(.22, 1, .36, 1);
}

.tab-icon {
  width: 32px;
  height: 28px;
}

.tab-icon .van-icon { font-size: 20px; }
.shell-tab.active { color: var(--v2-brand-strong); font-weight: 600; }
.shell-tab.active .tab-icon { color: var(--v2-brand); }

@media (min-width: 560px) {
  .shell-tabbar {
    right: auto;
    left: 50%;
    width: 520px;
    border-right: 1px solid var(--v2-line);
    border-left: 1px solid var(--v2-line);
    transform: translateX(-50%);
  }
}

.app-container.ivory-shell,
.app-container.ivory-shell .app-main {
  background: #faf8f3;
}

.app-container.ivory-shell {
  --v2-bg: #faf8f3;
  --v2-surface: #f6f4ef;
  --v2-surface-2: #ece9e2;
  --v2-line: rgba(24, 25, 29, .11);
  --v2-text: #18191d;
  --v2-muted: #69645c;
  --v2-soft: #8b8479;
  --v2-brand: #0e603f;
  --v2-brand-strong: #0e603f;
  --v2-on-brand: #fffdf8;
  --v2-green: #0e603f;
  --v2-red: #8b2437;
  --v2-orange: #a87821;
  --bg: #faf8f3;
  --bg-page: #faf8f3;
  --bg-elevated: #f6f4ef;
  --bg-elevated-2: #ece9e2;
  --surface-flat: #f6f4ef;
  --surface-raised: rgba(24, 25, 29, .035);
  --surface-raised-2: rgba(24, 25, 29, .06);
  --border: rgba(24, 25, 29, .11);
  --border-strong: rgba(24, 25, 29, .18);
  --hairline: rgba(24, 25, 29, .08);
  --text: #18191d;
  --text-2: #69645c;
  --text-3: #8b8479;
  --accent: #0e603f;
  --accent-light: #187553;
  --accent-dark: #0a4c32;
  --accent-soft: rgba(14, 96, 63, .1);
  --accent-gold: #b08a42;
  --up: #0e603f;
  --down: #8b2437;
  --primary-color: #0e603f;
  --text-on-accent: #fffdf8;
}

.app-container.ivory-shell .shell-tabbar {
  border-top-color: rgba(127, 95, 39, .28);
  background: #fbf7ef;
}

.app-container.ivory-shell .shell-tab {
  color: #7a756d;
}

.app-container.ivory-shell .shell-tab.active {
  color: #0e603f;
}

.app-container.ivory-shell .shell-tab.active .tab-icon {
  color: #0e603f;
}

.app-container.ivory-shell .shell-tab.active .tab-icon::before {
  background: #b08a42;
}
</style>
