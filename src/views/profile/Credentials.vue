<template>
  <div class="credentials-page account-page">
    <van-nav-bar fixed placeholder safe-area-inset-top
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
      <p class="account-list-count">{{ $t('credentials.list_desc', { count: credentials.length }) }}</p>

      <van-button v-if="loadFailed" block @click="loadData">{{ $t('audit.loadFailed') }}</van-button>
      <div v-else-if="credentials.length" class="cred-list">
        <div v-for="item in credentials" :key="item.id" class="cred-row">
          <button type="button" class="cred-left" @click="$router.push(`/profile/credentials/${item.id}`)">
            <ExchangeLogo :exchange="item.exchange_id" :size="40" />
            <div class="cred-info">
              <span class="row-title">{{ item.name || formatExchange(item.exchange_id) }}</span>
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
            </div><van-icon name="arrow"/>
          </button>
          <button type="button" class="account-manage" :aria-label="$t('profile_detail.manage')" @click="manageTarget=item;showManage=true"><van-icon name="ellipsis"/></button>
        </div>
      </div>
      <div v-else-if="!loading" class="account-empty"><div class="provider-stack"><ExchangeLogo v-for="id in ['binance','okx','alpaca']" :key="id" :exchange="id" :size="44"/></div><h3>{{ $t('account_ui.connectTitle') }}</h3><p>{{ $t('account_ui.connectHint') }}</p><van-button block type="primary" @click="$router.push('/profile/credentials/new')">{{ $t('account_ui.connectAction') }}</van-button></div>
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
          <ExchangeLogo :exchange="item.id" :size="36" />
          <div class="signup-meta">
            <div class="signup-name">{{ item.name }}</div>
            <div class="signup-rebate">{{ $t('credentials.rebate') }}</div>
          </div>
          <van-icon class="signup-arrow" name="arrow" />
        </div>
      </div>
    </div>

    <van-action-sheet v-model:show="showManage" :title="manageTarget?.name || formatExchange(manageTarget?.exchange_id)" :cancel-text="$t('common.cancel')" :actions="[{name:$t('credentials.rename'),value:'rename'},{name:$t('credentials.delete'),value:'delete',color:'var(--v2-red)'}]" @select="onManage" />
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
import ExchangeLogo from '@/components/ExchangeLogo.vue'
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { EXCHANGE_BRANDS, EXCHANGE_SIGNUP_CARDS } from '@/constants/exchanges'
import { openExternal } from '@/utils/external'

export default {
  name: 'CredentialList',
  components: { ExchangeLogo },

  data() {
    return {
      loading: false, loadFailed: false,
      showSignup: false, showManage: false, manageTarget: null,
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
      return this.credentialsStore.items
    },
    signupCards() {
      return EXCHANGE_SIGNUP_CARDS
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    onManage(action) { this.showManage=false; if(action.value==='rename')this.openRename(this.manageTarget);else this.removeCredential(this.manageTarget) },
    async loadData() {
      this.loading = true
      this.loadFailed = false
      try {
        const listRes = await credentialsApi.list()
        this.credentialsStore.setItems(listRes.data || [])
      } catch (error) {
        this.loadFailed = true
        this.credentialsStore.setItems([])
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

    openExchangeSignup(item) {
      if (!item.signupUrl) return
      openExternal(item.signupUrl)
    },

    credentialEnvironmentLabel(item) {
      if (item?.exchange_id === 'alpaca') return this.$t(/paper/i.test(item.api_key_hint || '') ? 'audit.paperMode' : 'credentials.environment_live')
      const environment = String(item?.environment || (item?.enable_demo_trading ? 'demo' : 'live')).toLowerCase()
      if (environment === 'testnet') return this.$t('credentials.environment_testnet')
      if (environment === 'demo') return this.$t('credentials.environment_demo')
      return this.$t('credentials.environment_live')
    },

    credentialScopeLabel(item) {
      if (item?.exchange_id === 'alpaca') return this.$t('account_ui.usStocks')
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
      if (!this.credentialHealthy(item)) return this.$t('credentials.status_check')
      const verified = item?.last_test_success === true || item?.test_success === true || item?.connection_status === 'connected'
      return this.$t(verified ? 'credentials.status_connected' : 'account_ui.saved')
    },

    credentialLastChecked(item) {
      const value = item?.last_tested_at || item?.last_checked_at
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

.signup-card,
.list-card {
  margin: 12px var(--page-gutter);
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

<style scoped>
.list-card,.signup-card{border-radius:12px;box-shadow:none;border-color:var(--border)}.card-icon.blue,.card-icon.gold{background:var(--surface-raised);color:var(--text-2);border:1px solid var(--border)}.card-title{font-weight:650}.account-empty{padding:20px 8px 8px;text-align:center}.provider-stack{display:flex;justify-content:center;gap:12px;margin:0 0 18px}.account-empty h3{font-size:18px;margin:0 0 8px}.account-empty p{max-width:320px;margin:0 auto 22px;color:var(--text-3);font-size:12px;line-height:1.7}.account-empty .van-button{border-radius:8px;height:44px}.signup-toggle{margin-bottom:0}.signup-grid{margin-top:16px;grid-template-columns:1fr 1fr}.signup-card-item{padding:10px 8px;gap:7px;border-radius:8px}.signup-arrow{display:none}.cred-row{flex-wrap:wrap}.cred-actions{width:100%;justify-content:flex-end}.cred-actions .van-button{padding:0 10px;min-height:30px}.cred-info{gap:5px}
</style>
