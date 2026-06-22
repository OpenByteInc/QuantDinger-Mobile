<template>
  <div class="notifications-page">
    <van-nav-bar
      :title="$t('notifications.title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    >
      <template #right>
        <span v-if="notifications.length" class="nav-link" @click="markAllRead">
          {{ $t('notifications.mark_all_read') }}
        </span>
      </template>
    </van-nav-bar>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="notification-list">
        <div
          v-for="item in notifications"
          :key="item.id"
          :class="['notification-item', { unread: !item.is_read && !item.read }]"
          @click="openNotification(item)"
        >
          <div class="icon-wrapper" :class="getType(item)">
            <van-icon :name="getIcon(item)" />
          </div>
          <div class="content">
            <div class="header">
              <span class="title">{{ getTitle(item) }}</span>
              <span class="time">{{ formatTime(item.created_at) }}</span>
            </div>
            <p class="message">
              {{ getMessage(item) }}
            </p>
            <div class="meta">
              <van-tag v-if="item.strategy_id" size="small" plain type="primary">
                {{ $t('notifications.strategy') }} #{{ item.strategy_id }}
              </van-tag>
              <van-tag v-if="!item.is_read && !item.read" size="small" plain type="warning">
                {{ $t('notifications.unread') }}
              </van-tag>
            </div>
          </div>
        </div>

        <van-empty
          v-if="!loading && notifications.length === 0"
          :description="$t('notifications.empty')"
        />
      </div>
    </van-pull-refresh>

    <van-loading v-if="loading" class="page-loading" vertical>
      {{ $t('common.loading') }}
    </van-loading>

    <van-popup
      v-model:show="showDetail"
      position="bottom"
      round
      closeable
      class="notification-detail-popup"
    >
      <div v-if="selectedNotification" class="detail-panel">
        <div class="detail-type">
          <span class="detail-icon" :class="getType(selectedNotification)">
            <van-icon :name="getIcon(selectedNotification)" />
          </span>
          <span>{{ formatTime(selectedNotification.created_at) }}</span>
        </div>
        <h2 class="detail-title">{{ getTitle(selectedNotification) }}</h2>
        <div class="detail-meta">
          <van-tag v-if="selectedNotification.strategy_id" size="small" plain type="primary">
            {{ $t('notifications.strategy') }} #{{ selectedNotification.strategy_id }}
          </van-tag>
          <van-tag size="small" plain :type="getType(selectedNotification) === 'alert' ? 'danger' : 'success'">
            {{ selectedNotification.event_type || getType(selectedNotification) }}
          </van-tag>
        </div>
        <div class="detail-body">
          {{ getDetailMessage(selectedNotification) }}
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { strategyApi } from '@/api'
import { useNotificationStore } from '@/stores'

const MESSAGE_PREVIEW_LIMIT = 220

function decodeHtmlEntities(value) {
  if (!value) return ''
  if (typeof document === 'undefined') {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  }
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function toPlainNotificationText(value, options = {}) {
  const { limit = 0, preserveLines = false } = options
  let text = decodeHtmlEntities(String(value || ''))
  if (!text.trim()) return ''

  text = text
    .replace(/<\s*(style|script|head|noscript|svg|canvas|meta|link)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|section|article|header|footer|h[1-6]|li|tr|table)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  text = decodeHtmlEntities(text)
    .replace(/\.[a-z0-9_-]+\s*\{[^{}]*\}/gi, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(preserveLines ? /\n{3,}/g : /\s*\n\s*/g, preserveLines ? '\n\n' : ' ')
    .trim()

  if (preserveLines) {
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
  } else {
    text = text.replace(/\s{2,}/g, ' ')
  }

  if (!limit || text.length <= limit) return text
  return `${text.slice(0, limit).trim()}...`
}

export default {
  name: 'Notifications',

  data() {
    return {
      loading: false,
      refreshing: false,
      showDetail: false,
      selectedNotification: null
    }
  },

  computed: {
    notificationStore() {
      return useNotificationStore()
    },
    notifications() {
      return this.notificationStore.notifications
    }
  },

  mounted() {
    this.loadNotifications()
  },

  methods: {
    async loadNotifications() {
      this.loading = true
      try {
        const [listRes, unreadRes] = await Promise.all([
          strategyApi.getNotifications({ limit: 100 }),
          strategyApi.getUnreadNotificationCount()
        ])
        this.notificationStore.setNotifications(listRes.data || [])
        this.notificationStore.setUnreadCount(unreadRes.data || 0)
      } catch (error) {
        console.error('Load notifications failed:', error)
      } finally {
        this.loading = false
      }
    },

    async onRefresh() {
      await this.loadNotifications()
      this.refreshing = false
    },

    getType(item) {
      const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
      if (text.includes('error') || text.includes('异常') || text.includes('fail')) return 'alert'
      if (text.includes('trade') || text.includes('成交') || text.includes('order')) return 'trade'
      return 'signal'
    },

    getIcon(item) {
      const type = this.getType(item)
      const map = {
        signal: 'bell',
        trade: 'exchange',
        alert: 'warning-o'
      }
      return map[type]
    },

    getTitle(item) {
      return toPlainNotificationText(item.title || item.event_type) || this.$t('notifications.default_title')
    },

    getMessage(item) {
      return toPlainNotificationText(item.message || item.content, { limit: MESSAGE_PREVIEW_LIMIT }) || this.$t('notifications.no_content')
    },

    getDetailMessage(item) {
      return toPlainNotificationText(item.content || item.message, { preserveLines: true }) || this.$t('notifications.no_content')
    },

    formatTime(value) {
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return this.$t('notifications.just_now')
      const now = Date.now()
      const diff = now - date.getTime()
      if (diff < 60 * 1000) return this.$t('notifications.just_now')
      if (diff < 60 * 60 * 1000) {
        return this.$t('notifications.minutes_ago', { n: Math.floor(diff / 60000) })
      }
      if (diff < 24 * 60 * 60 * 1000) {
        return this.$t('notifications.hours_ago', { n: Math.floor(diff / 3600000) })
      }
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    async markRead(item) {
      if (item.is_read || item.read) return
      try {
        await strategyApi.markNotificationRead(item.id)
        this.notificationStore.markAsRead(item.id)
      } catch (error) {
        console.error('Mark notification read failed:', error)
      }
    },

    openNotification(item) {
      this.selectedNotification = item
      this.showDetail = true
      this.markRead(item)
    },

    async markAllRead() {
      try {
        await strategyApi.markAllNotificationsRead()
        this.notificationStore.markAllAsRead()
      } catch (error) {
        console.error('Mark all notifications read failed:', error)
      }
    }
  }
}
</script>

<style scoped>
.notifications-page {
  min-height: 100vh;
  padding-bottom: 24px;
  background: transparent;
}

.notifications-page :deep(.van-nav-bar) { background: transparent; }
.notifications-page :deep(.van-nav-bar__title),
.notifications-page :deep(.van-nav-bar__arrow),
.notifications-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.nav-link {
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
}

.notification-list { padding: 16px; }

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.notification-item.unread {
  border-color: transparent;
  background: var(--accent-soft);
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-wrapper.signal {
  background: var(--c-amber-soft);
  color: var(--c-amber);
}

.icon-wrapper.trade {
  background: var(--up-soft);
  color: var(--up);
}

.icon-wrapper.alert {
  background: var(--down-soft);
  color: var(--down);
}

.content {
  flex: 1;
  min-width: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
}

.message {
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}

.notifications-page :deep(.notification-detail-popup) {
  max-height: 82vh;
  background: var(--bg-elevated);
  color: var(--text);
}

.notifications-page :deep(.notification-detail-popup .van-popup__close-icon) {
  color: var(--text-3);
}

.detail-panel {
  padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
  max-height: 82vh;
  overflow-y: auto;
}

.detail-type {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-right: 28px;
  font-size: 12px;
  color: var(--text-3);
}

.detail-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.detail-icon.signal {
  background: var(--c-amber-soft);
  color: var(--c-amber);
}

.detail-icon.trade {
  background: var(--up-soft);
  color: var(--up);
}

.detail-icon.alert {
  background: var(--down-soft);
  color: var(--down);
}

.detail-title {
  margin: 14px 28px 10px 0;
  font-size: 19px;
  line-height: 1.35;
  font-weight: 800;
  color: var(--text);
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.detail-body {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
