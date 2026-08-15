<template>
  <div class="credential-form-page">
    <van-nav-bar
      :title="$t('credentials.add_title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    />

    <div class="form-card account-card">
      <div class="section-heading">
        <span class="section-icon blue"><van-icon name="records" /></span>
        <div>
          <div class="section-title">{{ $t('credentials.section_basic') }}</div>
          <p>{{ $t('credentials.section_basic_desc') }}</p>
        </div>
      </div>
      <van-field
        v-model="form.name"
        :label="$t('credentials.name')"
        :placeholder="$t('credentials.name_placeholder')"
      />
      <van-cell
        :title="$t('credentials.exchange')"
        :value="selectedExchangeLabel || $t('credentials.exchange_placeholder')"
        is-link
        @click="showExchangePicker = true"
      />
      <van-cell
        :title="$t('credentials.environment')"
        :value="environmentLabel"
        is-link
        @click="showEnvironmentPicker = true"
      />
      <div class="field-hint">{{ environmentHint }}</div>
      <van-cell
        :title="$t('credentials.market_scope')"
        :value="marketScopeLabel"
        is-link
        @click="showMarketScopePicker = true"
      />
    </div>

    <div class="egress-card">
      <div class="section-heading">
        <span class="section-icon amber"><van-icon name="shield-o" /></span>
        <div>
          <div class="section-title">{{ $t('credentials.egress_title') }}</div>
          <p>{{ $t('credentials.egress_desc') }}</p>
        </div>
      </div>

      <div class="ip-row">
        <div class="ip-box">{{ egressIpText }}</div>
        <button type="button" class="copy-ip-button" :disabled="!egressIpRaw" @click="copyIp">
          <van-icon name="records" />
          <span>{{ $t('credentials.copy') }}</span>
        </button>
      </div>

      <button type="button" class="tutorial-toggle" @click="showTutorial = !showTutorial">
        <van-icon name="question-o" />
        <span>{{ $t('credentials.how_to_whitelist') }}</span>
        <van-icon :name="showTutorial ? 'arrow-up' : 'arrow-down'" />
      </button>
      <div v-if="showTutorial" class="tutorial">
        <div v-for="(step, idx) in tutorialSteps" :key="idx" class="tutorial-step">
          <span class="step-num">{{ idx + 1 }}</span>
          <span class="step-text">{{ step }}</span>
        </div>
      </div>
    </div>

    <div class="form-card key-card">
      <div class="section-heading">
        <span class="section-icon violet"><van-icon name="exchange" /></span>
        <div>
          <div class="section-title">{{ $t('credentials.section_keys') }}</div>
          <p>{{ $t('credentials.section_keys_desc') }}</p>
        </div>
      </div>
      <div v-if="selectedExchangeDocsUrl" class="api-doc-card">
        <div class="api-doc-copy">
          <span class="api-doc-title">{{ $t('credentials.api_doc_title') }}</span>
          <p>{{ $t('credentials.api_doc_desc', { exchange: selectedExchangeLabel }) }}</p>
        </div>
        <button type="button" class="api-doc-action" @click="openDocs">
          {{ $t('credentials.api_doc_action') }}
        </button>
      </div>
      <van-field
        v-model="form.api_key"
        :label="$t('credentials.api_key')"
        :placeholder="$t('credentials.api_key_placeholder')"
      />
      <van-field
        v-model="form.secret_key"
        :label="$t('credentials.secret_key')"
        type="password"
        :placeholder="$t('credentials.secret_key_placeholder')"
      />
      <van-field
        v-if="needsPassphrase"
        v-model="form.passphrase"
        :label="$t('credentials.passphrase')"
        :placeholder="$t('credentials.passphrase_placeholder')"
      />
    </div>

    <div class="form-actions">
      <van-button
        block
        round
        plain
        class="test-button"
        :loading="testing"
        :disabled="saving"
        @click="testConnection"
      >
        <van-icon name="exchange" />
        {{ $t('credentials.test_connection') }}
      </van-button>
      <van-button
        block
        round
        type="primary"
        class="save-button"
        :loading="saving"
        :disabled="testing"
        @click="submit"
      >
        <van-icon name="success" />
        {{ $t('credentials.save') }}
      </van-button>
    </div>

    <van-popup v-model:show="showExchangePicker" position="bottom" round>
      <van-picker
        :columns="exchangeColumns"
        @cancel="showExchangePicker = false"
        @confirm="onSelectExchange"
      />
    </van-popup>
    <van-popup v-model:show="showEnvironmentPicker" position="bottom" round>
      <van-picker
        :columns="environmentColumns"
        @cancel="showEnvironmentPicker = false"
        @confirm="onSelectEnvironment"
      />
    </van-popup>
    <van-popup v-model:show="showMarketScopePicker" position="bottom" round>
      <van-picker
        :columns="marketScopeColumns"
        @cancel="showMarketScopePicker = false"
        @confirm="onSelectMarketScope"
      />
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { EXCHANGE_BRANDS, EXCHANGE_OPTIONS } from '@/constants/exchanges'
import { openExternal } from '@/utils/external'

const PASSPHRASE_EXCHANGES = ['okx', 'bitget']

export default {
  name: 'CredentialCreate',

  data() {
    return {
      saving: false,
      testing: false,
      showTutorial: false,
      showExchangePicker: false,
      showEnvironmentPicker: false,
      showMarketScopePicker: false,
      form: {
        name: '',
        exchange_id: '',
        api_key: '',
        secret_key: '',
        passphrase: '',
        environment: 'live',
        market_scope: 'both'
      }
    }
  },

  computed: {
    credentialsStore() {
      return useCredentialsStore()
    },
    exchangeColumns() {
      return EXCHANGE_OPTIONS.map((item) => ({
        text: item.label,
        value: item.value
      }))
    },
    selectedExchangeLabel() {
      return EXCHANGE_OPTIONS.find((item) => item.value === this.form.exchange_id)?.label || ''
    },
    selectedExchangeMeta() {
      return EXCHANGE_BRANDS[this.form.exchange_id] || null
    },
    selectedExchangeDocsUrl() {
      return this.selectedExchangeMeta?.docsUrl || ''
    },
    needsPassphrase() {
      return PASSPHRASE_EXCHANGES.includes(this.form.exchange_id)
    },
    environmentOptions() {
      const live = { value: 'live', label: this.$t('credentials.environment_live') }
      const demo = { value: 'demo', label: this.$t('credentials.environment_demo') }
      const testnet = { value: 'testnet', label: this.$t('credentials.environment_testnet') }
      if (['binance', 'okx', 'bitget', 'bybit'].includes(this.form.exchange_id)) return [live, demo]
      if (this.form.exchange_id === 'gate') return [live, testnet]
      return [live]
    },
    environmentColumns() {
      return this.environmentOptions.map(item => ({ text: item.label, value: item.value }))
    },
    environmentLabel() {
      return this.environmentOptions.find(item => item.value === this.form.environment)?.label || ''
    },
    environmentHint() {
      return this.form.environment === 'live'
        ? this.$t('credentials.environment_live_hint')
        : this.$t('credentials.environment_sandbox_hint')
    },
    marketScopeColumns() {
      return [
        { text: this.$t('credentials.market_scope_spot'), value: 'spot' },
        { text: this.$t('credentials.market_scope_swap'), value: 'swap' },
        { text: this.$t('credentials.market_scope_both'), value: 'both' }
      ]
    },
    marketScopeLabel() {
      return this.marketScopeColumns.find(item => item.value === this.form.market_scope)?.text || ''
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
    }
  },

  mounted() {
    this.loadEgressIp()
  },

  methods: {
    async loadEgressIp() {
      try {
        const response = await credentialsApi.getEgressIp()
        this.credentialsStore.setEgressIp(response.data || null)
      } catch (error) {
        console.error('Load exchange whitelist IP failed:', error)
      }
    },

    async copyIp() {
      const text = this.egressIpRaw
      if (!text) {
        showToast({ message: this.$t('credentials.egress_loading'), type: 'fail' })
        return
      }
      try {
        await navigator.clipboard.writeText(text)
      } catch (error) {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        try { document.execCommand('copy') } catch {}
        textarea.remove()
      }
      showToast({ message: this.$t('credentials.copied'), type: 'success' })
    },

    onSelectExchange(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.selectedOption || payload?.[0] || payload
      this.form.exchange_id = selected?.value || ''
      if (!this.needsPassphrase) {
        this.form.passphrase = ''
      }
      if (!this.environmentOptions.some(item => item.value === this.form.environment)) {
        this.form.environment = 'live'
      }
      this.showExchangePicker = false
    },
    onSelectEnvironment(payload) {
      const selected = payload?.selectedOptions?.[0]
      if (selected) this.form.environment = selected.value
      this.showEnvironmentPicker = false
    },
    onSelectMarketScope(payload) {
      const selected = payload?.selectedOptions?.[0]
      if (selected) this.form.market_scope = selected.value
      this.showMarketScopePicker = false
    },

    openDocs() {
      if (this.selectedExchangeDocsUrl) {
        openExternal(this.selectedExchangeDocsUrl)
      }
    },

    validate() {
      if (!this.form.name.trim()) {
        showToast({ message: this.$t('credentials.name_required'), type: 'fail' })
        return false
      }
      if (!this.form.exchange_id) {
        showToast({ message: this.$t('credentials.exchange_required'), type: 'fail' })
        return false
      }
      if (!this.form.api_key.trim() || !this.form.secret_key.trim()) {
        showToast({ message: this.$t('credentials.keys_required'), type: 'fail' })
        return false
      }
      if (this.needsPassphrase && !this.form.passphrase.trim()) {
        showToast({ message: this.$t('credentials.passphrase_required'), type: 'fail' })
        return false
      }
      return true
    },

    credentialPayload() {
      return {
        name: this.form.name.trim(),
        exchange_id: this.form.exchange_id,
        api_key: this.form.api_key.trim(),
        secret_key: this.form.secret_key.trim(),
        passphrase: this.needsPassphrase ? this.form.passphrase.trim() : '',
        environment: this.form.environment,
        market_scope: this.form.market_scope,
        enable_demo_trading: this.form.environment !== 'live'
      }
    },

    async testConnection() {
      if (!this.validate()) return
      this.testing = true
      try {
        await credentialsApi.test(this.credentialPayload())
        showToast({ message: this.$t('credentials.test_success'), type: 'success' })
      } catch (error) {
        const message = error?.response?.data?.msg || error?.message || this.$t('credentials.test_failed')
        showToast({ message, type: 'fail' })
      } finally {
        this.testing = false
      }
    },

    async submit() {
      if (!this.validate()) return
      this.saving = true
      try {
        await credentialsApi.create(this.credentialPayload())
        showToast({ message: this.$t('credentials.saved'), type: 'success' })
        this.$router.replace('/profile/credentials')
      } catch (error) {
        console.error('Create credential failed:', error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.credential-form-page {
  min-height: 100vh;
  padding-bottom: calc(28px + var(--safe-area-bottom, 0px));
  background: transparent;
}

.credential-form-page :deep(.van-nav-bar) { background: transparent; }
.credential-form-page :deep(.van-nav-bar__title),
.credential-form-page :deep(.van-nav-bar__arrow),
.credential-form-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.form-card,
.egress-card {
  margin: 12px var(--page-gutter);
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.3fr);
  gap: 10px;
  margin: 14px var(--page-gutter) 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 12px;
}

.section-heading > div:last-child {
  flex: 1;
  min-width: 0;
}

.section-heading p {
  margin: 3px 0 0;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.45;
}

.section-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
}

.section-icon.blue { background: var(--c-blue); }
.section-icon.amber { background: var(--c-amber); color: #0a0a0d; }
.section-icon.violet { background: var(--c-violet); }

.egress-card {
  border-color: color-mix(in srgb, var(--c-amber) 30%, var(--border));
  background:
    radial-gradient(240px 140px at 100% 0%, color-mix(in srgb, var(--c-amber) 12%, transparent), transparent 65%),
    var(--bg-elevated);
}

.ip-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.ip-box {
  flex: 1;
  min-width: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--surface-deep);
  border: 1px solid var(--border);
  color: var(--accent);
  font: 700 12px/1.55 'SFMono-Regular', Consolas, monospace;
  word-break: break-all;
  white-space: pre-line;
}

.copy-ip-button {
  width: 68px;
  flex: 0 0 68px;
  border: 1px solid color-mix(in srgb, var(--c-amber) 44%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-amber) 12%, var(--surface-raised));
  color: var(--c-amber);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
}

.copy-ip-button .van-icon { font-size: 17px; }
.copy-ip-button:disabled { opacity: 0.45; }

.tutorial-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 9px 2px 2px;
  border: 0;
  background: transparent;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.tutorial-toggle > span { flex: 1; }
.tutorial-toggle .van-icon:first-child { color: var(--c-amber); }

.tutorial {
  margin-top: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.tutorial-step {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.5;
}

.step-num {
  width: 21px;
  height: 21px;
  flex: 0 0 21px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--c-amber);
  color: #0a0a0d;
  font-size: 10px;
  font-weight: 900;
}

.step-text { flex: 1; }

.form-actions :deep(.van-button) {
  height: 48px;
  margin: 0;
  border-radius: 14px;
  font-weight: 800;
  font-size: 13px;
}

.form-actions :deep(.van-button__content),
.form-actions :deep(.van-button__text) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.test-button {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border)) !important;
  background: var(--surface-raised) !important;
  color: var(--text) !important;
}

.save-button {
  border: 0 !important;
  background: var(--accent) !important;
  color: var(--text-on-accent) !important;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 22%, transparent);
}

.api-doc-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-elevated));
}

.api-doc-copy {
  flex: 1;
  min-width: 0;
}

.api-doc-title {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
}

.api-doc-copy p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-2);
}

.api-doc-action {
  flex: 0 0 auto;
  border: none;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-on-accent);
  background: var(--accent);
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 0 16px;
  color: var(--text);
}
.switch-row > div:first-child { flex: 1; min-width: 0; }
.switch-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.switch-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.field-hint {
  padding: 0 0 12px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
}

.credential-form-page :deep(.van-cell) {
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

.credential-form-page :deep(.van-cell__title),
.credential-form-page :deep(.van-cell__value),
.credential-form-page :deep(.van-cell__right-icon),
.credential-form-page :deep(.van-field__label),
.credential-form-page :deep(.van-field__control) {
  color: var(--text);
}

</style>
