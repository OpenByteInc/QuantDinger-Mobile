<template>
  <div class="credential-form-page">
    <van-nav-bar
      title="添加 API Key"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    />

    <div class="form-card">
      <div class="section-title">基础信息</div>
      <van-field v-model="form.name" label="名称" placeholder="例如 Binance 主账户" />
      <van-cell
        title="交易所"
        :value="selectedExchangeLabel || '请选择交易所'"
        is-link
        @click="showExchangePicker = true"
      />
      <van-field v-model="form.api_key" label="API Key" placeholder="请输入 API Key" />
      <van-field v-model="form.secret_key" label="Secret Key" type="password" placeholder="请输入 Secret Key" />
      <van-field v-model="form.passphrase" label="Passphrase" placeholder="部分交易所必填，例如 OKX" />

      <div class="switch-row">
        <span>启用模拟盘</span>
        <van-switch v-model="form.enable_demo_trading" size="20px" />
      </div>

      <div class="tip-box">
        说明：手机版第一版只支持新增和删除，不提供在线编辑。若要修改凭证，请删除后重新创建。
      </div>

      <van-button block type="primary" :loading="saving" @click="submit">保存 API Key</van-button>
    </div>

    <van-popup v-model:show="showExchangePicker" position="bottom" round>
      <van-picker
        :columns="exchangeActions"
        @cancel="showExchangePicker = false"
        @confirm="onSelectExchange"
      />
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { credentialsApi } from '@/api'

const EXCHANGES = [
  { label: 'Binance', value: 'binance' },
  { label: 'OKX', value: 'okx' },
  { label: 'Bybit', value: 'bybit' },
  { label: 'Bitget', value: 'bitget' },
  { label: 'Gate', value: 'gate' }
]

export default {
  name: 'CredentialCreate',

  data() {
    return {
      saving: false,
      showExchangePicker: false,
      form: {
        name: '',
        exchange_id: '',
        api_key: '',
        secret_key: '',
        passphrase: '',
        enable_demo_trading: false
      }
    }
  },

  computed: {
    exchangeActions() {
      return EXCHANGES.map((item) => ({
        text: item.label,
        value: item.value
      }))
    },
    selectedExchangeLabel() {
      return EXCHANGES.find((item) => item.value === this.form.exchange_id)?.label || ''
    }
  },

  methods: {
    onSelectExchange(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.selectedOption || payload?.[0] || payload
      this.form.exchange_id = selected?.value || ''
      this.showExchangePicker = false
    },

    validate() {
      if (!this.form.name.trim()) {
        showToast({ message: '请输入名称', type: 'fail' })
        return false
      }
      if (!this.form.exchange_id) {
        showToast({ message: '请选择交易所', type: 'fail' })
        return false
      }
      if (!this.form.api_key.trim() || !this.form.secret_key.trim()) {
        showToast({ message: 'API Key 和 Secret Key 不能为空', type: 'fail' })
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
          passphrase: this.form.passphrase.trim(),
          enable_demo_trading: this.form.enable_demo_trading
        })
        showToast({ message: 'API Key 已保存', type: 'success' })
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
}

.credential-form-page :deep(.van-nav-bar) {
  background: transparent;
}

.credential-form-page :deep(.van-nav-bar__title),
.credential-form-page :deep(.van-nav-bar__arrow) {
  color: #fff;
}

.form-card {
  margin: 16px;
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  color: #fff;
}

.tip-box {
  margin: 6px 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
}

.credential-form-page :deep(.van-cell) {
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

.credential-form-page :deep(.van-cell__title),
.credential-form-page :deep(.van-cell__value),
.credential-form-page :deep(.van-cell__right-icon) {
  color: #fff;
}
</style>
