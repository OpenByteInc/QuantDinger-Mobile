<template>
  <div class="ai-copilot-page">
    <div class="top-bar">
      <button type="button" class="new-chat" :disabled="sending" :aria-label="text.newChat" @click="newChat"><van-icon name="plus" /></button>
      <button type="button" class="context-chip" :aria-label="text.selectSymbol" @click="showSymbolPicker = true">
        <span class="context-identity">
          <strong>{{ context.symbol }}</strong>
          <em>{{ context.market }} · {{ context.timeframe }}</em>
        </span>
        <span class="context-quote">
          <strong v-if="contextQuote.price != null">{{ formatMarketPrice(contextQuote.price) }}</strong>
          <em v-if="contextQuote.changePercent != null" :class="Number(contextQuote.changePercent) >= 0 ? 'up' : 'down'">
            {{ Number(contextQuote.changePercent) >= 0 ? '+' : '' }}{{ Number(contextQuote.changePercent).toFixed(2) }}%
          </em>
        </span>
        <span class="context-switch"><van-icon name="arrow-down" /></span>
      </button>
      <button type="button" class="history-btn" :aria-label="text.sessions" @click="openHistoryDrawer">
        <van-icon name="clock-o" />
      </button>
    </div>

    <div :class="['copilot-body', { empty: !messages.length }]">
      <div class="chat-panel">
        <div v-if="!messages.length" class="welcome-card">
          <div class="welcome-title-row">
            <small>{{ text.workspaceEyebrow }}</small>
            <span>{{ text.emptyTitle }}</span>
            <em>{{ text.emptyDesc }}</em>
          </div>
          <button type="button" class="report-feature-card" :disabled="sending || !context.symbol" @click="confirmProfessionalAnalysis">
            <span class="report-feature-icon"><van-icon name="description" /></span>
            <span>
              <strong>{{ text.professionalReport }}</strong>
              <em>{{ text.professionalReportDesc }}</em>
            </span>
            <van-icon name="arrow" />
          </button>
          <div class="starter-grid">
            <button
              v-for="example in examples"
              :key="example.key"
              type="button"
              @click="composer = example.prompt"
            >
              <span class="starter-icon"><van-icon :name="example.icon" /></span>
              <span>
                <strong>{{ example.title }}</strong>
                <em>{{ example.description }}</em>
              </span>
            </button>
          </div>
        </div>

        <div v-else ref="messageList" class="message-list">
          <div
            v-for="msg in messages"
            :key="msg.localId || msg.id"
            :class="['message-row', msg.role]"
          >
            <div class="bubble-wrap">
              <div :class="['bubble', { 'report-bubble': msg.report || msg.reportLoading || msg.reportError }]">
                <div v-if="msg.attachments?.length" class="attachment-preview">
                  <button
                    v-for="att in msg.attachments"
                    :key="att.name || att.data_url"
                    type="button"
                    class="attachment-card"
                    @click="previewAttachment(att)"
                  >
                    <img v-if="isImageAttachment(att)" :src="att.data_url" :alt="att.name || text.imageAttached" />
                    <span class="attachment-fallback" v-else>
                      <van-icon name="photo-o" />
                    </span>
                    <em>
                      <van-icon name="photo-o" />
                      {{ att.name || text.imageAttached }}
                    </em>
                  </button>
                </div>
                <div
                  v-if="msg.report || msg.reportLoading || msg.reportError"
                  :class="['analysis-report-card', reportTone(msg.report), { loading: msg.reportLoading, error: msg.reportError }]"
                >
                  <div v-if="msg.reportLoading" class="report-loading">
                    <van-loading size="20" />
                    <span>{{ $t('ai_analysis.analyzing') }}</span>
                    <small>{{ $t('ai_analysis.please_wait') }}</small>
                  </div>
                  <div v-else-if="msg.reportError" class="report-error">
                    <van-icon name="warning-o" />
                    <strong>{{ $t('ai_analysis.error_tip') }}</strong>
                    <p>{{ msg.reportError }}</p>
                    <button type="button" @click="retryProfessionalAnalysis(msg)">
                      {{ $t('ai_analysis.retry') }}
                    </button>
                  </div>
                  <div v-else-if="!reportArtifact(msg.report)" class="report-error">
                    <van-icon name="warning-o" />
                    <strong>{{ $t('professional_report.contract_required') }}</strong>
                    <p>{{ $t('professional_report.contract_required_desc') }}</p>
                    <button type="button" @click="retryProfessionalAnalysis(msg)">
                      {{ $t('professional_report.regenerate') }}
                    </button>
                  </div>
                  <template v-else>
                    <div class="report-head">
                      <div>
                        <span>{{ reportMarketLabel(msg.report) }}</span>
                        <strong>
                          {{ reportDecisionLabel(msg.report) }}
                          <small :class="['report-bias', reportBiasTone(msg.report)]">{{ reportBiasLabel(msg.report) }}</small>
                        </strong>
                      </div>
                      <em>{{ reportConfidence(msg.report) }}</em>
                    </div>
                    <p class="report-summary">{{ reportSummary(msg.report) }}</p>
                    <div v-if="reportPlanIsCandidate(msg.report)" class="report-candidate-label">
                      <van-icon name="eye-o" />
                      {{ $t('professional_report.candidate_setup') }}
                    </div>
                    <div class="report-plan">
                      <div>
                        <span>{{ $t('ai_analysis.entry') }}</span>
                        <strong>{{ reportPlanValue(msg.report, 'entry') }}</strong>
                      </div>
                      <div>
                        <span>{{ $t('ai_analysis.stop_loss') }}</span>
                        <strong>{{ reportPlanValue(msg.report, 'stop') }}</strong>
                      </div>
                      <div>
                        <span>{{ $t('ai_analysis.take_profit') }}</span>
                        <strong>{{ reportPlanValue(msg.report, 'take') }}</strong>
                      </div>
                      <div>
                        <span>{{ text.riskReward }}</span>
                        <strong>{{ reportRiskReward(msg.report) }}</strong>
                      </div>
                    </div>
                    <div v-if="reportHasRrWarning(msg.report)" class="report-rr-warning">
                      <van-icon name="warning-o" />
                      <span>{{ text.riskRewardWarning }}</span>
                    </div>
                    <div class="report-scores">
                      <span>{{ $t('ai_analysis.score_technical') }} {{ reportScore(msg.report, 'technical') }}</span>
                      <span>{{ $t('professional_report.coverage') }} {{ reportQualityRatio(msg.report, 'coverage_ratio') }}</span>
                      <span>{{ $t('professional_report.freshness') }} {{ reportQualityRatio(msg.report, 'freshness_ratio') }}</span>
                    </div>
                    <div class="report-actions">
                      <button type="button" @click="openFullReport(msg.report)">
                        <van-icon name="description" />
                        {{ $t('ai_analysis.detailed_title') }}
                      </button>
                      <button type="button" :disabled="!reportReferenceId(msg)" @click="askAboutReport(msg)">
                        <van-icon name="chat-o" />
                        {{ text.askReport }}
                      </button>
                    </div>
                  </template>
                </div>
                <div v-if="msg.content" class="markdown-body">
                  <template v-for="(block, idx) in renderMarkdown(msg.content)" :key="idx">
                    <div v-if="block.type === 'html'" v-html="block.html"></div>
                    <div v-else class="code-block">
                      <div class="code-head">
                        <span>{{ block.lang || 'code' }}</span>
                        <button type="button" @click="copyText(block.code)">
                          <van-icon name="records" />
                          {{ text.copy }}
                        </button>
                      </div>
                      <pre><code>{{ block.code }}</code></pre>
                    </div>
                  </template>
                </div>
                <div v-if="msg.streamWarning" class="stream-warning">
                  <van-icon name="warning-o" />
                  <span>{{ msg.streamWarning }}</span>
                </div>
                <van-loading v-if="msg.loading" size="18" />
              </div>
              <div v-if="msg.role === 'assistant' && msg.content && !msg.loading" class="bubble-tools">
                <button type="button" @click="copyText(msg.content)">
                  <van-icon name="records" />
                  {{ text.copy }}
                </button>
              </div>
              <div v-if="agentUsageItems(msg).length" class="agent-usage">
                <span class="agent-usage-title">
                  <van-icon name="cluster-o" />
                  {{ agentUsageLabel(msg) }}
                </span>
                <span
                  v-for="item in agentUsageItems(msg)"
                  :key="`${item.kind}-${item.id}`"
                  :class="['agent-usage-chip', `agent-usage-chip--${item.kind}`]"
                >
                  {{ item.label }}
                </span>
              </div>
              <div v-if="visibleMessageActions(msg).length" class="action-strip">
                <button
                  v-for="action in visibleMessageActions(msg)"
                  :key="action.type + action.label"
                  type="button"
                  @click="handleCopilotAction(action)"
                >
                  {{ action.label || action.type }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ask-card">
        <div v-if="draftReferencedReportId" class="report-reference-chip">
          <van-icon name="link-o" />
          <span>{{ text.reportReferenceReady }}</span>
          <button type="button" :aria-label="text.cancelReportReference" @click="draftReferencedReportId = null">
            <van-icon name="cross" />
          </button>
        </div>

        <textarea
          :value="composer"
          :placeholder="text.placeholder"
          rows="2"
          inputmode="text"
          enterkeyhint="send"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          @compositionstart="handleComposerCompositionStart"
          @compositionend="handleComposerCompositionEnd"
          @input="handleComposerInput"
          @keydown="handleComposerKeydown"
        />

        <div v-if="attachments.length" class="pending-attachments">
          <span v-for="att in attachments" :key="att.name" class="pending-chip">
            <van-icon name="photo-o" />
            {{ att.name }}
            <van-icon name="cross" @click="removeAttachment(att)" />
          </span>
        </div>

        <div class="composer-actions">
          <div class="left-actions">
            <button type="button" class="icon-action image" @click="triggerImageUpload" :aria-label="text.uploadImage">
              <van-icon name="photo-o" />
            </button>
            <button type="button" class="memory-action" @click="openMemoryPanel">
              <van-icon name="bulb-o" />
              <span>{{ text.memoryTitle }}</span>
              <em v-if="hasSessionMemory" aria-hidden="true"></em>
            </button>
          </div>
          <button
            type="button"
            class="send-action"
            :aria-label="text.send"
            :disabled="sending || !canSend"
            @click="sendMessage"
          >
            <van-loading v-if="sending" size="16" />
            <template v-else>{{ text.send }}</template>
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="onImageSelected"
    />

    <SymbolPicker
      v-model:show="showSymbolPicker"
      :default-market="context.market"
      :title="text.selectSymbol"
      @pick="onSymbolPicked"
    />

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
          <span>{{ text.sessions }}</span>
          <van-icon name="cross" @click="showHistoryDrawer = false" />
        </div>
        <div v-if="loadingSessions" class="drawer-loading">
          <van-loading vertical>{{ text.loading }}</van-loading>
        </div>
        <div v-else class="drawer-body">
          <div v-if="!sessions.length" class="drawer-empty">
            <van-icon name="records" />
            <span>{{ text.noSessions }}</span>
          </div>
          <template v-else>
            <div
              v-for="session in sessions"
              :key="session.id"
              :class="['session-row', { active: Number(session.id) === Number(sessionId) }]"
            >
              <button type="button" class="session-main" @click="loadSession(session)">
                <strong>{{ session.title || text.newChat }}</strong>
                <em>{{ session.context_market || context.market }}:{{ session.context_symbol || '--' }}</em>
              </button>
              <div class="session-meta">
                <small>{{ formatTime(session.updated_at || session.created_at) }}</small>
                <button
                  type="button"
                  class="session-delete-btn"
                  :disabled="deletingSessionId === session.id"
                  :aria-label="text.deleteSession"
                  @click.stop="deleteSession(session)"
                >
                  <van-loading v-if="deletingSessionId === session.id" size="13" />
                  <van-icon v-else name="delete-o" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="memoryVisible"
      position="bottom"
      class="memory-popup"
      :style="{ maxHeight: '78vh' }"
      teleport="body"
      round
      safe-area-inset-bottom
    >
      <div class="memory-sheet">
        <div class="drawer-head">
          <span>{{ text.memoryTitle }}</span>
          <van-icon name="cross" @click="memoryVisible = false" />
        </div>
        <div v-if="loadingMemory" class="drawer-loading">
          <van-loading vertical>{{ text.loading }}</van-loading>
        </div>
        <template v-else>
          <section class="memory-section">
            <div class="memory-section-head">
              <div>
                <strong>{{ text.sessionMemory }}</strong>
                <small>{{ text.sessionMemoryHint }}</small>
              </div>
              <button v-if="sessionId" type="button" @click="clearCurrentSessionMemory">{{ text.clearMemory }}</button>
            </div>
            <div v-if="hasSessionMemory" class="memory-summary-grid">
              <div><span>{{ text.memoryTarget }}</span><strong>{{ sessionMemoryTarget }}</strong></div>
              <div><span>{{ text.memoryWorkflow }}</span><strong>{{ sessionMemoryWorkflow }}</strong></div>
            </div>
            <div v-if="sessionMemoryConstraints.length" class="memory-constraints">
              <span v-for="item in sessionMemoryConstraints" :key="item">{{ item }}</span>
            </div>
            <div v-if="latestContextUsage" class="context-usage-grid">
              <div><span>{{ text.inputTokens }}</span><strong>{{ latestContextUsage.estimated_input_tokens || 0 }}</strong></div>
              <div><span>{{ text.historyCount }}</span><strong>{{ latestContextUsage.history_message_count || 0 }}</strong></div>
              <div><span>{{ text.memoryCount }}</span><strong>{{ latestContextUsage.memory_count || 0 }}</strong></div>
              <div><span>{{ text.contextState }}</span><strong>{{ latestContextUsage.context_truncated ? text.contextCompacted : text.contextNormal }}</strong></div>
            </div>
            <div v-if="!hasSessionMemory && !latestContextUsage" class="memory-empty">{{ text.sessionMemoryEmpty }}</div>
          </section>

          <section class="memory-section">
            <div class="memory-section-head">
              <div>
                <strong>{{ text.longTermMemory }}</strong>
                <small>{{ text.longTermMemoryHint }}</small>
              </div>
            </div>
            <div v-if="!userMemories.length" class="memory-empty">{{ text.longTermMemoryEmpty }}</div>
            <div v-else class="long-term-memory-list">
              <div v-for="item in userMemories" :key="item.id" class="long-term-memory-item">
                <input v-model="item.title" :aria-label="text.memoryTitleField">
                <textarea v-model="item.content" rows="2" :aria-label="text.memoryContentField"></textarea>
                <div>
                  <button type="button" @click="saveMemory(item)">{{ text.saveMemory }}</button>
                  <button type="button" class="danger" @click="removeMemory(item)">{{ text.deleteMemory }}</button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { showConfirmDialog, showImagePreview, showToast } from 'vant'
import {
  aiAnalysisApi,
  aiChatApi,
  klineApi
} from '@/api'
import { useAiAnalysisStore } from '@/stores'
import SymbolPicker from '@/components/SymbolPicker.vue'
import {
  professionalReportArtifact,
  professionalReportEnvelope,
  reportHasRiskRewardWarning,
  reportInstrument,
  reportRiskReward as professionalRiskReward
} from '@/utils/professionalReport'


export default {
  name: 'AiHub',
  components: { SymbolPicker },
  data() {
    return {
      context: {
        market: 'Crypto',
        symbol: 'BTC/USDT',
        timeframe: '1H'
      },
      composer: '',
      messages: [],
      attachments: [],
      sending: false,
      sessionId: null,
      sessionLoadToken: 0,
      sessions: [],
      loadingSessions: false,
      deletingSessionId: null,
      showHistoryDrawer: false,
      showSymbolPicker: false,
      memoryVisible: false,
      loadingMemory: false,
      sessionMemory: { summary: {}, recent_requests: [], version: 0 },
      userMemories: [],
      contextUsage: null,
      draftReferencedReportId: null,
      isComposerComposing: false,
      composerTask: null,
      contextQuote: { price: null, changePercent: null },
      quoteTimer: null
    }
  },
  computed: {
    text() { return this.$tm('ai_chat') },
    canSend() {
      return Boolean((this.composer || '').trim() || this.attachments.length)
    },
    sessionMemorySummary() {
      return this.sessionMemory?.summary?.summary || this.sessionMemory?.summary || {}
    },
    hasSessionMemory() {
      return Boolean(Object.keys(this.sessionMemorySummary || {}).length)
    },
    sessionMemoryTarget() {
      const target = this.sessionMemorySummary?.selected_target || {}
      return [target.market, target.symbol].filter(Boolean).join(':') || '--'
    },
    sessionMemoryWorkflow() {
      return this.sessionMemorySummary?.active_workflow || '--'
    },
    sessionMemoryConstraints() {
      return Array.isArray(this.sessionMemorySummary?.stable_constraints)
        ? this.sessionMemorySummary.stable_constraints.slice(0, 6)
        : []
    },
    latestContextUsage() {
      return this.contextUsage || this.sessionMemory?.recent_requests?.[0] || null
    },
    examples() {
      const label = `${this.context.market}:${this.context.symbol}`
      const locale = this.$i18n?.locale || 'zh-CN'
      const isZh = locale.startsWith('zh')
      if (isZh) {
        return [
          { key: 'diagnose', icon: 'chart-trending-o', title: this.text.quickDiagnose, description: this.text.quickDiagnoseDesc, prompt: `请诊断 ${label} 趋势，给出关键支撑阻力和失效条件。` },
          { key: 'news', icon: 'newspaper-o', title: this.text.quickNews, description: this.text.quickNewsDesc, prompt: `请检索 ${label} 最近新闻和事件，区分事实、解读和不确定性。` },
          { key: 'risk', icon: 'warning-o', title: this.text.quickRisk, description: this.text.quickRiskDesc, prompt: `帮我扫描 ${label} 未来 24 小时机会和风险，给出触发条件。` }
        ]
      }
      return [
        { key: 'diagnose', icon: 'chart-trending-o', title: this.text.quickDiagnose, description: this.text.quickDiagnoseDesc, prompt: `Diagnose ${label}: trend, levels, and invalidation.` },
        { key: 'news', icon: 'newspaper-o', title: this.text.quickNews, description: this.text.quickNewsDesc, prompt: `Research recent news and events for ${label}, separating facts from interpretation.` },
        { key: 'risk', icon: 'warning-o', title: this.text.quickRisk, description: this.text.quickRiskDesc, prompt: `Scan ${label} for opportunities and risks in the next 24 hours, with triggers.` }
      ]
    }
  },
  mounted() {
    this.applyRouteContext()
    this.refreshContextQuote()
    this.startQuoteRefresh()
  },
  activated() {
    this.applyRouteContext()
    this.refreshContextQuote()
    this.startQuoteRefresh()
  },
  deactivated() {
    this.stopQuoteRefresh()
  },
  beforeUnmount() {
    this.stopQuoteRefresh()
  },
  methods: {
    applyRouteContext() {
      const query = this.$route?.query || {}
      if (query.market) this.context.market = String(query.market)
      if (query.symbol) this.context.symbol = String(query.symbol)
      if (query.timeframe) this.context.timeframe = String(query.timeframe)
    },
    async refreshContextQuote() {
      if (!this.context.market || !this.context.symbol) return
      try {
        const response = await klineApi.getPrice({ market: this.context.market, symbol: this.context.symbol })
        const row = response?.data || {}
        const change = row.changePercent ?? row.change_percent ?? row.change_rate
        this.contextQuote = {
          price: Number.isFinite(Number(row.price)) ? Number(row.price) : null,
          changePercent: Number.isFinite(Number(change)) ? Number(change) : null
        }
      } catch {
        this.contextQuote = { price: null, changePercent: null }
      }
    },
    startQuoteRefresh() {
      this.stopQuoteRefresh()
      this.quoteTimer = window.setInterval(() => this.refreshContextQuote(), 20000)
    },
    stopQuoteRefresh() {
      if (this.quoteTimer) window.clearInterval(this.quoteTimer)
      this.quoteTimer = null
    },
    formatMarketPrice(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      const digits = Math.abs(number) < 1 ? 6 : 2
      return number.toLocaleString(undefined, { maximumFractionDigits: digits })
    },
    newChat() { if (this.sending) return; this.sessionId = null; this.messages = []; this.composer = ''; this.attachments = []; this.composerTask = null; this.draftReferencedReportId = null; this.sessionMemory = null; this.contextUsage = null; this.sessionLoadToken++ },
    escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    renderMarkdown(content) {
      const text = String(content || '')
      const blocks = []
      const fence = /```(\w+)?\n([\s\S]*?)```/g
      let lastIndex = 0
      let match
      while ((match = fence.exec(text))) {
        if (match.index > lastIndex) {
          blocks.push({ type: 'html', html: this.renderMarkdownText(text.slice(lastIndex, match.index)) })
        }
        blocks.push({ type: 'code', lang: match[1] || '', code: match[2].replace(/\n$/, '') })
        lastIndex = fence.lastIndex
      }
      if (lastIndex < text.length) {
        blocks.push({ type: 'html', html: this.renderMarkdownText(text.slice(lastIndex)) })
      }
      return blocks.filter((block) => block.type === 'code' || block.html)
    },
    renderMarkdownText(text) {
      const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
      const html = []
      let listType = ''
      let quoteLines = []
      let paragraph = []
      const flushParagraph = () => {
        if (!paragraph.length) return
        html.push(`<p>${paragraph.map((line) => this.renderInlineMarkdown(line)).join('<br>')}</p>`)
        paragraph = []
      }
      const flushList = () => {
        if (!listType) return
        html.push(`</${listType}>`)
        listType = ''
      }
      const flushQuote = () => {
        if (!quoteLines.length) return
        html.push(`<blockquote>${quoteLines.map((line) => this.renderInlineMarkdown(line)).join('<br>')}</blockquote>`)
        quoteLines = []
      }

      lines.forEach((raw) => {
        const line = raw.trimEnd()
        if (!line.trim()) {
          flushParagraph()
          flushList()
          flushQuote()
          return
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/)
        if (heading) {
          flushParagraph()
          flushList()
          flushQuote()
          const level = heading[1].length + 2
          html.push(`<h${level}>${this.renderInlineMarkdown(heading[2])}</h${level}>`)
          return
        }

        const quote = line.match(/^>\s?(.*)$/)
        if (quote) {
          flushParagraph()
          flushList()
          quoteLines.push(quote[1])
          return
        }

        const ordered = line.match(/^\d+[.)]\s+(.+)$/)
        const unordered = line.match(/^[-*]\s+(.+)$/)
        if (ordered || unordered) {
          flushParagraph()
          flushQuote()
          const nextType = ordered ? 'ol' : 'ul'
          if (listType !== nextType) {
            flushList()
            listType = nextType
            html.push(`<${listType}>`)
          }
          html.push(`<li>${this.renderInlineMarkdown((ordered || unordered)[1])}</li>`)
          return
        }

        flushList()
        flushQuote()
        paragraph.push(line)
      })

      flushParagraph()
      flushList()
      flushQuote()
      return html.join('')
    },
    renderInlineMarkdown(value) {
      return this.escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    },
    async copyText(text) {
      const value = String(text || '')
      if (!value) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = value
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        showToast(this.text.copied)
      } catch (err) {
        showToast({ message: this.text.copyFailed, type: 'fail' })
      }
    },
    taskPrompt(task) {
      const label = `${this.context.market}:${this.context.symbol}`
      const locale = this.$i18n?.locale || 'zh-CN'
      const isZh = locale.startsWith('zh')
      const prompts = isZh
        ? {
          diagnose: `请诊断 ${label}。从趋势、量能、支撑阻力、资金面、风险回报比和失效条件给出可执行判断。`,
            research: `请研究 ${label} 当前市场状态：数据截止时间、趋势、相对强弱、主要驱动、风险和值得继续验证的问题。`,
            technical: `请对 ${label} 做技术分析：趋势结构、动量、成交量、支撑阻力、多周期确认和失效条件。`,
            plan: `请为 ${label} 制定一份非强制的交易计划：方向、触发条件、入场、止损、止盈、风险收益比、仓位风险和观望条件。`,
            chart: '我会上传一张 K 线图。请结合图形结构、趋势位置、量能、支撑阻力和风险回报比，判断目前是否适合进场，并给出止损、止盈和失效条件。',
            news: `请检索 ${label} 最近的新闻和事件，优先使用可靠且最新的来源，区分事实、市场解读和不确定性。`,
            macro: `请检查 CPI、FOMC、利率、GDP、PCE、就业、流动性等宏观数据，说明对 ${label} 的潜在影响和关键风险。`,
            radar: `请扫描 ${label} 未来 24 小时可能出现的机会，重点给出触发条件、确认信号、失效位和主要风险。`
          }
        : {
          diagnose: `Diagnose ${label}: trend, momentum, support/resistance, liquidity, risk/reward, and invalidation.`,
            research: `Research ${label}: data cutoff, market regime, relative strength, key drivers, risks, and questions that still need verification.`,
            technical: `Analyze ${label} technically: structure, momentum, volume, support/resistance, multi-timeframe confirmation, and invalidation.`,
            plan: `Build a non-mandatory trade plan for ${label}: direction, triggers, entry, stop, targets, risk/reward, position risk, and when to wait.`,
            chart: 'I will upload a chart image. Judge structure, trend, volume, support/resistance, risk/reward, entry, stop loss, take profit, and invalidation.',
            news: `Search recent news and events for ${label}. Prioritize reliable recent sources and separate facts, interpretation, and uncertainty.`,
            macro: `Analyze the macro backdrop for ${label}: CPI, FOMC, rates, GDP, PCE, employment, liquidity, and market impact.`,
            radar: `Scan ${label} for likely opportunities in the next 24 hours, with triggers, confirmation, invalidation, and risks.`
          }
      return prompts[task.key] || prompts.diagnose
    },
    handleComposerCompositionStart() {
      this.isComposerComposing = true
    },
    handleComposerCompositionEnd(event) {
      this.isComposerComposing = false
      this.composer = event?.target?.value ?? ''
      this.composerTask = null
    },
    handleComposerInput(event) {
      if (this.isComposerComposing || event?.isComposing) return
      this.composer = event?.target?.value ?? ''
      this.composerTask = null
    },
    handleComposerKeydown(event) {
      if (event.key !== 'Enter' || event.shiftKey) return
      if (this.isComposerComposing || event.isComposing || event.keyCode === 229) return
      event.preventDefault()
      this.sendMessage()
    },
    async sendMessage() {
      if (!this.canSend || this.sending) {
        if (!this.canSend) showToast({ message: this.text.promptNeeded, type: 'fail' })
        return
      }
      const content = (this.composer || '').trim()
      const outboundAttachments = this.attachments.slice()
      const task = this.composerTask
      const referencedReportId = this.draftReferencedReportId
      this.composerTask = null
      const userMsg = {
        localId: `u-${Date.now()}`,
        role: 'user',
        content: content || this.text.imageAttached,
        attachments: outboundAttachments
      }
      const pendingMsg = {
        localId: `a-${Date.now()}`,
        role: 'assistant',
        content: this.text.sending,
        loading: true
      }
      this.messages.push(userMsg, pendingMsg)
      this.composer = ''
      this.attachments = []
      this.sending = true
      this.scrollToBottom()
      try {
        if (task?.mode === 'analysis') {
          pendingMsg.content = ''
          pendingMsg.loading = false
          pendingMsg.reportLoading = true
          pendingMsg.reportTarget = this.analysisTarget()
          pendingMsg.report = await this.fetchProfessionalAnalysis(pendingMsg.reportTarget)
          pendingMsg.reportError = ''
        } else {
          const payload = {
            session_id: this.sessionId,
            message: content,
            attachments: outboundAttachments,
            language: this.$i18n?.locale || 'zh-CN',
            referenced_report_id: referencedReportId || null,
            context: {
              ...this.buildChatContext(),
              selected_task: task?.key || null
            }
          }
          await this.sendMessageReliable(payload, pendingMsg)
          if (this.draftReferencedReportId === referencedReportId) this.draftReferencedReportId = null
          await this.loadSessionMemory()
        }
      } catch (err) {
        if (pendingMsg.reportLoading) {
          pendingMsg.reportError = err?.response?.data?.msg || err?.message || this.text.generateFailed
        } else {
          this.updatePendingMessage(pendingMsg, {
            content: err?.message || this.text.generateFailed,
            loading: false
          })
        }
      } finally {
        this.updatePendingMessage(pendingMsg, { loading: false, reportLoading: false })
        this.sending = false
        this.scrollToBottom()
      }
    },
    sleep(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms))
    },
    extractStreamText(data) {
      if (typeof data === 'string') return data
      if (!data || typeof data !== 'object') return ''
      return String(
        data.text ??
        data.delta ??
        data.content ??
        data.message ??
        data.answer ??
        ''
      )
    },
    updatePendingMessage(pendingMsg, patch) {
      const index = this.messages.findIndex((msg) =>
        msg.localId === pendingMsg.localId || (pendingMsg.id && msg.id === pendingMsg.id)
      )
      if (index < 0) {
        Object.assign(pendingMsg, patch)
        return pendingMsg
      }
      const nextMsg = { ...this.messages[index], ...patch }
      this.messages.splice(index, 1, nextMsg)
      Object.assign(pendingMsg, nextMsg)
      return nextMsg
    },
    async revealStreamText(pendingMsg, text) {
      const value = String(text || '')
      if (!value) return
      const step = value.length > 160 ? 14 : value.length > 60 ? 8 : 3
      for (let i = 0; i < value.length; i += step) {
        this.updatePendingMessage(pendingMsg, {
          content: `${pendingMsg.content || ''}${value.slice(i, i + step)}`,
          loading: false
        })
        await this.$nextTick()
        this.scrollToBottom()
        await this.sleep(16)
      }
    },
    async sendMessageStream(payload, pendingMsg) {
      let hasContent = false
      let streamAccepted = false
      try {
        const streamResult = await aiChatApi.streamMessage(payload, async (event, data) => {
          if (event === 'accepted' || event === 'meta') {
            streamAccepted = true
            this.sessionId = data?.session_id || this.sessionId
            if (data?.context_usage || data?.contextUsage) {
              this.contextUsage = data.context_usage || data.contextUsage
            }
            return
          }
          if (['delta', 'message', 'content'].includes(event)) {
            const text = this.extractStreamText(data)
            if (!text) return
            if (!hasContent) {
              this.updatePendingMessage(pendingMsg, { content: '', loading: false })
              hasContent = true
            }
            await this.revealStreamText(pendingMsg, text)
            return
          }
          if (event === 'replace') {
            const text = this.extractStreamText(data)
            if (!text) throw new Error(this.text.generateFailed)
            hasContent = true
            this.updatePendingMessage(pendingMsg, {
              content: text,
              loading: false,
              streamWarning: ''
            })
            return
          }
          if (event === 'warning') {
            streamAccepted = true
            this.updatePendingMessage(pendingMsg, {
              loading: false,
              streamWarning: data?.code === 'output_limit'
                ? this.text.outputLimit
                : (data?.msg || this.text.streamIncomplete)
            })
            return
          }
          if (event === 'done') {
            streamAccepted = true
            this.sessionId = data?.session_id || this.sessionId
            this.updatePendingMessage(pendingMsg, { id: data?.message_id || pendingMsg.id })
            if (data?.context_usage || data?.contextUsage) {
              this.contextUsage = data.context_usage || data.contextUsage
            }
            const finalText = this.extractStreamText(data)
            if (finalText && !hasContent) {
              this.updatePendingMessage(pendingMsg, { content: '', loading: false })
              hasContent = true
              await this.revealStreamText(pendingMsg, finalText)
            }
            if (data?.actions) {
              this.updatePendingMessage(pendingMsg, { actions: this.filterMobileActions(data.actions || []) })
            }
            return
          }
          if (event === 'error') {
            streamAccepted = true
            const streamError = new Error(data?.msg || data?.message || this.text.generateFailed)
            streamError.streamErrorType = data?.error_type || ''
            throw streamError
          }
        })
        if (!streamResult?.completed) {
          throw new Error(this.text.streamIncomplete)
        }
      } catch (error) {
        if (error && typeof error === 'object') {
          error.streamHasContent = hasContent
          error.streamAccepted = streamAccepted
        }
        throw error
      }
      if (!hasContent && pendingMsg.content === this.text.sending) {
        throw new Error(this.text.generateFailed)
      }
    },
    async sendMessageReliable(payload, pendingMsg) {
      try {
        await this.sendMessageStream(payload, pendingMsg)
        return
      } catch (error) {
        if (error?.streamAccepted || error?.streamHasContent) {
          const hasContent = Boolean(String(pendingMsg.content || '').trim()) && pendingMsg.content !== this.text.sending
          this.updatePendingMessage(pendingMsg, {
            content: hasContent ? pendingMsg.content : (error?.message || this.text.generateFailed),
            loading: false,
            streamWarning: hasContent ? this.text.streamInterrupted : ''
          })
          showToast({
            message: hasContent ? this.text.streamInterrupted : (error?.message || this.text.generateFailed),
            type: 'fail'
          })
          return
        }
        this.updatePendingMessage(pendingMsg, {
          content: this.text.sending,
          loading: true,
          actions: []
        })
      }

      const response = await aiChatApi.sendMessage({
        ...payload,
        session_id: this.sessionId || payload.session_id
      })
      const data = response?.data || {}
      const reply = String(data.reply || data.answer || '').trim()
      if (!reply) throw new Error(this.text.generateFailed)

      this.sessionId = data.session_id || this.sessionId
      if (data.context_usage || data.contextUsage) {
        this.contextUsage = data.context_usage || data.contextUsage
      }
      this.updatePendingMessage(pendingMsg, {
        id: data.message_id || pendingMsg.id,
        content: '',
        loading: false,
        actions: this.filterMobileActions(data.actions || [])
      })
      await this.revealStreamText(pendingMsg, reply)
    },
    isUnsupportedMobileAction(action) {
      const payload = action?.payload || {}
      const signature = [
        action?.type,
        action?.path,
        action?.workflow,
        payload.intent,
        payload.path,
        payload.workflow,
        payload.target_type
      ].filter(Boolean).join(' ').toLowerCase()
      return /backtest|generate[-_]?(code|strategy)|code[-_]?(edit|editor|generation)|source[-_]?edit|script[-_]?(edit|editor)|indicator[-_]?research|strategy[-_]?research|publish|compile|strategy-ide|indicator-ide|backtest-center/.test(signature)
    },
    filterMobileActions(actions) {
      return (actions || []).filter((action) => action && !this.isUnsupportedMobileAction(action))
    },
    agentUsageAction(message) {
      const actions = Array.isArray(message?.actions) ? message.actions : []
      return actions.find((action) => action?.type === 'agent_usage') || null
    },
    agentUsageItems(message) {
      const payload = this.agentUsageAction(message)?.payload || {}
      const seen = new Set()
      const normalize = (items, kind) => (Array.isArray(items) ? items : [])
        .map((item) => ({
          kind,
          id: String(item?.id || '').trim(),
          label: String(item?.label || item?.id || '').trim()
        }))
        .filter((item) => {
          const key = `${item.kind}:${item.id}`
          if (!item.id || !item.label || seen.has(key)) return false
          seen.add(key)
          return true
        })
      return [
        ...normalize(payload.skills, 'skill'),
        ...normalize(payload.tools, 'tool')
      ].slice(0, 8)
    },
    agentUsageLabel(message) {
      return this.agentUsageAction(message)?.label || this.text.usedThisTurn
    },
    visibleMessageActions(message) {
      const actions = Array.isArray(message?.actions) ? message.actions : []
      return actions.filter((action) => action?.type !== 'agent_usage')
    },
    mobileActionRoute(action) {
      const payload = action?.payload || {}
      const strategyId = payload.strategy_id || payload.strategyId
      if (strategyId) return { name: 'StrategyDetail', params: { id: strategyId } }

      const indicatorId = payload.indicator_id || payload.indicatorId || payload.asset_id || payload.assetId
      if (indicatorId) return { name: 'MarketIndicatorDetail', params: { id: indicatorId } }

      const path = String(action?.path || payload.path || '').split('?')[0].replace(/\/+$/, '')
      const routeMap = {
        '/strategy-center': { name: 'Trading' },
        '/portfolio': { name: 'Trading' },
        '/indicator-community': { name: 'Market' },
        '/strategy-market': { name: 'Market' },
        '/broker-accounts': { name: 'CredentialList' },
        '/billing': { name: 'ProfileCredits' },
        '/profile': { name: 'Profile' },
        '/ai-analysis': { name: 'AiAnalysis' }
      }
      return routeMap[path] || null
    },
    handleCopilotAction(action) {
      if (this.isUnsupportedMobileAction(action)) {
        showToast({ message: this.text.desktopOnly, type: 'fail' })
        return
      }

      const route = this.mobileActionRoute(action)
      if (route) {
        this.$router.push(route)
        return
      }

      const type = String(action.type || '').toLowerCase()
      if (type.includes('analysis')) {
        this.runProfessionalAnalysis()
      } else {
        this.composer = action.payload?.prompt || action.label || ''
      }
    },
    analysisTarget() {
      return {
        market: this.context.market || 'Crypto',
        symbol: (this.context.symbol || '').trim(),
        timeframe: this.context.timeframe || '4h'
      }
    },
    messagePersistContent(message) {
      if (!message) return ''
      const content = String(message.content || '').trim()
      if (content) return content
      if (message.report) {
        const report = professionalReportArtifact(message.report) || {}
        const instrument = report.instrument || {}
        const target = message.reportTarget || {}
        const market = instrument.market || target.market || ''
        const symbol = instrument.canonical_symbol || instrument.symbol || target.symbol || ''
        return `Analysis report: ${[market, symbol].filter(Boolean).join(':') || 'market'}`
      }
      if (message.reportError) return `Analysis failed: ${message.reportError}`
      return String(message.meta || '').trim()
    },
    buildChatContext(target = null) {
      const ctx = target || this.context || {}
      return {
        market: ctx.market || this.context.market,
        symbol: ctx.symbol || this.context.symbol,
        timeframe: ctx.timeframe || this.context.timeframe,
        mobile: true,
        unsupported_mobile_workflows: ['code_editing', 'backtest']
      }
    },
    async persistLocalMessage(message, intent = '') {
      if (!message) return null
      const content = this.messagePersistContent(message)
      if (!content && !message.report && !message.reportError) return null
      try {
        const res = await aiChatApi.saveLocalMessage({
          session_id: this.sessionId,
          message_id: message.id || null,
          role: message.role || 'assistant',
          content,
          attachments: message.attachments || [],
          actions: message.actions || [],
          report: message.report || null,
          reportTarget: message.reportTarget || null,
          reportError: message.reportError || '',
          reportErrorTone: message.reportErrorTone || '',
          intent: intent || message.meta || 'local_agent',
          context: this.buildChatContext(message.reportTarget)
        })
        const data = res?.data || {}
        if (data.session_id) this.sessionId = data.session_id
        if (data.message_id) message.id = data.message_id
        return data
      } catch (err) {
        return null
      }
    },
    async confirmProfessionalAnalysis() {
      if (this.sending) return
      const target = this.analysisTarget()
      if (!target.symbol) {
        showToast({ message: this.$t('ai_analysis.symbol_placeholder'), type: 'fail' })
        return
      }
      let cost = 10
      try {
        const res = await aiChatApi.getPreflight()
        const data = res?.data || {}
        const costs = data.costs || data.feature_costs || data.billing?.feature_costs || {}
        cost = Number(costs.analysis || costs.ai_analysis || costs.fast_analysis || cost)
      } catch (_) {}
      const detail = this.text.reportConfirmDetail
        .replace('{target}', `${target.market}:${target.symbol}`)
        .replace('{cost}', String(cost))
      try {
        await showConfirmDialog({
          title: this.text.reportConfirmTitle,
          message: detail,
          confirmButtonText: this.text.reportConfirmAction,
          cancelButtonText: this.text.cancel,
          confirmButtonColor: '#52c41a'
        })
      } catch (_) {
        return
      }
      await this.runProfessionalAnalysis(target)
    },
    async runProfessionalAnalysis(targetOverride = null) {
      if (this.sending) return
      const target = { ...this.analysisTarget(), ...(targetOverride || {}) }
      if (!target.symbol) {
        showToast({ message: this.$t('ai_analysis.symbol_placeholder'), type: 'fail' })
        return
      }
      const now = Date.now()
      const userMsg = {
        localId: `u-analysis-${now}`,
        role: 'user',
        content: this.taskPrompt({ key: 'diagnose' })
      }
      const assistantMsg = {
        localId: `a-analysis-${now}`,
        role: 'assistant',
        content: '',
        reportLoading: true,
        reportTarget: target
      }
      this.messages.push(userMsg, assistantMsg)
      this.composer = ''
      this.sending = true
      this.scrollToBottom()
      try {
        const report = await this.fetchProfessionalAnalysis(target)
        assistantMsg.report = report
        assistantMsg.reportLoading = false
        assistantMsg.reportError = ''
      } catch (err) {
        assistantMsg.reportLoading = false
        assistantMsg.reportError = err?.response?.data?.msg || err?.message || this.$t('ai_analysis.error_tip')
      } finally {
        await this.persistLocalMessage(userMsg, 'fast_analysis_user')
        await this.persistLocalMessage(assistantMsg, 'fast_analysis_report')
        await this.refreshSessionsSilently()
        this.sending = false
        this.scrollToBottom()
      }
    },
    async fetchProfessionalAnalysis(target) {
      const res = await aiAnalysisApi.analyze({
        market: target.market,
        symbol: target.symbol,
        timeframe: target.timeframe || '1D',
        language: this.$i18n?.locale || 'zh-CN',
        response_contract: 'professional_report_v1'
      })
      const envelope = professionalReportEnvelope(res)
      if (!envelope) throw new Error(this.$t('professional_report.contract_required_desc'))
      return envelope
    },
    async retryProfessionalAnalysis(msg) {
      if (!msg?.reportTarget || this.sending) return
      msg.reportLoading = true
      msg.reportError = ''
      msg.report = null
      this.sending = true
      this.scrollToBottom()
      try {
        msg.report = await this.fetchProfessionalAnalysis(msg.reportTarget)
        msg.reportError = ''
        await this.persistLocalMessage(msg, 'fast_analysis_report')
        await this.refreshSessionsSilently()
      } catch (err) {
        msg.reportError = err?.response?.data?.msg || err?.message || this.$t('ai_analysis.error_tip')
        await this.persistLocalMessage(msg, 'fast_analysis_report')
        await this.refreshSessionsSilently()
      } finally {
        msg.reportLoading = false
        this.sending = false
        this.scrollToBottom()
      }
    },
    openFullReport(report) {
      const envelope = professionalReportEnvelope(report)
      if (!envelope) {
        showToast({ message: this.$t('professional_report.contract_required_desc'), type: 'fail' })
        return
      }
      const instrument = reportInstrument(envelope)
      useAiAnalysisStore().setLastResult(envelope)
      this.$router.push({
        path: '/ai-analysis',
        query: {
          market: instrument.market || this.context.market,
          symbol: instrument.canonical_symbol || instrument.symbol || this.context.symbol,
          timeframe: envelope.report?.evidence_snapshot?.timeframe || this.context.timeframe
        }
      })
    },
    reportArtifact(report) {
      return professionalReportArtifact(report)
    },
    reportMarketLabel(report) {
      const instrument = reportInstrument(report)
      return [instrument.market, instrument.canonical_symbol || instrument.symbol].filter(Boolean).join(':') || this.$t('ai_analysis.title')
    },
    reportDecisionLabel(report) {
      const d = String(professionalReportArtifact(report)?.decision_profile?.decision || '').toUpperCase()
      if (d.includes('BUY')) return this.$t('ai_analysis.decision_buy')
      if (d.includes('SELL')) return this.$t('ai_analysis.decision_sell')
      return this.$t('ai_analysis.decision_hold')
    },
    reportBias(report) {
      const artifact = professionalReportArtifact(report) || {}
      const profile = artifact.decision_profile || {}
      const explicit = String(profile.market_bias || '').toUpperCase()
      if (['BULLISH', 'BEARISH', 'NEUTRAL'].includes(explicit)) return explicit
      const raw = Number(profile.market_bias_score)
      const technical = Number((artifact.dimensions || []).find((item) => item?.key === 'technical')?.score)
      const score = Number.isFinite(raw) ? raw : Number.isFinite(technical) ? (technical - 50) * 2 : 0
      if (score >= 5) return 'BULLISH'
      if (score <= -5) return 'BEARISH'
      return 'NEUTRAL'
    },
    reportBiasLabel(report) {
      return this.$t(`professional_report.bias_${this.reportBias(report).toLowerCase()}`)
    },
    reportBiasTone(report) {
      return `bias-${this.reportBias(report).toLowerCase()}`
    },
    reportTone(report) {
      const d = String(professionalReportArtifact(report)?.decision_profile?.decision || '').toUpperCase()
      if (d.includes('BUY')) return 'buy'
      if (d.includes('SELL')) return 'sell'
      return 'hold'
    },
    reportConfidence(report) {
      const value = Number(professionalReportArtifact(report)?.decision_profile?.confidence)
      return Number.isFinite(value) ? `${Math.round(value)}%` : '--'
    },
    reportSummary(report) {
      const artifact = professionalReportArtifact(report)
      return String(artifact?.executive_summary || artifact?.decision_profile?.rationale || '--')
        .replace(/\s*\[(?:ev_[a-f0-9]+(?:\s*,\s*)?)+\]/gi, '')
        .trim()
    },
    reportPlanValue(report, type) {
      const artifact = professionalReportArtifact(report) || {}
      const plan = artifact.risk_plan || {}
      const displayPlan = plan.candidate_setup || plan
      const map = {
        entry: displayPlan.entry_price,
        stop: displayPlan.stop_loss,
        take: displayPlan.take_profit
      }
      return this.formatReportNumber(map[type])
    },
    reportPlanIsCandidate(report) {
      return Boolean(professionalReportArtifact(report)?.risk_plan?.candidate_setup)
    },
    reportRiskReward(report) {
      const artifact = professionalReportArtifact(report) || {}
      const plan = artifact.risk_plan?.candidate_setup || artifact.risk_plan || {}
      const value = plan.net_risk_reward ?? plan.gross_risk_reward ?? professionalRiskReward(report)
      if (value === '' || value == null || !Number.isFinite(Number(value))) return '--'
      return Number(value).toFixed(2)
    },
    reportHasRrWarning(report) {
      return reportHasRiskRewardWarning(report)
    },
    reportReferenceId(message) {
      const value = Number(message?.id)
      return Number.isInteger(value) && value > 0 ? value : null
    },
    askAboutReport(message) {
      const reportId = this.reportReferenceId(message)
      if (!reportId) return
      const report = professionalReportArtifact(message?.report) || {}
      const instrument = report.instrument || {}
      const target = message?.reportTarget || {}
      this.context.market = instrument.market || target.market || this.context.market
      this.context.symbol = instrument.canonical_symbol || instrument.symbol || target.symbol || this.context.symbol
      this.context.timeframe = report.evidence_snapshot?.timeframe || target.timeframe || this.context.timeframe
      this.draftReferencedReportId = reportId
      const label = [this.context.market, this.context.symbol].filter(Boolean).join(':')
      this.composer = (this.$i18n?.locale || '').startsWith('zh')
        ? `基于 ${label} 的专业分析报告，请进一步说明：`
        : `Based on the professional report for ${label}, explain further: `
    },
    reportScore(report, key) {
      const dimensions = professionalReportArtifact(report)?.dimensions || []
      const row = dimensions.find((item) => item?.key === key)
      return row?.status === 'available' ? this.formatReportNumber(row.score, 0) : '--'
    },
    reportQualityRatio(report, key) {
      const value = Number(professionalReportArtifact(report)?.data_quality?.[key])
      return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '--'
    },
    formatReportNumber(value, digits = 2) {
      if (value === '' || value == null) return '--'
      const n = Number(value)
      if (!Number.isFinite(n)) return String(value)
      return n.toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0
      })
    },
    isImageAttachment(att) {
      return typeof att?.data_url === 'string' && att.data_url.startsWith('data:image/')
    },
    previewAttachment(att) {
      if (!this.isImageAttachment(att)) return
      showImagePreview({
        images: [att.data_url],
        closeable: true,
        showIndex: false
      })
    },
    triggerImageUpload() {
      this.$refs.fileInput?.click()
    },
    onImageSelected(event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (file.size > 3 * 1024 * 1024) {
        showToast({ message: this.text.imageTooLarge, type: 'fail' })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        this.attachments = [{
          name: file.name,
          mime_type: file.type,
          data_url: String(reader.result || '')
        }]
        showToast({ message: this.text.imageAdded, type: 'success' })
      }
      reader.readAsDataURL(file)
    },
    removeAttachment(att) {
      this.attachments = this.attachments.filter((item) => item !== att)
    },
    async openHistoryDrawer() {
      this.showHistoryDrawer = true
      this.loadingSessions = true
      try {
        const res = await aiChatApi.getSessions({ limit: 30 })
        this.sessions = res.data || []
      } catch {
        this.sessions = []
      } finally {
        this.loadingSessions = false
      }
    },
    async refreshSessionsSilently() {
      try {
        const res = await aiChatApi.getSessions({ limit: 30 })
        this.sessions = res.data || []
      } catch {
        // History refresh is best effort; the report itself is already visible.
      }
    },
    async loadSession(session) {
      if (this.sending) return
      const token = ++this.sessionLoadToken
      try {
        const res = await aiChatApi.getHistory({ session_id: session.id })
        if (token !== this.sessionLoadToken) return
        const context = res.data?.session || session
        const market = String(context.context_market || session.context_market || this.context.market)
        this.context.market = ({CRYPTO:'Crypto',USSTOCK:'USStock',ASTOCK:'AStock',HKSTOCK:'HKStock',FOREX:'Forex',FUTURES:'Futures'})[market.toUpperCase()] || market
        this.context.symbol = context.context_symbol || session.context_symbol || this.context.symbol
        this.context.timeframe = context.context_timeframe || session.context_timeframe || this.context.timeframe
        this.sessionId = session.id
        this.messages = (res.data?.messages || []).map((msg) => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: (msg.report || msg.reportError) ? '' : (msg.content || ''),
          attachments: msg.attachments || [],
          actions: this.filterMobileActions(msg.actions || []),
          meta: msg.intent || '',
          report: msg.report || null,
          reportTarget: msg.reportTarget || null,
          reportError: msg.reportError || '',
          reportErrorTone: msg.reportErrorTone || '',
          referencedReportId: msg.referenced_report_id || msg.referencedReportId || null
        }))
        this.sessionMemory = res.data?.session?.summary
          ? { summary: res.data.session.summary, recent_requests: [], version: res.data.session.summary_version || 0 }
          : { summary: {}, recent_requests: [], version: 0 }
        this.contextUsage = null
        this.draftReferencedReportId = null
        await this.loadSessionMemory()
        this.showHistoryDrawer = false
        this.scrollToBottom()
      } catch (err) {
        showToast({ message: err?.message || this.text.generateFailed, type: 'fail' })
      }
    },
    async deleteSession(session) {
      if (!session?.id || this.deletingSessionId) return
      try {
        await showConfirmDialog({
          title: this.text.deleteSession,
          message: this.text.deleteSessionConfirm,
          confirmButtonText: this.text.deleteSession,
          confirmButtonColor: '#ef4444'
        })
      } catch {
        return
      }
      this.deletingSessionId = session.id
      try {
        await aiChatApi.deleteSession(session.id)
        this.sessions = this.sessions.filter((item) => Number(item.id) !== Number(session.id))
        if (Number(this.sessionId) === Number(session.id)) {
          this.sessionId = null
          this.messages = []
          this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
          this.contextUsage = null
          this.draftReferencedReportId = null
        }
        showToast({ message: this.text.deleteSessionSuccess, type: 'success' })
      } catch (err) {
        showToast({ message: err?.message || this.text.generateFailed, type: 'fail' })
      } finally {
        this.deletingSessionId = null
      }
    },
    onSymbolPicked(item) {
      this.context.market = item.market || 'Crypto'
      this.context.symbol = item.symbol || this.context.symbol
      this.showSymbolPicker = false
      this.refreshContextQuote()
    },
    async loadSessionMemory() {
      if (!this.sessionId) {
        this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
        return
      }
      try {
        const res = await aiChatApi.getSessionMemory(this.sessionId)
        this.sessionMemory = res?.data || { summary: {}, recent_requests: [], version: 0 }
        this.contextUsage = this.sessionMemory?.recent_requests?.[0] || this.contextUsage
      } catch (_) {
        this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
      }
    },
    async loadUserMemory() {
      try {
        const res = await aiChatApi.getUserMemory()
        this.userMemories = (res?.data || []).map((item) => ({ ...item }))
      } catch (_) {
        this.userMemories = []
      }
    },
    async openMemoryPanel() {
      this.memoryVisible = true
      this.loadingMemory = true
      try {
        await Promise.all([this.loadSessionMemory(), this.loadUserMemory()])
      } finally {
        this.loadingMemory = false
      }
    },
    async clearCurrentSessionMemory() {
      if (!this.sessionId) return
      try {
        await aiChatApi.clearSessionMemory(this.sessionId)
        this.sessionMemory = { summary: {}, recent_requests: [], version: Number(this.sessionMemory?.version || 0) + 1 }
        this.contextUsage = null
        showToast({ message: this.text.memoryCleared, type: 'success' })
      } catch (err) {
        showToast({ message: err?.message || this.text.generateFailed, type: 'fail' })
      }
    },
    async saveMemory(item) {
      if (!item?.id || !String(item.title || '').trim() || !String(item.content || '').trim()) return
      try {
        await aiChatApi.updateUserMemory(item.id, {
          title: String(item.title).trim(),
          content: String(item.content).trim(),
          category: item.category || 'preference'
        })
        showToast({ message: this.text.memorySaved, type: 'success' })
      } catch (err) {
        showToast({ message: err?.message || this.text.generateFailed, type: 'fail' })
      }
    },
    async removeMemory(item) {
      if (!item?.id) return
      try {
        await showConfirmDialog({
          title: this.text.deleteMemory,
          message: item.title || item.content,
          confirmButtonText: this.text.deleteMemory,
          cancelButtonText: this.text.cancel,
          confirmButtonColor: '#ef4444'
        })
      } catch (_) {
        return
      }
      try {
        await aiChatApi.deleteUserMemory(item.id)
        this.userMemories = this.userMemories.filter((memory) => Number(memory.id) !== Number(item.id))
        showToast({ message: this.text.memoryDeleted, type: 'success' })
      } catch (err) {
        showToast({ message: err?.message || this.text.generateFailed, type: 'fail' })
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messageList
        if (el) el.scrollTop = el.scrollHeight
      })
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
.ai-copilot-page {
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: calc(12px + var(--safe-area-top, 0px)) var(--page-gutter) calc(10px + var(--safe-area-bottom, 0px));
  color: var(--text);
  background: var(--bg);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.copilot-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.top-copy {
  min-width: 0;
  flex: 1;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  color: var(--accent-gold);
  font-size: 11px;
  font-weight: 800;
}

.top-bar h1 {
  display: none;
}

.top-bar p {
  display: none;
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.new-chat,
.history-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 18px;
}

.new-chat:disabled { opacity: .45; }

.ask-card,
.recommend-sheet {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.ask-card {
  position: relative;
  flex-shrink: 0;
  z-index: 5;
  padding: 8px 9px 9px;
  border-radius: 16px;
  margin-top: 0;
  margin-bottom: 0;
  background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.context-chip {
  max-width: 100%;
  min-width: 0;
  flex: 1 1 100%;
  height: 31px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  margin: 0;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text);
  line-height: 1;
}

.composer-top-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.context-chip strong {
  min-width: 0;
  font-size: 13px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-chip span {
  color: var(--text-3);
  font-size: 11px;
}

.memory-action {
  position: relative;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.memory-action em {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.report-reference-chip {
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 0 6px;
  padding: 5px 9px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 34%, var(--border));
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  font-size: 11px;
  font-weight: 800;
}

.report-reference-chip span {
  min-width: 0;
  flex: 1;
}

.report-reference-chip button {
  width: 24px;
  height: 24px;
  border: 0;
  color: inherit;
  background: transparent;
}

.ask-card textarea {
  width: 100%;
  min-height: 42px;
  max-height: 92px;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
}

.ask-card textarea::placeholder {
  color: var(--text-3);
}

.session-row em {
  font-style: normal;
  color: var(--text-3);
  font-size: 11px;
}

.chat-panel {
  flex: 1 1 0;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  border-radius: 0;
  margin-bottom: 6px;
}

.welcome-card {
  height: 100%;
  min-height: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0;
  text-align: left;
}

.welcome-card > .van-icon {
  display: none;
}

.welcome-title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.welcome-title-row span {
  color: var(--text);
  font-size: 15px;
  font-weight: 900;
}

.welcome-title-row em {
  max-width: 300px;
  color: var(--text-3);
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
}

.welcome-card p {
  display: none;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.55;
}

.starter-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.starter-grid button {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border-radius: 11px;
  border: 1px solid var(--border);
  color: var(--text-2);
  background: var(--surface-raised);
  text-align: left;
}

.starter-grid button:active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.starter-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 17px;
}

.starter-grid button > span:last-child {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.starter-grid strong {
  color: var(--text);
  font-size: 12px;
}

.starter-grid em {
  overflow: hidden;
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-list {
  height: 100%;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 10px 0 16px;
  scroll-padding-bottom: 16px;
}

.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 12px;
}

.message-row.user {
  justify-content: flex-end;
}

.bubble-wrap {
  min-width: 0;
  max-width: 100%;
}

.message-row.assistant .bubble-wrap {
  width: 100%;
}

.message-row.user .bubble-wrap {
  width: fit-content;
  max-width: 94%;
}

.bubble {
  padding: 11px 12px;
  border-radius: 15px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.bubble.report-bubble {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
}

.message-row.user .bubble {
  background: var(--accent);
  color: var(--on-accent);
  border-color: transparent;
}

.analysis-report-card {
  white-space: normal;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  padding: 13px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--report-tone, #fbbf24) 22%, var(--border));
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--report-tone, #fbbf24) 9%, transparent), transparent 44%),
    color-mix(in srgb, var(--surface-raised) 88%, var(--bg));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.analysis-report-card.buy {
  --report-tone: #22c55e;
}

.analysis-report-card.sell {
  --report-tone: #fb7185;
}

.analysis-report-card.hold {
  --report-tone: #fbbf24;
}

.report-loading,
.report-error {
  min-height: 126px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.report-loading span,
.report-error strong {
  color: var(--text);
  font-size: 14px;
  font-weight: 900;
}

.report-loading small,
.report-error p {
  margin: 0;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.45;
}

.report-error .van-icon {
  color: #fb7185;
  font-size: 24px;
}

.report-error button {
  height: 30px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, #fb7185 44%, var(--border));
  border-radius: 999px;
  color: #fb7185;
  background: rgba(251, 113, 133, 0.1);
  font-size: 12px;
  font-weight: 900;
}

.report-head {
  padding: 0 0 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.report-head div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.report-head span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
}

.report-head strong {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  color: var(--text);
  font-size: 22px;
  font-weight: 950;
  line-height: 1.08;
}

.report-head em {
  min-width: 46px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--report-tone, #fbbf24);
  background: color-mix(in srgb, var(--report-tone, #fbbf24) 14%, transparent);
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.report-summary {
  display: -webkit-box;
  margin: 0 0 12px;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.62;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.report-plan {
  margin: 0 0 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.report-plan div {
  min-width: 0;
  padding: 9px 8px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--surface-deep) 78%, transparent);
}

.report-plan span,
.report-scores span {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
}

.report-plan strong {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-rr-warning {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: -2px 0 10px;
  padding: 8px 9px;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.26);
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.09);
  font-size: 11px;
  line-height: 1.45;
}

.report-scores {
  margin: 0 0 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.report-scores span {
  width: max-content;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--text-2);
  background: color-mix(in srgb, var(--surface-deep) 72%, transparent);
}

.report-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 0;
}

.report-actions button {
  min-width: 0;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface-deep) 78%, transparent);
  font-size: 12px;
  font-weight: 900;
}

.report-actions button:active {
  border-color: color-mix(in srgb, var(--report-tone, #fbbf24) 42%, var(--border));
  color: var(--report-tone, #fbbf24);
}

.report-actions button:disabled {
  opacity: 0.46;
}

.bubble p {
  margin: 0;
}

.markdown-body {
  color: inherit;
  font-size: 13px;
  line-height: 1.72;
}

.stream-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 10px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  font-size: 12px;
  line-height: 1.45;
}

.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(strong) {
  color: var(--text);
  font-weight: 900;
}

.message-row.user .markdown-body :deep(strong) {
  color: inherit;
}

.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5) {
  margin: 12px 0 7px;
  color: var(--text);
  font-size: 14px;
  font-weight: 900;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 6px 0 10px;
  padding-left: 18px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0 10px;
  padding: 8px 10px;
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  color: var(--text-2);
  background: var(--surface-deep);
}

.markdown-body :deep(code) {
  padding: 1px 5px;
  border-radius: 6px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.code-block {
  overflow: hidden;
  margin: 10px 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #0b1020;
}

.code-head {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  font-size: 11px;
  font-weight: 800;
}

.code-head button,
.bubble-tools button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  color: var(--text-2);
  background: transparent;
  font-size: 11px;
  font-weight: 800;
}

.code-block pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
}

.code-block code {
  color: #dbeafe;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
}

.bubble-tools {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

.attachment-preview {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 10px;
}

.attachment-card {
  width: min(210px, 100%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.attachment-card img,
.attachment-fallback {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
}

.attachment-card img {
  display: block;
  object-fit: cover;
}

.attachment-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-card em {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-style: normal;
  line-height: 1.35;
  opacity: 0.82;
  word-break: break-all;
}

.action-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.action-strip button {
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 11px;
  font-weight: 800;
}

.agent-usage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.agent-usage-title,
.agent-usage-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.agent-usage-title {
  gap: 5px;
  color: var(--text-3);
  font-weight: 700;
}

.agent-usage-chip {
  max-width: min(190px, 70vw);
  padding: 0 9px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--text-1);
  text-overflow: ellipsis;
}

.agent-usage-chip--tool {
  border-color: rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.08);
}

.pending-attachments {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin: 2px 0 8px;
}

.pending-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: 12px;
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.left-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.icon-action,
.send-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 50%;
  font-weight: 900;
  font-size: 13px;
}

.icon-action {
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--tool-color) 34%, var(--border));
  color: var(--tool-color);
  background: var(--surface-raised);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tool-color) 10%, transparent);
  font-size: 16px;
}

.icon-action.image {
  --tool-color: #38bdf8;
}

.send-action {
  min-width: 72px;
  width: auto;
  height: 44px;
  padding: 0 20px;
  border-radius: 13px;
  color: var(--on-accent);
  border: 0;
  background: linear-gradient(135deg, #f2b632 0%, #ff6b35 58%, #e34848 100%);
  box-shadow: 0 8px 18px rgba(255, 107, 53, 0.2);
  font-size: 14px;
  letter-spacing: 0.04em;
}

.send-action:disabled {
  opacity: 0.55;
}

.history-popup :deep(.van-popup),
.memory-popup :deep(.van-popup),
.recommend-popup :deep(.van-popup) {
  background: var(--bg-elevated);
}

.memory-sheet {
  max-height: 78vh;
  overflow-y: auto;
  border-radius: 20px 20px 0 0;
  background: var(--bg-elevated);
  color: var(--text);
}

.memory-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--hairline);
}

.memory-section:last-child {
  border-bottom: 0;
}

.memory-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.memory-section-head > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.memory-section-head strong {
  color: var(--text);
  font-size: 14px;
}

.memory-section-head small {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.45;
}

.memory-section-head > button,
.long-term-memory-item button {
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--border));
  border-radius: 9px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 11px;
  font-weight: 900;
}

.memory-summary-grid,
.context-usage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.memory-summary-grid > div,
.context-usage-grid > div {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-raised);
}

.memory-summary-grid span,
.context-usage-grid span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-3);
  font-size: 10px;
}

.memory-summary-grid strong,
.context-usage-grid strong {
  display: block;
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memory-constraints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.memory-constraints span {
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--text-2);
  background: var(--surface-raised);
  font-size: 10px;
}

.context-usage-grid {
  margin-top: 8px;
}

.memory-empty {
  padding: 18px 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--text-3);
  background: var(--surface-raised);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.long-term-memory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.long-term-memory-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface-raised);
}

.long-term-memory-item input,
.long-term-memory-item textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  outline: none;
  color: var(--text);
  background: var(--bg-elevated);
  font: inherit;
  font-size: 12px;
}

.long-term-memory-item textarea {
  min-height: 64px;
  resize: vertical;
  line-height: 1.5;
}

.long-term-memory-item > div {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.long-term-memory-item button.danger {
  border-color: rgba(251, 113, 133, 0.3);
  color: #fb7185;
  background: rgba(251, 113, 133, 0.09);
}

.drawer-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  color: var(--text);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(14px + var(--safe-area-top, 0px)) 16px 14px;
  border-bottom: 1px solid var(--hairline);
  font-weight: 900;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.drawer-loading,
.drawer-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--text-3);
}

.session-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text);
  text-align: left;
}

.session-row.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.session-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.session-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-main em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.session-meta small {
  color: var(--text-3);
  font-size: 11px;
}

.session-delete-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 50%;
  color: var(--text-3);
  background: transparent;
  font-size: 15px;
}

.session-delete-btn:active {
  color: #fb7185;
  border-color: color-mix(in srgb, #fb7185 35%, transparent);
  background: rgba(251, 113, 133, 0.1);
}

.session-delete-btn:disabled {
  opacity: 0.7;
}

.recommend-sheet {
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.recommend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--hairline);
}

.recommend-head div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recommend-head span {
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
}

.recommend-head strong {
  color: var(--text);
  font-size: 18px;
  line-height: 1.3;
}

.recommend-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.recommend-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}

.recommend-badges span {
  padding: 5px 9px;
  border-radius: 999px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 11px;
  font-weight: 900;
}

.recommend-reason {
  margin: 0 0 12px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}

.param-block {
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  margin-bottom: 12px;
}

.param-block h3 {
  margin: 0 0 10px;
  color: var(--text);
  font-size: 14px;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.param-grid div {
  min-width: 0;
  padding: 9px;
  border-radius: 10px;
  background: var(--bg-elevated);
}

.param-grid em {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  word-break: break-all;
}

.param-grid strong {
  display: block;
  margin-top: 3px;
  color: var(--text);
  font-size: 12px;
  word-break: break-all;
}

.recommend-actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 10px;
  padding: 12px 16px calc(12px + var(--safe-area-bottom, 0px));
  border-top: 1px solid var(--hairline);
}
</style>

<style scoped>
.context-chip {
  width: 100%;
  min-height: 62px;
  height: auto;
  flex: 0 0 auto;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--v2-surface, var(--bg-elevated));
  box-shadow: none;
  text-align: left;
}

.report-head .report-bias {
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 850;
  line-height: 1;
}

.report-bias.bias-bullish { color: var(--v2-green, #11a77b); background: color-mix(in srgb, var(--v2-green, #11a77b) 12%, transparent); }
.report-bias.bias-bearish { color: var(--v2-red, #f04449); background: color-mix(in srgb, var(--v2-red, #f04449) 12%, transparent); }
.report-bias.bias-neutral { color: var(--text-2); background: var(--surface-raised); }

.report-candidate-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 8px;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  font-size: 10px;
  font-weight: 800;
}

.context-identity,
.context-quote {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.context-identity {
  flex: 1;
}

.context-identity small {
  color: var(--text-3);
  font-size: 10px;
}

.context-chip .context-identity strong {
  font-size: 18px;
}

.context-identity em,
.context-quote em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
}

.context-quote {
  flex: 0 0 auto;
  justify-items: end;
}

.context-quote strong {
  font-size: 16px;
}

.context-quote .up {
  color: var(--v2-green, #11a77b);
}

.context-quote .down {
  color: var(--v2-red, #f04449);
}

.welcome-title-row small {
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.report-feature-card {
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: 12px;
  color: var(--text);
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, var(--bg-elevated)), var(--bg-elevated));
  text-align: left;
}

.report-feature-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--text-on-accent, #111);
  background: var(--accent);
  font-size: 21px;
}

.report-feature-card > span:nth-child(2) {
  display: grid;
  gap: 3px;
}

.report-feature-card strong {
  font-size: 14px;
}

.report-feature-card em {
  color: var(--text-2);
  font-size: 10px;
  font-style: normal;
  line-height: 1.45;
}

.report-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}


@media (max-width: 340px) {
  .report-feature-card { grid-template-columns: 36px minmax(0, 1fr) 16px; padding: 10px; }
  .report-feature-icon { width: 36px; height: 36px; }
}
</style>
