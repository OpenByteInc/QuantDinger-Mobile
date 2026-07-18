<template>
  <div class="login-page">
    <div class="login-shell">
      <div class="login-toolbar">
        <button
          type="button"
          class="lang-btn"
          :aria-label="$t('login.language_switch')"
          @click="showLangSheet = true"
        >
          {{ langButtonLabel }}
        </button>
      </div>
      <div class="login-header">
        <div class="logo-wrap">
          <img :src="logoUrl" alt="Logo" class="logo-image" />
        </div>
        <p class="subtitle">{{ $t('login.subtitle') }}</p>
      </div>

      <div class="tab-bar">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab', { active: mode === tab.value }]"
          @click="switchMode(tab.value)"
        >
          {{ tab.label }}
        </div>
      </div>

      <div class="login-form">
        <!-- Login -->
        <template v-if="mode === 'login'">
          <div class="login-method-switch">
            <button
              type="button"
              :class="['method-pill', { active: loginMethod === 'password' }]"
              @click="switchLoginMethod('password')"
            >
              {{ $t('login.password_login') }}
            </button>
            <button
              type="button"
              :class="['method-pill', { active: loginMethod === 'code' }]"
              @click="switchLoginMethod('code')"
            >
              {{ $t('login.code_login') }}
            </button>
          </div>

          <template v-if="loginMethod === 'password'">
            <div class="form-item">
              <div class="input-wrapper">
                <van-icon name="user-o" class="input-icon" />
                <input
                  v-model="loginForm.username"
                  type="text"
                  :placeholder="$t('login.placeholder_username')"
                  class="input"
                  autocomplete="username"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="input-wrapper">
                <van-icon name="lock" class="input-icon" />
                <input
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="$t('login.placeholder_password')"
                  class="input"
                  autocomplete="current-password"
                  @keyup.enter="handleLogin"
                />
                <van-icon
                  :name="showPassword ? 'eye-o' : 'closed-eye'"
                  class="eye-icon"
                  @click="showPassword = !showPassword"
                />
              </div>
            </div>
            <div class="row-between">
              <van-checkbox v-model="rememberMe" shape="square" icon-size="16">
                {{ $t('login.remember') }}
              </van-checkbox>
              <span class="link" @click="switchMode('forgot')">{{ $t('login.forgot_password') }}</span>
            </div>
          </template>

          <template v-else>
            <div class="form-item">
              <div class="input-wrapper">
                <van-icon name="envelop-o" class="input-icon" />
                <input
                  v-model="codeLoginForm.email"
                  type="email"
                  :placeholder="$t('login.placeholder_email')"
                  class="input"
                  autocomplete="email"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="input-wrapper">
                <van-icon name="shield-o" class="input-icon" />
                <input
                  v-model="codeLoginForm.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  :placeholder="$t('login.placeholder_code')"
                  class="input"
                  autocomplete="one-time-code"
                  @keyup.enter="handleLogin"
                />
                <button
                  type="button"
                  class="code-btn"
                  :disabled="getCodeCountdown('login') > 0 || isSendingCode('login')"
                  @click="sendCode('login')"
                >
                  {{ getCodeBtnText('login') }}
                </button>
              </div>
            </div>
          </template>

          <div class="row-agreement">
            <van-checkbox v-model="agreeTerms" shape="square" icon-size="16">
              <span class="agree-line">
                {{ $t('login.agree_prefix') }}
                <span class="link-inline" role="button" tabindex="0" @click.stop.prevent="openLegal('terms')">{{
                  $t('login.agree_terms_link')
                }}</span>
                {{ $t('login.agree_connector') }}
                <span
                  class="link-inline"
                  role="button"
                  tabindex="0"
                  @click.stop.prevent="openLegal('disclaimer')"
                  >{{ $t('login.agree_disclaimer_link') }}</span
                >
              </span>
            </van-checkbox>
          </div>
        </template>

        <!-- Register -->
        <template v-else-if="mode === 'register'">
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="envelop-o" class="input-icon" />
              <input
                v-model="registerForm.email"
                type="email"
                :placeholder="$t('login.placeholder_email')"
                class="input"
                autocomplete="email"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="shield-o" class="input-icon" />
              <input
                v-model="registerForm.code"
                type="text"
                inputmode="numeric"
                maxlength="6"
                :placeholder="$t('login.placeholder_code')"
                class="input"
                autocomplete="one-time-code"
              />
              <button
                type="button"
                class="code-btn"
                :disabled="getCodeCountdown('register') > 0 || isSendingCode('register')"
                @click="sendCode('register')"
              >
                {{ getCodeBtnText('register') }}
              </button>
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="user-o" class="input-icon" />
              <input
                v-model="registerForm.username"
                type="text"
                :placeholder="$t('login.placeholder_new_username')"
                class="input"
                autocomplete="username"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <input
                v-model="registerForm.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('login.placeholder_new_password')"
                class="input"
                autocomplete="new-password"
              />
              <van-icon
                :name="showPassword ? 'eye-o' : 'closed-eye'"
                class="eye-icon"
                @click="showPassword = !showPassword"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="friends-o" class="input-icon" />
              <input
                v-model="registerForm.referralCode"
                type="text"
                :placeholder="$t('login.placeholder_referral')"
                class="input"
              />
            </div>
          </div>
          <div class="row-agreement">
            <van-checkbox v-model="agreeTerms" shape="square" icon-size="16">
              <span class="agree-line">
                {{ $t('login.agree_prefix') }}
                <span class="link-inline" role="button" tabindex="0" @click.stop.prevent="openLegal('terms')">{{
                  $t('login.agree_terms_link')
                }}</span>
                {{ $t('login.agree_connector') }}
                <span
                  class="link-inline"
                  role="button"
                  tabindex="0"
                  @click.stop.prevent="openLegal('disclaimer')"
                  >{{ $t('login.agree_disclaimer_link') }}</span
                >
              </span>
            </van-checkbox>
          </div>
        </template>

        <!-- Forgot Password -->
        <template v-else-if="mode === 'forgot'">
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="envelop-o" class="input-icon" />
              <input
                v-model="forgotForm.email"
                type="email"
                :placeholder="$t('login.placeholder_email')"
                class="input"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="shield-o" class="input-icon" />
              <input
                v-model="forgotForm.code"
                type="text"
                inputmode="numeric"
                maxlength="6"
                :placeholder="$t('login.placeholder_code')"
                class="input"
                autocomplete="one-time-code"
              />
              <button
                type="button"
                class="code-btn"
                :disabled="getCodeCountdown('forgot') > 0 || isSendingCode('forgot')"
                @click="sendCode('reset_password')"
              >
                {{ getCodeBtnText('forgot') }}
              </button>
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <input
                v-model="forgotForm.newPassword"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('login.placeholder_new_password')"
                class="input"
              />
              <van-icon
                :name="showPassword ? 'eye-o' : 'closed-eye'"
                class="eye-icon"
                @click="showPassword = !showPassword"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <input
                v-model="forgotForm.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('login.confirm_password')"
                class="input"
              />
            </div>
          </div>
        </template>

        <div v-if="securityConfig.turnstile_enabled" class="security-panel">
          <div class="security-copy">
            <span class="security-title">{{ $t('login.turnstile_title') }}</span>
            <span class="security-desc">
              {{ turnstileVerified ? $t('login.turnstile_verified') : $t('login.turnstile_desc') }}
            </span>
          </div>
          <div v-if="turnstileVerified" class="turnstile-verified">
            <van-icon name="passed" />
            <span>{{ $t('login.turnstile_verified') }}</span>
          </div>
          <div v-else class="turnstile-card">
            <div ref="turnstileRef" class="turnstile-mount"></div>
            <van-loading v-if="turnstileClearanceLoading" size="18" class="turnstile-loading">
              {{ $t('login.turnstile_tip') }}
            </van-loading>
            <p v-if="turnstileError" class="turnstile-error">{{ turnstileError }}</p>
          </div>
        </div>

        <van-button
          type="primary"
          block
          :loading="loading"
          :disabled="!canSubmit"
          class="submit-btn"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </van-button>

        <div
          v-if="mode === 'login' && (oauthConfig.google_enabled || oauthConfig.github_enabled)"
          class="oauth-section"
        >
          <div class="divider">
            <span class="line"></span>
            <span class="text">{{ $t('login.oauth_divider') }}</span>
            <span class="line"></span>
          </div>
          <div class="oauth-buttons">
            <button
              v-if="oauthConfig.google_enabled"
              type="button"
              class="oauth-btn"
              :disabled="oauthLoading || !agreeTerms"
              @click="handleOAuthLogin('google')"
            >
              <svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09A6.73 6.73 0 0 1 5.48 12c0-.72.13-1.42.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{{ $t('login.continue_with_google') }}</span>
            </button>
            <button
              v-if="oauthConfig.github_enabled"
              type="button"
              class="oauth-btn"
              :disabled="oauthLoading || !agreeTerms"
              @click="handleOAuthLogin('github')"
            >
              <svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#ffffff" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
              </svg>
              <span>{{ $t('login.continue_with_github') }}</span>
            </button>
          </div>
        </div>

        <div class="alt-link">
          <span v-if="mode === 'login'" class="link" @click="switchMode('register')">{{ $t('login.to_register') }}</span>
          <span v-else class="link" @click="switchMode('login')">{{ $t('login.to_login') }}</span>
        </div>

        <div class="footer">
          <p>{{ $t('login.footer_tip') }}</p>
        </div>
      </div>
    </div>

    <van-action-sheet
      v-model:show="showLangSheet"
      :actions="langSheetActions"
      :cancel-text="$t('common.cancel')"
      close-on-click-action
      @select="onLangSheetSelect"
    />

    <van-popup
      v-model:show="legalVisible"
      position="bottom"
      round
      :style="{ height: '78vh' }"
      class="legal-popup-root"
    >
      <div class="legal-popup">
        <div class="legal-popup__head">
          <span
            :class="['legal-tab', { active: legalTab === 'terms' }]"
            @click="legalTab = 'terms'"
            >{{ $t('about.terms_tab') }}</span
          >
          <span
            :class="['legal-tab', { active: legalTab === 'disclaimer' }]"
            @click="legalTab = 'disclaimer'"
            >{{ $t('about.disclaimer_tab') }}</span
          >
        </div>
        <div class="legal-popup__body">{{ legalPopupBody }}</div>
        <div class="legal-popup__foot">
          <van-button type="primary" block round @click="legalVisible = false">{{
            $t('common.confirm')
          }}</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="mfaVisible"
      round
      closeable
      class="mfa-popup-root"
      :style="{ width: '88%', maxWidth: '420px' }"
      @closed="resetMfaLogin"
    >
      <div class="mfa-popup">
        <div class="mfa-icon">
          <van-icon name="shield-o" />
        </div>
        <h3>{{ $t('login.mfa_title') }}</h3>
        <p>{{ $t('login.mfa_hint') }}</p>
        <div class="input-wrapper mfa-input">
          <van-icon name="shield-o" class="input-icon" />
          <input
            v-model="mfaCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            :placeholder="$t('login.mfa_placeholder')"
            class="input"
            @keyup.enter="handleMfaLoginVerify"
          />
        </div>
        <div v-if="mfaError" class="mfa-error">{{ mfaError }}</div>
        <div class="mfa-actions">
          <van-button block plain @click="mfaVisible = false">{{ $t('common.cancel') }}</van-button>
          <van-button block type="primary" :loading="mfaLoading" @click="handleMfaLoginVerify">
            {{ $t('login.mfa_verify') }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { authApi, getBaseUrl } from '@/api'
import { useUserStore, useSettingsStore } from '@/stores'
import { getOAuthRedirectUri } from '@/utils/oauthRedirect'
import { getLegal } from '@/constants/legal'
import logoUrl from '@/assets/slogo.png'

/** Normalize backend variants for Turnstile (PC / mobile API parity). */
function parseTurnstileConfig(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  const nested = (d.security && typeof d.security === 'object' && d.security) || {}
  const nested2 = (d.turnstile && typeof d.turnstile === 'object' && d.turnstile) || {}
  const pickKey = (...objs) => {
    const keys = [
      'turnstile_site_key',
      'turnstileSiteKey',
      'cf_turnstile_site_key',
      'cloudflare_turnstile_site_key',
      'site_key',
      'siteKey',
      'public_key'
    ]
    for (const obj of objs) {
      if (!obj || typeof obj !== 'object') continue
      for (const k of keys) {
        const v = obj[k]
        if (v != null && String(v).trim()) return String(v).trim()
      }
    }
    return ''
  }
  const siteKey = pickKey(d, nested, nested2)
  const rawEn =
    d.turnstile_enabled ??
    d.cf_turnstile_enabled ??
    d.cloudflare_turnstile_enabled ??
    d.turnstile ??
    nested.turnstile_enabled ??
    nested.enabled ??
    nested2.enabled

  if (!siteKey) {
    return { enabled: false, siteKey: '' }
  }
  if (rawEn === false || rawEn === 0 || rawEn === '0' || rawEn === 'false') {
    return { enabled: false, siteKey }
  }
  if (rawEn === true || rawEn === 1 || rawEn === '1' || rawEn === 'true') {
    return { enabled: true, siteKey }
  }
  return { enabled: true, siteKey }
}

const OAUTH_ERROR_KEYS = {
  missing_params: 'login.oauth_err_missing_params',
  state_invalid: 'login.oauth_err_state',
  user_creation_failed: 'login.oauth_err_user_failed',
  server_error: 'login.oauth_err_server'
}

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
      mode: 'login',
      loginMethod: 'password',
      loginForm: { username: '', password: '' },
      codeLoginForm: { email: '', code: '' },
      registerForm: { email: '', code: '', username: '', password: '', referralCode: '' },
      forgotForm: { email: '', code: '', newPassword: '', confirmPassword: '' },
      securityConfig: {
        turnstile_enabled: false,
        turnstile_site_key: ''
      },
      oauthConfig: {
        google_enabled: false,
        github_enabled: false
      },
      oauthLoading: false,
      showPassword: false,
      rememberMe: true,
      agreeTerms: false,
      loading: false,
      sendingCodeType: '',
      codeCountdowns: {
        login: 0,
        register: 0,
        forgot: 0
      },
      codeTimers: {},
      turnstileWidgetId: null,
      turnstileToken: '',
      turnstileClearance: '',
      turnstileClearanceExpiresAt: 0,
      turnstileClearanceTimer: null,
      turnstileClearanceLoading: false,
      turnstileError: '',
      turnstileErrorCode: '',
      mfaVisible: false,
      mfaLoading: false,
      mfaCode: '',
      mfaError: '',
      mfaChallengeId: '',
      showLangSheet: false,
      legalVisible: false,
      legalTab: 'terms'
    }
  },

  computed: {
    settingsStore() {
      return useSettingsStore()
    },
    isLightTheme() {
      return this.settingsStore.theme === 'light'
    },
    turnstileWidgetTheme() {
      return this.isLightTheme ? 'light' : 'dark'
    },
    tabs() {
      return [
        { value: 'login', label: this.$t('login.tab_login') },
        { value: 'register', label: this.$t('login.tab_register') },
        { value: 'forgot', label: this.$t('login.tab_forgot') }
      ]
    },
    submitLabel() {
      if (this.mode === 'login') {
        return this.loginMethod === 'code' ? this.$t('login.code_login_submit') : this.$t('login.login')
      }
      if (this.mode === 'register') return this.$t('login.register')
      return this.$t('login.reset_submit')
    },
    langButtonLabel() {
      const map = {
        'en-US': 'EN',
        'zh-CN': '中文',
        'zh-TW': '繁',
        'ja-JP': 'JA',
        'ko-KR': 'KO'
      }
      return map[this.settingsStore.locale] || 'EN'
    },
    langSheetActions() {
      return [
        { name: this.$t('language.en_us'), value: 'en-US' },
        { name: this.$t('language.zh_cn'), value: 'zh-CN' },
        { name: this.$t('language.zh_tw'), value: 'zh-TW' },
        { name: this.$t('language.ja_jp'), value: 'ja-JP' },
        { name: this.$t('language.ko_kr'), value: 'ko-KR' }
      ]
    },
    legalPopupBody() {
      const loc = this.settingsStore.locale
      const doc = getLegal(loc)
      return this.legalTab === 'terms' ? doc.terms : doc.disclaimer
    },
    canSubmit() {
      if (this.mode === 'login') {
        if (!this.agreeTerms) return false
        if (this.loginMethod === 'code') {
          return !!(this.codeLoginForm.email.trim() && this.codeLoginForm.code.trim())
        }
        return !!(this.loginForm.username.trim() && this.loginForm.password && this.turnstileVerified)
      }
      if (this.mode === 'register') {
        return !!(
          this.registerForm.email.trim() &&
          this.registerForm.code.trim() &&
          this.registerForm.username.trim() &&
          this.registerForm.password &&
          this.agreeTerms
        )
      }
      return !!(
        this.forgotForm.email.trim() &&
        this.forgotForm.code.trim() &&
        this.forgotForm.newPassword &&
        this.forgotForm.confirmPassword
      )
    },
    turnstileVerified() {
      return !this.securityConfig.turnstile_enabled || this.hasValidTurnstileClearance()
    }
  },

  watch: {
    isLightTheme() {
      this.$nextTick(() => this.renderTurnstileIfNeeded())
    },
    /**
     * Native OAuth returns through appUrlOpen while this component is still alive,
     * so watch query changes instead of relying on mounted() to run again.
     */
    '$route.query': {
      deep: true,
      handler() {
        const q = this.$route.query || {}
        if (q.oauth_token || q.oauth_error) {
          this.$nextTick(() => this.handleOAuthCallback())
        }
      }
    }
  },

  async mounted() {
    await this.handleOAuthCallback()
    await this.initSecurity()
  },

  beforeUnmount() {
    Object.values(this.codeTimers || {}).forEach((timer) => {
      if (timer) clearInterval(timer)
    })
    if (this.turnstileClearanceTimer) clearTimeout(this.turnstileClearanceTimer)
    this.destroyTurnstileWidget()
  },

  methods: {
    switchLoginMethod(method) {
      if (this.loginMethod === method) return
      this.loginMethod = method
      this.showPassword = false
      this.$nextTick(() => this.renderTurnstileIfNeeded())
    },

    switchMode(mode) {
      if (this.mode === mode) return
      this.mode = mode
      this.showPassword = false
      if (mode === 'login' || mode === 'register') {
        this.agreeTerms = false
      }
      this.$nextTick(() => this.renderTurnstileIfNeeded())
    },

    onLangSheetSelect(action) {
      if (!action || action.value == null) return
      this.settingsStore.setLocale(action.value)
      this.showLangSheet = false
      showToast({ message: this.$t('common.success'), type: 'success' })
    },

    openLegal(tab) {
      this.legalTab = tab === 'disclaimer' ? 'disclaimer' : 'terms'
      this.legalVisible = true
    },

    async initSecurity() {
      try {
        const res = await authApi.getSecurityConfig()
        if (res.code === 1 && res.data) {
          const ts = parseTurnstileConfig(res.data)
          this.securityConfig = {
            turnstile_enabled: ts.enabled,
            turnstile_site_key: ts.siteKey
          }
          this.oauthConfig = {
            google_enabled: !!(res.data.google_oauth_enabled ?? res.data.oauth_google_enabled ?? res.data.google_enabled),
            github_enabled: !!(res.data.github_oauth_enabled ?? res.data.oauth_github_enabled ?? res.data.github_enabled)
          }
        }
      } catch (err) {
        console.warn('Failed to load security config:', err)
      }
      await this.$nextTick()
      await this.renderTurnstileIfNeeded()
    },

    async handleOAuthLogin(provider) {
      if (this.oauthLoading) return
      if (!this.agreeTerms) {
        showToast({ message: this.$t('login.need_agree'), type: 'fail' })
        return
      }
      this.oauthLoading = true
      const base = getBaseUrl().replace(/\/$/, '')
      const redirectBack = getOAuthRedirectUri()
      const url = `${base}/api/auth/oauth/${provider}?redirect=${encodeURIComponent(redirectBack)}`
      try {
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url, presentationStyle: 'fullscreen' })
        } else {
          window.location.href = url
        }
      } catch (e) {
        console.error('OAuth start error:', e)
        showToast({ message: this.$t('login.oauth_err_generic'), type: 'fail' })
      } finally {
        this.oauthLoading = false
      }
    },

    async handleOAuthCallback() {
      const query = this.$route.query || {}
      const token = Array.isArray(query.oauth_token) ? query.oauth_token[0] : query.oauth_token
      const err = Array.isArray(query.oauth_error) ? query.oauth_error[0] : query.oauth_error

      if (!token && !err) return

      // Remove the OAuth params from the URL to avoid re-triggering on refresh.
      const clean = { ...query }
      delete clean.oauth_token
      delete clean.oauth_error
      this.$router.replace({ path: this.$route.path, query: clean })

      if (err) {
        const key = OAUTH_ERROR_KEYS[err] || 'login.oauth_err_generic'
        const fallback = this.$te(key) ? this.$t(key) : `OAuth: ${err}`
        showToast({ message: fallback, type: 'fail' })
        return
      }

      try {
        await this.finalizeLogin(token)
        showToast({ message: this.$t('login.login_success'), type: 'success' })
      } catch (e) {
        console.error('OAuth finalize error:', e)
        showToast({ message: this.$t('login.login_fail'), type: 'fail' })
      }
    },

    destroyTurnstileWidget() {
      if (this.turnstileWidgetId !== null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(this.turnstileWidgetId)
        } catch (e) {
          console.warn('Turnstile remove:', e)
        }
      }
      this.turnstileWidgetId = null
      this.turnstileToken = ''
    },

    hasValidTurnstileClearance() {
      return Boolean(
        this.turnstileClearance &&
        Date.now() < Number(this.turnstileClearanceExpiresAt || 0) - 5000
      )
    },

    async exchangeTurnstileToken(token) {
      if (!token || this.turnstileClearanceLoading) return
      this.turnstileToken = token
      this.turnstileClearanceLoading = true
      try {
        const res = await authApi.issueTurnstileClearance({ turnstile_token: token })
        const clearance = String(res?.data?.turnstile_clearance || '')
        if (!clearance) throw new Error(this.$t('login.turnstile_fail'))
        const ttlSeconds = Math.max(30, Number(res?.data?.expires_in || 600))
        this.turnstileClearance = clearance
        this.turnstileClearanceExpiresAt = Date.now() + ttlSeconds * 1000
        this.turnstileWidgetId = null
        this.turnstileToken = ''
        if (this.turnstileClearanceTimer) clearTimeout(this.turnstileClearanceTimer)
        this.turnstileClearanceTimer = setTimeout(() => {
          this.clearTurnstileClearance()
        }, ttlSeconds * 1000)
        this.turnstileError = ''
        this.turnstileErrorCode = ''
      } catch (error) {
        this.turnstileError = error?.localizedMessage || error?.message || this.$t('login.turnstile_fail')
        this.resetTurnstileWidget()
      } finally {
        this.turnstileClearanceLoading = false
      }
    },

    clearTurnstileClearance() {
      this.turnstileClearance = ''
      this.turnstileClearanceExpiresAt = 0
      if (this.turnstileClearanceTimer) clearTimeout(this.turnstileClearanceTimer)
      this.turnstileClearanceTimer = null
      this.$nextTick(() => this.renderTurnstileIfNeeded())
    },

    isTurnstileError(error) {
      const message = String(error?.backendMessage || error?.localizedMessage || error?.message || error || '')
      return /turnstile|clearance|human verification|security check|人机验证|安全验证/i.test(message)
    },

    handleTurnstileError(error) {
      if (this.isTurnstileError(error)) this.clearTurnstileClearance()
    },

    async renderTurnstileIfNeeded() {
      if (!this.securityConfig.turnstile_enabled || !this.securityConfig.turnstile_site_key) {
        this.destroyTurnstileWidget()
        return
      }
      if (this.hasValidTurnstileClearance()) {
        this.destroyTurnstileWidget()
        return
      }
      try {
        this.turnstileError = ''
        this.turnstileErrorCode = ''
        await ensureTurnstileScript()
        if (!this.$refs.turnstileRef || !window.turnstile) return

        this.destroyTurnstileWidget()

        this.turnstileWidgetId = window.turnstile.render(this.$refs.turnstileRef, {
          sitekey: this.securityConfig.turnstile_site_key,
          theme: this.turnstileWidgetTheme,
          size: 'flexible',
          callback: (token) => {
            this.turnstileError = ''
            this.turnstileErrorCode = ''
            this.exchangeTurnstileToken(token)
          },
          'expired-callback': () => {
            this.turnstileToken = ''
            if (!this.hasValidTurnstileClearance()) {
              this.turnstileError = this.$t('login.turnstile_fail')
              this.turnstileErrorCode = 'expired'
            }
          },
          'error-callback': (errorCode) => {
            this.turnstileToken = ''
            if (!this.hasValidTurnstileClearance()) {
              this.turnstileErrorCode = String(errorCode || '')
              this.turnstileError = this.getTurnstileErrorMessage(errorCode)
            }
          }
        })
      } catch (err) {
        console.error('Turnstile render failed:', err)
        this.turnstileError = this.$t('login.turnstile_fail')
      }
    },

    resetTurnstileWidget() {
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
      const hostname = window.location.hostname || 'current host'

      if (code === '110200') {
        return `${hostname} is not allow-listed on Cloudflare Turnstile for the configured site key.`
      }
      if (code.startsWith('110')) {
        return `Turnstile rejected (code ${code}). This is usually a domain / site-key misconfiguration.`
      }
      return code
        ? `Turnstile failed to load (code ${code}), please retry later.`
        : this.$t('login.turnstile_fail')
    },

    getCodeStateKey(type) {
      if (type === 'reset_password') return 'forgot'
      if (type === 'register') return 'register'
      return 'login'
    },

    getCodeCountdown(key) {
      return Number(this.codeCountdowns?.[key] || 0)
    },

    getCodeBtnText(key) {
      const seconds = this.getCodeCountdown(key)
      if (seconds > 0) {
        return this.$t('login.resend_in', { seconds })
      }
      return this.$t('login.send_code')
    },

    isSendingCode(key) {
      return this.sendingCodeType === key
    },

    startCountdown(key, seconds = 60) {
      this.codeCountdowns[key] = seconds
      if (this.codeTimers[key]) clearInterval(this.codeTimers[key])
      this.codeTimers[key] = setInterval(() => {
        this.codeCountdowns[key] = Math.max(0, Number(this.codeCountdowns[key] || 0) - 1)
        if (this.codeCountdowns[key] <= 0) {
          clearInterval(this.codeTimers[key])
          this.codeTimers[key] = null
        }
      }, 1000)
    },

    /**
     * Normalize and validate an email address.
     *
     * Mobile IMEs sometimes inject full-width punctuation (e.g. `＠` `．`),
     * NBSP / zero-width characters, or uppercase variants that look correct
     * to the user but fail a strict ASCII regex. Normalize first so the
     * "I clearly typed an email" case stops failing silently as
     * `email_required`.
     */
    normalizeEmail(email) {
      let s = String(email == null ? '' : email)
      s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
      s = s.replace(/＠/g, '@').replace(/[．。]/g, '.')
      return s.trim().toLowerCase()
    },
    validEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.normalizeEmail(email))
    },

    validateUsername(username) {
      const value = String(username || '').trim()
      if (!value) return this.$t('login.username_required')
      if (value.length < 3 || value.length > 30) return this.$t('login.username_length')
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) return this.$t('login.username_pattern')
      return ''
    },

    validatePasswordStrength(password) {
      const value = String(password || '')
      if (!value) return this.$t('login.password_required')
      if (value.length < 8) return this.$t('login.password_min')
      if (!/[A-Z]/.test(value)) return this.$t('login.password_upper')
      if (!/[a-z]/.test(value)) return this.$t('login.password_lower')
      if (!/[0-9]/.test(value)) return this.$t('login.password_number')
      return ''
    },

    getEmailForCodeType(type) {
      if (type === 'register') return this.registerForm.email
      if (type === 'reset_password') return this.forgotForm.email
      return this.codeLoginForm.email
    },

    setEmailForCodeType(type, email) {
      if (type === 'register') this.registerForm.email = email
      else if (type === 'reset_password') this.forgotForm.email = email
      else this.codeLoginForm.email = email
    },

    async sendCode(type) {
      const stateKey = this.getCodeStateKey(type)
      const rawEmail = this.getEmailForCodeType(type)
      const email = this.normalizeEmail(rawEmail)
      if (!email) {
        showToast({ message: this.$t('login.email_required'), type: 'fail' })
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast({ message: this.$t('login.email_invalid'), type: 'fail' })
        return
      }
      this.setEmailForCodeType(type, email)
      if (this.securityConfig.turnstile_enabled && !this.hasValidTurnstileClearance()) {
        showToast({ message: this.$t('login.turnstile_required'), type: 'fail' })
        return
      }

      this.sendingCodeType = stateKey
      try {
        const res = await authApi.sendCode({
          email,
          type,
          turnstile_clearance: this.turnstileClearance || undefined
        })
        if (res.code === 1) {
          showToast({ message: this.$t('login.code_sent'), type: 'success' })
          this.startCountdown(stateKey, 60)
        } else {
          showToast({ message: res.msg || this.$t('login.code_send_fail'), type: 'fail' })
          this.handleTurnstileError(res.msg)
        }
      } catch (err) {
        console.error('Send code error:', err)
        this.handleTurnstileError(err)
      } finally {
        this.sendingCodeType = ''
      }
    },

    handleSubmit() {
      if (this.loading || !this.canSubmit) return
      if (this.mode === 'login') this.handleLogin()
      else if (this.mode === 'register') this.handleRegister()
      else this.handleReset()
    },

    async finalizeLogin(token, userinfo) {
      const userStore = useUserStore()
      userStore.setToken(token)
      if (userinfo) {
        userStore.setUserInfo(userinfo)
      } else {
        try {
          const infoRes = await authApi.getInfo()
          if (infoRes.code === 1 && infoRes.data) {
            userStore.setUserInfo(infoRes.data)
          }
        } catch (e) {
          console.warn('Failed to get user info:', e)
        }
      }
      const redirect = this.$route.query.redirect || '/ai'
      this.$router.replace(redirect)
    },

    async handleAuthResult(res, fallbackKey = 'login.login_fail') {
      if (res?.code === 1 && res.data?.mfa_required) {
        this.mfaChallengeId = res.data.challenge_id || ''
        this.mfaCode = ''
        this.mfaError = ''
        this.mfaVisible = true
        return true
      }
      if (res?.code === 1 && res.data?.token) {
        showToast({ message: this.$t('login.login_success'), type: 'success' })
        await this.finalizeLogin(res.data.token, res.data.userinfo)
        return true
      }
      showToast({ message: res?.msg || this.$t(fallbackKey), type: 'fail' })
      this.handleTurnstileError(res?.msg)
      return false
    },

    async handleLogin() {
      if (this.loginMethod === 'code') {
        await this.handleCodeLogin()
        return
      }
      await this.handlePasswordLogin()
    },

    async handlePasswordLogin() {
      if (!this.agreeTerms) {
        showToast({ message: this.$t('login.need_agree'), type: 'fail' })
        return
      }
      if (!this.loginForm.username.trim()) {
        showToast({ message: this.$t('login.account_required'), type: 'fail' })
        return
      }
      if (!this.loginForm.password) {
        showToast({ message: this.$t('login.password_required'), type: 'fail' })
        return
      }
      if (this.securityConfig.turnstile_enabled && !this.hasValidTurnstileClearance()) {
        showToast({ message: this.$t('login.turnstile_required'), type: 'fail' })
        return
      }
      this.loading = true
      try {
        const res = await authApi.login({
          username: this.loginForm.username.trim(),
          password: this.loginForm.password,
          turnstile_clearance: this.turnstileClearance || undefined
        })
        await this.handleAuthResult(res, 'login.login_fail')
      } catch (err) {
        console.error('Login error:', err)
        this.handleTurnstileError(err)
      } finally {
        this.loading = false
      }
    },

    async handleCodeLogin() {
      if (!this.agreeTerms) {
        showToast({ message: this.$t('login.need_agree'), type: 'fail' })
        return
      }
      const email = this.normalizeEmail(this.codeLoginForm.email)
      if (!this.validEmail(email)) {
        showToast({ message: email ? this.$t('login.email_invalid') : this.$t('login.email_required'), type: 'fail' })
        return
      }
      const code = this.codeLoginForm.code.trim()
      if (!code) {
        showToast({ message: this.$t('login.code_required'), type: 'fail' })
        return
      }
      this.codeLoginForm.email = email
      this.loading = true
      try {
        const res = await authApi.loginWithCode({
          email,
          code,
          referral_code: this.registerForm.referralCode.trim() || undefined
        })
        await this.handleAuthResult(res, 'login.login_fail')
      } catch (err) {
        console.error('Code login error:', err)
      } finally {
        this.loading = false
      }
    },

    async handleRegister() {
      if (!this.agreeTerms) {
        showToast({ message: this.$t('login.need_agree'), type: 'fail' })
        return
      }
      const email = this.normalizeEmail(this.registerForm.email)
      if (!this.validEmail(email)) {
        showToast({ message: email ? this.$t('login.email_invalid') : this.$t('login.email_required'), type: 'fail' })
        return
      }
      const usernameError = this.validateUsername(this.registerForm.username)
      if (usernameError) {
        showToast({ message: usernameError, type: 'fail' })
        return
      }
      if (!this.registerForm.code.trim()) {
        showToast({ message: this.$t('login.code_required'), type: 'fail' })
        return
      }
      const passwordError = this.validatePasswordStrength(this.registerForm.password)
      if (passwordError) {
        showToast({ message: passwordError, type: 'fail' })
        return
      }
      this.loading = true
      try {
        const res = await authApi.register({
          email,
          code: this.registerForm.code.trim(),
          username: this.registerForm.username.trim(),
          password: this.registerForm.password,
          referral_code: this.registerForm.referralCode.trim() || undefined
        })
        if (res.code === 1 && res.data?.token) {
          showToast({ message: this.$t('login.register_success'), type: 'success' })
          await this.finalizeLogin(res.data.token, res.data.userinfo)
        } else {
          showToast({ message: res.msg || this.$t('login.register_fail'), type: 'fail' })
        }
      } catch (err) {
        console.error('Register error:', err)
      } finally {
        this.loading = false
      }
    },

    async handleReset() {
      const email = this.normalizeEmail(this.forgotForm.email)
      if (!this.validEmail(email)) {
        showToast({ message: email ? this.$t('login.email_invalid') : this.$t('login.email_required'), type: 'fail' })
        return
      }
      if (!this.forgotForm.code.trim()) {
        showToast({ message: this.$t('login.code_required'), type: 'fail' })
        return
      }
      const passwordError = this.validatePasswordStrength(this.forgotForm.newPassword)
      if (passwordError) {
        showToast({ message: passwordError, type: 'fail' })
        return
      }
      if (this.forgotForm.newPassword !== this.forgotForm.confirmPassword) {
        showToast({ message: this.$t('login.password_mismatch'), type: 'fail' })
        return
      }
      this.loading = true
      try {
        const res = await authApi.resetPassword({
          email,
          code: this.forgotForm.code.trim(),
          new_password: this.forgotForm.newPassword
        })
        if (res.code === 1) {
          showToast({ message: this.$t('login.reset_success'), type: 'success' })
          this.loginForm.username = this.forgotForm.email
          this.loginForm.password = ''
          this.forgotForm = { email: '', code: '', newPassword: '', confirmPassword: '' }
          this.switchMode('login')
        } else {
          showToast({ message: res.msg || this.$t('login.reset_fail'), type: 'fail' })
        }
      } catch (err) {
        console.error('Reset error:', err)
      } finally {
        this.loading = false
      }
    },

    async handleMfaLoginVerify() {
      const code = this.mfaCode.trim()
      if (!code) {
        this.mfaError = this.$t('login.mfa_required')
        return
      }
      if (!this.mfaChallengeId) {
        this.mfaError = this.$t('login.mfa_expired')
        return
      }
      this.mfaLoading = true
      this.mfaError = ''
      try {
        const res = await authApi.verifyLoginMfa({
          challenge_id: this.mfaChallengeId,
          code
        })
        if (res.code === 1 && res.data?.token) {
          showToast({ message: this.$t('login.login_success'), type: 'success' })
          await this.finalizeLogin(res.data.token, res.data.userinfo)
          this.resetMfaLogin()
        } else {
          this.mfaError = res.msg || this.$t('login.mfa_failed')
        }
      } catch (err) {
        this.mfaError = err?.response?.data?.msg || err?.message || this.$t('login.mfa_failed')
      } finally {
        this.mfaLoading = false
      }
    },

    resetMfaLogin() {
      this.mfaVisible = false
      this.mfaLoading = false
      this.mfaCode = ''
      this.mfaError = ''
      this.mfaChallengeId = ''
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

.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 26px 18px 20px;
  border-radius: 30px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-pop);
}

.login-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: -6px -4px 4px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.lang-btn:active {
  background: var(--surface-raised-2);
  color: var(--accent);
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.logo-wrap {
  width: 92px;
  height: 92px;
  margin: 0 auto 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  overflow: hidden;
}

.logo-image {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  object-fit: cover;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.18));
}

.subtitle {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
  padding: 0 8px;
}

.tab-bar {
  display: flex;
  padding: 4px;
  margin-bottom: 20px;
  border-radius: 16px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 13px;
  color: var(--text-2);
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tab.active {
  background: var(--accent);
  color: var(--text-on-accent);
  font-weight: 700;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.login-method-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 4px;
  margin: -4px 0 16px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}

.method-pill {
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.method-pill.active {
  background: var(--accent);
  color: var(--text-on-accent);
  box-shadow: 0 8px 18px var(--accent-soft);
}

.method-pill:active {
  transform: scale(0.98);
}

.form-item {
  margin-bottom: 14px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  min-height: 54px;
  background: var(--surface-raised);
  border-radius: 16px;
  padding: 0 14px;
  border: 1px solid var(--border);
  transition: all 0.24s ease;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
  background: var(--surface-raised-2);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.input-icon {
  color: var(--text-3);
  font-size: 18px;
  margin-right: 10px;
}

.input {
  flex: 1;
  min-width: 0;
  height: 52px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  outline: none;
}

.input::placeholder {
  color: var(--text-3);
}

.eye-icon {
  color: var(--text-3);
  font-size: 18px;
  padding: 8px;
  margin-right: -6px;
}

.code-btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.code-btn:disabled {
  color: var(--text-4);
  background: var(--surface-raised);
  border-color: var(--border);
  cursor: not-allowed;
}

.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 2px 16px;
}

.row-agreement {
  margin: 4px 2px 16px;
}

.row-between :deep(.van-checkbox__label),
.row-agreement :deep(.van-checkbox__label) {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.5;
}

.agree-line {
  white-space: normal;
}

.link-inline {
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}

.legal-popup-root :deep(.van-popup__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.legal-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 14px 16px;
  box-sizing: border-box;
}

.legal-popup__head {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.legal-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  cursor: pointer;
}

.legal-tab.active {
  color: var(--text-on-accent);
  background: var(--accent);
  border-color: transparent;
}

.legal-popup__body {
  flex: 1;
  overflow: auto;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-2);
  white-space: pre-wrap;
  padding: 4px 2px 12px;
}

.legal-popup__foot {
  flex-shrink: 0;
  padding-top: 4px;
}

.link {
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
}

.security-panel {
  margin-bottom: 16px;
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
  color: var(--text);
}

.security-desc {
  font-size: 12px;
  color: var(--text-3);
}

.turnstile-card {
  padding: 14px 12px 10px;
  border-radius: 16px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}

.turnstile-mount {
  min-height: 70px;
}

.turnstile-loading,
.turnstile-verified {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  color: var(--up);
  font-size: 13px;
  font-weight: 700;
}

.turnstile-loading {
  color: var(--text-2);
}

.turnstile-error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--down);
  line-height: 1.5;
}

.submit-btn {
  height: 54px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

.submit-btn:disabled {
  opacity: 0.45;
}

.oauth-section {
  margin-top: 18px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.divider .line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.divider .text {
  color: var(--text-3);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border-radius: 16px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.oauth-btn:hover:not(:disabled) {
  background: var(--surface-raised-2);
  border-color: var(--border-strong);
}

.oauth-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.oauth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.oauth-icon {
  flex-shrink: 0;
}

.alt-link {
  text-align: center;
  margin-top: 16px;
}

.footer {
  text-align: center;
  margin-top: 14px;
}

.footer p {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.6;
}

.mfa-popup-root {
  background: var(--bg-elevated);
  color: var(--text);
}

.mfa-popup {
  padding: 24px 18px 18px;
  text-align: center;
}

.mfa-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 24px;
}

.mfa-popup h3 {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 18px;
  line-height: 1.3;
}

.mfa-popup p {
  margin: 0 0 16px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
}

.mfa-input {
  margin-bottom: 10px;
  text-align: left;
}

.mfa-error {
  margin: 2px 0 12px;
  color: var(--down);
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.mfa-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mfa-actions :deep(.van-button) {
  height: 44px;
  border-radius: 14px;
}
</style>
