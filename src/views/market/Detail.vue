<template>
  <div class="detail-page">
    <van-nav-bar :title="indicator?.name || $t('market.title')" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else-if="indicator">
      <div class="hero">
        <div class="hero-title">{{ indicator.name }}</div>
        <div class="hero-meta">
          <van-tag :type="indicator.pricing_type === 'paid' ? 'warning' : 'success'" plain>
            {{ indicator.pricing_type === 'paid' ? $t('market.filter_paid') : $t('market.filter_free') }}
          </van-tag>
          <span class="meta">
            <van-icon name="star" /> {{ Number(indicator.avg_rating || 0).toFixed(1) }}
          </span>
          <span class="meta">
            <van-icon name="cart-o" /> {{ indicator.purchase_count || 0 }}
          </span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">{{ $t('market.detail_about') }}</div>
        <p class="desc">{{ indicator.description || '-' }}</p>
      </div>

      <div v-if="performance" class="card">
        <div class="card-title">{{ $t('market.detail_performance') }}</div>
        <div class="perf-grid">
          <div class="perf-item">
            <span class="label">{{ $t('market.perf_strategy_count') }}</span>
            <span class="value">{{ performance.strategy_count || 0 }}</span>
          </div>
          <div class="perf-item">
            <span class="label">{{ $t('market.perf_trade_count') }}</span>
            <span class="value">{{ performance.trade_count || 0 }}</span>
          </div>
          <div class="perf-item">
            <span class="label">{{ $t('market.perf_win_rate') }}</span>
            <span :class="['value', Number(performance.win_rate || 0) >= 50 ? 'up' : 'down']">
              {{ Number(performance.win_rate || 0).toFixed(2) }}%
            </span>
          </div>
          <div class="perf-item">
            <span class="label">{{ $t('market.perf_total_profit') }}</span>
            <span :class="['value', Number(performance.total_profit || 0) >= 0 ? 'up' : 'down']">
              {{ Number(performance.total_profit || 0) >= 0 ? '+' : '' }}{{ Number(performance.total_profit || 0).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          {{ $t('market.detail_reviews') }}
          <span class="reviews-total">({{ comments.total || 0 }})</span>
        </div>
        <van-loading v-if="commentsLoading && !comments.items.length" size="18" class="comments-loading" />
        <div v-else-if="!comments.items.length" class="comments-empty">
          {{ $t('market.reviews_empty') }}
        </div>
        <template v-else>
          <div v-for="c in comments.items" :key="c.id" class="comment">
            <div class="comment-head">
              <span class="author">{{ c.nickname || c.username || c.user_id || '--' }}</span>
              <van-rate :model-value="Number(c.rating || 0)" readonly size="12" />
            </div>
            <p class="content">{{ c.content }}</p>
            <span v-if="c.created_at" class="comment-time">{{ formatDate(c.created_at) }}</span>
          </div>
          <div v-if="comments.items.length < (comments.total || 0)" class="comments-more">
            <van-button plain size="small" :loading="commentsLoading" @click="loadMoreComments">
              {{ $t('market.reviews_more') }}
            </van-button>
          </div>
        </template>
      </div>
    </template>

    <div class="footer-bar" v-if="indicator">
      <div class="price-line">
        <span class="price-label">{{ $t('ai_analysis.current_price') === '当前价' ? '价格' : 'Price' }}</span>
        <span class="price-value">
          {{ indicator.pricing_type === 'paid' ? $t('market.price_credits', { price: indicator.price }) : $t('market.price_free') }}
        </span>
      </div>
      <van-button
        v-if="!isPurchased"
        type="primary"
        round
        block
        :loading="purchasing"
        @click="handlePurchase"
      >{{ $t('market.detail_purchase') }}</van-button>
      <van-button
        v-else
        type="primary"
        round
        block
        @click="goCreateStrategy"
      >{{ $t('market.detail_use') }}</van-button>
    </div>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { marketApi } from '@/api'

export default {
  name: 'MarketDetail',
  data() {
    return {
      loading: false,
      purchasing: false,
      indicator: null,
      comments: { items: [], total: 0, page: 1, page_size: 10 },
      commentsLoading: false,
      performance: null
    }
  },
  computed: {
    indicatorId() {
      return Number(this.$route.params.id)
    },
    isPurchased() {
      return !!(this.indicator?.is_purchased || this.indicator?.owned)
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const [detail, perf] = await Promise.allSettled([
          marketApi.getIndicator(this.indicatorId),
          marketApi.getIndicatorPerformance(this.indicatorId)
        ])
        this.indicator = detail.status === 'fulfilled' ? detail.value.data : null
        this.performance = perf.status === 'fulfilled' ? perf.value.data : null
      } finally {
        this.loading = false
      }
      this.loadComments(1)
    },
    async loadComments(page = 1) {
      this.commentsLoading = true
      try {
        const res = await marketApi.getComments(this.indicatorId, {
          page,
          page_size: this.comments.page_size
        })
        const items = Array.isArray(res?.data?.items) ? res.data.items : []
        const total = Number(res?.data?.total || 0)
        if (page === 1) {
          this.comments = { ...this.comments, items, total, page }
        } else {
          this.comments = {
            ...this.comments,
            items: [...this.comments.items, ...items],
            total,
            page
          }
        }
      } catch {
        if (page === 1) this.comments = { ...this.comments, items: [], total: 0, page: 1 }
      } finally {
        this.commentsLoading = false
      }
    },
    loadMoreComments() {
      if (this.commentsLoading) return
      if (this.comments.items.length >= (this.comments.total || 0)) return
      this.loadComments((this.comments.page || 1) + 1)
    },
    formatDate(val) {
      if (!val) return ''
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    },
    async handlePurchase() {
      if (!this.indicator) return
      try {
        await showConfirmDialog({
          title: this.$t('market.purchase_confirm_title'),
          message: this.$t('market.purchase_confirm_desc', { price: this.indicator.price })
        })
      } catch {
        return
      }
      this.purchasing = true
      try {
        await marketApi.purchase(this.indicatorId)
        showToast({ message: this.$t('market.purchase_success'), type: 'success' })
        await this.load()
      } catch (err) {
        const msg = err?.response?.data?.msg || err?.message
        if (String(msg).toLowerCase().includes('credit')) {
          showToast({ message: this.$t('market.insufficient_credits'), type: 'fail' })
        }
      } finally {
        this.purchasing = false
      }
    },
    goCreateStrategy() {
      const localId =
        this.indicator.local_copy_id ||
        this.indicator.local_indicator_id ||
        this.indicator.buyer_indicator_id
      this.$router.push({
        path: '/trading/create/indicator',
        query: {
          indicator_id: localId || '',
          source_indicator_id: this.indicatorId,
          name: this.indicator.name
        }
      })
    }
  }
}
</script>

<style scoped>
.detail-page { min-height: 100vh; padding-bottom: 120px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.loading { margin-top: 80px; color: var(--text-2); }
.hero {
  margin: 8px 16px 16px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(320px 220px at 100% 0%, var(--c-amber-soft), transparent 62%);
  pointer-events: none;
}
.hero-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 10px; position: relative; }
.hero-meta { display: flex; gap: 12px; align-items: center; font-size: 12px; color: var(--text-2); position: relative; }
.card {
  margin: 0 16px 14px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.card-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
.desc { font-size: 13px; color: var(--text-2); line-height: 1.7; white-space: pre-wrap; }
.perf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.perf-item {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
}
.perf-item .label { display: block; color: var(--text-3); font-size: 11px; margin-bottom: 4px; }
.perf-item .value { color: var(--text); font-weight: 700; font-size: 16px; }
.perf-item .value.up { color: var(--up); }
.perf-item .value.down { color: var(--down); }
.reviews-total {
  margin-left: 6px;
  font-weight: 500;
  color: var(--text-3);
  font-size: 12px;
}
.comments-loading { padding: 12px 0; text-align: center; }
.comments-empty {
  padding: 18px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
.comments-more {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
.comment { padding: 12px 0; border-top: 1px solid var(--hairline); }
.comment:first-child { border-top: none; padding-top: 0; }
.comment-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.comment .author { color: var(--text); font-weight: 600; font-size: 13px; }
.comment .content { color: var(--text-2); font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-wrap; }
.comment-time {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
}
.footer-bar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  padding: 12px 16px calc(12px + var(--safe-area-bottom, 0px));
  background: var(--bg-elevated);
  backdrop-filter: blur(22px);
  border-top: 1px solid var(--border);
}
.price-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
.price-label { color: var(--text-3); }
.price-value { color: var(--accent); font-weight: 700; }
</style>
