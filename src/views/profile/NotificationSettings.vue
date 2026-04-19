<template>
  <div class="notif-settings-page">
    <van-nav-bar
      :title="$t('notif_settings.title')"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    />

    <!-- Hint -->
    <div class="hint-card">
      <van-icon name="info-o" class="hint-icon" />
      <span>{{ $t('notif_settings.hint') }}</span>
    </div>

    <!-- Default channels -->
    <div class="card">
      <div class="card-title">{{ $t('notif_settings.default_channels') }}</div>
      <p class="card-desc">{{ $t('notif_settings.default_channels_desc') }}</p>
      <van-checkbox-group v-model="channels" class="channel-list">
        <van-checkbox
          v-for="item in channelOptions"
          :key="item.value"
          :name="item.value"
          shape="square"
        >
          <div class="channel-item">
            <van-icon :name="item.icon" :class="['channel-icon', item.value]" />
            <span>{{ item.label }}</span>
          </div>
        </van-checkbox>
      </van-checkbox-group>
    </div>

    <!-- Telegram -->
    <div class="card">
      <div class="card-title">
        <van-icon name="chat-o" class="title-icon tg" />
        Telegram
      </div>
      <van-field
        v-model="form.telegram_bot_token"
        :label="$t('notif_settings.tg_bot_token')"
        :placeholder="$t('notif_settings.tg_bot_token_ph')"
        type="password"
      />
      <p class="field-hint">{{ $t('notif_settings.tg_bot_token_hint') }} <a @click.stop="openLink('https://t.me/BotFather')">@BotFather</a></p>

      <van-field
        v-model="form.telegram_chat_id"
        :label="$t('notif_settings.tg_chat_id')"
        :placeholder="$t('notif_settings.tg_chat_id_ph')"
      />
      <p class="field-hint">{{ $t('notif_settings.tg_chat_id_hint') }}</p>
    </div>

    <!-- Email -->
    <div class="card">
      <div class="card-title">
        <van-icon name="envelop-o" class="title-icon email" />
        {{ $t('notif_settings.email') }}
      </div>
      <van-field
        v-model="form.email"
        :label="$t('notif_settings.email_label')"
        :placeholder="$t('notif_settings.email_ph')"
      />
      <p class="field-hint">{{ $t('notif_settings.email_hint') }}</p>
    </div>

    <!-- Phone / SMS -->
    <div class="card">
      <div class="card-title">
        <van-icon name="phone-o" class="title-icon sms" />
        {{ $t('notif_settings.sms') }}
      </div>
      <van-field
        v-model="form.phone"
        :label="$t('notif_settings.phone_label')"
        :placeholder="$t('notif_settings.phone_ph')"
      />
      <p class="field-hint">{{ $t('notif_settings.phone_hint') }}</p>
    </div>

    <!-- Discord -->
    <div class="card">
      <div class="card-title">
        <van-icon name="comment-o" class="title-icon discord" />
        Discord
      </div>
      <van-field
        v-model="form.discord_webhook"
        :label="$t('notif_settings.discord_webhook')"
        :placeholder="$t('notif_settings.discord_webhook_ph')"
      />
      <p class="field-hint">{{ $t('notif_settings.discord_hint') }}</p>
    </div>

    <!-- Webhook -->
    <div class="card">
      <div class="card-title">
        <van-icon name="link-o" class="title-icon webhook" />
        {{ $t('notif_settings.webhook') }}
      </div>
      <van-field
        v-model="form.webhook_url"
        :label="$t('notif_settings.webhook_url')"
        :placeholder="$t('notif_settings.webhook_url_ph')"
      />
      <p class="field-hint">{{ $t('notif_settings.webhook_hint') }}</p>

      <van-field
        v-model="form.webhook_token"
        :label="$t('notif_settings.webhook_token')"
        :placeholder="$t('notif_settings.webhook_token_ph')"
        type="password"
      />
      <p class="field-hint">{{ $t('notif_settings.webhook_token_hint') }}</p>
    </div>

    <div class="actions">
      <van-button plain block :loading="testing" @click="handleTest">
        <van-icon name="send-gift-o" /> {{ $t('notif_settings.test') }}
      </van-button>
      <van-button type="primary" block :loading="saving" @click="handleSave">
        {{ $t('notif_settings.save') }}
      </van-button>
    </div>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { userApi } from '@/api'
import { openExternal } from '@/utils/external'

export default {
  name: 'NotificationSettings',
  data() {
    return {
      saving: false,
      testing: false,
      channels: ['browser'],
      form: {
        telegram_bot_token: '',
        telegram_chat_id: '',
        email: '',
        phone: '',
        discord_webhook: '',
        webhook_url: '',
        webhook_token: ''
      }
    }
  },
  computed: {
    channelOptions() {
      return [
        { value: 'browser', label: this.$t('notif_settings.ch_browser'), icon: 'bell' },
        { value: 'telegram', label: 'Telegram', icon: 'chat-o' },
        { value: 'email', label: this.$t('notif_settings.ch_email'), icon: 'envelop-o' },
        { value: 'phone', label: this.$t('notif_settings.ch_sms'), icon: 'phone-o' },
        { value: 'discord', label: 'Discord', icon: 'comment-o' },
        { value: 'webhook', label: 'Webhook', icon: 'link-o' }
      ]
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    openLink(url) {
      openExternal(url)
    },
    async load() {
      try {
        const res = await userApi.getNotificationSettings()
        const d = res?.data || {}
        this.channels = d.default_channels && d.default_channels.length ? d.default_channels : ['browser']
        this.form.telegram_bot_token = d.telegram_bot_token || ''
        this.form.telegram_chat_id = d.telegram_chat_id || ''
        this.form.email = d.email || ''
        this.form.phone = d.phone || ''
        this.form.discord_webhook = d.discord_webhook || ''
        this.form.webhook_url = d.webhook_url || ''
        this.form.webhook_token = d.webhook_token || ''
      } catch (err) {
        console.error('Load notification settings failed:', err)
      }
    },
    async handleSave() {
      this.saving = true
      try {
        await userApi.updateNotificationSettings({
          default_channels: this.channels,
          ...this.form
        })
        showToast({ message: this.$t('notif_settings.saved'), type: 'success' })
      } catch (err) {
        console.error('Save failed:', err)
      } finally {
        this.saving = false
      }
    },
    async handleTest() {
      this.testing = true
      try {
        await userApi.testNotificationSettings()
        showToast({ message: this.$t('notif_settings.test_sent'), type: 'success' })
      } catch (err) {
        console.error('Test failed:', err)
      } finally {
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.notif-settings-page {
  min-height: 100vh;
  padding-bottom: 40px;
  background: transparent;
}

:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.hint-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--c-blue-soft);
  border: 1px solid transparent;
  font-size: 12px;
  color: var(--c-blue);
  line-height: 1.5;
}
.hint-icon {
  color: var(--c-blue);
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.card {
  margin: 12px 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.title-icon {
  width: 26px; height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ffffff;
}
.title-icon.tg      { background: var(--c-blue); }
.title-icon.email   { background: var(--c-indigo); }
.title-icon.sms     { background: var(--c-green); }
.title-icon.discord { background: var(--c-violet); }
.title-icon.webhook { background: var(--c-orange); }

.card-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.channel-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 8px;
  margin-top: 10px;
}

.channel-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-2);
  font-size: 12px;
}
.channel-icon {
  width: 22px; height: 22px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: var(--c-slate-soft);
  color: var(--c-slate);
}
.channel-icon.browser  { background: var(--c-indigo-soft); color: var(--c-indigo); }
.channel-icon.telegram { background: var(--c-blue-soft);   color: var(--c-blue); }
.channel-icon.email    { background: var(--c-violet-soft); color: var(--c-violet); }
.channel-icon.phone    { background: var(--c-green-soft);  color: var(--c-green); }
.channel-icon.discord  { background: var(--c-indigo-soft); color: var(--c-indigo); }
.channel-icon.webhook  { background: var(--c-orange-soft); color: var(--c-orange); }

.field-hint {
  margin: 4px 16px 10px;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}
.field-hint a {
  color: var(--accent);
  text-decoration: underline;
}

.card :deep(.van-cell) {
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}
.card :deep(.van-field__label),
.card :deep(.van-field__control) {
  color: var(--text);
}
.card :deep(.van-field__control::placeholder) {
  color: var(--text-3);
}

.actions {
  margin: 20px 16px 0;
  display: grid;
  gap: 10px;
}

.actions :deep(.van-button) {
  border-radius: 14px;
  height: 46px;
  font-weight: 700;
}
.actions :deep(.van-button--primary) {
  background: var(--accent);
  border: none;
  color: var(--text-on-accent);
}
</style>
