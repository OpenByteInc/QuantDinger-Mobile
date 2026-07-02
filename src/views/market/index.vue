<template>
  <div class="market-page">
    <van-nav-bar :title="$t('market.title')" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="bag-o" size="20" @click="$router.push('/market/my-purchases')" />
      </template>
    </van-nav-bar>

    <div class="hero">
      <div class="hero-title">{{ assetTitle }}</div>
      <p class="hero-desc">{{ assetDesc }}</p>
    </div>

    <div class="toolbar">
      <div class="asset-tabs">
        <div
          v-for="opt in assetOptions"
          :key="opt.value"
          :class="['asset-tab', { active: assetType === opt.value }]"
          @click="setAssetType(opt.value)"
        >
          <van-icon :name="opt.icon" />
          <span>{{ opt.label }}</span>
        </div>
      </div>
      <van-search
        v-model="keyword"
        shape="round"
        :placeholder="$t('market.search_placeholder')"
        @search="reload"
      />
      <div class="filter-row">
        <div class="segment">
          <div
            v-for="opt in filterOptions"
            :key="opt.value"
            :class="['seg-item', { active: pricing === opt.value }]"
            @click="setPricing(opt.value)"
          >{{ opt.label }}</div>
        </div>
        <van-cell :value="sortLabel" is-link class="sort-cell" @click="showSortPicker = true">
          <template #title>
            <van-icon name="exchange" />
          </template>
        </van-cell>
      </div>
    </div>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text=""
      @load="loadMore"
    >
      <div class="grid">
        <div v-for="item in items" :key="item.id" class="ind-card" @click="openDetail(item)">
          <div class="ind-cover" :style="coverStyle(item)">
            <div class="cover-overlay"></div>
            <div class="cover-top">
              <span class="cover-badge">
                <van-icon :name="item.pricing_type === 'paid' ? 'gold-coin-o' : 'gift-o'" />
                {{ item.pricing_type === 'paid' ? $t('market.filter_paid') : $t('market.filter_free') }}
              </span>
              <span v-if="isVipFree(item)" class="cover-badge vip-free">
                <van-icon name="gem-o" />
                {{ $t('market.vip_free') }}
              </span>
              <span class="cover-score">{{ $t('market.score_short') }} {{ formatScore(item.score) }}</span>
            </div>
            <div class="cover-bottom">
              <span class="cover-initials">{{ initialsOf(item.name) }}</span>
              <span class="cover-return" :class="valueTone(item.total_return)">
                {{ $t('market.total_return_short') }} {{ formatPercent(item.total_return, true) }}
              </span>
            </div>
          </div>
          <div class="ind-body">
            <div class="ind-heading">
              <div class="ind-title">{{ item.name }}</div>
              <div class="pill-stack">
                <span v-if="isVipFree(item)" class="vip-free-pill">{{ $t('market.vip_free') }}</span>
                <span class="asset-pill">{{ typeLabel(item) }}</span>
              </div>
            </div>
            <p class="ind-desc">{{ shortDesc(item.description) }}</p>
            <div class="metric-grid">
              <div v-for="metric in cardMetrics(item)" :key="metric.key" class="metric-cell">
                <span class="metric-label">{{ metric.label }}</span>
                <span :class="['metric-value', metric.tone]">{{ metric.value }}</span>
              </div>
            </div>
            <div v-if="applicableTags(item).length" class="tag-row">
              <span v-for="tag in applicableTags(item)" :key="tag" class="mini-tag">{{ tag }}</span>
            </div>
            <div class="ind-stats">
              <span class="stat">
                <van-icon name="star" /> {{ Number(item.avg_rating || 0).toFixed(1) }}
              </span>
              <span class="stat">
                <van-icon name="cart-o" /> {{ item.purchase_count || 0 }}
              </span>
              <span :class="['price', item.pricing_type === 'paid' ? 'paid' : 'free']">
                {{ item.pricing_type === 'paid' ? $t('market.price_credits', { price: item.price }) : $t('market.price_free') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </van-list>

    <van-empty v-if="!loading && !items.length" :description="$t('common.empty')" />

    <van-popup v-model:show="showSortPicker" position="bottom" round>
      <van-picker
        :columns="sortColumns"
        @cancel="showSortPicker = false"
        @confirm="onSortSelect"
      />
    </van-popup>
  </div>
</template>

<script>
import { marketApi } from '@/api'
import { ASSET_TYPES, getAssetLabel, normalizeAssetType } from '@/utils/marketRoutes'

export default {
  name: 'Market',
  data() {
    return {
      items: [],
      keyword: '',
      pricing: '',
      assetType: ASSET_TYPES.INDICATOR,
      sort: 'score',
      page: 1,
      pageSize: 12,
      total: 0,
      loading: false,
      finished: false,
      showSortPicker: false
    }
  },
  computed: {
    assetOptions() {
      return [
        { value: ASSET_TYPES.INDICATOR, label: this.$t('market.asset_indicator'), icon: 'bar-chart-o' },
        { value: ASSET_TYPES.SCRIPT_TEMPLATE, label: this.$t('market.asset_script_template'), icon: 'description' },
        { value: ASSET_TYPES.BOT_PRESET, label: this.$t('market.asset_bot_preset'), icon: 'apps-o' }
      ]
    },
    assetTitle() {
      return getAssetLabel(this.assetType, this.$t)
    },
    assetDesc() {
      const map = {
        [ASSET_TYPES.INDICATOR]: this.$t('market.asset_indicator_desc'),
        [ASSET_TYPES.SCRIPT_TEMPLATE]: this.$t('market.asset_script_template_desc'),
        [ASSET_TYPES.BOT_PRESET]: this.$t('market.asset_bot_preset_desc')
      }
      return map[this.assetType] || this.$t('market.subtitle')
    },
    filterOptions() {
      return [
        { value: '', label: this.$t('market.filter_all') },
        { value: 'free', label: this.$t('market.filter_free') },
        { value: 'paid', label: this.$t('market.filter_paid') },
        { value: 'vip_free', label: this.$t('market.filter_vip_free') }
      ]
    },
    sortColumns() {
      return [
        { value: 'score', text: this.$t('market.sort_score') },
        { value: 'newest', text: this.$t('market.sort_newest') },
        { value: 'hot', text: this.$t('market.sort_hot') },
        { value: 'rating', text: this.$t('market.sort_rating') },
        { value: 'price_asc', text: this.$t('market.sort_price_asc') },
        { value: 'price_desc', text: this.$t('market.sort_price_desc') }
      ]
    },
    sortLabel() {
      const it = this.sortColumns.find((s) => s.value === this.sort)
      return it ? it.text : ''
    }
  },
  mounted() {
    if (this.$route.query?.asset_type) {
      this.assetType = normalizeAssetType(this.$route.query.asset_type)
    }
    this.reload()
  },
  methods: {
    async reload() {
      this.page = 1
      this.finished = false
      this.items = []
      await this.loadMore()
    },
    async loadMore() {
      if (this.loading || this.finished) return
      this.loading = true
      try {
        const res = await marketApi.getIndicators({
          page: this.page,
          page_size: this.pageSize,
          keyword: this.keyword || undefined,
          pricing_type: this.pricing === 'vip_free' ? undefined : (this.pricing || undefined),
          vip_free: this.pricing === 'vip_free' ? 1 : undefined,
          asset_type: this.assetType,
          sort_by: this.sort
        })
        const list = res.data?.items || []
        this.items = this.page === 1 ? list : this.items.concat(list)
        this.total = res.data?.total || this.items.length
        if (this.items.length >= this.total || list.length === 0) {
          this.finished = true
        } else {
          this.page += 1
        }
      } catch (err) {
        this.finished = true
      } finally {
        this.loading = false
      }
    },
    setPricing(val) {
      if (this.pricing === val) return
      this.pricing = val
      this.reload()
    },
    setAssetType(val) {
      const next = normalizeAssetType(val)
      if (this.assetType === next) return
      this.assetType = next
      this.$router.replace({ path: '/market', query: { ...this.$route.query, asset_type: next } })
      this.reload()
    },
    onSortSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.sort = selected.value
      this.showSortPicker = false
      this.reload()
    },
    openDetail(item) {
      this.$router.push(`/market/indicator/${item.id}`)
    },
    shortDesc(text) {
      if (!text) return ''
      return text.length > 80 ? `${text.slice(0, 80)}...` : text
    },
    asNumber(value) {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    },
    formatScore(value) {
      return this.asNumber(value).toFixed(0)
    },
    formatPercent(value, signed = false) {
      const num = this.asNumber(value)
      const sign = signed && num > 0 ? '+' : ''
      return `${sign}${num.toFixed(Math.abs(num) >= 100 ? 0 : 1)}%`
    },
    formatDrawdown(value) {
      const num = this.asNumber(value)
      if (num === 0) return '0.0%'
      return `${num > 0 ? '-' : ''}${Math.abs(num).toFixed(1)}%`
    },
    formatRatio(value) {
      const num = this.asNumber(value)
      return num ? num.toFixed(2) : '-'
    },
    valueTone(value) {
      const num = this.asNumber(value)
      if (num > 0) return 'up'
      if (num < 0) return 'down'
      return ''
    },
    cardMetrics(item) {
      return [
        {
          key: 'win',
          label: this.$t('market.perf_win_rate'),
          value: this.formatPercent(item.win_rate_backtest),
          tone: this.asNumber(item.win_rate_backtest) >= 50 ? 'up' : ''
        },
        {
          key: 'drawdown',
          label: this.$t('market.max_drawdown_short'),
          value: this.formatDrawdown(item.max_drawdown),
          tone: 'risk'
        },
        {
          key: 'annual',
          label: this.$t('market.annual_return_short'),
          value: this.formatPercent(item.annual_return, true),
          tone: this.valueTone(item.annual_return)
        },
        {
          key: 'sample',
          label: this.$t('market.sample_size_short'),
          value: this.asNumber(item.sample_size).toFixed(0),
          tone: ''
        }
      ]
    },
    applicableTags(item) {
      const symbols = Array.isArray(item.applicable_symbols) ? item.applicable_symbols : []
      const timeframes = Array.isArray(item.applicable_timeframes) ? item.applicable_timeframes : []
      return symbols.concat(timeframes).filter(Boolean).slice(0, 4)
    },
    initialsOf(name) {
      if (!name) return 'IN'
      const str = String(name).trim().toUpperCase()
      const parts = str.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return parts[0].slice(0, 1) + parts[1].slice(0, 1)
      const ascii = str.replace(/[^A-Z0-9]/g, '')
      if (ascii) return ascii.slice(0, 2)
      return str.slice(0, 2)
    },
    typeLabel(item) {
      return getAssetLabel(item.asset_type, this.$t)
    },
    isVipFree(item) {
      return !!item?.vip_free
    },
    coverStyle(item) {
      const palettes = [
        ['#667eea', '#764ba2'],
        ['#4facfe', '#00f2fe'],
        ['#f7971e', '#ffd200'],
        ['#ff6a00', '#ee0979'],
        ['#11998e', '#38ef7d'],
        ['#fc466b', '#3f5efb'],
        ['#7c5cff', '#22d3ee'],
        ['#42275a', '#734b6d'],
        ['#08AEEA', '#2AF598']
      ]
      const key = String(item.id || item.name || '')
      let hash = 0
      for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
      const palette = palettes[Math.abs(hash) % palettes.length]
      return {
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`
      }
    }
  }
}
</script>

<style scoped>
.market-page { min-height: 100vh; padding-bottom: 60px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.hero {
  margin: 8px 16px 16px;
  padding: 16px 20px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(260px 180px at 100% 0%, var(--c-amber-soft), transparent 62%);
}
.hero > * { position: relative; }
.hero-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.02em; }
.hero-desc { font-size: 12px; color: var(--text-2); }
.toolbar { padding: 0 8px; }
.asset-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 8px 8px;
}
.asset-tab {
  min-height: 58px;
  padding: 9px 6px;
  border-radius: 16px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.asset-tab .van-icon {
  font-size: 18px;
}
.asset-tab.active {
  color: #eaf7ff;
  background:
    radial-gradient(circle at 22% 18%, rgba(56, 189, 248, 0.26), transparent 42%),
    linear-gradient(135deg, rgba(37, 99, 235, 0.34), rgba(20, 184, 166, 0.18)),
    var(--surface-raised);
  border-color: rgba(56, 189, 248, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 24px rgba(14, 165, 233, 0.18);
}
:deep(.van-search) { background: transparent; padding: 8px; }
:deep(.van-search__content) { background: var(--surface-raised); }
:deep(.van-field__control) { color: var(--text); }
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  overflow: hidden;
}
.segment {
  min-width: 0;
  flex: 1;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 2px;
  scrollbar-width: none;
}
.segment::-webkit-scrollbar {
  display: none;
}
.seg-item {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.seg-item.active {
  background: var(--accent);
  color: var(--text-on-accent);
  border-color: var(--accent);
}
.sort-cell {
  height: 30px;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: auto;
  max-width: 118px;
  padding: 0 8px 0 10px;
  border-radius: 999px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12px;
}
:deep(.sort-cell .van-cell__title) {
  flex: none;
  padding-right: 4px;
}
:deep(.sort-cell .van-cell__value) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.grid {
  padding: 6px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ind-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}
.ind-cover {
  position: relative;
  height: 104px;
  padding: 14px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 10%, rgba(255,255,255,0.2), transparent 55%),
    radial-gradient(circle at 10% 90%, rgba(0,0,0,0.35), transparent 60%);
}
.cover-top,
.cover-bottom {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.cover-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.cover-badge.vip-free {
  margin-right: auto;
  color: #1f1300;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}
.cover-score {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(6, 14, 24, 0.42);
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  font-weight: 800;
  backdrop-filter: blur(10px);
}
.cover-initials {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.cover-return {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.34);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 800;
}
.cover-return.up { color: #34d399; }
.cover-return.down { color: #fb7185; }
.ind-body { padding: 14px 16px 16px; }
.ind-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.ind-title {
  color: var(--text);
  font-weight: 700;
  font-size: 15px;
  line-height: 1.35;
  min-width: 0;
}
.asset-pill {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.18);
  font-size: 10px;
  font-weight: 700;
}
.pill-stack {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.vip-free-pill {
  padding: 3px 8px;
  border-radius: 999px;
  color: #1f1300;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  border: 1px solid rgba(245, 158, 11, 0.36);
  font-size: 10px;
  font-weight: 900;
}
.ind-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
  min-height: 36px;
}
.metric-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.metric-cell {
  padding: 8px 6px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--hairline);
  min-width: 0;
}
.metric-label {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-value {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}
.metric-value.up { color: var(--up); }
.metric-value.down { color: var(--down); }
.metric-value.risk { color: var(--c-amber); }
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.mini-tag {
  max-width: 96px;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--text-2);
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid var(--hairline);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ind-stats {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-3);
}
.stat {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.price { font-weight: 700; }
.price.paid { color: var(--c-amber); }
.price.free { color: var(--up); }
</style>
