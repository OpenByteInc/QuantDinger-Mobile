<template>
  <div class="credentials-page">
    <van-nav-bar
      :title="$t('credentials.title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    >
      <template #right>
        <span class="nav-link" @click="$router.push('/profile/credentials/new')">
          <van-icon name="plus" /> {{ $t('credentials.add') }}
        </span>
      </template>
    </van-nav-bar>

    <!-- Existing accounts are the primary mobile task. -->
    <div class="list-card primary-list">
      <div class="card-head">
        <div class="card-head-left">
          <div class="card-icon blue"><van-icon name="records" /></div>
          <div>
            <div class="card-title">{{ $t('credentials.list_title') }}</div>
            <p class="card-desc">{{ $t('credentials.list_desc', { count: credentials.length }) }}</p>
          </div>
        </div>
      </div>

      <div v-if="credentials.length" class="cred-list">
        <div v-for="item in credentials" :key="item.id" class="cred-row">
          <div class="cred-left">
            <div class="cred-logo" :style="exchangeBrand(item.exchange_id)">
              {{ exchangeShort(item.exchange_id) }}
            </div>
            <div class="cred-info">
              <span class="row-title">{{ item.name }}</span>
              <span class="row-subtitle">
                {{ formatExchange(item.exchange_id) }}
                <span v-if="item.api_key_hint"> · {{ item.api_key_hint }}</span>
              </span>
              <span class="credential-tags">
                <small :class="['credential-tag', credentialHealthy(item) ? 'healthy' : 'needs-check']">
                  {{ credentialHealthLabel(item) }}
                </small>
                <small :class="['credential-tag', item.environment === 'live' ? 'live' : 'sandbox']">
                  {{ credentialEnvironmentLabel(item) }}
                </small>
                <small class="credential-tag">{{ credentialScopeLabel(item) }}</small>
              </span>
              <span v-if="credentialLastChecked(item)" class="last-checked">
                {{ $t('credentials.last_checked', { time: credentialLastChecked(item) }) }}
              </span>
            </div>
          </div>
          <div class="cred-actions">
            <van-button size="mini" plain @click="openRename(item)">
              {{ $t('credentials.rename') }}
            </van-button>
            <van-button size="mini" plain type="danger" @click="removeCredential(item)">
              {{ $t('credentials.delete') }}
            </van-button>
          </div>
        </div>
      </div>
      <van-empty v-else-if="!loading" :description="$t('credentials.empty')">
        <van-button round type="primary" size="small" @click="$router.push('/profile/credentials/new')">
          {{ $t('credentials.add') }}
        </van-button>
      </van-empty>
    </div>

    <!-- Egress IP card -->
    <div class="egress-card">
      <div class="card-head">
        <div class="card-head-left">
          <div class="card-icon"><van-icon name="shield-o" /></div>
          <div>
            <div class="card-title">{{ $t('credentials.egress_title') }}</div>
            <p class="card-desc">{{ $t('credentials.egress_desc') }}</p>
          </div>
        </div>
      </div>

      <div class="ip-row">
        <div class="ip-box">{{ egressIpText }}</div>
        <van-button size="small" plain class="copy-btn" @click="copyIp">
          <van-icon name="records" /> {{ $t('credentials.copy') }}
        </van-button>
      </div>

      <div class="tutorial-toggle" @click="showTutorial = !showTutorial">
        <van-icon name="question-o" />
        <span>{{ $t('credentials.how_to_whitelist') }}</span>
        <van-icon :name="showTutorial ? 'arrow-up' : 'arrow-down'" />
      </div>
      <div v-if="showTutorial" class="tutorial">
        <div v-for="(step, idx) in tutorialSteps" :key="idx" class="tutorial-step">
          <span class="step-num">{{ idx + 1 }}</span>
          <span class="step-text">{{ step }}</span>
        </div>
      </div>
    </div>

    <!-- One-click signup -->
    <div class="signup-card">
      <button type="button" class="card-head signup-toggle" @click="showSignup = !showSignup">
        <div class="card-head-left">
          <div class="card-icon gold"><van-icon name="gift-o" /></div>
          <div>
            <div class="card-title">{{ $t('credentials.signup_title') }}</div>
            <p class="card-desc">{{ $t('credentials.signup_promo') }}</p>
          </div>
        </div>
        <van-icon :name="showSignup ? 'arrow-up' : 'arrow-down'" />
      </button>
      <div v-if="showSignup" class="signup-grid">
        <div
          v-for="item in signupCards"
          :key="item.id"
          class="signup-card-item"
          @click="openExchangeSignup(item)"
        >
          <div class="signup-logo" :style="{ background: item.brandBg, color: item.brandColor }">
            {{ item.short }}
          </div>
          <div class="signup-meta">
            <div class="signup-name">{{ item.name }}</div>
            <div class="signup-rebate">{{ $t('credentials.rebate') }}</div>
          </div>
          <van-icon class="signup-arrow" name="arrow" />
        </div>
      </div>
    </div>

    <van-popup v-model:show="showRename" position="bottom" round>
      <div class="rename-sheet">
        <div class="rename-title">{{ $t('credentials.rename_title') }}</div>
        <p>{{ $t('credentials.rename_hint') }}</p>
        <van-field
          v-model="renameValue"
          :label="$t('credentials.name')"
          :placeholder="$t('credentials.name_placeholder')"
          maxlength="128"
          clearable
        />
        <div class="rename-actions">
          <van-button block @click="closeRename">{{ $t('common.cancel') }}</van-button>
          <van-button block type="primary" :loading="renaming" @click="saveRename">
            {{ $t('common.save') }}
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-loading v-if="loading" class="page-loading" vertical>{{ $t('common.loading') }}</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { EXCHANGE_BRANDS, EXCHANGE_SIGNUP_CARDS } from '@/constants/exchanges'
import { openExternal } from '@/utils/external'

export default {
  name: 'CredentialList',

  data() {
    return {
      loading: false,
      showTutorial: false,
      showSignup: false,
      showRename: false,
      renaming: false,
      renameCredential: null,
      renameValue: ''
    }
  },

  computed: {
    credentialsStore() {
      return useCredentialsStore()
    },
    credentials() {
      return this.credentialsStore.cryptoItems
    },
    egressIpText() {
      const data = this.credentialsStore.egressIp
      if (!data) return this.$t('credentials.egress_loading')
      const parts = [
        data.ipv4 && `IPv4: ${data.ipv4}`,
        data.ipv6 && `IPv6: ${data.ipv6}`
      ].filter(Boolean)
      return parts.join('\n') || data.ip || data.address || this.$t('credentials.egress_loading')
    },
    egressIpRaw() {
      const data = this.credentialsStore.egressIp
      if (!data) return ''
      return [data.ipv4, data.ipv6, data.ip, data.address].filter(Boolean).join('\n')
    },
    tutorialSteps() {
      return [
        this.$t('credentials.tutorial_1'),
        this.$t('credentials.tutorial_2'),
        this.$t('credentials.tutorial_3'),
        this.$t('credentials.tutorial_4'),
        this.$t('credentials.tutorial_5')
      ]
    },
    signupCards() {
      return EXCHANGE_SIGNUP_CARDS
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const [listRes, egressRes] = await Promise.all([
          credentialsApi.list(),
          credentialsApi.getEgressIp()
        ])
        this.credentialsStore.setItems(listRes.data || [])
        this.credentialsStore.setEgressIp(egressRes.data || null)
      } catch (error) {
        console.error('Load credentials failed:', error)
      } finally {
        this.loading = false
      }
    },

    formatExchange(value) {
      const key = String(value || '').toLowerCase()
      const brand = EXCHANGE_BRANDS[key]
      return brand?.name || key.toUpperCase() || this.$t('credentials.unknown_exchange')
    },

    exchangeShort(value) {
      const key = String(value || '').toLowerCase()
      return EXCHANGE_BRANDS[key]?.short || (value || '?').slice(0, 2).toUpperCase()
    },

    exchangeBrand(value) {
      const key = String(value || '').toLowerCase()
      const brand = EXCHANGE_BRANDS[key]
      if (!brand) return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }
      return { background: brand.brandBg, color: brand.brandColor }
    },

    async copyIp() {
      const text = this.egressIpRaw
      if (!text) {
        showToast({ message: this.$t('credentials.egress_loading'), type: 'fail' })
        return
      }
      try {
        await navigator.clipboard.writeText(text)
        showToast({ message: this.$t('credentials.copied'), type: 'success' })
      } catch (err) {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch {}
        ta.remove()
        showToast({ message: this.$t('credentials.copied'), type: 'success' })
      }
    },

    openExchangeSignup(item) {
      if (!item.signupUrl) return
      openExternal(item.signupUrl)
    },

    credentialEnvironmentLabel(item) {
      const environment = String(item?.environment || (item?.enable_demo_trading ? 'demo' : 'live')).toLowerCase()
      if (environment === 'testnet') return this.$t('credentials.environment_testnet')
      if (environment === 'demo') return this.$t('credentials.environment_demo')
      return this.$t('credentials.environment_live')
    },

    credentialScopeLabel(item) {
      const scope = String(item?.market_scope || 'both').toLowerCase()
      if (scope === 'spot') return this.$t('credentials.market_scope_spot')
      if (scope === 'swap') return this.$t('credentials.market_scope_swap')
      return this.$t('credentials.market_scope_both')
    },

    credentialHealthy(item) {
      const status = String(item?.status || item?.connection_status || '').toLowerCase()
      if (['error', 'failed', 'invalid', 'expired', 'disabled'].includes(status)) return false
      if (item?.is_active === false || item?.last_test_success === false || item?.test_success === false) return false
      return true
    },

    credentialHealthLabel(item) {
      return this.$t(this.credentialHealthy(item) ? 'credentials.status_connected' : 'credentials.status_check')
    },

    credentialLastChecked(item) {
      const value = item?.last_tested_at || item?.last_checked_at || item?.updated_at
      if (!value) return ''
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
    },

    openRename(item) {
      this.renameCredential = item
      this.renameValue = String(item?.name || '').trim()
      this.showRename = true
    },

    closeRename() {
      if (this.renaming) return
      this.showRename = false
      this.renameCredential = null
      this.renameValue = ''
    },

    async saveRename() {
      const id = Number(this.renameCredential?.id)
      const name = this.renameValue.trim()
      if (!id || !name) {
        showToast({ message: this.$t('credentials.name_required'), type: 'fail' })
        return
      }
      this.renaming = true
      try {
        await credentialsApi.updateName(id, name)
        showToast({ message: this.$t('credentials.rename_success'), type: 'success' })
        this.showRename = false
        this.renameCredential = null
        this.renameValue = ''
        await this.loadData()
      } catch (error) {
        const message = error?.response?.data?.msg || error?.message || this.$t('credentials.rename_failed')
        showToast({ message, type: 'fail' })
      } finally {
        this.renaming = false
      }
    },

    async removeCredential(item) {
      try {
        await showConfirmDialog({
          title: this.$t('credentials.delete_title'),
          message: this.$t('credentials.delete_confirm', { name: item.name })
        })
        await credentialsApi.delete(item.id)
        showToast({ message: this.$t('credentials.deleted'), type: 'success' })
        await this.loadData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Delete credential failed:', error)
        }
      }
    }
  }
}
</script>

<style scoped>
.credentials-page {
  min-height: 100vh;
  padding-bottom: 32px;
  background: var(--bg);
}

.credentials-page :deep(.van-nav-bar) {
  background: transparent;
}

.credentials-page :deep(.van-nav-bar__title),
.credentials-page :deep(.van-nav-bar__arrow),
.credentials-page :deep(.van-nav-bar .van-icon) {
  color: var(--text);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 600;
}

.egress-card,
.signup-card,
.list-card {
  margin: 14px 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}
.primary-list { border-color: color-mix(in srgb, var(--accent) 24%, var(--border)); }

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.signup-toggle {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-2);
  text-align: left;
}
.card-head-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.card-icon {
  width: 36px; height: 36px;
  flex-shrink: 0;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-indigo);
  color: #ffffff;
  font-size: 18px;
  border: none;
}
.card-icon.gold {
  background: var(--c-amber);
  color: #0a0a0d;
  border: none;
}
.card-icon.blue {
  background: var(--c-blue);
  color: #ffffff;
  border: none;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.card-desc {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-2);
}

/* Egress IP */
.ip-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin: 10px 0 4px;
}
.ip-box {
  flex: 1;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-deep);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', monospace;
  word-break: break-all;
  white-space: pre-line;
  line-height: 1.6;
}
.copy-btn {
  flex-shrink: 0;
  border-radius: 12px !important;
  height: auto !important;
  padding: 0 14px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}
.tutorial-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 2px;
  font-size: 13px;
  color: var(--accent-light);
  font-weight: 600;
}
.tutorial-toggle .van-icon:first-child { color: var(--accent); }
.tutorial-toggle > span { flex: 1; }
.tutorial {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tutorial-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
.step-num {
  flex-shrink: 0;
  width: 22px; height: 22px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent);
  color: var(--text-on-accent);
  font-size: 11px;
  font-weight: 800;
}
.step-text { flex: 1; padding-top: 1px; }

/* Signup cards */
.signup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.signup-card-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  transition: transform 0.15s;
}
.signup-card-item:active { transform: scale(0.97); }
.signup-logo {
  width: 36px; height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.signup-meta { flex: 1; min-width: 0; }
.signup-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.signup-rebate {
  margin-top: 2px;
  font-size: 10px;
  color: var(--up);
  font-weight: 600;
}
.signup-arrow {
  color: var(--text-3);
  font-size: 14px;
}

/* Credential list */
.cred-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cred-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  position: relative;
}
.cred-row + .cred-row::before {
  content: '';
  position: absolute;
  left: 44px; right: 0; top: 0;
  height: 1px;
  background: var(--hairline);
}
.cred-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.cred-logo {
  width: 32px; height: 32px;
  flex-shrink: 0;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
.cred-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cred-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.row-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-subtitle {
  font-size: 12px;
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.credential-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.credential-tag {
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: 9px;
  line-height: 1.3;
}

.credential-tag.live {
  color: var(--down);
  border-color: color-mix(in srgb, var(--down) 30%, var(--border));
  background: color-mix(in srgb, var(--down) 9%, var(--surface-raised));
}

.credential-tag.sandbox {
  color: var(--up);
  border-color: color-mix(in srgb, var(--up) 30%, var(--border));
  background: color-mix(in srgb, var(--up) 9%, var(--surface-raised));
}
.credential-tag.healthy {
  color: var(--up);
  border-color: color-mix(in srgb, var(--up) 30%, var(--border));
  background: color-mix(in srgb, var(--up) 9%, var(--surface-raised));
}
.credential-tag.needs-check {
  color: var(--down);
  border-color: color-mix(in srgb, var(--down) 30%, var(--border));
  background: color-mix(in srgb, var(--down) 9%, var(--surface-raised));
}
.last-checked { color: var(--text-3); font-size: 10px; line-height: 1.4; }

.rename-sheet {
  padding: 20px 16px calc(20px + var(--safe-area-bottom));
  background: var(--bg-elevated);
}

.rename-title {
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
}

.rename-sheet p {
  margin: 6px 0 14px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.5;
}

.rename-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}
</style>
