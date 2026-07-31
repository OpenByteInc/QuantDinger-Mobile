<template>
  <div class="notifications-page">
    <van-nav-bar
      :title="$t('notifications.title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    >
      <template #right>
        <button v-if="notifications.length" type="button" class="nav-link" @click="markAllRead">
          {{ $t('notifications.mark_all_read') }}
        </button>
      </template>
    </van-nav-bar>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="notification-filters" role="tablist" :aria-label="$t('notifications.category_filter')">
        <button
          v-for="filter in categoryFilters"
          :key="filter.value"
          type="button"
          role="tab"
          :aria-selected="activeCategory === filter.value"
          :class="{ active: activeCategory === filter.value }"
          @click="activeCategory = filter.value"
        >
          {{ filter.label }}
          <small>{{ filter.count }}</small>
        </button>
      </div>
      <div class="notification-list">
        <button
          v-for="item in displayedNotifications"
          :key="item.id"
          type="button"
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
              <van-tag v-if="item._members?.length > 1" size="small" plain type="warning">
                {{ $t('notifications.merged_count', { count: item._members.length }) }}
              </van-tag>
              <van-tag v-if="item.strategy_id" size="small" plain type="primary">
                {{ $t('notifications.strategy') }} #{{ item.strategy_id }}
              </van-tag>
              <van-tag v-if="!item.is_read && !item.read" size="small" plain type="warning">
                {{ $t('notifications.unread') }}
              </van-tag>
            </div>
          </div>
        </button>

        <van-empty
          v-if="!loading && displayedNotifications.length === 0"
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
        <van-button
          v-if="selectedNotification.strategy_id"
          round
          block
          type="primary"
          class="detail-action"
          @click="goToStrategy(selectedNotification.strategy_id)"
        >
          {{ $t('notifications.view_strategy') }}
        </van-button>
        <details v-if="getTechnicalMessage(selectedNotification)" class="technical-details">
          <summary>{{ $t('notifications.technical_details') }}</summary>
          <code>{{ getTechnicalMessage(selectedNotification) }}</code>
        </details>
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
      selectedNotification: null,
      activeCategory: 'all'
    }
  },

  computed: {
    notificationStore() {
      return useNotificationStore()
    },
    notifications() {
      return this.notificationStore.notifications
    },
    groupedNotifications() {
      const groups = new Map()
      this.notifications.forEach((item) => {
        const type = this.getType(item)
        const action = this.signalAction(item)
        const symbol = this.notificationSymbol(item)
        const time = this.notificationTimestamp(item)
        const bucket = Math.floor(time / (30 * 60 * 1000))
        const key = [item.strategy_id || 'general', type, action || 'event', symbol || 'all', bucket].join('|')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(item)
      })
      return Array.from(groups.entries())
        .map(([key, members]) => {
          const latest = [...members].sort((a, b) => this.notificationTimestamp(b) - this.notificationTimestamp(a))[0]
          const unread = members.some((item) => !item.is_read && !item.read)
          return {
            ...latest,
            id: `group-${key}`,
            is_read: unread ? 0 : 1,
            read: !unread,
            _members: members
          }
        })
        .sort((a, b) => this.notificationTimestamp(b) - this.notificationTimestamp(a))
    },
    displayedNotifications() {
      if (this.activeCategory === 'all') return this.groupedNotifications
      return this.groupedNotifications.filter((item) => this.getType(item) === this.activeCategory)
    },
    categoryFilters() {
      const options = [
        ['all', 'notifications.category_all'],
        ['alert', 'notifications.category_alert'],
        ['trade', 'notifications.category_trade'],
        ['signal', 'notifications.category_signal'],
        ['system', 'notifications.category_system']
      ]
      return options.map(([value, key]) => ({
        value,
        label: this.$t(key),
        count: value === 'all'
          ? this.groupedNotifications.length
          : this.groupedNotifications.filter((item) => this.getType(item) === value).length
      }))
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
      const text = `${item.event_type || ''} ${item.title || ''} ${item.message || ''} ${item.content || ''}`.toLowerCase()
      if (/(risk|error|异常|fail|expired|失效|liquidat|强平|止损)/.test(text)) return 'alert'
      if (/(signal|open_long|open_short|close_long|close_short|add_long|add_short|信号)/.test(text)) return 'signal'
      if (/(trade|成交|order|filled|pending_order|下单|委托)/.test(text)) return 'trade'
      if (/(system|account|credential|login|系统|账户)/.test(text)) return 'system'
      return 'signal'
    },

    getIcon(item) {
      const type = this.getType(item)
      const map = {
        signal: 'bell',
        trade: 'exchange',
        alert: 'warning-o',
        system: 'setting-o'
      }
      return map[type]
    },

    getTitle(item) {
      const action = this.signalAction(item)
      const symbol = this.notificationSymbol(item)
      if (action) {
        return this.$t(`notifications.action_${action}`, { symbol: symbol || this.$t('notifications.the_strategy') })
      }
      const type = this.getType(item)
      return this.$t(`notifications.default_${type}_title`)
    },

    getMessage(item) {
      const action = this.signalAction(item)
      const symbol = this.notificationSymbol(item)
      if (action) {
        const key = action.startsWith('open') || action.startsWith('add')
          ? 'notifications.signal_detected'
          : 'notifications.signal_closed'
        return this.$t(key, {
          symbol: symbol || this.$t('notifications.the_strategy'),
          action: this.$t(`notifications.action_label_${action}`)
        })
      }
      const plain = toPlainNotificationText(item.message || item.content, { limit: MESSAGE_PREVIEW_LIMIT })
      if (this.getType(item) === 'alert') return this.$t('notifications.risk_requires_attention')
      return plain || this.$t('notifications.no_content')
    },

    getDetailMessage(item) {
      return this.getMessage(item)
    },

    getTechnicalMessage(item) {
      return toPlainNotificationText(item.content || item.message, { preserveLines: true })
    },

    signalAction(item) {
      const text = `${item.event_type || ''} ${item.title || ''} ${item.message || ''} ${item.content || ''}`.toLowerCase()
      const actions = ['open_long', 'open_short', 'add_long', 'add_short', 'close_long', 'close_short']
      return actions.find((action) => text.includes(action)) || ''
    },

    notificationSymbol(item) {
      const direct = item.symbol || item.trading_symbol
      if (direct) return String(direct).toUpperCase()
      const text = `${item.title || ''} ${item.message || ''} ${item.content || ''}`
      const match = text.match(/\b([A-Z0-9]{2,12})[/-](USDT|USD|USDC|BTC|ETH)\b/i)
      return match ? `${match[1].toUpperCase()}/${match[2].toUpperCase()}` : ''
    },

    notificationTimestamp(item) {
      const value = item?.created_at || item?.timestamp
      if (typeof value === 'number') return value * (value < 1e12 ? 1000 : 1)
      const parsed = new Date(value || 0).getTime()
      return Number.isFinite(parsed) ? parsed : 0
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
      const members = item._members || [item]
      const unread = members.filter((member) => !member.is_read && !member.read)
      if (!unread.length) return
      try {
        await Promise.allSettled(unread.map((member) => strategyApi.markNotificationRead(member.id)))
        unread.forEach((member) => this.notificationStore.markAsRead(member.id))
      } catch (error) {
        console.error('Mark notification read failed:', error)
      }
    },

    openNotification(item) {
      this.selectedNotification = item
      this.showDetail = true
      this.markRead(item)
    },

    goToStrategy(id) {
      this.showDetail = false
      this.$router.push(`/trading/strategy/${id}`)
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
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
}

.notification-filters {
  display: flex;
  gap: 8px;
  padding: 12px 16px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}
.notification-filters::-webkit-scrollbar { display: none; }
.notification-filters button {
  min-height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 12px;
}
.notification-filters button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.notification-filters small { color: var(--text-3); }
.notification-list { padding: 12px 16px 16px; }

.notification-item {
  width: 100%;
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: inherit;
  text-align: left;
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
.icon-wrapper.system {
  background: color-mix(in srgb, var(--c-blue) 14%, var(--surface-raised));
  color: var(--c-blue);
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
.detail-icon.system {
  background: color-mix(in srgb, var(--c-blue) 14%, var(--surface-raised));
  color: var(--c-blue);
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
.detail-action { margin-top: 14px; }
.technical-details {
  margin-top: 14px;
  color: var(--text-3);
  font-size: 12px;
}
.technical-details summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; }
.technical-details code {
  display: block;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-deep);
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
