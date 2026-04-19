<template>
  <div class="page">
    <van-nav-bar :title="$t('market.my_purchases')" left-arrow @click-left="$router.back()" />

    <div v-if="items.length" class="list">
      <div v-for="item in items" :key="item.purchase_id" class="card">
        <div class="row">
          <span class="title">{{ item.indicator?.name || '-' }}</span>
          <span class="price">{{ Number(item.purchase_price || 0) > 0 ? `${item.purchase_price}` : $t('market.price_free') }}</span>
        </div>
        <p class="desc">{{ item.indicator?.description || '-' }}</p>
        <div class="meta">{{ formatTime(item.purchase_time) }}</div>
        <div class="actions">
          <van-button size="small" plain @click="goDetail(item)">{{ $t('common.view_detail') }}</van-button>
          <van-button size="small" type="primary" @click="goCreate(item)">{{ $t('market.detail_use') }}</van-button>
        </div>
      </div>
    </div>
    <van-empty v-else :description="$t('market.my_purchases_empty')" />
  </div>
</template>

<script>
import { marketApi } from '@/api'

export default {
  name: 'MyPurchases',
  data() {
    return { items: [] }
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
      this.$router.push({
        path: '/trading/create/indicator',
        query: {
          source_indicator_id: item.indicator.id,
          name: item.indicator.name
        }
      })
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
.card { padding: 16px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border); }
.row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.title { color: var(--text); font-weight: 700; font-size: 15px; }
.price { color: var(--accent); font-size: 13px; font-weight: 700; }
.desc { color: var(--text-2); font-size: 12px; line-height: 1.6; }
.meta { margin-top: 8px; font-size: 11px; color: var(--text-3); }
.actions { margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; }
</style>
