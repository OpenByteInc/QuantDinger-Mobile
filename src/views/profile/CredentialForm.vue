<template>
  <div class="credential-form-page">
    <van-nav-bar
      :title="$t('credentials.add_title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    />

    <div class="form-card">
      <div class="section-title">{{ $t('credentials.section_basic') }}</div>
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

      <van-button block type="primary" :loading="saving" @click="submit">
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
import { EXCHANGE_BRANDS, EXCHANGE_OPTIONS } from '@/constants/exchanges'
import { openExternal } from '@/utils/external'

const PASSPHRASE_EXCHANGES = ['okx', 'bitget']

export default {
  name: 'CredentialCreate',

  data() {
    return {
      saving: false,
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
    }
  },

  methods: {
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

    async submit() {
      if (!this.validate()) return
      this.saving = true
      try {
        await credentialsApi.create({
          name: this.form.name.trim(),
          exchange_id: this.form.exchange_id,
          api_key: this.form.api_key.trim(),
          secret_key: this.form.secret_key.trim(),
          passphrase: this.needsPassphrase ? this.form.passphrase.trim() : '',
          environment: this.form.environment,
          market_scope: this.form.market_scope,
          enable_demo_trading: this.form.environment !== 'live'
        })
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
  padding-bottom: 24px;
  background: transparent;
}

.credential-form-page :deep(.van-nav-bar) { background: transparent; }
.credential-form-page :deep(.van-nav-bar__title),
.credential-form-page :deep(.van-nav-bar__arrow),
.credential-form-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.form-card {
  margin: 16px;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
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

.credential-form-page :deep(.van-button--primary) {
  margin-top: 10px;
  border-radius: 14px;
  height: 48px;
  font-weight: 700;
  background: var(--accent);
  color: var(--text-on-accent);
  border: none;
}
</style>
