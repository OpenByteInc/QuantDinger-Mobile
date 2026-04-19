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
        <div class="row">
          <span class="symbol">{{ item.symbol }}</span>
          <van-tag :type="decisionTone(item)" plain>{{ decisionText(item) }}</van-tag>
        </div>
        <div class="meta">
          <span>{{ item.market }} · {{ item.timeframe || '-' }}</span>
          <span>{{ formatTime(item.created_at) }}</span>
        </div>
        <div v-if="item.summary" class="summary">{{ item.summary }}</div>
        <div class="actions" @click.stop>
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
    openItem(item) {
      const payload = {
        decision: item.decision,
        confidence: item.confidence,
        summary: item.summary,
        market_data: item.market_data || { current_price: item.current_price },
        trading_plan: {
          entry_price: item.entry_price,
          stop_loss: item.stop_loss,
          take_profit: item.take_profit
        },
        indicators: item.indicators,
        risks: item.risks
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
    formatTime(value) {
      if (!value) return ''
      const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
.symbol { color: var(--text); font-weight: 700; font-size: 15px; }
.meta { margin-top: 6px; display: flex; justify-content: space-between; font-size: 11px; color: var(--text-3); }
.summary { margin-top: 10px; font-size: 12px; color: var(--text-2); line-height: 1.6; }
.actions { margin-top: 12px; display: flex; justify-content: flex-end; }
.action-link { color: var(--down); font-size: 12px; }
</style>
