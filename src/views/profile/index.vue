<template>
  <div class="profile-page">
    <div class="user-card">
      <div class="avatar">
        <img :src="logoUrl" alt="Logo" class="avatar-logo" />
      </div>
      <div class="info">
        <span class="name">{{ userInfo?.username || '交易账户' }}</span>
        <span class="email">{{ userInfo?.email || 'Mobile trading frontend' }}</span>
      </div>
    </div>

    <div class="menu-group">
      <div class="menu-item" @click="$router.push('/profile/credentials')">
        <van-icon name="shield-o" class="icon" />
        <span class="label">API Key 管理</span>
        <span class="value">{{ credentialCount }} 个</span>
        <van-icon name="arrow" class="arrow" />
      </div>
      <div class="menu-item" @click="$router.push('/profile/notifications')">
        <van-icon name="bell" class="icon" />
        <span class="label">消息通知</span>
        <span class="value">{{ unreadCount }} 条未读</span>
        <van-icon name="arrow" class="arrow" />
      </div>
      <div class="menu-item" @click="$router.push('/profile/server')">
        <van-icon name="cluster-o" class="icon" />
        <span class="label">服务器配置</span>
        <span class="value">已接入</span>
        <van-icon name="arrow" class="arrow" />
      </div>
    </div>

    <div class="settings-card">
      <span class="card-title">通知渠道</span>
      <p class="card-desc">这里只保留必要设置，策略消息列表请在消息中心查看。</p>
      <van-checkbox-group v-model="notificationChannels" class="channel-list">
        <van-checkbox v-for="item in channelOptions" :key="item.value" :name="item.value">
          {{ item.label }}
        </van-checkbox>
      </van-checkbox-group>
      <van-field v-model="notificationForm.email" label="邮箱" placeholder="可选，用于接收通知邮件" />
      <van-field v-model="notificationForm.telegram_chat_id" label="Telegram Chat ID" placeholder="可选" />
      <div class="actions">
        <van-button plain @click="saveNotificationSettings">保存设置</van-button>
        <van-button type="primary" plain @click="sendNotificationTest">发送测试</van-button>
      </div>
    </div>

    <div class="logout-section">
      <van-button block plain type="danger" @click="handleLogout">
        退出登录
      </van-button>
    </div>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { authApi, credentialsApi, strategyApi, userApi } from '@/api'
import { useCredentialsStore, useNotificationStore, useUserStore } from '@/stores'
import logoUrl from '@/assets/logo.png'

export default {
  name: 'Profile',

  data() {
    return {
      logoUrl,
      channelOptions: [
        { label: '浏览器', value: 'browser' },
        { label: '邮箱', value: 'email' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Discord', value: 'discord' }
      ],
      notificationChannels: ['browser'],
      notificationForm: {
        email: '',
        telegram_chat_id: ''
      }
    }
  },

  computed: {
    userStore() {
      return useUserStore()
    },
    credentialsStore() {
      return useCredentialsStore()
    },
    notificationStore() {
      return useNotificationStore()
    },
    userInfo() {
      return this.userStore.userInfo
    },
    credentialCount() {
      return this.credentialsStore.cryptoItems.length
    },
    unreadCount() {
      return this.notificationStore.unreadCount
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      try {
        const [userRes, credentialsRes, unreadRes, settingsRes] = await Promise.allSettled([
          this.userInfo ? Promise.resolve({ data: this.userInfo }) : authApi.getInfo(),
          credentialsApi.list(),
          strategyApi.getUnreadNotificationCount(),
          userApi.getNotificationSettings()
        ])
        if (userRes.status === 'fulfilled' && !this.userInfo && userRes.value?.data) {
          this.userStore.setUserInfo(userRes.value.data)
        }
        this.credentialsStore.setItems(credentialsRes.status === 'fulfilled' ? (credentialsRes.value.data || []) : [])
        this.notificationStore.setUnreadCount(unreadRes.status === 'fulfilled' ? (unreadRes.value.data || 0) : 0)
        if (settingsRes.status === 'fulfilled') {
          this.notificationChannels = settingsRes.value.data?.default_channels || ['browser']
          this.notificationForm.email = settingsRes.value.data?.email || ''
          this.notificationForm.telegram_chat_id = settingsRes.value.data?.telegram_chat_id || ''
        }
      } catch (error) {
        console.error('Load profile data failed:', error)
      }
    },

    async saveNotificationSettings() {
      try {
        await userApi.updateNotificationSettings({
          default_channels: this.notificationChannels,
          email: this.notificationForm.email,
          telegram_chat_id: this.notificationForm.telegram_chat_id
        })
        showToast({ message: '通知设置已保存', type: 'success' })
      } catch (error) {
        console.error('Save notification settings failed:', error)
      }
    },

    async sendNotificationTest() {
      try {
        await userApi.testNotificationSettings()
        showToast({ message: '测试通知已发送', type: 'success' })
      } catch (error) {
        console.error('Send notification test failed:', error)
      }
    },

    async handleLogout() {
      try {
        await showConfirmDialog({
          title: '确认退出',
          message: '确定要退出当前账号吗？'
        })
        try {
          await authApi.logout()
        } catch (error) {
          console.error('Logout request failed:', error)
        }
        this.userStore.logout()
        this.$router.replace('/login')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Logout failed:', error)
        }
      }
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 16px 16px 110px;
}

.user-card,
.menu-group,
.settings-card {
  margin-bottom: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 18px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 176, 106, 0.08);
  border: 1px solid rgba(212, 176, 106, 0.2);
}

.avatar-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.email {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.menu-item:last-child {
  border-bottom: none;
}

.icon {
  font-size: 20px;
  color: var(--primary-color);
}

.label {
  flex: 1;
  color: #fff;
  font-size: 15px;
}

.value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.arrow {
  color: rgba(255, 255, 255, 0.32);
}

.settings-card {
  padding: 18px 16px;
}

.card-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.card-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.48);
}

.channel-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 8px;
  margin: 16px 0;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.logout-section {
  margin-top: 28px;
}

.logout-section :deep(.van-button),
.actions :deep(.van-button) {
  border-radius: 12px;
}
</style>
