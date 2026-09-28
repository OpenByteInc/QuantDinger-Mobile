<template>
  <div class="ai-page">
    <van-nav-bar
      fixed
      placeholder
      safe-area-inset-top
      :title="$t('ai_analysis.title')"
      left-arrow
      @click-left="$router.back()"
    />

    <main v-if="result" class="report-wrap">
      <ProfessionalAnalysisReport :value="result" :show-regenerate="false" />
    </main>

    <section v-else class="report-empty">
      <span><van-icon name="description" /></span>
      <strong>{{ $t('ai_analysis.no_result') }}</strong>
      <p>{{ $t('ai_chat.professionalReportDesc') }}</p>
    </section>
  </div>
</template>

<script>
import ProfessionalAnalysisReport from '@/components/ProfessionalAnalysisReport.vue'
import { useAiAnalysisStore } from '@/stores'

export default {
  name: 'AiAnalysis',
  components: { ProfessionalAnalysisReport },
  computed: {
    aiStore() { return useAiAnalysisStore() },
    result() { return this.aiStore.lastResult }
  }
}
</script>

<style scoped>
.ai-page {
  min-height: 100%;
  padding-bottom: 28px;
  background: var(--v2-bg, var(--bg));
}

:deep(.van-nav-bar) {
  background: color-mix(in srgb, var(--v2-bg, var(--bg)) 94%, transparent);
  border-bottom: 1px solid var(--v2-line, var(--border));
  backdrop-filter: blur(12px);
}

:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) {
  color: var(--text);
}

.report-wrap {
  margin: 12px var(--page-gutter);
}

.report-empty {
  min-height: 62vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  padding: 24px;
  color: var(--text-2);
  text-align: center;
}

.report-empty > span {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 25px;
}

.report-empty strong {
  color: var(--text);
  font-size: 15px;
}

.report-empty p {
  max-width: 300px;
  margin: 0;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.55;
}

@media (min-width: 720px) {
  .ai-page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    border-inline: 1px solid var(--v2-line, var(--border));
  }
}
</style>
