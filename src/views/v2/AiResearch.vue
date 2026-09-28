<template><div class="research-shell"><AiHub /></div></template>
<script setup>
import AiHub from '@/views/ai-hub/index.vue'
defineOptions({name:'AiResearchV2'})
</script>
<style scoped>
.research-shell{height:100%;min-height:0;background:var(--v2-bg);--bg:var(--v2-bg);--bg-elevated:var(--v2-surface);--surface-raised:var(--v2-surface-2);--border:var(--v2-line);--border-strong:var(--v2-line);--text:var(--v2-text);--text-2:var(--v2-muted);--text-3:var(--v2-soft);--accent:var(--v2-brand);--accent-gold:var(--v2-brand);--accent-soft:color-mix(in srgb,var(--v2-brand) 12%,var(--v2-surface));--accent-softer:color-mix(in srgb,var(--v2-brand) 6%,var(--v2-surface));--text-on-accent:var(--v2-on-brand)}
.research-shell :deep(.ai-copilot-page){background:var(--v2-bg);min-height:100%;color:var(--v2-text)}
.research-shell :deep(.welcome-card),.research-shell :deep(.analysis-report-card),.research-shell :deep(.composer-shell){background:var(--v2-surface);box-shadow:none;border:1px solid var(--v2-line);border-radius:12px}
.research-shell :deep(.bubble){box-shadow:none;border-radius:12px;background:var(--v2-surface);border:1px solid var(--v2-line)}
.research-shell :deep(.message-row.user .bubble){background:color-mix(in srgb,var(--v2-brand) 18%,var(--v2-surface))}
.research-shell :deep(.eyebrow){font-size:24px;font-weight:750;letter-spacing:0;color:var(--v2-text)}
.research-shell :deep(.new-chat),.research-shell :deep(.history-btn){color:var(--v2-text);box-shadow:none;background:var(--v2-surface)}
</style>

<style scoped>
.research-shell :deep(.top-bar){display:grid;grid-template-columns:40px minmax(0,1fr) 40px;gap:8px;align-items:center;margin-bottom:14px}
.research-shell :deep(.new-chat),.research-shell :deep(.history-btn){width:38px;height:38px;display:grid;place-items:center;padding:0;border:1px solid var(--v2-line);border-radius:11px;color:var(--v2-text);font-size:18px}
.research-shell :deep(.history-btn){justify-self:end}.research-shell :deep(.new-chat .van-icon),.research-shell :deep(.history-btn .van-icon){font-size:18px}
.research-shell :deep(.top-bar .context-chip){width:100%;min-height:44px;height:44px;margin:0;padding:4px 7px 4px 11px;border:1px solid var(--v2-line);border-radius:11px;background:var(--v2-surface);box-shadow:none}
.research-shell :deep(.top-bar .context-identity){display:grid;gap:2px;text-align:left}
.research-shell :deep(.top-bar .context-identity strong){color:var(--v2-text);font-size:16px;font-style:normal;line-height:1.05}
.research-shell :deep(.top-bar .context-identity em){color:var(--v2-muted);font-size:9px}
.research-shell :deep(.top-bar .context-quote){display:grid;gap:1px;justify-items:end}
.research-shell :deep(.top-bar .context-quote strong){color:var(--v2-text);font-size:14px;line-height:1.05}
.research-shell :deep(.top-bar .context-quote em){font-size:9px}
.research-shell :deep(.top-bar .context-switch){width:24px;height:24px;display:grid;place-items:center;border-radius:7px;background:var(--v2-surface-2);color:var(--v2-text);font-size:12px}
.research-shell :deep(.welcome-card){border:0;background:none;justify-content:center;text-align:center;padding:24px 16px}
.research-shell :deep(.welcome-title-row){align-items:center;gap:10px}.research-shell :deep(.welcome-title-row span){font-size:21px;font-weight:650}.research-shell :deep(.welcome-title-row em){font-size:13px}
.research-shell :deep(.welcome-title-row small){color:var(--v2-brand-strong)}
.research-shell :deep(.report-feature-card){border-color:color-mix(in srgb,var(--v2-brand) 45%,var(--v2-line));background:linear-gradient(135deg,color-mix(in srgb,var(--v2-brand) 12%,var(--v2-surface)),var(--v2-surface))}
.research-shell :deep(.report-feature-icon){background:var(--v2-brand);color:var(--v2-on-brand)}
.research-shell :deep(.ask-card){background:var(--v2-surface);border:1px solid var(--v2-line);box-shadow:none;border-radius:12px}
.research-shell :deep(.send-action){background:var(--v2-brand);color:var(--v2-on-brand);box-shadow:none;border-radius:9px}
.research-shell :deep(.starter-grid button){box-shadow:none;background:var(--v2-surface-2);border-radius:10px}.research-shell :deep(.starter-icon){color:var(--v2-brand-strong);background:color-mix(in srgb,var(--v2-brand) 11%,var(--v2-surface))}
.research-shell :deep(.memory-action){background:var(--v2-surface-2);color:var(--v2-text);border:0;box-shadow:none}
.research-shell :deep(.icon-action){background:none;box-shadow:none;border:0;color:var(--v2-muted)}
</style>

<style scoped>.research-shell :deep(.message-row.user .bubble){color:var(--v2-text)}.research-shell :deep(.message-row.user .markdown-body){color:inherit}</style>
