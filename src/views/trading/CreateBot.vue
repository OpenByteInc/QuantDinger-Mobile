<template>
  <div class="page">
    <van-nav-bar :title="$t('trading.create_choice_title')" left-arrow @click-left="$router.back()" />
    <div class="options">
      <div class="option" @click="$router.push('/trading/create/ai')">
        <div class="icon ai">
          <van-icon name="fire-o" />
        </div>
        <div class="copy">
          <div class="title">{{ $t('trading.create_choice_ai_title') }}</div>
          <p class="desc">{{ $t('trading.create_choice_ai_desc') }}</p>
        </div>
        <van-icon name="arrow" class="arrow" />
      </div>
      <div class="option" @click="$router.push('/trading/create/manual')">
        <div class="icon manual">
          <van-icon name="setting-o" />
        </div>
        <div class="copy">
          <div class="title">{{ $t('trading.create_choice_manual_title') }}</div>
          <p class="desc">{{ $t('trading.create_choice_manual_desc') }}</p>
        </div>
        <van-icon name="arrow" class="arrow" />
      </div>
      <div class="option" @click="$router.push('/trading/create/indicator')">
        <div class="icon indicator">
          <van-icon name="bar-chart-o" />
        </div>
        <div class="copy">
          <div class="title">{{ $t('trading.create_choice_indicator_title') }}</div>
          <p class="desc">{{ $t('trading.create_choice_indicator_desc') }}</p>
        </div>
        <van-icon name="arrow" class="arrow" />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'BotCreate' }
</script>

<style scoped>
.page { min-height: 100vh; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.options { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
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
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.icon.ai        { background: var(--c-indigo); color: #ffffff; }
.icon.manual    { background: var(--c-amber);  color: #0a0a0d; }
.icon.indicator { background: var(--c-green);  color: #ffffff; }
.copy { flex: 1; min-width: 0; }
.title { color: var(--text); font-weight: 700; font-size: 15px; }
.desc  { color: var(--text-2); font-size: 12px; margin-top: 4px; line-height: 1.5; }
.arrow { color: var(--text-3); }
</style>
