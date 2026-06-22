<template>
  <div class="page">
    <van-nav-bar :title="$t('trading.create_choice_title')" left-arrow @click-left="$router.back()" />

    <div class="intro-card">
      <div class="intro-kicker">{{ $t('market.my_purchases') }}</div>
      <div class="intro-title">{{ $t('trading.create_repository_title') }}</div>
      <p>{{ $t('trading.create_repository_desc') }}</p>
      <div class="intro-actions">
        <van-button round type="primary" block @click="$router.push('/market/my-purchases')">
          {{ $t('trading.create_repository_cta') }}
        </van-button>
        <van-button round plain block @click="$router.push('/market')">
          {{ $t('trading.create_market_cta') }}
        </van-button>
      </div>
    </div>

    <div class="options">
      <div
        v-for="item in options"
        :key="item.key"
        class="option"
        @click="$router.push(item.route)"
      >
        <div class="icon" :class="item.tone">
          <van-icon :name="item.icon" />
        </div>
        <div class="copy">
          <div class="title">{{ item.title }}</div>
          <p class="desc">{{ item.desc }}</p>
        </div>
        <van-icon name="arrow" class="arrow" />
      </div>
    </div>
  </div>
</template>

<script>
import { ASSET_TYPES } from '@/utils/marketRoutes'

export default {
  name: 'BotCreate',
  computed: {
    options() {
      return [
        {
          key: 'ai',
          icon: 'service-o',
          tone: 'ai',
          title: this.$t('trading.create_choice_ai_title'),
          desc: this.$t('trading.create_choice_ai_desc'),
          route: { path: '/trading/create/ai' }
        },
        {
          key: 'manual',
          icon: 'setting-o',
          tone: 'manual',
          title: this.$t('trading.create_choice_manual_title'),
          desc: this.$t('trading.create_choice_manual_desc'),
          route: { path: '/trading/create/manual' }
        },
        {
          key: ASSET_TYPES.INDICATOR,
          icon: 'bar-chart-o',
          tone: 'indicator',
          title: this.$t('trading.create_choice_indicator_title'),
          desc: this.$t('trading.create_choice_indicator_desc'),
          route: { path: '/trading/create/indicator' }
        },
        {
          key: ASSET_TYPES.SCRIPT_TEMPLATE,
          icon: 'description',
          tone: 'script',
          title: this.$t('trading.create_choice_script_title'),
          desc: this.$t('trading.create_choice_script_desc'),
          route: { path: '/market/my-purchases', query: { asset_type: ASSET_TYPES.SCRIPT_TEMPLATE } }
        },
        {
          key: ASSET_TYPES.BOT_PRESET,
          icon: 'apps-o',
          tone: 'preset',
          title: this.$t('trading.create_choice_preset_title'),
          desc: this.$t('trading.create_choice_preset_desc'),
          route: { path: '/market/my-purchases', query: { asset_type: ASSET_TYPES.BOT_PRESET } }
        }
      ]
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
.options { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.icon.indicator { background: rgba(24, 144, 255, 0.16); color: #40a9ff; }
.icon.script    { background: rgba(124, 92, 255, 0.16); color: #8b6cff; }
.icon.preset    { background: rgba(250, 173, 20, 0.18); color: #ffc53d; }
.icon.ai        { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; }
.icon.manual    { background: rgba(34, 197, 94, 0.14); color: #22c55e; }
.copy { flex: 1; min-width: 0; }
.title { color: var(--text); font-weight: 800; font-size: 15px; }
.desc  { color: var(--text-2); font-size: 12px; margin-top: 4px; line-height: 1.5; }
.arrow { color: var(--text-3); }
</style>
