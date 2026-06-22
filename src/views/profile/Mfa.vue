<template>
  <div class="mfa-page">
    <van-nav-bar :title="$t('profile.mfa_manage')" left-arrow @click-left="$router.back()" />

    <div class="status-card">
      <div :class="['status-icon', status.enabled ? 'on' : 'off']">
        <van-icon name="shield-o" />
      </div>
      <div class="status-main">
        <div class="status-title">{{ $t('profile.mfa_manage') }}</div>
        <p class="status-desc">
          {{ status.enabled ? $t('profile.mfa_enabled_desc') : $t('profile.mfa_disabled_desc') }}
        </p>
        <div class="status-tags">
          <span :class="['status-tag', status.enabled ? 'on' : 'off']">
            {{ status.enabled ? $t('profile.enabled') : $t('profile.disabled') }}
          </span>
          <span v-if="status.risk_login_only" class="status-tag soft">{{ $t('profile.mfa_risky_only') }}</span>
        </div>
      </div>
    </div>

    <div v-if="!status.system_enabled" class="hint-card warn">
      <van-icon name="warning-o" />
      <span>{{ $t('profile.mfa_system_disabled') }}</span>
    </div>
    <div v-else class="hint-card">
      <van-icon name="info-o" />
      <span>{{ $t('profile.mfa_mobile_hint') }}</span>
    </div>

    <div class="feature-card">
      <div class="feature-row">
        <div class="feature-icon"><van-icon name="qr" /></div>
        <div class="feature-copy">
          <div class="feature-title">{{ $t('profile.mfa_app_title') }}</div>
          <p>{{ $t('profile.mfa_app_desc') }}</p>
        </div>
      </div>
      <van-button
        v-if="!status.enabled"
        type="primary"
        block
        :disabled="!status.system_enabled"
        :loading="starting"
        @click="startSetup"
      >
        {{ $t('profile.mfa_enable') }}
      </van-button>
      <van-button v-else plain type="danger" block @click="disableVisible = true">
        {{ $t('profile.mfa_disable') }}
      </van-button>
    </div>

    <van-popup v-model:show="setupVisible" position="center" round class="mfa-popup" :close-on-click-overlay="false">
      <div class="mfa-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ $t('profile.mfa_setup_title') }}</div>
            <p>{{ $t('profile.mfa_scan_hint') }}</p>
          </div>
          <van-icon name="cross" class="modal-close" @click="closeSetup" />
        </div>

        <div class="qr-box">
          <img v-if="setup.qr_image" :src="setup.qr_image" alt="MFA QR code" />
        </div>

        <div class="manual-box">
          <span class="manual-label">{{ $t('profile.mfa_manual_key') }}</span>
          <div class="manual-value">
            <span>{{ setup.secret_display || setup.secret || '-' }}</span>
            <van-icon name="records" @click="copy(setup.secret)" />
          </div>
        </div>

        <van-field
          v-model="setupCode"
          class="code-input"
          maxlength="6"
          inputmode="numeric"
          :placeholder="$t('profile.mfa_code_placeholder')"
          @keyup.enter="confirmSetup"
        >
          <template #left-icon><van-icon name="shield-o" /></template>
        </van-field>

        <div class="modal-actions">
          <van-button plain block @click="closeSetup">{{ $t('common.cancel') }}</van-button>
          <van-button type="primary" block :loading="confirming" @click="confirmSetup">
            {{ $t('profile.mfa_confirm_enable') }}
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="recoveryVisible" position="center" round class="mfa-popup" :close-on-click-overlay="false">
      <div class="mfa-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ $t('profile.mfa_recovery_title') }}</div>
            <p>{{ $t('profile.mfa_recovery_hint') }}</p>
          </div>
        </div>
        <div class="recovery-grid">
          <span v-for="code in recoveryCodes" :key="code">{{ code }}</span>
        </div>
        <div class="modal-actions single">
          <van-button type="primary" block @click="finishRecovery">{{ $t('profile.mfa_saved_codes') }}</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="disableVisible" position="bottom" round class="disable-sheet">
      <div class="disable-body">
        <div class="sheet-title">{{ $t('profile.mfa_disable') }}</div>
        <p class="sheet-desc">{{ $t('profile.mfa_disable_hint') }}</p>
        <van-field
          v-model="disableCode"
          class="code-input"
          :placeholder="$t('profile.mfa_code_or_recovery')"
          @keyup.enter="disableMfa"
        >
          <template #left-icon><van-icon name="shield-o" /></template>
        </van-field>
        <div class="modal-actions">
          <van-button plain block @click="disableVisible = false">{{ $t('common.cancel') }}</van-button>
          <van-button type="danger" block :loading="disabling" @click="disableMfa">
            {{ $t('profile.mfa_disable') }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { userApi } from '@/api'

export default {
  name: 'ProfileMfa',
  data() {
    return {
      loading: false,
      starting: false,
      confirming: false,
      disabling: false,
      setupVisible: false,
      recoveryVisible: false,
      disableVisible: false,
      setupCode: '',
      disableCode: '',
      setup: {},
      recoveryCodes: [],
      status: {
        system_enabled: true,
        enabled: false,
        risk_login_only: true,
        challenge_ttl_minutes: 5
      }
    }
  },
  mounted() {
    this.loadStatus()
  },
  methods: {
    async loadStatus() {
      this.loading = true
      try {
        const res = await userApi.getMfaStatus()
        if (res?.data) this.status = { ...this.status, ...res.data }
      } catch (err) {
        showToast({ message: err?.response?.data?.msg || this.$t('profile.mfa_load_failed'), type: 'fail' })
      } finally {
        this.loading = false
      }
    },
    async startSetup() {
      this.starting = true
      try {
        const res = await userApi.startMfaSetup()
        this.setup = res?.data || {}
        this.setupCode = ''
        this.setupVisible = true
      } catch (err) {
        showToast({ message: err?.response?.data?.msg || this.$t('profile.mfa_setup_failed'), type: 'fail' })
      } finally {
        this.starting = false
      }
    },
    async confirmSetup() {
      const code = this.setupCode.trim()
      if (!code) {
        showToast({ message: this.$t('profile.mfa_code_required'), type: 'fail' })
        return
      }
      this.confirming = true
      try {
        const res = await userApi.confirmMfaSetup({ code })
        this.recoveryCodes = res?.data?.recovery_codes || []
        this.setupVisible = false
        this.recoveryVisible = true
        await this.loadStatus()
      } catch (err) {
        showToast({ message: err?.response?.data?.msg || this.$t('profile.mfa_verify_failed'), type: 'fail' })
      } finally {
        this.confirming = false
      }
    },
    async disableMfa() {
      const code = this.disableCode.trim()
      if (!code) {
        showToast({ message: this.$t('profile.mfa_code_required'), type: 'fail' })
        return
      }
      this.disabling = true
      try {
        await userApi.disableMfa({ code })
        this.disableVisible = false
        this.disableCode = ''
        showToast({ message: this.$t('profile.mfa_disabled_success'), type: 'success' })
        await this.loadStatus()
      } catch (err) {
        showToast({ message: err?.response?.data?.msg || this.$t('profile.mfa_disable_failed'), type: 'fail' })
      } finally {
        this.disabling = false
      }
    },
    closeSetup() {
      this.setupVisible = false
      this.setup = {}
      this.setupCode = ''
    },
    finishRecovery() {
      this.recoveryVisible = false
      this.recoveryCodes = []
    },
    async copy(text) {
      const value = String(text || '')
      if (!value) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value)
        } else {
          const input = document.createElement('textarea')
          input.value = value
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast({ message: this.$t('common.copied'), type: 'success' })
      } catch {
        showToast({ message: this.$t('profile.copy_failed'), type: 'fail' })
      }
    }
  }
}
</script>

<style scoped>
.mfa-page {
  min-height: 100vh;
  padding-bottom: 40px;
  background: var(--bg);
  color: var(--text);
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.status-card,
.feature-card,
.hint-card {
  margin: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.status-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  position: relative;
}
.status-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(260px 180px at 100% 0%, var(--c-indigo-soft), transparent 62%);
}
.status-icon,
.status-main { position: relative; }
.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.status-icon.on {
  color: var(--up);
  background: var(--up-soft);
}
.status-icon.off {
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
}
.status-main { flex: 1; min-width: 0; }
.status-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
}
.status-desc {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
}
.status-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.status-tag {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.status-tag.on { color: var(--up); background: var(--up-soft); }
.status-tag.off { color: var(--text-2); background: var(--surface-raised); }
.status-tag.soft { color: var(--c-blue); background: var(--c-blue-soft); }

.hint-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  color: var(--c-blue);
  background: var(--c-blue-soft);
  border-color: transparent;
  font-size: 12px;
  line-height: 1.5;
}
.hint-card.warn {
  color: var(--warn);
  background: var(--warn-soft);
}

.feature-card {
  padding: 16px;
}
.feature-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.feature-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--c-indigo-soft);
  color: var(--c-indigo);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.feature-copy { flex: 1; min-width: 0; }
.feature-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}
.feature-copy p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
}
.feature-card :deep(.van-button) {
  border-radius: 13px;
  height: 44px;
  font-weight: 700;
}

.mfa-popup {
  width: calc(100% - 34px);
  max-width: 430px;
  background: var(--bg-elevated) !important;
  color: var(--text);
  overflow: hidden;
}
.mfa-modal {
  padding: 18px;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--hairline);
}
.modal-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}
.modal-head p {
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.modal-close {
  color: var(--text-3);
  font-size: 20px;
  padding: 2px;
}
.qr-box {
  margin: 16px auto 14px;
  width: min(260px, 78vw);
  padding: 10px;
  border-radius: 16px;
  background: #fff;
}
.qr-box img {
  width: 100%;
  display: block;
}
.manual-box {
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.manual-label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-3);
  font-size: 11px;
}
.manual-value {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
}
.manual-value .van-icon {
  color: var(--accent);
  font-size: 18px;
}
.code-input {
  margin-top: 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  overflow: hidden;
}
.code-input :deep(.van-cell) { background: transparent; }
.code-input :deep(.van-field__control) { color: var(--text); }
.modal-actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.modal-actions.single {
  grid-template-columns: 1fr;
}
.modal-actions :deep(.van-button) {
  border-radius: 12px;
  font-weight: 700;
}
.recovery-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.recovery-grid span {
  padding: 9px 8px;
  border-radius: 10px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 12px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  text-align: center;
}
.disable-sheet {
  background: var(--bg-elevated) !important;
  color: var(--text);
}
.disable-body {
  padding: 18px 16px calc(18px + var(--safe-area-bottom, 0px));
}
.sheet-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}
.sheet-desc {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.6;
}
</style>
