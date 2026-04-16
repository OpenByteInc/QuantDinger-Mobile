<template>
  <div class="server-page">
    <van-nav-bar
      title="服务器配置"
      left-arrow
      @click-left="$router.back()"
      :border="false"
    />
    
    <div class="content">
      <van-cell-group inset>
        <van-field
          v-model="serverUrl"
          label="服务器地址"
          :placeholder="defaultServerUrl"
          clearable
        />
      </van-cell-group>
      
      <div class="hint">
        <p>• 官方后端默认地址：{{ defaultServerUrl }}</p>
        <p>• 如需切换测试环境，可改成你自己的 API 地址</p>
        <p>• 保存后登录、行情和策略请求都会走这里</p>
      </div>
      
      <div class="actions">
        <van-button type="primary" block :loading="testing" @click="testConnection">
          测试连接
        </van-button>
        <van-button type="default" block @click="saveConfig">
          保存配置
        </van-button>
      </div>
      
      <!-- 连接状态 -->
      <div v-if="connectionStatus" :class="['status-card', connectionStatus.success ? 'success' : 'error']">
        <van-icon :name="connectionStatus.success ? 'passed' : 'cross'" />
        <span>{{ connectionStatus.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { useSettingsStore } from '@/stores'
import axios from 'axios'
import { DEFAULT_SERVER_URL } from '@/config'

export default {
  name: 'ServerConfig',
  
  data() {
    return {
      serverUrl: DEFAULT_SERVER_URL,
      defaultServerUrl: DEFAULT_SERVER_URL,
      testing: false,
      connectionStatus: null
    }
  },
  
  computed: {
    settingsStore() {
      return useSettingsStore()
    }
  },
  
  mounted() {
    this.serverUrl = this.settingsStore.serverUrl || DEFAULT_SERVER_URL
  },
  
  methods: {
    async testConnection() {
      if (!this.serverUrl.trim()) {
        showToast({ message: '请输入服务器地址', type: 'fail' })
        return
      }
      
      this.testing = true
      this.connectionStatus = null
      
      try {
        const url = this.serverUrl.trim().replace(/\/$/, '')
        const res = await axios.get(`${url}/api/health`, { timeout: 5000 })
        
        if (res.data) {
          this.connectionStatus = {
            success: true,
            message: '连接成功！服务器运行正常'
          }
        }
      } catch (err) {
        this.connectionStatus = {
          success: false,
          message: `连接失败：${err.message}`
        }
      } finally {
        this.testing = false
      }
    },
    
    saveConfig() {
      this.settingsStore.setServerUrl(this.serverUrl.trim())
      showToast({ message: '配置已保存', type: 'success' })
    }
  }
}
</script>

<style scoped>
.server-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
}

.server-page :deep(.van-nav-bar) {
  background: transparent;
}

.server-page :deep(.van-nav-bar__title),
.server-page :deep(.van-nav-bar__arrow) {
  color: #fff;
}

.content {
  padding: 16px;
}

.server-page :deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.server-page :deep(.van-cell) {
  background: transparent;
}

.server-page :deep(.van-field__label) {
  color: rgba(255, 255, 255, 0.8);
}

.server-page :deep(.van-field__control) {
  color: #fff;
}

.server-page :deep(.van-field__control::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

.hint {
  margin: 16px 0 24px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
}

.hint p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.8;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions :deep(.van-button) {
  height: 48px;
  border-radius: 12px;
}

.actions :deep(.van-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.actions :deep(.van-button--default) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 14px;
  border-radius: 12px;
}

.status-card.success {
  background: rgba(81, 207, 102, 0.1);
  color: #51cf66;
}

.status-card.error {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

.status-card .van-icon {
  font-size: 20px;
}

.status-card span {
  font-size: 14px;
}
</style>
