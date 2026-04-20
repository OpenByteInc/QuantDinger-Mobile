<template>
  <div class="referral-page">
    <van-nav-bar :title="$t('profile.referral')" left-arrow @click-left="$router.back()" />

    <div class="hero">
      <div class="hero-icon">
        <van-icon name="friends-o" />
      </div>
      <div class="hero-title">{{ $t('profile.referral') }}</div>
      <p class="hero-desc">{{ $t('profile.referral_desc') }}</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="label">{{ $t('profile.referral_total') }}</span>
        <span class="value">{{ data.total || 0 }}</span>
      </div>
      <div class="stat-card" v-if="data.referral_bonus > 0">
        <span class="label">{{ $t('profile.referral_bonus') }}</span>
        <span class="value">+{{ data.referral_bonus }}</span>
      </div>
      <div class="stat-card" v-if="data.register_bonus > 0">
        <span class="label">{{ $t('profile.credits_unit') }}</span>
        <span class="value">+{{ data.register_bonus }}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">{{ $t('profile.referral_link') }}</div>
      <div class="link-box">
        <span class="link">{{ referralLink || '-' }}</span>
        <van-button size="small" type="primary" @click="copyLink">
          <van-icon name="description" />
          <span style="margin-left: 4px">{{ $t('profile.referral_copy') }}</span>
        </van-button>
      </div>
      <div v-if="data.register_bonus > 0" class="hint">
        <van-icon name="gift-o" />
        <span>{{ $t('profile.referral_new_bonus', { count: data.register_bonus }) }}</span>
      </div>
    </div>

    <div v-if="list.length" class="card">
      <div class="card-title">{{ $t('profile.referral_total') }} · {{ total }}</div>
      <div v-for="item in list" :key="item.id" class="invite-row">
        <div class="avatar">
          <img v-if="item.avatar" :src="item.avatar" alt="avatar" />
          <span v-else>{{ (item.nickname || item.username || '?').slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="col">
          <span class="name">{{ item.nickname || item.username }}</span>
          <span class="time">{{ formatTime(item.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { userApi } from '@/api'
import { PUBLIC_WEB_BASE_URL } from '@/config'

export default {
  name: 'ProfileReferral',
  data() {
    return {
      loading: false,
      data: {
        total: 0,
        referral_code: '',
        referral_bonus: 0,
        register_bonus: 0
      },
      list: [],
      total: 0
    }
  },
  computed: {
    referralLink() {
      const code = this.data.referral_code
      if (!code) return ''
      const base = String(PUBLIC_WEB_BASE_URL || '').replace(/\/$/, '')
      return `${base}/login?ref=${encodeURIComponent(code)}`
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await userApi.getMyReferrals({ page: 1, page_size: 20 })
        const d = res.data || {}
        this.data = {
          total: d.total || 0,
          referral_code: d.referral_code || '',
          referral_bonus: d.referral_bonus || 0,
          register_bonus: d.register_bonus || 0
        }
        this.list = d.list || []
        this.total = d.total || 0
      } catch (err) {
        console.error('Load referrals failed:', err)
      } finally {
        this.loading = false
      }
    },
    async copyLink() {
      const link = this.referralLink
      if (!link) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link)
        } else {
          const input = document.createElement('input')
          input.value = link
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast({ message: this.$t('profile.referral_copied'), type: 'success' })
      } catch (err) {
        console.error('Copy link failed:', err)
      }
    },
    formatTime(value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.referral-page {
  min-height: 100vh;
  padding-bottom: 40px;
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.hero {
  margin: 18px 16px 16px;
  padding: 22px 20px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.hero-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--c-green);
  background: var(--c-green-soft);
}

.hero-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.hero-desc {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 10px;
  margin: 0 16px 16px;
}

.stat-card {
  padding: 14px 12px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: center;
}

.stat-card .label {
  display: block;
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 4px;
}

.stat-card .value {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
}

.card {
  margin: 0 16px 14px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}

.link-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.link {
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  color: var(--text);
  font-size: 12px;
  word-break: break-all;
}

.hint {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--c-amber-soft);
  color: var(--c-amber);
  font-size: 12px;
}

.invite-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--hairline);
}

.invite-row:first-of-type { border-top: none; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--text);
  background: var(--surface-raised);
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.time {
  font-size: 11px;
  color: var(--text-3);
}
</style>
