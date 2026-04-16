<template>
  <div class="credentials-page">
    <van-nav-bar
      title="API Key 管理"
      left-arrow
      :border="false"
      @click-left="$router.back()"
    >
      <template #right>
        <span class="nav-link" @click="$router.push('/profile/credentials/new')">新增</span>
      </template>
    </van-nav-bar>

    <div class="egress-card">
      <span class="card-title">交易所白名单 IP</span>
      <p class="card-desc">部分交易所需要将后端出口 IP 加入白名单，否则余额查询和下单会失败。</p>
      <div class="ip-box">{{ egressIpText }}</div>
    </div>

    <div class="list-card">
      <div v-for="item in credentials" :key="item.id" class="cred-row">
        <div>
          <span class="row-title">{{ item.name }}</span>
          <p class="row-subtitle">{{ formatExchange(item.exchange_id) }} · {{ item.api_key_hint || '已加密保存' }}</p>
        </div>
        <van-button size="mini" plain type="danger" @click="removeCredential(item)">
          删除
        </van-button>
      </div>
      <van-empty v-if="!credentials.length && !loading" description="还没有保存任何 API Key" />
    </div>

    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { credentialsApi } from '@/api'
import { useCredentialsStore } from '@/stores'

export default {
  name: 'CredentialList',

  data() {
    return {
      loading: false
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
      if (!data) return '暂未获取'
      const parts = [data.ipv4 && `IPv4: ${data.ipv4}`, data.ipv6 && `IPv6: ${data.ipv6}`].filter(Boolean)
      return parts.join(' / ') || data.ip || data.address || '暂未获取'
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
      return String(value || '').toUpperCase() || '未知交易所'
    },

    async removeCredential(item) {
      try {
        await showConfirmDialog({
          title: '确认删除',
          message: `删除 ${item.name} 后需要重新填写 API Key，确定继续吗？`
        })
        await credentialsApi.delete(item.id)
        showToast({ message: '已删除', type: 'success' })
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
  padding-bottom: 24px;
}

.credentials-page :deep(.van-nav-bar) {
  background: transparent;
}

.credentials-page :deep(.van-nav-bar__title),
.credentials-page :deep(.van-nav-bar__arrow) {
  color: #fff;
}

.nav-link {
  color: var(--primary-color);
  font-size: 14px;
}

.egress-card,
.list-card {
  margin: 16px;
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.card-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.card-desc,
.row-subtitle {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.46);
}

.ip-box {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(212, 176, 106, 0.08);
  color: var(--primary-light);
  word-break: break-all;
}

.cred-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.cred-row:last-child {
  border-bottom: none;
}

.row-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
}
</style>
