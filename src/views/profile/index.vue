<template>
  <div class="profile-page">
    <!-- User hero -->
    <div class="user-hero">
      <div class="hero-glow"></div>
      <div class="hero-main">
        <div class="avatar">
          <img
            :src="avatarUrl"
            alt="Avatar"
            class="avatar-logo"
            referrerpolicy="no-referrer"
            @error="onAvatarError"
          />
          <span v-if="isVip" class="vip-crown"><van-icon name="medal-o" /></span>
        </div>
        <div class="info">
          <span class="name">{{ displayName }}</span>
          <span class="email">{{ userInfo?.email || $t('profile.account_subtitle') }}</span>
          <div class="tag-row">
            <span class="role-tag">{{ roleLabel }}</span>
            <span v-if="isVip" class="vip-tag">
              <van-icon name="medal-o" /> VIP
            </span>
          </div>
        </div>
        <button
          type="button"
          class="edit-profile-button"
          :aria-label="$t('profile.edit_profile')"
          @click="openProfileEditor"
        >
          <van-icon name="edit" />
        </button>
      </div>
    </div>

    <!-- Dual glass cards: Credits + Invite -->
    <div class="double-card">
      <div class="wallet-card" @click="$router.push('/profile/credits')">
        <div class="wallet-shine"></div>
        <div class="wallet-head">
          <van-icon name="gold-coin-o" />
          <span>{{ $t('profile.credits') }}</span>
        </div>
        <div class="wallet-value">{{ formatCredits(billing.credits) }}</div>
        <div class="wallet-sub">
          <span v-if="billing.is_vip && billing.vip_expires_at">
            {{ $t('profile.vip_active', { date: formatDate(billing.vip_expires_at) }) }}
          </span>
          <span v-else>{{ $t('profile.vip_none') }}</span>
        </div>
        <div class="wallet-cta">
          <span>{{ $t('profile.credits_recharge') }}</span>
          <van-icon name="arrow" />
        </div>
      </div>

      <div class="invite-card" @click="$router.push('/profile/referral')">
        <div class="wallet-shine invite"></div>
        <div class="invite-head">
          <van-icon name="friends-o" />
          <span>{{ $t('profile.referral') }}</span>
        </div>
        <div class="invite-stats">
          <div class="stat">
            <span class="val">{{ referralData.total || 0 }}</span>
            <span class="lab">{{ $t('profile.referral_total') }}</span>
          </div>
          <div class="stat" v-if="referralData.referral_bonus > 0">
            <span class="val">+{{ referralData.referral_bonus }}</span>
            <span class="lab">{{ $t('profile.referral_bonus') }}</span>
          </div>
        </div>
        <div class="invite-sub">{{ $t('profile.referral_desc') }}</div>
      </div>
    </div>

    <!-- Account -->
    <div class="menu-section">
      <span class="menu-section-title">{{ $t('profile.section_account') }}</span>
      <div class="menu-group">
        <div class="menu-item" @click="$router.push('/profile/credentials')">
          <div class="menu-icon c-amber"><van-icon name="exchange" /></div>
          <div class="menu-copy">
            <span class="label">{{ $t('profile.credentials') }}</span>
            <span class="menu-description">{{ $t('profile.credentials_sub') }}</span>
          </div>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/referral')">
          <div class="menu-icon c-green"><van-icon name="friends-o" /></div>
          <span class="label">{{ $t('profile.referral') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/security')">
          <div class="menu-icon c-indigo"><van-icon name="lock" /></div>
          <span class="label">{{ $t('profile.change_password') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/mfa')">
          <div class="menu-icon c-blue"><van-icon name="shield-o" /></div>
          <span class="label">{{ $t('profile.mfa_manage') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/login-logs')">
          <div class="menu-icon c-teal"><van-icon name="clock-o" /></div>
          <span class="label">{{ $t('profile.login_logs') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
      </div>
    </div>

    <!-- Preferences -->
    <div class="menu-section">
      <span class="menu-section-title">{{ $t('profile.section_preferences') }}</span>
      <div class="menu-group">
        <div class="menu-item" @click="$router.push('/profile/language')">
          <div class="menu-icon c-blue"><van-icon name="font-o" /></div>
          <span class="label">{{ $t('profile.language') }}</span>
          <span class="menu-value">{{ currentLanguageLabel }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" role="switch" :aria-checked="isDarkTheme" @click="toggleTheme">
          <div class="menu-icon c-violet"><van-icon :name="isDarkTheme ? 'closed-eye' : 'eye-o'" /></div>
          <span class="label">{{ $t('profile.appearance') }}</span>
          <span class="menu-value">{{ $t(isDarkTheme ? 'profile.theme_dark' : 'profile.theme_light') }}</span>
          <van-switch :model-value="isDarkTheme" size="20" @click.stop="toggleTheme" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/notification-settings')">
          <div class="menu-icon c-orange"><van-icon name="setting-o" /></div>
          <span class="label">{{ $t('profile.notif_settings') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/profile/about')">
          <div class="menu-icon c-violet"><van-icon name="info-o" /></div>
          <span class="label">{{ $t('profile.about_us') }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
      </div>
    </div>

    <div class="logout-section">
      <van-button block plain type="danger" @click="handleLogout">
        {{ $t('profile.logout') }}
      </van-button>
    </div>

    <van-popup
      v-model:show="profileEditorOpen"
      position="bottom"
      round
      :style="{ height: '72%' }"
    >
      <div class="profile-editor">
        <div class="editor-head">
          <div>
            <strong>{{ $t('profile.edit_profile') }}</strong>
            <span>{{ $t('profile.edit_profile_desc') }}</span>
          </div>
          <van-icon name="cross" @click="profileEditorOpen = false" />
        </div>
        <div class="editor-body">
          <div class="avatar-preview">
            <img :src="profileForm.avatar || logoUrl" :alt="profileForm.nickname" @error="onAvatarError" />
          </div>
          <van-field
            v-model="profileForm.nickname"
            :label="$t('profile.nickname')"
            :placeholder="$t('profile.nickname_placeholder')"
            maxlength="40"
            show-word-limit
          />
          <van-field
            v-model="profileForm.avatar"
            :label="$t('profile.avatar_url')"
            :placeholder="$t('profile.avatar_url_placeholder')"
          />
          <p class="editor-hint">{{ $t('profile.avatar_url_hint') }}</p>
          <van-field
            v-model="profileForm.timezone"
            :label="$t('profile.timezone')"
            :placeholder="$t('profile.timezone_placeholder')"
          />
          <p class="editor-hint">{{ $t('profile.timezone_hint') }}</p>
          <van-button type="primary" round block :loading="savingProfile" @click="saveProfile">
            {{ $t('common.save') }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { authApi, getBaseUrl, userApi } from '@/api'
import { useSettingsStore, useUserStore } from '@/stores'
import logoUrl from '@/assets/slogo.png'

export default {
  name: 'Profile',

  data() {
    return {
      logoUrl,
      billing: {
        credits: 0,
        is_vip: false,
        vip_expires_at: null,
        billing_enabled: false
      },
      referralData: {
        total: 0,
        referral_bonus: 0,
        register_bonus: 0,
        referral_code: ''
      },
      profileEditorOpen: false,
      savingProfile: false,
      profileForm: {
        nickname: '',
        avatar: '',
        timezone: ''
      }
    }
  },

  computed: {
    userStore() {
      return useUserStore()
    },
    userInfo() {
      return this.userStore.userInfo
    },
    settingsStore() {
      return useSettingsStore()
    },
    isDarkTheme() {
      return this.settingsStore.theme !== 'light'
    },
    currentLanguageLabel() {
      const labels = {
        'zh-CN': '简体中文',
        'zh-TW': '繁體中文',
        'en-US': 'English',
        'ja-JP': '日本語',
        'ko-KR': '한국어'
      }
      return labels[this.settingsStore.locale] || this.settingsStore.locale
    },
    avatarUrl() {
      const raw = (this.userInfo?.avatar || '').trim()
      if (!raw) return this.logoUrl
      if (/^(https?:|data:|blob:)/i.test(raw)) return raw
      const base = getBaseUrl().replace(/\/$/, '')
      if (raw.startsWith('/')) return `${base}${raw}`
      return `${base}/${raw}`
    },
    displayName() {
      return this.userInfo?.nickname || this.userInfo?.username || this.$t('profile.title')
    },
    isVip() {
      if (!this.billing.vip_expires_at) return !!this.billing.is_vip
      const ts = new Date(this.billing.vip_expires_at).getTime()
      return !Number.isNaN(ts) && ts > Date.now()
    },
    roleLabel() {
      const role = this.userInfo?.role
      if (role === 'admin') return this.$t('profile.role_admin')
      return this.$t('profile.role_user')
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    toggleTheme() {
      this.settingsStore.setTheme(this.isDarkTheme ? 'light' : 'dark')
    },
    async loadData() {
      try {
        const [profileRes, referralRes] = await Promise.allSettled([
          userApi.getProfile(),
          userApi.getMyReferrals({ page: 1, page_size: 1 })
        ])
        if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
          const profile = profileRes.value.data
          this.userStore.setUserInfo(profile)
          if (profile.billing) {
            this.billing = { ...this.billing, ...profile.billing }
          }
        }
        if (referralRes.status === 'fulfilled' && referralRes.value?.data) {
          this.referralData = {
            total: referralRes.value.data.total || 0,
            referral_bonus: referralRes.value.data.referral_bonus || 0,
            register_bonus: referralRes.value.data.register_bonus || 0,
            referral_code: referralRes.value.data.referral_code || ''
          }
        }
      } catch (error) {
        console.error('Load profile data failed:', error)
      }
    },

    formatCredits(value) {
      const num = Number(value || 0)
      return new Intl.NumberFormat('en-US').format(num)
    },

    onAvatarError(event) {
      const img = event?.target
      if (img && img.src !== this.logoUrl) {
        img.src = this.logoUrl
      }
    },

    formatDate(value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    openProfileEditor() {
      this.profileForm = {
        nickname: this.userInfo?.nickname || '',
        avatar: this.userInfo?.avatar || '',
        timezone: this.userInfo?.timezone || ''
      }
      this.profileEditorOpen = true
    },

    async saveProfile() {
      const nickname = this.profileForm.nickname.trim()
      if (!nickname) {
        showToast({ message: this.$t('profile.nickname_required'), type: 'fail' })
        return
      }
      this.savingProfile = true
      try {
        await userApi.updateProfile({
          nickname,
          avatar: this.profileForm.avatar.trim(),
          timezone: this.profileForm.timezone.trim()
        })
        this.userStore.setUserInfo({
          ...(this.userInfo || {}),
          nickname,
          avatar: this.profileForm.avatar.trim(),
          timezone: this.profileForm.timezone.trim()
        })
        showToast({ message: this.$t('profile.profile_saved'), type: 'success' })
        this.profileEditorOpen = false
        await this.loadData()
      } finally {
        this.savingProfile = false
      }
    },

    async handleLogout() {
      try {
        await showConfirmDialog({
          title: this.$t('profile.logout'),
          message: this.$t('profile.logout_confirm')
        })
        try {
          await authApi.logout()
        } catch (error) {
          console.error('Logout request failed:', error)
        }
        this.userStore.logout()
        this.$router.replace('/login')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Logout failed:', error)
        }
      }
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: calc(16px + var(--safe-area-top, 0px)) var(--page-gutter) calc(40px + var(--safe-area-bottom, 0px));
  background: var(--bg);
  color: var(--text);
}

/* ===== Hero (flat panel with top glow) ===== */
.user-hero {
  position: relative;
  margin-bottom: 16px;
  padding: 22px 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(320px 220px at 100% 0%, var(--accent-crimson-soft), transparent 60%);
}
.hero-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-profile-button {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--accent);
  font-size: 16px;
}

.avatar {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  overflow: visible;
  flex-shrink: 0;
}

.avatar-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}

.vip-crown {
  position: absolute;
  bottom: -4px; right: -4px;
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-gold);
  color: #0a0a0d;
  font-size: 13px;
  border: 2px solid var(--bg-elevated);
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name {
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.025em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.role-tag,
.vip-tag {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.role-tag {
  background: var(--surface-raised);
  color: var(--text-2);
  border: 1px solid var(--border);
}

.vip-tag {
  background: var(--accent-gold);
  color: #0a0a0d;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ===== Double card ===== */
.double-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.wallet-card,
.invite-card {
  position: relative;
  padding: 16px 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  overflow: hidden;
  transition: transform 0.15s;
}
.wallet-card:active,
.invite-card:active { transform: scale(0.98); }

.wallet-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(220px 160px at 100% 0%, var(--accent-gold-soft), transparent 62%);
}
.invite-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(220px 160px at 100% 0%, var(--c-green-soft), transparent 62%);
}

.wallet-shine { display: none; }

.wallet-head,
.invite-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-3);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wallet-head .van-icon { font-size: 15px; color: var(--c-amber); }
.invite-head .van-icon { font-size: 15px; color: var(--c-green); }

.wallet-value {
  position: relative;
  margin-top: 6px;
  font-size: 30px;
  font-weight: 800;
  color: var(--c-amber);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.wallet-sub {
  position: relative;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}

.wallet-cta {
  position: relative;
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--c-amber-soft);
  color: var(--c-amber);
  font-size: 11px;
  font-weight: 700;
}

.invite-stats {
  position: relative;
  margin-top: 8px;
  display: flex;
  gap: 14px;
}
.invite-stats .stat { display: flex; flex-direction: column; }
.invite-stats .val {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.invite-stats .lab {
  font-size: 11px;
  color: var(--text-3);
}
.invite-sub {
  position: relative;
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-3);
}

/* ===== Menu sections ===== */
.menu-section { margin-bottom: 20px; }
.menu-section-title {
  display: block;
  padding: 0 4px;
  margin-bottom: 10px;
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.menu-group {
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  position: relative;
  transition: background 0.15s;
}
.menu-item:active { background: var(--surface-raised); }
.menu-item + .menu-item::before {
  content: '';
  position: absolute;
  left: 58px; right: 0; top: 0;
  height: 1px;
  background: var(--hairline);
}

/* iOS-style: solid color tile per row for a cheerful, organized look */
.menu-icon {
  width: 30px; height: 30px;
  flex-shrink: 0;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-slate);
  color: #ffffff;
  font-size: 16px;
}
.menu-icon.c-red    { background: var(--c-red); }
.menu-icon.c-orange { background: var(--c-orange); }
.menu-icon.c-amber  { background: var(--c-amber); color: #0a0a0d; }
.menu-icon.c-green  { background: var(--c-green); }
.menu-icon.c-teal   { background: var(--c-teal); }
.menu-icon.c-blue   { background: var(--c-blue); }
.menu-icon.c-indigo { background: var(--c-indigo); }
.menu-icon.c-violet { background: var(--c-violet); }
.menu-icon.c-pink   { background: var(--c-pink); }
.menu-icon.c-slate  { background: var(--c-slate); }

.menu-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-copy .label {
  flex: none;
}

.menu-description {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.35;
}

.label {
  flex: 1;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value {
  font-size: 13px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.menu-value {
  max-width: 96px;
  overflow: hidden;
  color: var(--text-3);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--down);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow {
  color: var(--text-4);
  font-size: 13px;
}

.logout-section {
  margin-top: 24px;
}

.logout-section :deep(.van-button) {
  border-radius: 13px;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--down);
}

.profile-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
}

.editor-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 17px 18px 13px;
  border-bottom: 1px solid var(--hairline);
}

.editor-head strong,
.editor-head span {
  display: block;
}

.editor-head strong {
  color: var(--text);
  font-size: 16px;
}

.editor-head span {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 10px;
}

.editor-head .van-icon {
  color: var(--text-2);
  font-size: 18px;
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 18px calc(24px + var(--safe-area-bottom, 0px));
}

.avatar-preview {
  width: 72px;
  height: 72px;
  margin: 0 auto 8px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-raised);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.editor-body :deep(.van-cell) {
  padding: 14px 0;
  background: transparent;
  color: var(--text);
  border-bottom: 1px solid var(--hairline);
}

.editor-body :deep(.van-field__label) { color: var(--text-2); }
.editor-body :deep(.van-field__control) { color: var(--text); }
.editor-body :deep(.van-cell::after) { display: none; }

.editor-hint {
  margin: 7px 0 0;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.5;
}

.editor-body > .van-button {
  margin-top: 18px;
}
</style>
