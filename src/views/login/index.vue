<template>
  <div class="login-page">
    <div class="login-shell">
      <div class="login-header">
        <div class="logo-wrap">
          <img :src="logoUrl" alt="Logo" class="logo-image" />
        </div>
        <p class="subtitle">安全登录后即可访问策略、资产与市场数据</p>
      </div>

      <div class="login-form">
      <div class="form-item">
        <div class="input-wrapper">
          <van-icon name="link-o" class="input-icon" />
          <input
            v-model="serverUrl"
            type="text"
            placeholder="服务器地址"
            class="input"
          />
        </div>
        <p class="hint">默认连接官方后端：{{ defaultServerUrl }}</p>
      </div>

      <div class="form-item">
        <div class="input-wrapper">
          <van-icon name="user-o" class="input-icon" />
          <input
            v-model="form.username"
            type="text"
            placeholder="用户名"
            class="input"
          />
        </div>
      </div>

      <div class="form-item">
        <div class="input-wrapper">
          <van-icon name="lock" class="input-icon" />
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            class="input"
            @keyup.enter="handleLogin"
          />
          <van-icon
            :name="showPassword ? 'eye-o' : 'closed-eye'"
            class="eye-icon"
            @click="showPassword = !showPassword"
          />
        </div>
      </div>

      <div class="remember-row">
        <van-checkbox v-model="rememberMe" shape="square" icon-size="16">
          记住登录状态
        </van-checkbox>
      </div>

      <div v-if="securityConfig.turnstile_enabled" class="security-panel">
        <div class="security-copy">
          <span class="security-title">安全验证</span>
          <span class="security-desc">请完成人机验证后继续登录</span>
        </div>
        <div class="turnstile-card">
          <div ref="turnstileRef" class="turnstile-mount"></div>
          <p v-if="turnstileError" class="turnstile-error">{{ turnstileError }}</p>
        </div>
      </div>

      <van-button
        type="primary"
        block
        :loading="loading"
        :disabled="!canLogin"
        class="login-btn"
        @click="handleLogin"
      >
        登录
      </van-button>

        <div class="footer">
          <p>登录过程受风控保护，若验证失效会自动要求重新验证</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { authApi } from '@/api'
import { useUserStore, useSettingsStore } from '@/stores'
import { DEFAULT_SERVER_URL } from '@/config'
import logoUrl from '@/assets/logo.png'

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileScriptPromise

const ensureTurnstileScript = () => {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile)
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile 脚本加载失败')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => reject(new Error('Turnstile 脚本加载失败'))
    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

export default {
  name: 'Login',
  
  data() {
    return {
      logoUrl,
      defaultServerUrl: DEFAULT_SERVER_URL,
      serverUrl: localStorage.getItem('serverUrl') || DEFAULT_SERVER_URL,
      form: {
        username: '',
        password: ''
      },
      securityConfig: {
        turnstile_enabled: false,
        turnstile_site_key: ''
      },
      showPassword: false,
      rememberMe: true,
      loading: false,
      turnstileWidgetId: null,
      turnstileToken: '',
      turnstileError: '',
      turnstileErrorCode: ''
    }
  },
  
  computed: {
    canLogin() {
      const hasCredentials = this.form.username.trim() && this.form.password.trim()
      const turnstileReady = !this.securityConfig.turnstile_enabled || !!this.turnstileToken
      return hasCredentials && turnstileReady
    }
  },

  async mounted() {
    await this.initSecurity()
  },
  
  methods: {
    async initSecurity() {
      try {
        const res = await authApi.getSecurityConfig()
        if (res.code === 1 && res.data) {
          this.securityConfig = {
            turnstile_enabled: !!res.data.turnstile_enabled,
            turnstile_site_key: res.data.turnstile_site_key || ''
          }
        }
      } catch (err) {
        console.warn('Failed to load security config:', err)
      }

      if (this.securityConfig.turnstile_enabled && this.securityConfig.turnstile_site_key) {
        await this.$nextTick()
        await this.renderTurnstile()
      }
    },

    async renderTurnstile() {
      try {
        this.turnstileError = ''
        this.turnstileErrorCode = ''
        await ensureTurnstileScript()
        if (!this.$refs.turnstileRef || !window.turnstile) return

        if (this.turnstileWidgetId !== null) {
          window.turnstile.remove(this.turnstileWidgetId)
          this.turnstileWidgetId = null
        }

        this.turnstileWidgetId = window.turnstile.render(this.$refs.turnstileRef, {
          sitekey: this.securityConfig.turnstile_site_key,
          theme: 'dark',
          size: 'flexible',
          callback: (token) => {
            this.turnstileToken = token
            this.turnstileError = ''
            this.turnstileErrorCode = ''
          },
          'expired-callback': () => {
            this.turnstileToken = ''
            this.turnstileError = '验证已过期，请重新完成验证'
            this.turnstileErrorCode = 'expired'
          },
          'error-callback': (errorCode) => {
            this.turnstileToken = ''
            this.turnstileErrorCode = String(errorCode || '')
            this.turnstileError = this.getTurnstileErrorMessage(errorCode)
          }
        })
      } catch (err) {
        console.error('Turnstile render failed:', err)
        this.turnstileError = '安全验证初始化失败，请刷新页面重试'
      }
    },

    resetTurnstile() {
      if (!this.securityConfig.turnstile_enabled || this.turnstileWidgetId === null || !window.turnstile) {
        return
      }
      this.turnstileToken = ''
      this.turnstileError = ''
      this.turnstileErrorCode = ''
      window.turnstile.reset(this.turnstileWidgetId)
    },

    getTurnstileErrorMessage(errorCode) {
      const code = String(errorCode || '')
      const hostname = window.location.hostname || '当前域名'

      if (code === '110200') {
        return `${hostname} 未加入 Cloudflare Turnstile 白名单，当前官方 site key 不允许在这个域名上使用。`
      }

      if (code.startsWith('110')) {
        return `安全验证被 Cloudflare 拒绝（错误码 ${code}），通常是域名或站点配置问题。`
      }

      return code
        ? `安全验证加载失败（错误码 ${code}），请稍后重试。`
        : '安全验证加载失败，请稍后重试。'
    },

    async handleLogin() {
      if (this.loading || !this.canLogin) return

      if (this.securityConfig.turnstile_enabled && !this.turnstileToken) {
        showToast({ message: '请先完成人机验证', type: 'fail' })
        return
      }
      
      const settingsStore = useSettingsStore()
      settingsStore.setServerUrl(this.serverUrl.trim())
      
      this.loading = true
      
      try {
        const res = await authApi.login({
          username: this.form.username.trim(),
          password: this.form.password,
          turnstile_token: this.turnstileToken || undefined
        })
        
        if (res.code === 1 && res.data?.token) {
          const userStore = useUserStore()
          userStore.setToken(res.data.token)
          
          try {
            const infoRes = await authApi.getInfo()
            if (infoRes.code === 1 && infoRes.data) {
              userStore.setUserInfo(infoRes.data)
            }
          } catch (e) {
            console.warn('Failed to get user info:', e)
          }
          
          showToast({ message: '登录成功', type: 'success' })
          
          const redirect = this.$route.query.redirect || '/home'
          this.$router.replace(redirect)
        } else {
          showToast({ message: res.msg || '登录失败', type: 'fail' })
        }
      } catch (err) {
        console.error('Login error:', err)
        this.resetTurnstile()
        showToast({ message: err.message || '登录失败，请检查服务器地址', type: 'fail' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 26px 18px 24px;
  display: flex;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: -20% auto auto -35%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 176, 106, 0.22), transparent 66%);
  filter: blur(14px);
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  right: -120px;
  bottom: -120px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent 62%);
  filter: blur(12px);
  pointer-events: none;
}

.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 26px 18px 20px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(12, 12, 14, 0.94), rgba(6, 6, 8, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(24px);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-wrap {
  width: 112px;
  height: 112px;
  margin: 0 auto 18px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(212, 176, 106, 0.12), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(212, 176, 106, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.logo-image {
  width: 84px;
  height: 84px;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px rgba(212, 176, 106, 0.18));
}

.subtitle {
  color: rgba(255, 255, 255, 0.58);
  font-size: 14px;
  line-height: 1.6;
  padding: 0 8px;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-item {
  margin-bottom: 16px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  min-height: 58px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.24s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.input-wrapper:focus-within {
  border-color: rgba(212, 176, 106, 0.55);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 4px rgba(212, 176, 106, 0.08);
}

.input-icon {
  color: rgba(255, 255, 255, 0.42);
  font-size: 18px;
  margin-right: 12px;
}

.input {
  flex: 1;
  height: 56px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.eye-icon {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  padding: 8px;
  margin-right: -8px;
}

.hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
  padding-left: 4px;
}

.remember-row {
  margin: 4px 0 18px;
}

.remember-row :deep(.van-checkbox__label) {
  color: rgba(255, 255, 255, 0.7);
}

.security-panel {
  margin-bottom: 18px;
}

.security-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.security-title {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.security-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.44);
}

.turnstile-card {
  padding: 14px 12px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.turnstile-mount {
  min-height: 70px;
}

.turnstile-error {
  margin-top: 8px;
  font-size: 12px;
  color: #ff8f87;
}

.login-btn {
  height: 56px;
  border-radius: 18px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

.login-btn:disabled {
  opacity: 0.45;
}

.footer {
  text-align: center;
  margin-top: 18px;
}

.footer p {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  line-height: 1.6;
}
</style>
