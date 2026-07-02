<template>
  <div class="page">
    <van-nav-bar :title="$t('market.my_purchases')" left-arrow @click-left="$router.back()" />

    <div class="library-tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.value || 'all'"
        type="button"
        :class="['library-tab', { active: typeFilter === tab.value }]"
        @click="setTypeFilter(tab.value)"
      >
        <van-icon :name="tab.icon" />
        <span>{{ tab.label }}</span>
        <small>{{ tab.count }}</small>
      </button>
    </div>

    <div v-if="visibleItems.length" class="list">
      <div v-for="item in visibleItems" :key="item.purchase_id" class="card">
        <div class="row">
          <span class="title">{{ item.indicator?.name || '-' }}</span>
          <div class="pill-stack">
            <span v-if="isVipFree(item)" class="vip-free">{{ $t('market.vip_free') }}</span>
            <span class="asset">{{ assetLabel(item) }}</span>
          </div>
        </div>
        <p class="desc">{{ item.indicator?.description || '-' }}</p>
        <div class="meta">
          <span>{{ formatTime(item.purchase_time) }}</span>
          <span class="price">{{ Number(item.purchase_price || 0) > 0 ? `${item.purchase_price}` : $t('market.price_free') }}</span>
        </div>
        <div class="actions">
          <van-button size="small" plain @click="goDetail(item)">{{ $t('common.view_detail') }}</van-button>
          <van-button
            size="small"
            plain
            :loading="!!syncingIds[item.purchase_id]"
            @click="syncCode(item)"
          >{{ $t('market.sync_code') }}</van-button>
          <van-button size="small" type="primary" @click="goCreate(item)">{{ useLabel(item) }}</van-button>
        </div>
      </div>
    </div>
    <van-empty v-else :description="emptyText">
      <van-button round type="primary" @click="goMarket">{{ $t('trading.create_market_cta') }}</van-button>
    </van-empty>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { marketApi } from '@/api'
import {
  ASSET_TYPES,
  buildCreateRouteFromMarketAsset,
  getAssetLabel,
  getAssetType,
  getUseLabel
} from '@/utils/marketRoutes'

export default {
  name: 'MyPurchases',
  data() {
    return {
      items: [],
      syncingIds: {}
    }
  },
  computed: {
    typeFilter() {
      const type = this.$route.query?.asset_type
      return type ? getAssetType({ asset_type: type }) : ''
    },
    visibleItems() {
      if (!this.typeFilter) return this.items
      return this.items.filter((item) => getAssetType(item) === this.typeFilter)
    },
    typeTabs() {
      const countByType = (type) => (
        type ? this.items.filter((item) => getAssetType(item) === type).length : this.items.length
      )
      return [
        { value: '', label: this.$t('common.all'), icon: 'apps-o', count: countByType('') },
        {
          value: ASSET_TYPES.INDICATOR,
          label: this.$t('market.asset_indicator'),
          icon: 'bar-chart-o',
          count: countByType(ASSET_TYPES.INDICATOR)
        },
        {
          value: ASSET_TYPES.SCRIPT_TEMPLATE,
          label: this.$t('market.asset_script_template'),
          icon: 'description',
          count: countByType(ASSET_TYPES.SCRIPT_TEMPLATE)
        },
        {
          value: ASSET_TYPES.BOT_PRESET,
          label: this.$t('market.asset_bot_preset'),
          icon: 'cluster-o',
          count: countByType(ASSET_TYPES.BOT_PRESET)
        }
      ]
    },
    emptyText() {
      if (!this.typeFilter) return this.$t('market.my_purchases_empty')
      return this.$t('market.my_purchases_empty_type', {
        type: this.assetLabelByType(this.typeFilter)
      })
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const res = await marketApi.getMyPurchases({ page: 1, page_size: 50 })
        this.items = res.data?.items || []
      } catch {
        this.items = []
      }
    },
    setTypeFilter(type) {
      if (this.typeFilter === type) return
      const query = type ? { asset_type: type } : {}
      this.$router.replace({ path: '/market/my-purchases', query })
    },
    goDetail(item) {
      if (!item.indicator?.id) return
      this.$router.push(`/market/indicator/${item.indicator.id}`)
    },
    goCreate(item) {
      if (!item.indicator?.id) return
      this.$router.push(buildCreateRouteFromMarketAsset(item, item.indicator.id))
    },
    async syncCode(item) {
      const id = item.indicator?.id
      if (!id) return
      try {
        await showConfirmDialog({
          title: this.$t('market.sync_code_confirm_title'),
          message: this.$t('market.sync_code_confirm_desc')
        })
      } catch {
        return
      }
      this.syncingIds = { ...this.syncingIds, [item.purchase_id]: true }
      try {
        const res = await marketApi.syncIndicator(id)
        const msg = this.syncMessage(res?.msg)
        showToast({ message: msg, type: 'success' })
        await this.load()
      } catch {
        showToast({ message: this.$t('market.sync_fail'), type: 'fail' })
      } finally {
        const next = { ...this.syncingIds }
        delete next[item.purchase_id]
        this.syncingIds = next
      }
    },
    goMarket() {
      if (this.typeFilter) {
        this.$router.push({ path: '/market', query: { asset_type: this.typeFilter } })
        return
      }
      this.$router.push('/market')
    },
    assetLabel(item) {
      return getAssetLabel(getAssetType(item), this.$t)
    },
    assetLabelByType(type) {
      return getAssetLabel(type, this.$t)
    },
    useLabel(item) {
      return getUseLabel(getAssetType(item), this.$t)
    },
    isVipFree(item) {
      return !!item?.indicator?.vip_free
    },
    syncMessage(code) {
      const map = {
        success: 'market.sync_success',
        restored: 'market.sync_restored',
        already_latest: 'market.sync_already_latest'
      }
      return this.$t(map[code] || 'market.sync_success')
    },
    formatTime(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString()
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 60px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.list { padding: 8px 16px; display: flex; flex-direction: column; gap: 12px; }
.library-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 16px 6px;
  scrollbar-width: none;
}
.library-tabs::-webkit-scrollbar {
  display: none;
}
.library-tab {
  flex: 0 0 auto;
  min-width: 92px;
  height: 38px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
}
.library-tab .van-icon {
  font-size: 15px;
}
.library-tab small {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
}
.library-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}
.library-tab.active small {
  background: rgba(0, 0, 0, 0.14);
  color: var(--text-on-accent);
}
.card { padding: 16px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border); }
.row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.title { color: var(--text); font-weight: 700; font-size: 15px; }
.pill-stack {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.asset {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--accent);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
}
.vip-free {
  padding: 3px 8px;
  border-radius: 999px;
  color: #1f1300;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  border: 1px solid rgba(245, 158, 11, 0.36);
  font-size: 10px;
  font-weight: 900;
}
.price { color: var(--accent); font-size: 13px; font-weight: 700; }
.desc { color: var(--text-2); font-size: 12px; line-height: 1.6; }
.meta { margin-top: 8px; font-size: 11px; color: var(--text-3); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.actions :deep(.van-button) {
  flex: 1 1 86px;
  min-width: 0;
}
</style>
