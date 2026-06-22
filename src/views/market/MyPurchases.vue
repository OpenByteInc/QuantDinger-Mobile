<template>
  <div class="page">
    <van-nav-bar :title="$t('market.my_purchases')" left-arrow @click-left="$router.back()" />

    <div v-if="typeFilter" class="filter-card">
      <span>{{ assetLabelByType(typeFilter) }}</span>
      <van-button size="mini" plain @click="$router.replace('/market/my-purchases')">
        {{ $t('common.all') }}
      </van-button>
    </div>

    <div v-if="visibleItems.length" class="list">
      <div v-for="item in visibleItems" :key="item.purchase_id" class="card">
        <div class="row">
          <span class="title">{{ item.indicator?.name || '-' }}</span>
          <span class="asset">{{ assetLabel(item) }}</span>
        </div>
        <p class="desc">{{ item.indicator?.description || '-' }}</p>
        <div class="meta">
          <span>{{ formatTime(item.purchase_time) }}</span>
          <span class="price">{{ Number(item.purchase_price || 0) > 0 ? `${item.purchase_price}` : $t('market.price_free') }}</span>
        </div>
        <div class="actions">
          <van-button size="small" plain @click="goDetail(item)">{{ $t('common.view_detail') }}</van-button>
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
import { marketApi } from '@/api'
import {
  buildCreateRouteFromMarketAsset,
  getAssetLabel,
  getAssetType,
  getUseLabel
} from '@/utils/marketRoutes'

export default {
  name: 'MyPurchases',
  data() {
    return { items: [] }
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
    goDetail(item) {
      if (!item.indicator?.id) return
      this.$router.push(`/market/indicator/${item.indicator.id}`)
    },
    goCreate(item) {
      if (!item.indicator?.id) return
      this.$router.push(buildCreateRouteFromMarketAsset(item, item.indicator.id))
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
.filter-card {
  margin: 10px 16px 4px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.filter-card span {
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
}
.card { padding: 16px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border); }
.row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.title { color: var(--text); font-weight: 700; font-size: 15px; }
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
.price { color: var(--accent); font-size: 13px; font-weight: 700; }
.desc { color: var(--text-2); font-size: 12px; line-height: 1.6; }
.meta { margin-top: 8px; font-size: 11px; color: var(--text-3); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.actions { margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; }
</style>
