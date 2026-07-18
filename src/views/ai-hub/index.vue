<template>
  <div class="ai-copilot-page">
    <div class="top-bar">
      <button type="button" class="nav-menu-btn" @click="openNav">
        <van-icon name="wap-nav" />
      </button>
      <div class="top-copy">
        <span class="eyebrow">
          {{ text.title }}
        </span>
      </div>
      <button type="button" class="history-btn" @click="openHistoryDrawer">
        <van-icon name="clock-o" />
        <span>{{ text.sessions }}</span>
      </button>
    </div>

    <div class="copilot-body">
      <div class="chat-panel">
        <div v-if="!messages.length" class="welcome-card">
          <div class="welcome-title-row">
            <span>{{ text.emptyTitle }}</span>
            <em>{{ text.emptyDesc }}</em>
          </div>
        </div>

        <div v-else ref="messageList" class="message-list">
          <div
            v-for="msg in messages"
            :key="msg.localId || msg.id"
            :class="['message-row', msg.role]"
          >
            <div class="avatar">
              <van-icon v-if="msg.role === 'user'" name="user-o" />
              <span v-else class="ai-avatar-mark">AI</span>
            </div>
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
                  <template v-else>
                    <div class="report-head">
                      <div>
                        <span>{{ reportMarketLabel(msg.report) }}</span>
                        <strong>{{ reportDecisionLabel(msg.report) }}</strong>
                      </div>
                      <em>{{ reportConfidence(msg.report) }}</em>
                    </div>
                    <p v-if="msg.report.summary" class="report-summary">{{ msg.report.summary }}</p>
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
                    </div>
                    <div class="report-scores">
                      <span>{{ $t('ai_analysis.score_technical') }} {{ reportScore(msg.report, 'technical') }}</span>
                      <span>{{ $t('ai_analysis.score_sentiment') }} {{ reportScore(msg.report, 'sentiment') }}</span>
                      <span>{{ $t('ai_analysis.score_overall') }} {{ reportScore(msg.report, 'overall') }}</span>
                    </div>
                    <div class="report-actions">
                      <button type="button" @click="openFullReport(msg.report)">
                        <van-icon name="description" />
                        {{ $t('ai_analysis.detailed_title') }}
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
                <van-loading v-if="msg.loading" size="18" />
              </div>
              <div v-if="msg.role === 'assistant' && msg.content && !msg.loading" class="bubble-tools">
                <button type="button" @click="copyText(msg.content)">
                  <van-icon name="records" />
                  {{ text.copy }}
                </button>
              </div>
              <div v-if="msg.actions?.length" class="action-strip">
                <button
                  v-for="action in msg.actions"
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

      <div class="bottom-suggestions">
        <div v-if="!messages.length" class="example-list">
          <button
            v-for="example in examples"
            :key="example"
            type="button"
            @click="composer = example"
          >
            {{ example }}
          </button>
        </div>

        <div v-if="!messages.length || showQuickTools" class="quick-task-grid">
          <button
            v-for="task in mobileTasks"
            :key="task.key"
            type="button"
            :class="['task-card', `tone-${task.tone || 'amber'}`]"
            @click="handleTask(task)"
          >
            <span class="task-icon">
              <van-icon :name="task.icon" />
            </span>
            <span class="task-copy">
              <strong>{{ task.label }}</strong>
            </span>
          </button>
        </div>
      </div>

      <div class="ask-card">
        <div class="composer-top-row">
          <button type="button" class="context-chip" @click="showSymbolPicker = true">
            <van-icon name="exchange" />
            <strong>{{ context.symbol }}</strong>
            <span>{{ context.market }}</span>
            <van-icon name="arrow-down" />
          </button>
          <button v-if="messages.length" type="button" class="tools-inline-btn" @click="showQuickTools = !showQuickTools">
            <van-icon name="apps-o" />
            {{ showQuickTools ? text.hideTools : text.quickTools }}
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
          </div>
          <button type="button" class="send-action" :disabled="sending || !canSend" @click="sendMessage">
            <van-loading v-if="sending" size="16" />
            <template v-else>
              <van-icon name="guide-o" />
            </template>
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
  </div>
</template>

<script>
import { showConfirmDialog, showImagePreview, showToast } from 'vant'
import { aiAnalysisApi, aiChatApi } from '@/api'
import { useAiAnalysisStore } from '@/stores'
import SymbolPicker from '@/components/SymbolPicker.vue'

const COPY = {
  'zh-CN': {
    title: 'AI Copilot',
    welcomeTitle: '你的专属 AI 自动化交易系统',
    welcomeDesc: '用一句话完成行情诊断、策略参数和交易研究。',
    sessions: '历史',
    currentSymbol: '当前标的',
    selectSymbol: '选择标的',
    emptyTitle: '你的专属 AI 自动化交易系统',
    emptyDesc: '把行情、策略和交易研究交给 AI Copilot。',
    placeholder: '例如：帮我诊断 BTC/USDT 1 小时趋势，或者上传 K 线图问是否适合开仓...',
    uploadImage: '上传图片',
    quickTools: '快捷工具',
    hideTools: '收起工具',
    copy: '复制',
    copied: '已复制',
    copyFailed: '复制失败',
    deleteSession: '删除记录',
    deleteSessionConfirm: '确定删除这条聊天记录吗？相关图片也会一起删除。',
    deleteSessionSuccess: '已删除',
    send: '发送',
    loading: '加载中',
    noSessions: '暂无会话历史',
    newChat: '新会话',
    imageAttached: '图片已添加',
    cancel: '取消',
    applyAndEdit: '应用并编辑',
    sending: 'AI 正在思考...',
    imageTooLarge: '图片过大，请选择 3MB 以内图片',
    imageAdded: '图片已添加',
    promptNeeded: '请输入问题或上传图片',
    strategyPromptNeeded: '请先写一点策略想法',
    generateFailed: '生成失败',
    taskDiagnose: '诊断标的',
    taskDiagnoseDesc: '趋势、量能、支撑阻力和风险',
    taskChart: '看图诊断',
    taskChartDesc: '上传 K 线图判断入场和失效位',
    taskNews: '新闻事件',
    taskNewsDesc: '检索资产和宏观事件影响',
    taskMacro: '宏观数据',
    taskMacroDesc: 'CPI、FOMC、利率和流动性',
    taskRadar: '机会雷达',
    taskRadarDesc: '扫描未来 24 小时触发条件'
  },
  'zh-TW': {
    title: 'AI Copilot',
    welcomeTitle: '你的專屬 AI 自動化交易系統',
    welcomeDesc: '用一句話完成行情診斷、策略參數和交易研究。',
    sessions: '歷史',
    currentSymbol: '目前標的',
    selectSymbol: '選擇標的',
    emptyTitle: '你的專屬 AI 自動化交易系統',
    emptyDesc: '把行情、策略和交易研究交給 AI Copilot。',
    placeholder: '例如：幫我診斷 BTC/USDT 1 小時趨勢，或上傳 K 線圖問是否適合開倉...',
    uploadImage: '上傳圖片',
    quickTools: '快捷工具',
    hideTools: '收起工具',
    copy: '複製',
    copied: '已複製',
    copyFailed: '複製失敗',
    deleteSession: '刪除記錄',
    deleteSessionConfirm: '確定刪除這條聊天記錄嗎？相關圖片也會一起刪除。',
    deleteSessionSuccess: '已刪除',
    send: '發送',
    loading: '載入中',
    noSessions: '暫無會話歷史',
    newChat: '新會話',
    imageAttached: '圖片已加入',
    cancel: '取消',
    applyAndEdit: '套用並編輯',
    sending: 'AI 正在思考...',
    imageTooLarge: '圖片過大，請選擇 3MB 以內圖片',
    imageAdded: '圖片已加入',
    promptNeeded: '請輸入問題或上傳圖片',
    strategyPromptNeeded: '請先寫一點策略想法',
    generateFailed: '生成失敗',
    taskDiagnose: '診斷標的',
    taskDiagnoseDesc: '趨勢、量能、支撐阻力和風險',
    taskChart: '看圖診斷',
    taskChartDesc: '上傳 K 線圖判斷入場和失效位',
    taskNews: '新聞事件',
    taskNewsDesc: '檢索資產和宏觀事件影響',
    taskMacro: '宏觀資料',
    taskMacroDesc: 'CPI、FOMC、利率和流動性',
    taskRadar: '機會雷達',
    taskRadarDesc: '掃描未來 24 小時觸發條件'
  },
  'en-US': {
    title: 'AI Copilot',
    welcomeTitle: 'Your personal AI automated trading system',
    welcomeDesc: 'Diagnose markets, shape strategy parameters, and research trades in one sentence.',
    sessions: 'History',
    currentSymbol: 'Current symbol',
    selectSymbol: 'Select symbol',
    emptyTitle: 'Your personal AI automated trading system',
    emptyDesc: 'Let AI Copilot handle market diagnosis, strategy thinking, and trade research.',
    placeholder: 'Example: diagnose BTC/USDT 1H trend, or upload a chart and ask whether entry risk is acceptable...',
    uploadImage: 'Upload image',
    quickTools: 'Quick tools',
    hideTools: 'Hide tools',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    deleteSession: 'Delete',
    deleteSessionConfirm: 'Delete this chat history? Related images will be removed too.',
    deleteSessionSuccess: 'Deleted',
    send: 'Send',
    loading: 'Loading',
    noSessions: 'No chat history',
    newChat: 'New chat',
    imageAttached: 'Image attached',
    cancel: 'Cancel',
    applyAndEdit: 'Apply & edit',
    sending: 'AI is thinking...',
    imageTooLarge: 'Image is too large. Choose one under 3MB.',
    imageAdded: 'Image added',
    promptNeeded: 'Enter a question or upload an image',
    strategyPromptNeeded: 'Write a short strategy idea first',
    generateFailed: 'Generation failed',
    taskDiagnose: 'Diagnose',
    taskDiagnoseDesc: 'Trend, volume, levels, and risk',
    taskChart: 'Chart review',
    taskChartDesc: 'Upload a chart for entry and invalidation',
    taskNews: 'News/events',
    taskNewsDesc: 'Research asset and macro drivers',
    taskMacro: 'Macro data',
    taskMacroDesc: 'CPI, FOMC, rates, and liquidity',
    taskRadar: 'Opportunity radar',
    taskRadarDesc: 'Scan triggers for the next 24 hours'
  },
  'ja-JP': {
    title: 'AI Copilot',
    welcomeTitle: 'あなただけの AI クオンツ OS',
    welcomeDesc: '一文で相場診断、戦略パラメータ、取引リサーチを進められます。',
    sessions: '履歴',
    currentSymbol: '現在の銘柄',
    selectSymbol: '銘柄を選択',
    emptyTitle: 'あなただけの AI クオンツ OS',
    emptyDesc: '相場、戦略、取引リサーチを AI Copilot に任せましょう。',
    placeholder: '例：BTC/USDT の1時間足を診断、またはチャート画像をアップロードしてエントリー可否を確認...',
    uploadImage: '画像',
    quickTools: 'クイックツール',
    hideTools: 'ツールを閉じる',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
    deleteSession: '削除',
    deleteSessionConfirm: 'このチャット履歴を削除しますか？関連画像も削除されます。',
    deleteSessionSuccess: '削除しました',
    send: '送信',
    loading: '読み込み中',
    noSessions: 'チャット履歴なし',
    newChat: '新規チャット',
    imageAttached: '画像を追加しました',
    cancel: 'キャンセル',
    applyAndEdit: '適用して編集',
    sending: 'AI が考えています...',
    imageTooLarge: '画像が大きすぎます。3MB 未満を選択してください。',
    imageAdded: '画像を追加しました',
    promptNeeded: '質問を入力するか画像をアップロードしてください',
    strategyPromptNeeded: 'まず戦略アイデアを入力してください',
    generateFailed: '生成に失敗しました',
    taskDiagnose: '銘柄診断',
    taskDiagnoseDesc: 'トレンド、出来高、重要水準、リスク',
    taskChart: 'チャート診断',
    taskChartDesc: '画像からエントリーと無効条件を確認',
    taskNews: 'ニュース',
    taskNewsDesc: '資産とマクロ材料を調査',
    taskMacro: 'マクロデータ',
    taskMacroDesc: 'CPI、FOMC、金利、流動性',
    taskRadar: '機会レーダー',
    taskRadarDesc: '24時間の発火条件を確認'
  },
  'ko-KR': {
    title: 'AI Copilot',
    welcomeTitle: '나만의 AI 퀀트 운영체제',
    welcomeDesc: '한 문장으로 시장 진단, 전략 파라미터, 거래 리서치를 진행하세요.',
    sessions: '기록',
    currentSymbol: '현재 종목',
    selectSymbol: '종목 선택',
    emptyTitle: '나만의 AI 퀀트 운영체제',
    emptyDesc: '시장, 전략, 거래 리서치를 AI Copilot에게 맡기세요.',
    placeholder: '예: BTC/USDT 1시간 추세를 진단하거나 차트 이미지를 올려 진입 가능성을 확인...',
    uploadImage: '이미지',
    quickTools: '빠른 도구',
    hideTools: '도구 닫기',
    copy: '복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    deleteSession: '삭제',
    deleteSessionConfirm: '이 채팅 기록을 삭제할까요? 관련 이미지도 함께 삭제됩니다.',
    deleteSessionSuccess: '삭제됨',
    send: '전송',
    loading: '로딩 중',
    noSessions: '채팅 기록 없음',
    newChat: '새 채팅',
    imageAttached: '이미지 추가됨',
    cancel: '취소',
    applyAndEdit: '적용 후 편집',
    sending: 'AI가 생각 중...',
    imageTooLarge: '이미지가 너무 큽니다. 3MB 이하를 선택하세요.',
    imageAdded: '이미지가 추가되었습니다',
    promptNeeded: '질문을 입력하거나 이미지를 업로드하세요',
    strategyPromptNeeded: '먼저 전략 아이디어를 입력하세요',
    generateFailed: '생성 실패',
    taskDiagnose: '종목 진단',
    taskDiagnoseDesc: '추세, 거래량, 레벨, 리스크',
    taskChart: '차트 진단',
    taskChartDesc: '이미지로 진입과 무효 조건 판단',
    taskNews: '뉴스/이벤트',
    taskNewsDesc: '자산과 매크로 이슈 조사',
    taskMacro: '매크로 데이터',
    taskMacroDesc: 'CPI, FOMC, 금리, 유동성',
    taskRadar: '기회 레이더',
    taskRadarDesc: '24시간 트리거 조건 스캔'
  }
}

export default {
  name: 'AiHub',
  inject: {
    openAppNav: {
      default: null
    }
  },
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
      sessions: [],
      loadingSessions: false,
      deletingSessionId: null,
      showQuickTools: false,
      showHistoryDrawer: false,
      showSymbolPicker: false,
      isComposerComposing: false,
      composerTask: null
    }
  },
  computed: {
    text() {
      const locale = this.$i18n?.locale || 'zh-CN'
      return COPY[locale] || COPY[locale.split('-')[0]] || COPY['en-US']
    },
    canSend() {
      return Boolean((this.composer || '').trim() || this.attachments.length)
    },
    mobileTasks() {
      return [
        { key: 'diagnose', icon: 'chart-trending-o', label: this.text.taskDiagnose, desc: this.text.taskDiagnoseDesc, mode: 'analysis', tone: 'amber' },
        { key: 'chart', icon: 'photo-o', label: this.text.taskChart, desc: this.text.taskChartDesc, mode: 'image', tone: 'blue' },
        { key: 'news', icon: 'description', label: this.text.taskNews, desc: this.text.taskNewsDesc, mode: 'chat', tone: 'violet' },
        { key: 'macro', icon: 'bar-chart-o', label: this.text.taskMacro, desc: this.text.taskMacroDesc, mode: 'chat', tone: 'cyan' },
        { key: 'radar', icon: 'location-o', label: this.text.taskRadar, desc: this.text.taskRadarDesc, mode: 'chat', tone: 'rose' },
        { key: 'analysis-history', icon: 'clock-o', label: this.$t('ai_analysis.history_title'), mode: 'route', route: '/ai-analysis/history', tone: 'indigo' }
      ]
    },
    examples() {
      const label = `${this.context.market}:${this.context.symbol}`
      const locale = this.$i18n?.locale || 'zh-CN'
      const isZh = locale.startsWith('zh')
      if (isZh) {
        return [
          `请诊断 ${label} 趋势，给出关键支撑阻力和失效条件。`,
          `请检索 ${label} 最近新闻和事件，区分事实、解读和不确定性。`,
          `帮我扫描 ${label} 未来 24 小时机会和风险，给出触发条件。`
        ]
      }
      return [
        `Diagnose ${label}: trend, levels, and invalidation.`,
        `Research recent news and events for ${label}, separating facts from interpretation.`,
        `Scan ${label} for opportunities and risks in the next 24 hours, with triggers.`
      ]
    }
  },
  methods: {
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
    openNav() {
      if (typeof this.openAppNav === 'function') this.openAppNav()
    },
    taskPrompt(task) {
      const label = `${this.context.market}:${this.context.symbol}`
      const locale = this.$i18n?.locale || 'zh-CN'
      const isZh = locale.startsWith('zh')
      const prompts = isZh
        ? {
            diagnose: `请诊断 ${label}。从趋势、量能、支撑阻力、资金面、风险回报比和失效条件给出可执行判断。`,
            chart: '我会上传一张 K 线图。请结合图形结构、趋势位置、量能、支撑阻力和风险回报比，判断目前是否适合进场，并给出止损、止盈和失效条件。',
            news: `请检索 ${label} 最近的新闻和事件，优先使用可靠且最新的来源，区分事实、市场解读和不确定性。`,
            macro: `请检查 CPI、FOMC、利率、GDP、PCE、就业、流动性等宏观数据，说明对 ${label} 的潜在影响和关键风险。`,
            radar: `请扫描 ${label} 未来 24 小时可能出现的机会，重点给出触发条件、确认信号、失效位和主要风险。`
          }
        : {
            diagnose: `Diagnose ${label}: trend, momentum, support/resistance, liquidity, risk/reward, and invalidation.`,
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
    handleTask(task) {
      if (task.mode === 'route' && task.route) {
        this.$router.push(task.route)
        return
      }
      if (task.mode === 'analysis') {
        this.runProfessionalAnalysis()
        return
      }
      this.composer = this.taskPrompt(task)
      this.composerTask = task
      if (task.mode === 'image') {
        this.triggerImageUpload()
        return
      }
      if (this.messages.length) this.showQuickTools = false
    },
    async sendMessage() {
      if (!this.canSend || this.sending) {
        if (!this.canSend) showToast({ message: this.text.promptNeeded, type: 'fail' })
        return
      }
      const content = (this.composer || '').trim()
      const outboundAttachments = this.attachments.slice()
      const task = this.composerTask
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
            context: {
              ...this.buildChatContext(),
              selected_task: task?.key || null
            }
          }
          await this.sendMessageStream(payload, pendingMsg)
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
      await aiChatApi.streamMessage(payload, async (event, data) => {
        if (event === 'meta') {
          this.sessionId = data?.session_id || this.sessionId
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
        if (event === 'done') {
          this.sessionId = data?.session_id || this.sessionId
          this.updatePendingMessage(pendingMsg, { id: data?.message_id || pendingMsg.id })
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
          throw new Error(data?.msg || data?.message || this.text.generateFailed)
        }
      })
      if (!hasContent && pendingMsg.content === this.text.sending) {
        throw new Error(this.text.generateFailed)
      }
    },
    filterMobileActions(actions) {
      return (actions || []).filter((action) => {
        const type = String(action.type || '').toLowerCase()
        return !/backtest|indicator|script|code/.test(type)
      })
    },
    handleCopilotAction(action) {
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
        const report = message.report || {}
        const target = message.reportTarget || {}
        const market = report.market || target.market || ''
        const symbol = report.symbol || target.symbol || ''
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
      this.showQuickTools = false
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
        timeframe: target.timeframe || '4h',
        language: this.$i18n?.locale || 'zh-CN'
      })
      const payload = res?.data || res || {}
      if (payload.code === 0) {
        const err = new Error(payload.msg || this.$t('ai_analysis.error_tip'))
        err.response = { data: payload }
        throw err
      }
      const data = payload.data && typeof payload.data === 'object' ? payload.data : payload
      return {
        ...data,
        market: data.market || target.market,
        symbol: data.symbol || target.symbol,
        timeframe: data.timeframe || target.timeframe || '4h'
      }
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
      if (!report) return
      useAiAnalysisStore().setLastResult(report)
      this.$router.push({
        path: '/ai-analysis',
        query: {
          market: report.market || this.context.market,
          symbol: report.symbol || this.context.symbol,
          timeframe: report.timeframe || this.context.timeframe
        }
      })
    },
    generateStrategyFromReport(report) {
      if (!report) return
      const symbol = report.symbol || this.context.symbol
      const timeframe = report.timeframe || this.context.timeframe || '4h'
      const decision = String(report.decision || '').toUpperCase() || 'HOLD'
      const locale = this.$i18n?.locale || 'zh-CN'
      const isZh = locale.startsWith('zh')
      const prompt = isZh
        ? `基于 ${symbol} (${timeframe}) 的 AI 分析建议 ${decision}，请生成一个合适的交易机器人参数。分析摘要：${report.summary || ''}`
        : `Based on the AI analysis of ${symbol} (${timeframe}) suggesting ${decision}, please generate suitable trading bot parameters. Summary: ${report.summary || ''}`
      this.$router.push({ path: '/trading/create/script', query: { prompt, symbol } })
    },
    reportMarketLabel(report) {
      return [report?.market, report?.symbol].filter(Boolean).join(':') || this.$t('ai_analysis.title')
    },
    reportDecisionLabel(report) {
      const d = String(report?.decision || '').toUpperCase()
      if (d.includes('BUY')) return this.$t('ai_analysis.decision_buy')
      if (d.includes('SELL')) return this.$t('ai_analysis.decision_sell')
      return this.$t('ai_analysis.decision_hold')
    },
    reportTone(report) {
      const d = String(report?.decision || '').toUpperCase()
      if (d.includes('BUY')) return 'buy'
      if (d.includes('SELL')) return 'sell'
      return 'hold'
    },
    reportConfidence(report) {
      const value = Number(report?.confidence)
      return Number.isFinite(value) ? `${Math.round(value)}%` : '--'
    },
    reportPlanValue(report, type) {
      const plan = report?.trading_plan || report?.tradingPlan || {}
      const map = {
        entry: plan.entry_price ?? plan.entryPrice ?? report?.entry_price ?? report?.entryPrice,
        stop: plan.stop_loss ?? plan.stopLoss ?? report?.stop_loss ?? report?.stopLoss,
        take: plan.take_profit ?? plan.takeProfit ?? report?.take_profit ?? report?.takeProfit
      }
      return this.formatReportNumber(map[type])
    },
    reportScore(report, key) {
      const scores = report?.scores || {}
      return this.formatReportNumber(scores[key], 0)
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
      try {
        const res = await aiChatApi.getHistory({ session_id: session.id })
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
          reportErrorTone: msg.reportErrorTone || ''
        }))
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
  display: flex;
  flex-direction: column;
  padding: calc(12px + var(--safe-area-top, 0px)) 18px calc(10px + var(--safe-area-bottom, 0px));
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

.nav-menu-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--border);
  color: var(--text);
  background: var(--surface-raised);
  font-size: 18px;
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

.history-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
}

.ask-card,
.recommend-sheet {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.ask-card {
  position: relative;
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
  flex: 1;
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

.tools-inline-btn {
  height: 34px;
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #a78bfa 34%, var(--border));
  color: #c4b5fd;
  background:
    linear-gradient(135deg, rgba(167, 139, 250, 0.14), rgba(56, 189, 248, 0.06)),
    var(--surface-raised);
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
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
  font-size: 12.5px;
  line-height: 1.45;
}

.ask-card textarea::placeholder {
  color: var(--text-3);
}

.bottom-suggestions {
  margin-top: auto;
}

.bottom-suggestions .example-list {
  margin-bottom: 8px;
}

.task-copy em,
.session-row em {
  font-style: normal;
  color: var(--text-3);
  font-size: 11px;
}

.quick-task-grid {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 0 0 6px;
  margin: 4px -2px 6px;
  scrollbar-width: none;
}

.quick-task-grid::-webkit-scrollbar {
  display: none;
}

.task-card {
  min-width: 116px;
  min-height: 34px;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-raised) 78%, transparent);
  text-align: left;
  flex-shrink: 0;
}

.task-card:active {
  border-color: var(--tone);
  background: color-mix(in srgb, var(--tone) 13%, var(--surface-raised));
}

.task-icon {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 18%, transparent);
  font-size: 14px;
}

.task-card.tone-amber {
  --tone: #f5b51b;
}

.task-card.tone-blue {
  --tone: #38bdf8;
}

.task-card.tone-green {
  --tone: #34d399;
}

.task-card.tone-violet {
  --tone: #a78bfa;
}

.task-card.tone-indigo {
  --tone: #818cf8;
}

.task-card.tone-cyan {
  --tone: #22d3ee;
}

.task-card.tone-rose {
  --tone: #fb7185;
}

.task-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.task-copy strong {
  color: var(--text);
  font-size: 10.5px;
  font-weight: 900;
  white-space: nowrap;
}

.task-copy em {
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chat-panel {
  flex: 0 1 auto;
  min-height: auto;
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

.example-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.example-list button {
  padding: 8px 11px;
  border-radius: 13px;
  border: 1px solid transparent;
  color: var(--text-2);
  background: color-mix(in srgb, var(--surface-raised) 72%, transparent);
  text-align: left;
  font-size: 11px;
  line-height: 1.4;
}

.example-list button:active {
  border-color: var(--accent);
  color: var(--text);
  background: var(--accent-soft);
}

.message-list {
  height: calc(100vh - 220px - var(--safe-area-top, 0px) - var(--safe-area-bottom, 0px));
  min-height: 300px;
  max-height: none;
  overflow-y: auto;
  padding: 14px 12px calc(92px + var(--safe-area-bottom, 0px));
  scroll-padding-bottom: calc(92px + var(--safe-area-bottom, 0px));
}

.message-row {
  display: flex;
  gap: 9px;
  margin-bottom: 14px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: 12px;
}

.message-row.assistant .avatar {
  color: #d8f4ff;
  border-color: color-mix(in srgb, #38bdf8 36%, var(--border));
  background:
    linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(167, 139, 250, 0.18)),
    var(--surface-raised);
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.12);
}

.ai-avatar-mark {
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0;
}

.bubble-wrap {
  max-width: calc(100% - 48px);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-deep) 78%, transparent);
}

.report-plan div {
  min-width: 0;
  padding: 9px 8px;
  border-right: 1px solid var(--border);
}

.report-plan div:last-child {
  border-right: 0;
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
  grid-template-columns: 1fr;
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

.bubble p {
  margin: 0;
}

.markdown-body {
  color: inherit;
  font-size: 13px;
  line-height: 1.72;
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
  min-width: 36px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--on-accent);
  border: 0;
  background: linear-gradient(135deg, #f2b632 0%, #ff6b35 58%, #e34848 100%);
  box-shadow: 0 8px 18px rgba(255, 107, 53, 0.2);
  font-size: 15px;
}

.send-action:disabled {
  opacity: 0.55;
}

.history-popup :deep(.van-popup),
.recommend-popup :deep(.van-popup) {
  background: var(--bg-elevated);
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
