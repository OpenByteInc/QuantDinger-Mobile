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
          @click="markRead(item)"
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
              {{ item.message || item.content || $t('notifications.no_content') }}
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
  </div>
</template>

<script>
import { strategyApi } from '@/api'
import { useNotificationStore } from '@/stores'

export default {
  name: 'Notifications',

  data() {
    return {
      loading: false,
      refreshing: false
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
      return item.title || item.event_type || this.$t('notifications.default_title')
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
</style>
