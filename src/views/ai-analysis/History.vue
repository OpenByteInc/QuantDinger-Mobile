<template>
  <div class="history-page">
    <van-nav-bar :title="$t('ai_analysis.history_title')" left-arrow @click-left="$router.back()" />

    <van-list
      v-if="list.length"
      v-model:loading="loading"
      :finished="finished"
      finished-text=""
      @load="loadMore"
    >
      <div v-for="item in list" :key="item.id" class="history-item" @click="openItem(item)">
        <div class="row top-row">
          <div class="title-line">
            <van-tag
              v-if="item.market"
              :color="getMarketColor(item.market)"
              text-color="#fff"
              size="medium"
              round
              class="market-tag"
            >{{ getMarketName(item.market) }}</van-tag>
            <span class="symbol">{{ item.symbol || '-' }}</span>
            <van-tag :type="decisionTone(item)" plain class="decision-tag">{{ decisionText(item) }}</van-tag>
            <van-tag
              :color="getStatusColor(item.status || 'completed')"
              text-color="#fff"
              plain
              class="status-tag"
            >{{ getStatusText(item.status || 'completed') }}</van-tag>
          </div>
        </div>

        <div class="meta">
          <span class="confidence">{{ $t('ai_analysis.confidence') }}: {{ formatConfidence(item.confidence) }}%</span>
          <span v-if="item.price" class="price">${{ formatNumber(item.price) }}</span>
        </div>

        <div v-if="item.summary" class="summary">{{ truncatedSummary(item.summary) }}</div>

        <div class="meta meta-bottom">
          <span>{{ item.timeframe || '-' }}</span>
          <span>{{ formatTime(item.created_at) }}</span>
        </div>

        <div class="actions" @click.stop>
          <van-button
            size="mini"
            plain
            type="primary"
            :disabled="(item.status || '').toLowerCase() === 'processing'"
            @click="openItem(item)"
          >{{ $t('ai_analysis.view_result') }}</van-button>
          <span class="action-link" @click="removeItem(item)">{{ $t('ai_analysis.delete_record') }}</span>
        </div>
      </div>
    </van-list>
    <van-empty v-else-if="!loading" :description="$t('ai_analysis.history_empty')" />
  </div>
</template>

<script>
import { showConfirmDialog, showToast } from 'vant'
import { aiAnalysisApi } from '@/api'
import { useAiAnalysisStore } from '@/stores'

const MARKET_COLORS = {
  Crypto: '#722ed1',
  USStock: '#1890ff',
  Forex: '#13c2c2',
  ChinaStock: '#fa541c',
  HKStock: '#eb2f96',
  Futures: '#fa8c16',
  Commodities: '#faad14'
}

const STATUS_COLORS = {
  pending: '#fa8c16',
  processing: '#1890ff',
  completed: '#52c41a',
  failed: '#f5222d'
}

export default {
  name: 'AiAnalysisHistory',
  data() {
    return {
      loading: false,
      finished: false,
      page: 1
    }
  },
  computed: {
    aiStore() { return useAiAnalysisStore() },
    list() { return this.aiStore.history }
  },
  mounted() {
    this.page = 1
    this.finished = false
    this.loadMore()
  },
  methods: {
    async loadMore() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await aiAnalysisApi.getAllHistory({ page: this.page, pagesize: 20 })
        const existing = this.page === 1 ? [] : this.aiStore.history
        const merged = existing.concat(res.data?.list || [])
        this.aiStore.setHistory({ list: merged, total: res.data?.total || merged.length })
        if (merged.length >= (res.data?.total || merged.length) || (res.data?.list || []).length === 0) {
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
    async removeItem(item) {
      try {
        await showConfirmDialog({
          title: this.$t('ai_analysis.delete_record'),
          message: this.$t('ai_analysis.delete_confirm')
        })
        await aiAnalysisApi.deleteHistory(item.id)
        const filtered = this.aiStore.history.filter((r) => r.id !== item.id)
        this.aiStore.setHistory({ list: filtered, total: filtered.length })
        showToast({ message: this.$t('common.success'), type: 'success' })
      } catch (err) {
        // cancelled
      }
    },
    /**
     * Reconstruct a payload the AI analysis page can render, mirroring
     * the PC `viewHistoryResult` logic so the user gets the same
     * "open from history" experience on mobile (entry / SL / TP
     * derived from price and decision when full_result is missing).
     */
    openItem(item) {
      if ((item.status || '').toLowerCase() === 'processing') {
        showToast({ message: this.$t('ai_analysis.history_processing'), type: 'fail' })
        return
      }

      let payload
      if (item.full_result) {
        payload = item.full_result
      } else {
        const price = Number(item.price) || Number(item.current_price) || 0
        const dec = String(item.decision || 'HOLD').toUpperCase()
        let stopLoss = null
        let takeProfit = null
        if (price > 0) {
          if (dec === 'SELL') {
            stopLoss = price * 1.05
            takeProfit = price * 0.95
          } else if (dec === 'BUY') {
            stopLoss = price * 0.95
            takeProfit = price * 1.05
          }
        }
        payload = {
          decision: item.decision,
          confidence: item.confidence,
          summary: item.summary,
          market_data: {
            current_price: item.price || item.current_price,
            change_24h: 0
          },
          trading_plan: {
            entry_price: item.price || item.current_price,
            stop_loss: stopLoss ?? item.stop_loss,
            take_profit: takeProfit ?? item.take_profit
          },
          scores: item.scores || {},
          reasons: item.reasons || [],
          risks: item.risks || [],
          indicators: item.indicators || {},
          memory_id: item.id
        }
      }
      this.aiStore.setLastResult(payload)
      this.$router.push('/ai-analysis')
    },
    decisionText(item) {
      const d = String(item.decision || '').toUpperCase()
      if (d.includes('BUY')) return this.$t('ai_analysis.decision_buy')
      if (d.includes('SELL')) return this.$t('ai_analysis.decision_sell')
      return this.$t('ai_analysis.decision_hold')
    },
    decisionTone(item) {
      const d = String(item.decision || '').toUpperCase()
      if (d.includes('BUY')) return 'success'
      if (d.includes('SELL')) return 'danger'
      return 'warning'
    },
    getMarketColor(market) {
      return MARKET_COLORS[market] || '#8c8c8c'
    },
    getMarketName(market) {
      const key = `ai_analysis.market_${String(market || '').toLowerCase()}`
      const text = this.$t(key)
      return text === key ? (market || '-') : text
    },
    getStatusColor(status) {
      return STATUS_COLORS[status] || '#8c8c8c'
    },
    getStatusText(status) {
      const key = `ai_analysis.status_${String(status || '').toLowerCase()}`
      const text = this.$t(key)
      return text === key ? status : text
    },
    formatConfidence(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '0'
      if (num <= 1) return (num * 100).toFixed(0)
      return num.toFixed(0)
    },
    formatNumber(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num === 0) return '0'
      if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
      return num.toFixed(num < 1 ? 6 : 4)
    },
    truncatedSummary(text) {
      if (!text) return ''
      const s = String(text)
      return s.length > 100 ? `${s.slice(0, 100)}...` : s
    },
    formatTime(value) {
      if (!value) return ''
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  padding-bottom: 60px;
}
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }

.history-item {
  margin: 12px 16px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.row { display: flex; justify-content: space-between; align-items: center; }
.top-row { margin-bottom: 8px; }
.title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.market-tag {
  font-size: 11px;
  font-weight: 700;
}
.symbol { color: var(--text); font-weight: 700; font-size: 15px; }
.decision-tag, .status-tag {
  font-size: 11px;
}
.meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-3);
  gap: 10px;
}
.meta .confidence { font-weight: 600; color: var(--text-2); }
.meta .price { font-weight: 700; color: var(--c-amber); font-variant-numeric: tabular-nums; }
.summary { margin-top: 10px; font-size: 12px; color: var(--text-2); line-height: 1.6; }
.meta-bottom { margin-top: 8px; font-size: 11px; }
.actions {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.actions :deep(.van-button) {
  height: 28px;
  border-radius: 8px;
  font-size: 12px;
}
.action-link { color: var(--down); font-size: 12px; }
</style>
