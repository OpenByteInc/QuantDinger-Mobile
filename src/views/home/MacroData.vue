<template>
  <div class="macro-page">
    <van-nav-bar
      title="宏观数据"
      left-arrow
      @click-left="$router.back()"
      :border="false"
    />
    
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="content">
        <!-- 市场概览 -->
        <div class="section">
          <div class="section-title">市场指数</div>
          <div class="index-grid">
            <div class="index-card" v-for="index in indices" :key="index.symbol">
              <span class="name">{{ index.name }}</span>
              <span class="value">{{ index.price }}</span>
              <span :class="['change', index.change >= 0 ? 'up' : 'down']">
                {{ index.change >= 0 ? '+' : '' }}{{ index.change_percent?.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>
        
        <!-- 市场情绪 -->
        <div class="section" v-if="sentiment">
          <div class="section-title">市场情绪</div>
          <div class="sentiment-card">
            <div class="fear-greed">
              <div class="gauge">
                <div class="gauge-value" :style="{ width: sentiment.fear_greed + '%' }"></div>
              </div>
              <div class="labels">
                <span>极度恐惧</span>
                <span class="value">{{ sentiment.fear_greed }}</span>
                <span>极度贪婪</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 经济日历 -->
        <div class="section">
          <div class="section-title">今日财经事件</div>
          <div class="calendar-list">
            <div class="calendar-item" v-for="event in calendar" :key="event.id">
              <div class="event-time">{{ event.time }}</div>
              <div class="event-content">
                <span class="country">{{ event.country }}</span>
                <span class="title">{{ event.title }}</span>
                <div class="values" v-if="event.actual !== undefined">
                  <span>实际: {{ event.actual }}</span>
                  <span>预期: {{ event.forecast }}</span>
                  <span>前值: {{ event.previous }}</span>
                </div>
              </div>
              <div :class="['impact', event.impact]">{{ getImpactText(event.impact) }}</div>
            </div>
            
            <van-empty v-if="calendar.length === 0 && !loading" description="暂无事件" />
          </div>
        </div>
      </div>
    </van-pull-refresh>
    
    <van-loading v-if="loading" class="page-loading" vertical>加载中...</van-loading>
  </div>
</template>

<script>
import { globalMarketApi } from '@/api'

export default {
  name: 'MacroData',
  
  data() {
    return {
      loading: false,
      refreshing: false,
      indices: [],
      sentiment: null,
      calendar: []
    }
  },
  
  mounted() {
    this.loadData()
  },
  
  methods: {
    async loadData() {
      this.loading = true
      
      try {
        const [overviewRes, calendarRes, sentimentRes] = await Promise.all([
          globalMarketApi.getOverview(),
          globalMarketApi.getCalendar({ limit: 10 }),
          globalMarketApi.getSentiment()
        ])
        
        if (overviewRes.code === 1 && overviewRes.data) {
          this.indices = overviewRes.data.indices || []
        }
        
        if (Array.isArray(calendarRes?.data)) {
          this.calendar = calendarRes.data
        } else {
          this.calendar = []
        }
        
        const s = sentimentRes?.data
        if (s && typeof s === 'object' && s.fear_greed != null && Number.isFinite(Number(s.fear_greed))) {
          this.sentiment = s
        } else {
          this.sentiment = null
        }
      } catch (err) {
        console.error('Load macro data error:', err)
      } finally {
        this.loading = false
      }
    },
    
    async onRefresh() {
      await this.loadData()
      this.refreshing = false
    },
    
    getImpactText(impact) {
      const map = { high: '高', medium: '中', low: '低' }
      return map[impact] || impact
    }
  }
}
</script>

<style scoped>
.macro-page {
  min-height: 100vh;
  background: transparent;
}

.macro-page :deep(.van-nav-bar) { background: transparent; }
.macro-page :deep(.van-nav-bar__title),
.macro-page :deep(.van-nav-bar__arrow),
.macro-page :deep(.van-nav-bar .van-icon) { color: var(--text); }

.content {
  padding: 16px;
  padding-bottom: 80px;
}

.section { margin-bottom: 24px; }

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}

.index-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.index-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.index-card .name { font-size: 13px; color: var(--text-2); }
.index-card .value { font-size: 18px; font-weight: 700; color: var(--text); }
.index-card .change { font-size: 13px; }
.index-card .change.up { color: var(--up); }
.index-card .change.down { color: var(--down); }

.sentiment-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

.fear-greed .gauge {
  height: 8px;
  background: linear-gradient(90deg, var(--down) 0%, var(--warn) 50%, var(--up) 100%);
  border-radius: 4px;
  position: relative;
  margin-bottom: 8px;
}

.fear-greed .gauge-value {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  background: var(--text);
  border-radius: 2px;
}

.fear-greed .labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-3);
}

.fear-greed .labels .value {
  font-weight: 700;
  color: var(--text);
}

.calendar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
}

.event-time {
  font-size: 12px;
  color: var(--text-3);
  min-width: 50px;
}

.event-content { flex: 1; }

.event-content .country {
  display: inline-block;
  font-size: 11px;
  color: var(--c-indigo);
  background: var(--c-indigo-soft);
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.event-content .title {
  display: block;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 4px;
}

.event-content .values {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-3);
}

.impact {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.impact.high   { background: var(--down-soft);   color: var(--down); }
.impact.medium { background: var(--warn-soft);   color: var(--warn); }
.impact.low    { background: var(--c-slate-soft); color: var(--c-slate); }

.page-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text);
}
</style>
