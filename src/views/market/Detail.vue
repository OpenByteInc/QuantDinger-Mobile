<template>
  <div class="detail-page">
    <van-nav-bar :title="indicator?.name || $t('market.title')" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" class="loading" vertical>{{ $t('common.loading') }}</van-loading>

    <template v-else-if="indicator">
      <div class="hero">
        <div class="hero-main">
          <div>
            <div class="hero-title">{{ indicator.name }}</div>
            <div class="hero-meta">
              <van-tag :type="indicator.pricing_type === 'paid' ? 'warning' : 'success'" plain>
                {{ indicator.pricing_type === 'paid' ? $t('market.filter_paid') : $t('market.filter_free') }}
              </van-tag>
              <span v-if="isVipFree" class="vip-free-pill">
                <van-icon name="gem-o" />
                {{ $t('market.vip_free') }}
              </span>
              <span class="meta">
                <van-icon name="star" /> {{ Number(indicator.avg_rating || 0).toFixed(1) }}
              </span>
              <span class="meta">
                <van-icon name="cart-o" /> {{ indicator.purchase_count || 0 }}
              </span>
              <span class="meta asset-meta">{{ assetLabel }}</span>
            </div>
          </div>
          <div class="hero-score">
            <span>{{ $t('market.score_short') }}</span>
            <strong>{{ formatScore(performance?.score || indicator.score) }}</strong>
          </div>
        </div>
        <div class="hero-kpis">
          <div v-for="metric in headlineMetrics" :key="metric.key" class="hero-kpi">
            <span>{{ metric.label }}</span>
            <strong :class="metric.tone">{{ metric.value }}</strong>
          </div>
        </div>
      </div>

      <div v-if="performance" class="card performance-card">
        <div class="card-head">
          <div>
            <div class="card-title">{{ $t('market.detail_performance') }}</div>
            <p v-if="bestRunText" class="card-subtitle">{{ bestRunText }}</p>
          </div>
          <span class="sample-pill">{{ $t('market.sample_size_short') }} {{ performance.sample_size || 0 }}</span>
        </div>
        <div v-if="curvePoints" class="curve-panel">
          <div class="curve-head">
            <span>{{ $t('market.equity_curve') }}</span>
            <strong :class="valueTone(performance.total_return)">
              {{ formatPercent(performance.total_return, true) }}
            </strong>
          </div>
          <svg class="equity-svg" viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true">
            <path class="curve-area" :d="curveAreaPath" />
            <polyline class="curve-line" :points="curvePoints" />
          </svg>
        </div>
        <div class="perf-grid rich">
          <div v-for="metric in performanceMetrics" :key="metric.key" class="perf-item">
            <span class="label">{{ metric.label }}</span>
            <span :class="['value', metric.tone]">{{ metric.value }}</span>
          </div>
        </div>
      </div>

      <div v-if="applicableTags.length" class="card">
        <div class="card-title">{{ $t('market.applicability') }}</div>
        <div class="tag-row">
          <span v-for="tag in applicableTags" :key="tag" class="mini-tag">{{ tag }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">{{ $t('market.detail_about') }}</div>
        <p class="desc">{{ indicator.description || '-' }}</p>
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
        <span class="price-label">{{ $t('market.detail_price') }}</span>
        <span class="price-value">
          {{ priceText }}
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
      <div v-else class="footer-actions">
        <van-button
          plain
          round
          block
          :loading="syncing"
          @click="syncCode"
        >{{ $t('market.sync_code') }}</van-button>
        <van-button
          type="primary"
          round
          block
          @click="goCreateStrategy"
        >{{ useLabel }}</van-button>
      </div>
    </div>
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { marketApi } from '@/api'
import {
  buildCreateRouteFromMarketAsset,
  getAssetLabel,
  getAssetType,
  getUseLabel
} from '@/utils/marketRoutes'

export default {
  name: 'MarketDetail',
  data() {
    return {
      loading: false,
      purchasing: false,
      syncing: false,
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
    },
    isVipFree() {
      return !!this.indicator?.vip_free
    },
    priceText() {
      const base = this.indicator?.pricing_type === 'paid'
        ? this.$t('market.price_credits', { price: this.indicator.price })
        : this.$t('market.price_free')
      return this.isVipFree ? `${this.$t('market.vip_free')} / ${base}` : base
    },
    assetType() {
      return getAssetType(this.indicator || {})
    },
    assetLabel() {
      return getAssetLabel(this.assetType, this.$t)
    },
    useLabel() {
      return getUseLabel(this.assetType, this.$t)
    },
    headlineMetrics() {
      const source = this.performance || this.indicator || {}
      return [
        {
          key: 'return',
          label: this.$t('market.total_return_short'),
          value: this.formatPercent(source.total_return, true),
          tone: this.valueTone(source.total_return)
        },
        {
          key: 'win',
          label: this.$t('market.perf_win_rate'),
          value: this.formatPercent(source.win_rate_backtest || source.win_rate),
          tone: this.asNumber(source.win_rate_backtest || source.win_rate) >= 50 ? 'up' : ''
        },
        {
          key: 'drawdown',
          label: this.$t('market.max_drawdown_short'),
          value: this.formatDrawdown(source.max_drawdown),
          tone: 'risk'
        }
      ]
    },
    performanceMetrics() {
      const p = this.performance || {}
      return [
        { key: 'score', label: this.$t('market.score_short'), value: this.formatScore(p.score), tone: '' },
        { key: 'total', label: this.$t('market.total_return_short'), value: this.formatPercent(p.total_return, true), tone: this.valueTone(p.total_return) },
        { key: 'annual', label: this.$t('market.annual_return_short'), value: this.formatPercent(p.annual_return, true), tone: this.valueTone(p.annual_return) },
        { key: 'drawdown', label: this.$t('market.max_drawdown_short'), value: this.formatDrawdown(p.max_drawdown), tone: 'risk' },
        { key: 'sharpe', label: this.$t('market.sharpe_short'), value: this.formatRatio(p.sharpe), tone: '' },
        { key: 'profit', label: this.$t('market.profit_factor_short'), value: this.formatRatio(p.profit_factor), tone: '' },
        { key: 'strategy', label: this.$t('market.perf_strategy_count'), value: String(p.strategy_count || 0), tone: '' },
        { key: 'trade', label: this.$t('market.perf_trade_count'), value: String(p.trade_count || 0), tone: '' }
      ]
    },
    applicableTags() {
      const p = this.performance || this.indicator || {}
      const symbols = Array.isArray(p.applicable_symbols) ? p.applicable_symbols : []
      const timeframes = Array.isArray(p.applicable_timeframes) ? p.applicable_timeframes : []
      return symbols.concat(timeframes).filter(Boolean).slice(0, 8)
    },
    bestRunText() {
      const meta = this.performance?.best_run_meta
      if (!meta) return ''
      const scope = [meta.symbol, meta.timeframe].filter(Boolean).join(' · ')
      const ret = this.formatPercent(meta.total_return, true)
      const dd = this.formatDrawdown(meta.max_drawdown)
      return [scope, `${this.$t('market.total_return_short')} ${ret}`, `${this.$t('market.max_drawdown_short')} ${dd}`]
        .filter(Boolean)
        .join(' / ')
    },
    curvePoints() {
      const curve = Array.isArray(this.performance?.equity_curve) ? this.performance.equity_curve : []
      const values = curve.map((p) => this.asNumber(p.value)).filter((v) => Number.isFinite(v))
      if (values.length < 2) return ''
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = max - min || 1
      return values.map((value, index) => {
        const x = (index / (values.length - 1)) * 320
        const y = 88 - ((value - min) / span) * 76
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    curveAreaPath() {
      if (!this.curvePoints) return ''
      const points = this.curvePoints.split(' ')
      return `M ${points[0]} L ${points.slice(1).join(' L ')} L 320,96 L 0,96 Z`
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
    async syncCode() {
      if (!this.indicatorId) return
      try {
        await showConfirmDialog({
          title: this.$t('market.sync_code_confirm_title'),
          message: this.$t('market.sync_code_confirm_desc')
        })
      } catch {
        return
      }
      this.syncing = true
      try {
        const res = await marketApi.syncIndicator(this.indicatorId)
        showToast({ message: this.syncMessage(res?.msg), type: 'success' })
        await this.load()
      } catch {
        showToast({ message: this.$t('market.sync_fail'), type: 'fail' })
      } finally {
        this.syncing = false
      }
    },
    syncMessage(code) {
      const map = {
        success: 'market.sync_success',
        restored: 'market.sync_restored',
        already_latest: 'market.sync_already_latest'
      }
      return this.$t(map[code] || 'market.sync_success')
    },
    goCreateStrategy() {
      this.$router.push(buildCreateRouteFromMarketAsset(this.indicator, this.indicatorId))
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
.hero-main {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.hero-title { font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 10px; position: relative; line-height: 1.3; }
.hero-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--text-2); position: relative; }
.asset-meta {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--accent);
  border: 1px solid var(--border);
}
.vip-free-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  color: #1f1300;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  border: 1px solid rgba(245, 158, 11, 0.36);
  font-size: 11px;
  font-weight: 900;
}
.hero-score {
  flex: none;
  width: 76px;
  min-height: 76px;
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 0%, rgba(250, 204, 21, 0.24), transparent 58%),
    rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(250, 204, 21, 0.22);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.hero-score span {
  font-size: 11px;
  color: var(--text-3);
}
.hero-score strong {
  margin-top: 3px;
  color: var(--c-amber);
  font-size: 24px;
  line-height: 1;
}
.hero-kpis {
  position: relative;
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.hero-kpi {
  padding: 10px 8px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.26);
  border: 1px solid var(--hairline);
}
.hero-kpi span {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hero-kpi strong {
  display: block;
  margin-top: 5px;
  color: var(--text);
  font-size: 14px;
  line-height: 1;
}
.hero-kpi strong.up,
.perf-item .value.up { color: var(--up); }
.hero-kpi strong.down,
.perf-item .value.down { color: var(--down); }
.hero-kpi strong.risk,
.perf-item .value.risk { color: var(--c-amber); }
.card {
  margin: 0 16px 14px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.card-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.card-subtitle {
  margin: -4px 0 10px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.45;
}
.sample-pill {
  flex: none;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.2);
  font-size: 10px;
  font-weight: 700;
}
.desc { font-size: 13px; color: var(--text-2); line-height: 1.7; white-space: pre-wrap; }
.performance-card {
  background:
    radial-gradient(260px 180px at 100% 0%, rgba(56, 189, 248, 0.1), transparent 62%),
    var(--bg-elevated);
}
.curve-panel {
  margin: 8px 0 14px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.28);
  border: 1px solid var(--hairline);
}
.curve-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
}
.curve-head strong {
  color: var(--text);
  font-size: 13px;
}
.curve-head strong.up { color: var(--up); }
.curve-head strong.down { color: var(--down); }
.equity-svg {
  display: block;
  width: 100%;
  height: 96px;
  margin-top: 8px;
}
.curve-area {
  fill: rgba(34, 197, 94, 0.12);
}
.curve-line {
  fill: none;
  stroke: var(--up);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.perf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.perf-grid.rich {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.perf-item {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  border: 1px solid var(--hairline);
}
.perf-item .label { display: block; color: var(--text-3); font-size: 11px; margin-bottom: 4px; }
.perf-item .value { color: var(--text); font-weight: 700; font-size: 16px; }
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mini-tag {
  max-width: 140px;
  padding: 5px 9px;
  border-radius: 999px;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--hairline);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
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
.footer-actions {
  display: flex;
  gap: 10px;
}
.footer-actions :deep(.van-button) {
  min-width: 0;
}
</style>
