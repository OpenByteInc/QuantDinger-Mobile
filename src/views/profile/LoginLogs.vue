<template>
  <div class="login-logs-page">
    <van-nav-bar :title="$t('profile.login_logs')" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="replay" @click="refresh" />
      </template>
    </van-nav-bar>

    <div class="hint-card">
      <van-icon name="info-o" />
      <span>{{ $t('profile.login_logs_hint') }}</span>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="refresh">
      <div v-if="logs.length" class="log-list">
        <div v-for="item in logs" :key="item.id || `${item.action}-${item.created_at}`" class="log-card">
          <div class="log-head">
            <div class="method">
              <span class="method-icon"><van-icon :name="methodIcon(item.action)" /></span>
              <span>{{ actionLabel(item) }}</span>
            </div>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="lab">{{ $t('profile.login_log_device') }}</span>
              <span class="val">{{ item.device || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="lab">{{ $t('profile.login_log_ip') }}</span>
              <span class="val mono">{{ item.ip_address || '-' }}</span>
            </div>
            <div class="meta-item full">
              <span class="lab">{{ $t('profile.login_log_location') }}</span>
              <span class="val">{{ locationText(item) }}</span>
            </div>
          </div>

          <div v-if="item.is_new_device || item.is_new_region" class="flags">
            <span v-if="item.is_new_device"><van-icon name="phone-o" /> {{ $t('profile.login_log_new_device') }}</span>
            <span v-if="item.is_new_region"><van-icon name="location-o" /> {{ $t('profile.login_log_new_region') }}</span>
          </div>
        </div>
      </div>

      <van-empty v-else-if="!loading" :description="$t('profile.login_logs_empty')" />
      <div v-if="loading" class="loading-wrap"><van-loading /></div>

      <div v-if="logs.length && logs.length < total" class="load-more">
        <van-button plain block :loading="loadingMore" @click="loadMore">
          {{ $t('profile.load_more') }}
        </van-button>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script>
import { userApi } from '@/api'

export default {
  name: 'ProfileLoginLogs',
  data() {
    return {
      loading: false,
      refreshing: false,
      loadingMore: false,
      page: 1,
      pageSize: 20,
      total: 0,
      logs: []
    }
  },
  mounted() {
    this.load(true)
  },
  methods: {
    async refresh() {
      this.refreshing = true
      await this.load(true)
      this.refreshing = false
    },
    async load(reset = false) {
      if (reset) {
        this.page = 1
        this.loading = true
      }
      try {
        const res = await userApi.getLoginLogs({ page: this.page, page_size: this.pageSize })
        const data = res?.data || {}
        const items = data.items || data.list || []
        this.total = data.total || items.length
        this.logs = reset ? items : this.logs.concat(items)
      } catch (err) {
        console.error('Load login logs failed:', err)
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    async loadMore() {
      if (this.loadingMore || this.logs.length >= this.total) return
      this.loadingMore = true
      this.page += 1
      await this.load(false)
    },
    methodIcon(action) {
      const key = String(action || '')
      if (key.includes('mfa')) return 'shield-o'
      if (key.includes('code')) return 'envelop-o'
      if (key.includes('oauth')) return 'link-o'
      return 'lock'
    },
    actionLabel(item) {
      const action = String(item.action || '')
      const map = {
        login_success: 'profile.login_log_password',
        login_via_code: 'profile.login_log_code',
        oauth_login: 'profile.login_log_oauth',
        mfa_login_success: 'profile.login_log_mfa'
      }
      const key = map[action]
      if (!key) return item.method || action || '-'
      const label = this.$t(key)
      return label === key ? (item.method || action) : label
    },
    locationText(item) {
      return [item.location, item.isp].filter(Boolean).join(' · ') || '-'
    },
    formatTime(value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.login-logs-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 36px;
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.hint-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 14px 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--c-blue-soft);
  color: var(--c-blue);
  font-size: 12px;
  line-height: 1.5;
}

.log-list {
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.log-card {
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.method {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text);
  font-weight: 800;
  font-size: 14px;
}
.method-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 9px;
  background: var(--c-indigo-soft);
  color: var(--c-indigo);
  display: flex;
  align-items: center;
  justify-content: center;
}
.time {
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
}
.meta-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.meta-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.meta-item.full {
  grid-column: 1 / -1;
}
.lab {
  font-size: 10px;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.val {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, Menlo, Consolas, monospace;
}
.flags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.flags span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11px;
  font-weight: 700;
}
.loading-wrap {
  padding: 32px 0;
  text-align: center;
}
.load-more {
  margin: 4px 16px 18px;
}
.load-more :deep(.van-button) {
  border-radius: 13px;
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text);
}
</style>
