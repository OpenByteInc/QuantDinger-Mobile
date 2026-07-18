<template>
  <div class="page">
    <van-nav-bar :title="$t('trading.create_choice_title')" left-arrow @click-left="$router.back()" />

    <div class="intro-card">
      <div class="intro-kicker">{{ $t('trading.create_sources_kicker') }}</div>
      <div class="intro-title">{{ $t('trading.create_repository_title') }}</div>
      <p>{{ $t('trading.create_repository_desc') }}</p>
      <div class="intro-actions">
        <van-button round type="primary" block :loading="loading" @click="loadSources">
          {{ $t('trading.create_repository_cta') }}
        </van-button>
        <van-button round plain block @click="$router.push({ path: '/market', query: { asset_type: scriptAssetType } })">
          {{ $t('trading.create_market_cta') }}
        </van-button>
      </div>
    </div>

    <section class="source-section">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('trading.create_choice_script_title') }}</div>
          <div class="section-subtitle">{{ $t('trading.create_source_count', { count: sources.length }) }}</div>
        </div>
        <van-icon name="replay" class="refresh-icon" :class="{ spinning: loading }" @click="loadSources" />
      </div>

      <van-loading v-if="loading && !sources.length" class="source-loading" vertical>
        {{ $t('common.loading') }}
      </van-loading>

      <div v-else-if="sources.length" class="source-list">
        <button
          v-for="source in sources"
          :key="source.id"
          type="button"
          class="source-card"
          @click="goCreate(source)"
        >
          <span :class="['source-icon', sourceTone(source)]">
            <van-icon :name="sourceIcon(source)" />
          </span>
          <span class="source-copy">
            <span class="source-heading">
              <strong>{{ sourceName(source) }}</strong>
              <small>{{ sourceTypeLabel(source) }}</small>
            </span>
            <span class="source-desc">{{ sourceDescription(source) }}</span>
          </span>
          <van-icon name="arrow" class="arrow" />
        </button>
      </div>

      <van-empty v-else :description="$t('trading.create_source_empty')">
        <van-button round type="primary" size="small" @click="$router.push({ path: '/market', query: { asset_type: scriptAssetType } })">
          {{ $t('trading.create_market_cta') }}
        </van-button>
      </van-empty>
    </section>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { scriptSourceApi } from '@/api'
import { ASSET_TYPES } from '@/utils/marketRoutes'

export default {
  name: 'BotCreate',
  data() {
    return {
      loading: false,
      sources: []
    }
  },
  computed: {
    scriptAssetType() {
      return ASSET_TYPES.SCRIPT_TEMPLATE
    }
  },
  mounted() {
    this.loadSources()
  },
  methods: {
    async loadSources() {
      if (this.loading) return
      this.loading = true
      try {
        const response = await scriptSourceApi.getList()
        this.sources = (Array.isArray(response?.data) ? response.data : [])
          .filter((source) => source?.id && ['script', 'portfolio_strategy'].includes(String(source.asset_type || 'script')))
      } catch {
        this.sources = []
        showToast({ message: this.$t('trading.create_source_load_failed'), type: 'fail' })
      } finally {
        this.loading = false
      }
    },
    goCreate(source) {
      if (!source?.id) return
      this.$router.push({
        path: '/trading/create/script',
        query: {
          source_id: String(source.id),
          name: this.sourceName(source)
        }
      })
    },
    isPortfolio(source) {
      return String(source?.asset_type || '').toLowerCase() === 'portfolio_strategy'
    },
    sourceName(source) {
      return source?.name || source?.strategy_name || this.$t('script_strategy.untitled')
    },
    sourceDescription(source) {
      return source?.description || this.$t('script_strategy.desc')
    },
    sourceTypeLabel(source) {
      return this.$t(this.isPortfolio(source) ? 'script_strategy.type_portfolio' : 'script_strategy.type_cta')
    },
    sourceIcon(source) {
      return this.isPortfolio(source) ? 'cluster-o' : 'description'
    },
    sourceTone(source) {
      return this.isPortfolio(source) ? 'portfolio' : 'script'
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 40px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.intro-card {
  margin: 12px 16px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: radial-gradient(220px 160px at 100% 0, var(--c-amber-soft), transparent 70%), var(--bg-elevated);
  border: 1px solid var(--border);
}
.intro-kicker {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 8px;
}
.intro-title {
  color: var(--text);
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 8px;
}
.intro-card p {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 16px;
}
.intro-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.intro-actions :deep(.van-button) {
  height: 40px;
  font-weight: 800;
}
.source-section { padding: 4px 16px 16px; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0 2px;
}
.section-title { color: var(--text); font-size: 16px; font-weight: 900; }
.section-subtitle { margin-top: 3px; color: var(--text-3); font-size: 11px; }
.refresh-icon { padding: 8px; color: var(--accent); font-size: 20px; }
.refresh-icon.spinning { animation: spin 0.8s linear infinite; }
.source-loading { padding: 52px 0; color: var(--text-2); }
.source-list { display: flex; flex-direction: column; gap: 12px; }
.source-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: inherit;
  text-align: left;
}
.source-icon {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.source-icon.script { background: rgba(124, 92, 255, 0.16); color: #8b6cff; }
.source-icon.portfolio { background: rgba(24, 144, 255, 0.16); color: #40a9ff; }
.source-copy { flex: 1; min-width: 0; display: block; }
.source-heading { display: flex; align-items: center; gap: 8px; }
.source-heading strong { min-width: 0; overflow: hidden; color: var(--text); font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.source-heading small { flex: 0 0 auto; padding: 3px 7px; border-radius: 999px; background: var(--surface-raised); color: var(--accent); font-size: 9px; font-weight: 800; }
.source-desc { display: -webkit-box; overflow: hidden; margin-top: 5px; color: var(--text-2); font-size: 12px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.arrow { color: var(--text-3); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
