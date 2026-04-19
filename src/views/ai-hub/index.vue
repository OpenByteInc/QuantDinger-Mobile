<template>
  <div class="ai-hub-page">
    <!-- Nav: title + history drawer trigger -->
    <div class="nav-header">
      <div class="nav-top-row">
        <div class="nav-top-left">
          <span class="nav-eyebrow">
            <span class="sparkle">✦</span>
            {{ $t('ai_hub.title') }}
          </span>
        </div>
        <button type="button" class="history-tab" @click="openHistoryDrawer">
          <van-icon name="clock-o" />
          <span>{{ $t('ai_hub.open_history') }}</span>
        </button>
      </div>
      <h1 class="nav-title">{{ $t('ai_hub.hero_title') }}</h1>
      <p class="nav-desc">{{ $t('ai_hub.hero_desc') }}</p>
    </div>

    <!-- Macro + calendar (PC parity, compact) -->
    <div class="macro-block qd-card">
      <div class="macro-head">
        <span class="macro-title">{{ $t('ai_hub.macro_title') }}</span>
        <van-loading v-if="loadingMacro" size="16" />
      </div>
      <div v-if="indices.length" class="index-scroll">
        <div v-for="ix in indices" :key="ix.symbol || ix.name" class="index-chip">
          <span class="ix-name">{{ ix.name || ix.symbol }}</span>
          <span class="ix-price">{{ formatIndexPrice(ix.price) }}</span>
          <span
            v-if="ix.change_percent != null"
            :class="['ix-chg', Number(ix.change_percent) >= 0 ? 'up' : 'down']"
          >
            {{ Number(ix.change_percent) >= 0 ? '+' : '' }}{{ Number(ix.change_percent).toFixed(2) }}%
          </span>
        </div>
      </div>
      <div v-else-if="!loadingMacro" class="macro-empty">{{ $t('ai_hub.macro_empty') }}</div>

      <div v-if="sentiment && sentiment.fear_greed != null" class="fg-block">
        <div class="fg-label">{{ $t('ai_hub.fear_greed_title') }}</div>
        <div class="fg-gauge">
          <div class="fg-marker" :style="{ left: `${Math.min(100, Math.max(0, Number(sentiment.fear_greed)))}%` }" />
        </div>
        <div class="fg-scale">
          <span>{{ $t('ai_hub.fear_greed_extreme_fear') }}</span>
          <div class="fg-mid">
            <strong>{{ sentiment.fear_greed }}</strong>
            <span v-if="formatFgClassification(sentiment.classification)" class="fg-class">{{
              formatFgClassification(sentiment.classification)
            }}</span>
          </div>
          <span>{{ $t('ai_hub.fear_greed_extreme_greed') }}</span>
        </div>
      </div>

      <button type="button" class="cal-head-row" @click="calendarExpanded = !calendarExpanded">
        <div class="cal-head-left">
          <span class="cal-head-title">{{ $t('ai_hub.calendar_title') }}</span>
          <span v-if="calendarEvents.length" class="cal-head-meta">{{
            $t('ai_hub.calendar_count', { n: calendarEvents.length })
          }}</span>
        </div>
        <van-icon :name="calendarExpanded ? 'arrow-up' : 'arrow-down'" class="cal-head-chev" />
      </button>
      <div v-show="calendarExpanded">
        <div v-if="calendarEvents.length" class="cal-list">
          <div v-for="ev in calendarEvents" :key="ev.id || ev.time + ev.title" class="cal-row">
            <span class="cal-time">{{ ev.time }}</span>
            <div class="cal-main">
              <div class="cal-head-line">
                <span v-if="ev.country" class="cal-country">{{ ev.country }}</span>
                <span class="cal-title">{{ displayEventTitle(ev) }}</span>
              </div>
              <div v-if="hasCalendarMetrics(ev)" class="cal-metrics">
                <span class="cm-item">
                  <span class="cm-lab">{{ $t('ai_hub.calendar_metric_actual') }}</span>
                  <span :class="['cm-val', surpriseColor(ev.surprise)]">{{ ev.actual || '--' }}</span>
                </span>
                <span class="cm-item">
                  <span class="cm-lab">{{ $t('ai_hub.calendar_metric_forecast') }}</span>
                  <span class="cm-val">{{ ev.forecast || '--' }}</span>
                </span>
                <span class="cm-item">
                  <span class="cm-lab">{{ $t('ai_hub.calendar_metric_previous') }}</span>
                  <span class="cm-val">{{ ev.previous || '--' }}</span>
                </span>
              </div>
              <div v-if="ev.surprise && ev.surprise !== 'inline'" class="cal-tags">
                <span :class="['cal-tag', 'surprise-' + ev.surprise]">
                  {{ surpriseLabel(ev.surprise) }}
                </span>
                <span v-if="ev.goldImpact" :class="['cal-tag', 'gold-' + ev.goldImpact]">
                  {{ goldImpactLabel(ev.goldImpact) }}
                </span>
              </div>
            </div>
            <span v-if="ev.impact" :class="['cal-impact', ev.impact]">{{ impactLabel(ev.impact) }}</span>
          </div>
        </div>
        <div v-else-if="!loadingMacro" class="macro-empty soft">{{ $t('ai_hub.calendar_empty') }}</div>
      </div>
    </div>

    <!-- AI analysis entry cards -->
    <div class="feature-cards">
      <div class="feat-card analysis" @click="$router.push('/ai-analysis')">
        <div class="feat-body">
          <div class="feat-icon">
            <van-icon name="fire-o" />
          </div>
          <div class="feat-copy">
            <span class="feat-title">{{ $t('ai_hub.card_analysis_title') }}</span>
            <p class="feat-desc">{{ $t('ai_hub.card_analysis_desc') }}</p>
          </div>
        </div>
        <div class="feat-cta">
          <span>{{ $t('ai_hub.go_analysis') }}</span>
          <van-icon name="arrow" />
        </div>
      </div>
    </div>

    <!-- Chat-style bot generator -->
    <div class="chat-card qd-card">
      <div class="chat-head">
        <van-icon name="chat-o" class="chat-head-icon" />
        <div>
          <div class="chat-title">{{ $t('ai_hub.chat_title') }}</div>
          <p class="chat-desc">{{ $t('ai_hub.chat_desc') }}</p>
        </div>
      </div>
      <van-field
        v-model="chatPrompt"
        type="textarea"
        rows="3"
        autosize
        maxlength="800"
        show-word-limit
        :placeholder="$t('ai_hub.chat_placeholder')"
        :disabled="creating"
        class="chat-field"
      />
      <div class="quick-row">
        <span class="quick-lab">{{ $t('ai_hub.chat_quick_title') }}</span>
        <div class="quick-chips">
          <span class="qc" @click="chatPrompt = $t('ai_hub.chat_quick_1')">{{ $t('ai_hub.chat_quick_1') }}</span>
          <span class="qc" @click="chatPrompt = $t('ai_hub.chat_quick_2')">{{ $t('ai_hub.chat_quick_2') }}</span>
          <span class="qc" @click="chatPrompt = $t('ai_hub.chat_quick_3')">{{ $t('ai_hub.chat_quick_3') }}</span>
        </div>
      </div>
      <van-button
        type="primary"
        block
        round
        class="chat-send"
        :loading="creating"
        :loading-text="$t('ai_hub.chat_sending')"
        @click="generateRecommend"
      >
        <van-icon name="cluster-o" style="margin-right: 6px;" />
        {{ $t('ai_hub.chat_send') }}
      </van-button>
      <p class="chat-hint">{{ $t('ai_hub.chat_hint') }}</p>
    </div>

    <!-- Tips -->
    <div class="ios-section">
      <div class="ios-section-head">
        <span class="ios-section-title">{{ $t('ai_hub.tips_title') }}</span>
      </div>
      <div class="tips-card">
        <div class="tip-row"><div class="bulb">1</div><span>{{ $t('ai_hub.tip_1') }}</span></div>
        <div class="tip-row"><div class="bulb">2</div><span>{{ $t('ai_hub.tip_2') }}</span></div>
        <div class="tip-row"><div class="bulb">3</div><span>{{ $t('ai_hub.tip_3') }}</span></div>
      </div>
    </div>

    <!-- History: right drawer -->
    <van-popup
      v-model:show="showHistoryDrawer"
      position="right"
      class="history-popup"
      :style="{ width: 'min(360px, 88vw)', height: '100%' }"
      teleport="body"
      round
    >
      <div class="drawer-page">
        <div class="drawer-head">
          <span class="drawer-title">{{ $t('ai_hub.drawer_history') }}</span>
          <van-icon name="cross" class="drawer-close" @click="showHistoryDrawer = false" />
        </div>
        <div v-if="loadingHistory" class="drawer-loading">
          <van-loading vertical>{{ $t('common.loading') }}</van-loading>
        </div>
        <div v-else class="drawer-body">
          <div v-if="!drawerHistory.length" class="drawer-empty">
            <van-icon name="records" />
            <span>{{ $t('ai_hub.no_recent') }}</span>
          </div>
          <div v-else class="drawer-list">
            <div
              v-for="item in drawerHistory"
              :key="item.memory_id || item.id || item.created_at"
              class="drawer-row"
              @click="openHistoryRecord(item)"
            >
              <div :class="['dr-icon', decisionClass(item.decision)]">
                <van-icon :name="decisionIcon(item.decision)" />
              </div>
              <div class="dr-main">
                <span class="dr-title">{{ item.symbol || item.input_data?.symbol || '--' }}</span>
                <span class="dr-sub">{{ formatTime(item.created_at) }}</span>
              </div>
              <span :class="['dr-badge', decisionClass(item.decision)]">{{ decisionLabel(item.decision) }}</span>
            </div>
          </div>
          <van-button block round plain class="drawer-more" @click="goFullHistory">
            {{ $t('ai_hub.history') }}
            <van-icon name="arrow" />
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- AI 推荐参数预览弹窗 -->
    <van-popup
      v-model:show="showRecommend"
      position="bottom"
      round
      teleport="body"
      :style="{ maxHeight: '82vh' }"
      class="recommend-popup"
    >
      <div v-if="recommendation" class="recommend-sheet">
        <div class="recommend-head">
          <div class="recommend-title">
            <van-icon name="star-o" />
            <span>{{ $t('bot_create.ai_recommendation') }}</span>
          </div>
          <van-icon name="cross" class="recommend-close" @click="showRecommend = false" />
        </div>
        <div class="recommend-body">
          <div class="recommend-name">
            {{ recommendation.botName || recommendation.strategyName || typeLabel(recommendation.botType) }}
          </div>
          <div class="recommend-badges">
            <span class="badge type">{{ typeLabel(recommendation.botType) }}</span>
            <span v-if="recommendation.baseConfig?.symbol" class="badge">{{ recommendation.baseConfig.symbol }}</span>
            <span v-if="recommendation.baseConfig?.timeframe" class="badge">{{ recommendation.baseConfig.timeframe }}</span>
            <span v-if="recommendation.mode === 'script'" class="badge script">{{ $t('bot_create.ai_script_title') }}</span>
          </div>
          <div v-if="recommendation.reason || recommendation.analysis" class="recommend-reason">
            <div class="rec-label">{{ $t('bot_create.ai_reason') }}</div>
            <p>{{ recommendation.reason || recommendation.analysis }}</p>
          </div>

          <div v-if="recommendation.strategyParams && Object.keys(recommendation.strategyParams).length" class="rec-block">
            <div class="rec-label">{{ $t('bot_create.strategy_params') }}</div>
            <div class="param-grid">
              <div v-for="(val, key) in recommendation.strategyParams" :key="'sp_' + key" class="param-item">
                <div class="param-key">{{ key }}</div>
                <div class="param-val">{{ val }}</div>
              </div>
            </div>
          </div>

          <div v-if="recommendation.riskConfig && Object.keys(recommendation.riskConfig).length" class="rec-block">
            <div class="rec-label">{{ $t('bot_create.risk_params') }}</div>
            <div class="param-grid">
              <div v-for="(val, key) in recommendation.riskConfig" :key="'rk_' + key" class="param-item">
                <div class="param-key">{{ key }}</div>
                <div class="param-val">{{ val }}</div>
              </div>
            </div>
          </div>

          <div v-if="recommendation.mode === 'script' && recommendation.strategy_code" class="rec-block">
            <div class="rec-label">{{ $t('bot_create.ai_script_preview') }}</div>
            <pre class="code-pre">{{ recommendation.strategy_code }}</pre>
          </div>
        </div>
        <div class="recommend-actions">
          <van-button plain round block @click="regenerateRecommend">{{ $t('bot_create.regenerate') }}</van-button>
          <van-button type="primary" round block @click="applyRecommendAndEdit">
            {{ $t('bot_create.apply_and_edit') }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { aiAnalysisApi, globalMarketApi, strategyApi } from '@/api'
import { useAiAnalysisStore } from '@/stores'
import { normalizeAiBotRecommendation } from '@/views/trading/botScriptTemplates'

/** 后端返回的中文事件名 → 英文兜底映射（字段 name_en 缺失时使用） */
const CALENDAR_ZH_TO_EN_FALLBACK = {
  美国非农就业数据: 'US Non-Farm Payrolls',
  美联储利率决议: 'Fed Interest Rate Decision',
  美国CPI月率: 'US CPI m/m',
  欧洲央行利率决议: 'ECB Interest Rate Decision',
  日本央行利率决议: 'BoJ Interest Rate Decision',
  美国初请失业金人数: 'US Initial Jobless Claims',
  英国央行利率决议: 'BoE Interest Rate Decision',
  美国零售销售月率: 'US Retail Sales m/m',
  OPEC月度报告: 'OPEC Monthly Report',
  美国PPI月率: 'US PPI m/m',
  美国GDP季率: 'US GDP q/q',
  美国ISM制造业PMI: 'US ISM Manufacturing PMI',
  美国消费者信心指数: 'US Consumer Confidence',
  美国耐用品订单: 'US Durable Goods Orders',
  美国工业产出: 'US Industrial Production',
  美国贸易差额: 'US Trade Balance',
  美元指数: 'US Dollar Index'
}

export default {
  name: 'AiHub',
  data() {
    return {
      drawerHistory: [],
      loadingHistory: false,
      loadingMacro: false,
      indices: [],
      sentiment: null,
      calendarEvents: [],
      showHistoryDrawer: false,
      chatPrompt: '',
      calendarExpanded: true,
      creating: false,
      recommendation: null,
      showRecommend: false
    }
  },
  mounted() {
    this.loadMacro()
  },
  activated() {
    this.loadMacro()
  },
  watch: {
    showHistoryDrawer(val) {
      if (val) this.loadDrawerHistory()
    }
  },
  methods: {
    async loadDrawerHistory() {
      this.loadingHistory = true
      try {
        const res = await aiAnalysisApi.getAllHistory({ page: 1, pagesize: 30 })
        const list = res?.data?.list || res?.data?.items || []
        this.drawerHistory = Array.isArray(list) ? list : []
      } catch {
        this.drawerHistory = []
      } finally {
        this.loadingHistory = false
      }
    },
    async loadMacro() {
      this.loadingMacro = true
      try {
        const [overviewRes, calendarRes, sentimentRes] = await Promise.allSettled([
          globalMarketApi.getOverview(),
          globalMarketApi.getCalendar({ limit: 8 }),
          globalMarketApi.getSentiment()
        ])
        if (overviewRes.status === 'fulfilled') {
          const r = overviewRes.value
          const ok = r?.code === 1 || r?.code === 200 || r?.success
          if (ok && r?.data) {
            this.indices = Array.isArray(r.data.indices) ? r.data.indices.slice(0, 12) : []
          } else {
            this.indices = []
          }
        } else {
          this.indices = []
        }
        if (calendarRes.status === 'fulfilled') {
          const r = calendarRes.value
          const raw = Array.isArray(r?.data) ? r.data : []
          this.calendarEvents = raw.slice(0, 8)
        } else {
          this.calendarEvents = []
        }
        if (sentimentRes.status === 'fulfilled') {
          const r = sentimentRes.value
          const s = r?.data
          this.sentiment =
            s && typeof s === 'object' && s.fear_greed != null && Number.isFinite(Number(s.fear_greed))
              ? s
              : null
        } else {
          this.sentiment = null
        }
      } catch {
        this.indices = []
        this.calendarEvents = []
        this.sentiment = null
      } finally {
        this.loadingMacro = false
      }
    },
    formatFgClassification(raw) {
      const c = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_')
      if (!c) return ''
      const map = {
        extreme_fear: 'ai_hub.fear_greed_class_extreme_fear',
        fear: 'ai_hub.fear_greed_class_fear',
        neutral: 'ai_hub.fear_greed_class_neutral',
        greed: 'ai_hub.fear_greed_class_greed',
        extreme_greed: 'ai_hub.fear_greed_class_extreme_greed'
      }
      const key = map[c] || map[c.replace(/-/g, '_')]
      return key ? this.$t(key) : raw
    },
    formatIndexPrice(val) {
      if (val == null || val === '') return '--'
      const n = Number(val)
      if (Number.isNaN(n)) return String(val)
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (Math.abs(n) >= 1e4) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
      return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    },
    impactLabel(impact) {
      const k = String(impact || '').toLowerCase()
      if (k === 'high') return this.$t('ai_hub.calendar_impact_high')
      if (k === 'medium') return this.$t('ai_hub.calendar_impact_medium')
      if (k === 'low') return this.$t('ai_hub.calendar_impact_low')
      return impact || ''
    },
    openHistoryDrawer() {
      this.showHistoryDrawer = true
    },
    goFullHistory() {
      this.showHistoryDrawer = false
      this.$router.push('/ai-analysis/history')
    },
    openHistoryRecord(item) {
      const store = useAiAnalysisStore()
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
      store.setLastResult(payload)
      this.showHistoryDrawer = false
      this.$router.push('/ai-analysis')
    },
    hasCalendarMetrics(ev) {
      return !!(ev && (ev.actual || ev.forecast || ev.previous))
    },
    displayEventTitle(ev) {
      if (!ev) return ''
      const locale = String(this.$i18n?.locale || 'zh-CN')
      const cn = ev.title_zh || ev.title || ''
      const en = ev.title_en || ''
      const src = (cn && /[\u4e00-\u9fa5]/.test(cn)) ? cn : ''
      if (locale.startsWith('zh')) {
        return cn || en || '--'
      }
      // en / other → prefer English title; fallback to local mapping of Chinese → English
      if (en) return en
      if (src && CALENDAR_ZH_TO_EN_FALLBACK[src]) return CALENDAR_ZH_TO_EN_FALLBACK[src]
      return cn || '--'
    },
    surpriseColor(surprise) {
      if (surprise === 'higher') return 'surprise-up'
      if (surprise === 'lower') return 'surprise-down'
      return ''
    },
    surpriseLabel(surprise) {
      if (surprise === 'higher') return this.$t('ai_hub.calendar_surprise_higher')
      if (surprise === 'lower') return this.$t('ai_hub.calendar_surprise_lower')
      return ''
    },
    goldImpactLabel(kind) {
      if (kind === 'bullish') return this.$t('ai_hub.calendar_gold_bullish')
      if (kind === 'bearish') return this.$t('ai_hub.calendar_gold_bearish')
      return ''
    },
    async generateRecommend() {
      if (this.creating) return
      const prompt = (this.chatPrompt || '').trim()
      if (!prompt) {
        showToast({ message: this.$t('ai_hub.chat_placeholder'), type: 'fail' })
        return
      }

      this.creating = true
      this.recommendation = null
      try {
        const res = await strategyApi.aiGenerate({
          intent: 'bot_recommend',
          prompt,
          user_prompt: prompt,
          language: this.$i18n?.locale || 'zh-CN'
        })
        const body = res?.data || res
        const rec = normalizeAiBotRecommendation(body)
        if (!rec) {
          const msg = res?.msg || body?.msg
          throw new Error(msg && String(msg).toLowerCase() !== 'success' ? String(msg) : this.$t('bot_create.ai_parse_fail'))
        }
        if (!rec.baseConfig) rec.baseConfig = {}
        if (!rec.baseConfig.symbol) rec.baseConfig.symbol = 'BTC/USDT:USDT'
        this.recommendation = rec
        this.showRecommend = true
      } catch (err) {
        showToast({ message: err?.message || this.$t('bot_create.ai_fail'), type: 'fail' })
      } finally {
        this.creating = false
      }
    },
    applyRecommendAndEdit() {
      const rec = this.recommendation
      if (!rec) return
      try {
        const preset = {
          botType: rec.botType || 'grid',
          botName: rec.botName || rec.strategyName || '',
          reason: rec.reason || rec.analysis || '',
          baseConfig: rec.baseConfig || {},
          strategyParams: rec.strategyParams || {},
          riskConfig: rec.riskConfig || {}
        }
        sessionStorage.setItem('qd_ai_strategy_preset', JSON.stringify(preset))
        if (rec.mode === 'script' && rec.strategy_code) {
          sessionStorage.setItem('qd_ai_strategy_code', rec.strategy_code)
        } else {
          sessionStorage.removeItem('qd_ai_strategy_code')
        }
      } catch {
        showToast({ message: this.$t('bot_create.ai_script_storage_fail'), type: 'fail' })
        return
      }
      this.showRecommend = false
      this.$router.push({
        path: '/trading/create/manual',
        query: { fromAi: '1' }
      })
    },
    regenerateRecommend() {
      this.showRecommend = false
      this.recommendation = null
    },
    typeLabel(type) {
      const keyMap = {
        grid: 'trading.type_grid',
        martingale: 'trading.type_martingale',
        dca: 'trading.type_dca'
      }
      if (keyMap[type]) return this.$t(keyMap[type])
      if (type === 'script') return 'Script Strategy'
      return String(type || '--')
    },
    decisionLabel(decision) {
      const d = String(decision || '').toUpperCase()
      if (d === 'BUY' || d === 'LONG') return 'BUY'
      if (d === 'SELL' || d === 'SHORT') return 'SELL'
      if (d === 'HOLD') return 'HOLD'
      return d || '-'
    },
    decisionClass(decision) {
      const d = String(decision || '').toUpperCase()
      if (['BUY', 'LONG'].includes(d)) return 'up'
      if (['SELL', 'SHORT'].includes(d)) return 'down'
      return 'neutral'
    },
    decisionIcon(decision) {
      const d = String(decision || '').toUpperCase()
      if (['BUY', 'LONG'].includes(d)) return 'arrow-up'
      if (['SELL', 'SHORT'].includes(d)) return 'arrow-down'
      return 'pause-circle-o'
    },
    formatTime(val) {
      if (!val) return ''
      const d = typeof val === 'number' ? new Date(val > 1e12 ? val : val * 1000) : new Date(val)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.ai-hub-page {
  min-height: 100%;
  padding: calc(14px + var(--safe-area-top, 0px)) 16px calc(120px + var(--safe-area-bottom, 0px));
  color: var(--text);
  background: var(--bg);
}

.nav-header {
  padding: 4px 4px 12px;
}
.nav-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.nav-top-left { min-width: 0; }
.history-tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.history-tab .van-icon { font-size: 16px; color: var(--accent); }

.nav-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.sparkle {
  color: var(--accent-gold);
  font-size: 13px;
}
.nav-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0 0 8px;
}
.nav-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
  max-width: 100%;
}

/* Macro block */
.macro-block {
  padding: 14px 14px 12px;
  margin-bottom: 14px;
}
.macro-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.macro-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}
.macro-empty {
  font-size: 12px;
  color: var(--text-3);
  padding: 8px 0;
}
.macro-empty.soft { padding-top: 0; }

.index-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 12px;
  scrollbar-width: none;
}
.index-scroll::-webkit-scrollbar { display: none; }
.index-chip {
  flex: 0 0 auto;
  min-width: 108px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ix-name { font-size: 11px; color: var(--text-3); font-weight: 600; }
.ix-price { font-size: 15px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
.ix-chg { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ix-chg.up { color: var(--up); }
.ix-chg.down { color: var(--down); }

.fg-block {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-deep);
  border: 1px solid var(--hairline);
}
.fg-label { font-size: 12px; font-weight: 700; color: var(--text-2); margin-bottom: 8px; }
.fg-gauge {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--down) 0%, var(--warn) 50%, var(--up) 100%);
  position: relative;
  overflow: visible;
}
.fg-marker {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--text);
  box-shadow: 0 0 0 2px var(--bg-elevated);
}
.fg-scale {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
}
.fg-scale strong { color: var(--text); font-size: 13px; }
.fg-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 56px;
}
.fg-class {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-2);
  text-transform: none;
  letter-spacing: 0;
}

.cal-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 4px 0 8px;
  padding: 8px 2px;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--text-2);
  border-radius: 8px;
  -webkit-tap-highlight-color: transparent;
}
.cal-head-row:active {
  background: var(--surface-raised);
}
.cal-head-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}
.cal-head-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-2);
}
.cal-head-meta {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
}
.cal-head-chev {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--text-3);
}

.cal-list { display: flex; flex-direction: column; gap: 8px; }
.cal-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.cal-time {
  flex-shrink: 0;
  width: 44px;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
}
.cal-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.cal-country {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
  padding: 2px 6px;
  border-radius: 4px;
}
.cal-title { font-size: 13px; color: var(--text); line-height: 1.35; }
.cal-head-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.cal-metrics {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-variant-numeric: tabular-nums;
}
.cm-item { display: inline-flex; align-items: baseline; gap: 4px; }
.cm-lab { font-size: 10px; color: var(--text-3); font-weight: 600; }
.cm-val { font-size: 12px; color: var(--text); font-weight: 700; }
.cm-val.surprise-up { color: var(--up); }
.cm-val.surprise-down { color: var(--down); }
.cal-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.cal-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}
.cal-tag.surprise-higher { background: var(--up-soft); color: var(--up); }
.cal-tag.surprise-lower { background: var(--down-soft); color: var(--down); }
.cal-tag.gold-bullish {
  background: rgba(250, 180, 50, 0.16);
  color: var(--accent-gold, #d49a2a);
}
.cal-tag.gold-bearish {
  background: rgba(148, 120, 60, 0.14);
  color: var(--text-2);
}
.cal-impact {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
}
.cal-impact.high { background: var(--down-soft); color: var(--down); }
.cal-impact.medium { background: var(--warn-soft); color: var(--warn); }
.cal-impact.low { background: var(--c-slate-soft); color: var(--c-slate); }

/* Feature card */
.feature-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}
.feat-card {
  position: relative;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  transition: transform 0.15s;
}
.feat-card:active { transform: scale(0.98); }
.feat-card.analysis::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(280px 200px at 0% 0%, var(--accent-crimson-soft), transparent 62%);
}
.feat-body {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}
.feat-icon {
  width: 48px; height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  background: var(--c-red);
  color: #ffffff;
  border: 1px solid transparent;
}
.feat-copy { flex: 1; min-width: 0; }
.feat-title {
  display: block;
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 5px;
}
.feat-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.feat-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--c-red);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

/* Chat card */
.chat-card {
  padding: 16px 14px 14px;
  margin-bottom: 20px;
}
.chat-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.chat-head-icon {
  font-size: 28px;
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
  padding: 10px;
  border-radius: 14px;
}
.chat-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}
.chat-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.chat-field {
  margin-bottom: 10px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
:deep(.chat-field .van-field__control) {
  min-height: 72px;
  font-size: 14px;
  line-height: 1.5;
}

.quick-row { margin-bottom: 12px; }
.quick-lab {
  display: block;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}
.quick-chips { display: flex; flex-direction: column; gap: 6px; }
.qc {
  font-size: 12px;
  color: var(--text-2);
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--hairline);
  line-height: 1.4;
  cursor: pointer;
}
.qc:active { border-color: var(--accent); }

.chat-send { height: 46px; font-weight: 700; font-size: 15px; }
.chat-hint {
  margin: 10px 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.45;
}

/* Section + tips */
.ios-section { margin-bottom: 22px; }
.ios-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 10px;
}
.ios-section-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}
.tips-card {
  background: var(--surface-glass);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}
.tip-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 13px 14px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
  position: relative;
}
.tip-row + .tip-row::before {
  content: '';
  position: absolute;
  left: 48px; right: 0; top: 0;
  height: 1px;
  background: var(--hairline);
}
.bulb {
  width: 22px; height: 22px;
  flex-shrink: 0;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-grad);
  color: var(--on-accent);
  font-size: 11px;
  font-weight: 800;
}

/* History drawer */
.history-popup :deep(.van-popup) {
  display: flex;
  flex-direction: column;
}
.drawer-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  padding-top: var(--safe-area-top, 0px);
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--hairline);
}
.drawer-title { font-size: 17px; font-weight: 800; color: var(--text); }
.drawer-close { font-size: 20px; color: var(--text-2); padding: 4px; }
.drawer-loading { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px calc(16px + var(--safe-area-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drawer-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-3);
  font-size: 13px;
  padding: 40px 16px;
}
.drawer-empty .van-icon { font-size: 36px; color: var(--text-4); }
.drawer-list { display: flex; flex-direction: column; gap: 8px; }
.drawer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  transition: background 0.15s;
}
.drawer-row:active { background: var(--accent-soft); }
.dr-icon {
  width: 32px; height: 32px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  background: var(--surface-deep);
  color: var(--text-2);
}
.dr-icon.up { background: var(--up-soft); color: var(--up); }
.dr-icon.down { background: var(--down-soft); color: var(--down); }
.dr-icon.neutral { background: var(--surface-raised); color: var(--text-2); }
.dr-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dr-title { font-size: 14px; font-weight: 700; color: var(--text); }
.dr-sub { font-size: 11px; color: var(--text-3); }
.dr-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
}
.dr-badge.up { background: var(--up-soft); color: var(--up); }
.dr-badge.down { background: var(--down-soft); color: var(--down); }
.dr-badge.neutral { background: var(--surface-deep); color: var(--text-2); }
.drawer-more { margin-top: 4px; font-weight: 600; }

/* Recommend popup */
.recommend-popup :deep(.van-popup) {
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
}
.recommend-sheet {
  display: flex;
  flex-direction: column;
  max-height: 82vh;
}
.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--hairline);
}
.recommend-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}
.recommend-close {
  font-size: 18px;
  color: var(--text-2);
  padding: 4px;
}
.recommend-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 6px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.recommend-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.3;
}
.recommend-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.recommend-badges .badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-deep);
  color: var(--text-2);
  font-weight: 700;
}
.recommend-badges .badge.type {
  background: var(--accent-soft, rgba(99,102,241,.12));
  color: var(--accent, #6366f1);
}
.recommend-badges .badge.script {
  background: rgba(59,130,246,.12);
  color: #2563eb;
}
.rec-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  margin-bottom: 6px;
}
.recommend-reason p {
  margin: 0;
  font-size: 13px;
  color: var(--text);
  line-height: 1.55;
}
.rec-block {
  background: var(--surface-raised);
  border-radius: 10px;
  padding: 10px 12px;
}
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.param-item {
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 0;
}
.param-key {
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 2px;
  word-break: break-all;
}
.param-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  word-break: break-all;
}
.code-pre {
  margin: 0;
  padding: 10px;
  background: var(--bg-elevated);
  border-radius: 8px;
  font-size: 11px;
  color: var(--text);
  max-height: 200px;
  overflow: auto;
  white-space: pre;
}
.recommend-actions {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 10px;
  padding: 12px 16px calc(12px + var(--safe-area-bottom, 0px));
  border-top: 1px solid var(--hairline);
  background: var(--bg-elevated);
}
</style>
