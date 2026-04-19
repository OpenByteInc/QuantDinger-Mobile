<template>
  <div class="security-page">
    <van-nav-bar :title="$t('profile.change_password')" left-arrow @click-left="$router.back()" />

    <div class="hero">
      <div class="hero-icon">
        <van-icon name="lock" />
      </div>
      <div class="hero-title">{{ $t('profile.change_password') }}</div>
      <p class="hero-desc">{{ $t('profile.change_password_desc') }}</p>
    </div>

    <!-- Email verification (PC parity) -->
    <div class="form-card">
      <div class="email-row">
        <div class="email-meta">
          <span class="meta-label">{{ $t('profile.change_pwd_email_label') }}</span>
          <span class="meta-value">{{ userEmail || '-' }}</span>
          <span v-if="userEmail" class="meta-hint">{{ $t('profile.change_pwd_email_hint') }}</span>
          <span v-else class="meta-hint error">{{ $t('profile.change_pwd_no_email') }}</span>
        </div>
      </div>

      <van-field
        v-model="form.code"
        :label="$t('profile.change_pwd_code_label')"
        :placeholder="$t('profile.change_pwd_code_placeholder')"
        maxlength="6"
        class="code-field"
      >
        <template #button>
          <van-button
            size="small"
            type="primary"
            :disabled="!userEmail || cooldown > 0 || sendingCode"
            :loading="sendingCode"
            @click="handleSendCode"
          >
            {{ cooldown > 0 ? $t('profile.change_pwd_resend', { sec: cooldown }) : $t('profile.change_pwd_send_code') }}
          </van-button>
        </template>
      </van-field>

      <van-field
        v-model="form.new_password"
        :label="$t('profile.new_password')"
        type="password"
        :placeholder="$t('profile.new_password_placeholder')"
      />
      <van-field
        v-model="form.confirm_password"
        :label="$t('profile.confirm_password')"
        type="password"
        :placeholder="$t('profile.confirm_password_placeholder')"
      />
    </div>

    <div class="actions">
      <van-button type="primary" block :loading="submitting" @click="handleSubmit">
        {{ $t('profile.change_password_submit') }}
      </van-button>
    </div>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { authApi } from '@/api'
import { useUserStore } from '@/stores'

export default {
  name: 'ProfileSecurity',
  data() {
    return {
      submitting: false,
      sendingCode: false,
      cooldown: 0,
      cooldownTimer: null,
      form: {
        code: '',
        new_password: '',
        confirm_password: ''
      }
    }
  },
  computed: {
    userStore() {
      return useUserStore()
    },
    userEmail() {
      return this.userStore.userInfo?.email || ''
    }
  },
  beforeUnmount() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer)
      this.cooldownTimer = null
    }
  },
  methods: {
    startCooldown() {
      this.cooldown = 60
      this.cooldownTimer = setInterval(() => {
        this.cooldown -= 1
        if (this.cooldown <= 0) {
          clearInterval(this.cooldownTimer)
          this.cooldownTimer = null
        }
      }, 1000)
    },
    async handleSendCode() {
      if (!this.userEmail) {
        showToast({ message: this.$t('profile.change_pwd_no_email'), type: 'fail' })
        return
      }
      this.sendingCode = true
      try {
        await authApi.sendCode({
          email: this.userEmail,
          type: 'change_password'
        })
        showToast({ message: this.$t('profile.change_pwd_code_sent'), type: 'success' })
        this.startCooldown()
      } catch (err) {
        const msg = err?.response?.data?.msg || err?.message || this.$t('profile.change_pwd_code_failed')
        showToast({ message: msg, type: 'fail' })
      } finally {
        this.sendingCode = false
      }
    },
    async handleSubmit() {
      const { code, new_password, confirm_password } = this.form
      if (!code) {
        showToast({ message: this.$t('profile.change_pwd_code_required'), type: 'fail' })
        return
      }
      if (!new_password || !confirm_password) {
        showToast({ message: this.$t('profile.password_required'), type: 'fail' })
        return
      }
      if (new_password !== confirm_password) {
        showToast({ message: this.$t('profile.password_mismatch'), type: 'fail' })
        return
      }
      this.submitting = true
      try {
        await authApi.changePassword({ code, new_password })
        showToast({ message: this.$t('profile.change_password_success'), type: 'success' })
        this.form = { code: '', new_password: '', confirm_password: '' }
        setTimeout(() => this.$router.back(), 600)
      } catch (err) {
        const msg = err?.response?.data?.msg || err?.message
        if (msg) showToast({ message: msg, type: 'fail' })
        console.error('Change password failed:', err)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.security-page {
  min-height: 100vh;
  padding-bottom: 40px;
  background: var(--bg);
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.hero {
  margin: 18px 16px 20px;
  padding: 24px 20px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(260px 180px at 100% 0%, var(--c-indigo-soft), transparent 62%);
  pointer-events: none;
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
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
  position: relative;
}

.hero-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  position: relative;
}

.hero-desc {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
  position: relative;
}

.form-card {
  margin: 0 16px;
  padding: 12px 4px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  overflow: hidden;
}

.email-row {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--hairline);
}
.email-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.meta-label {
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.meta-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  word-break: break-all;
}
.meta-hint {
  font-size: 11px;
  color: var(--text-3);
}
.meta-hint.error {
  color: var(--down);
}

:deep(.code-field .van-field__button .van-button) {
  border-radius: 10px;
  padding: 0 12px;
  font-weight: 600;
}

:deep(.form-card .van-cell) {
  background: transparent;
  padding: 14px 16px;
}
:deep(.form-card .van-cell::after) {
  border-color: var(--hairline);
}
:deep(.form-card .van-field__label) {
  color: var(--text-2);
}
:deep(.form-card .van-field__control) {
  color: var(--text);
}

.actions {
  margin: 20px 16px 0;
}

.actions :deep(.van-button) {
  border-radius: 14px;
  height: 46px;
  font-weight: 700;
}
</style>
