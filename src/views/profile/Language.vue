<template>
  <div class="page">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="$t('v2.profile.languageTheme')" left-arrow @click-left="$router.back()" />
    <section class="settings-section">
      <h2>{{ $t('appearance.displayMode') }}</h2>
      <div class="mode-grid">
        <button v-for="item in themeOptions" :key="item.value" type="button" :class="{ active: settingsStore.theme === item.value }" @click="settingsStore.setTheme(item.value)">
          <van-icon :name="item.icon" />
          <span>{{ item.label }}</span>
          <van-icon v-if="settingsStore.theme === item.value" name="success" class="selected-icon" />
        </button>
      </div>
    </section>
    <section class="settings-section">
      <h2>{{ $t('appearance.accentColor') }}</h2>
      <p>{{ $t('appearance.followHint') }}</p>
      <div class="accent-grid">
        <button v-for="item in accentOptions" :key="item.value" type="button" :class="{ active: settingsStore.accent === item.value }" @click="settingsStore.setAccent(item.value)">
          <i :style="{ backgroundColor: item.color }"></i>
          <span>{{ item.label }}</span>
          <van-icon v-if="settingsStore.accent === item.value" name="success" class="selected-icon" />
        </button>
      </div>
    </section>
    <section class="settings-section language-section">
      <h2>{{ $t('appearance.language') }}</h2>
    <van-cell-group inset>
      <van-cell
        v-for="item in options"
        :key="item.value"
        :title="item.label"
        clickable
        @click="onSelect(item.value)"
      >
        <template #right-icon>
          <van-icon v-if="current === item.value" name="success" color="var(--accent)" size="18" />
        </template>
      </van-cell>
    </van-cell-group>
    </section>
  </div>
</template>

<script>
import { showToast } from 'vant'
import { useSettingsStore } from '@/stores'

export default {
  name: 'LanguageSetting',
  computed: {
    settingsStore() { return useSettingsStore() },
    current() { return this.settingsStore.locale },
    themeOptions() {
      return [
        { value: 'light', label: this.$t('appearance.light'), icon: 'bulb-o' },
        { value: 'dark', label: this.$t('appearance.dark'), icon: 'closed-eye' }
      ]
    },
    accentOptions() {
      return [
        { value: 'gold', label: this.$t('appearance.gold'), color: '#ffc400' },
        { value: 'ocean', label: this.$t('appearance.ocean'), color: '#3b82f6' },
        { value: 'emerald', label: this.$t('appearance.emerald'), color: '#10b981' },
        { value: 'violet', label: this.$t('appearance.violet'), color: '#8b5cf6' },
        { value: 'coral', label: this.$t('appearance.coral'), color: '#f97316' },
        { value: 'crimson', label: this.$t('appearance.crimson'), color: '#d4042d' },
        { value: 'sunrise', label: this.$t('appearance.sunrise'), color: '#db7a0e' },
        { value: 'sky', label: this.$t('appearance.sky'), color: '#5a92e5' },
        { value: 'mint', label: this.$t('appearance.mint'), color: '#50c878' },
        { value: 'pink', label: this.$t('appearance.pink'), color: '#eb6d98' },
        { value: 'cyan', label: this.$t('appearance.cyan'), color: '#41b5c2' },
        { value: 'yellow', label: this.$t('appearance.yellow'), color: '#faca2e' },
        { value: 'plum', label: this.$t('appearance.plum'), color: '#722169' }
      ]
    },
    options() {
      return [
        { value: 'en-US', label: this.$t('language.en_us') },
        { value: 'zh-CN', label: this.$t('language.zh_cn') },
        { value: 'zh-TW', label: this.$t('language.zh_tw') },
        { value: 'ja-JP', label: this.$t('language.ja_jp') },
        { value: 'ko-KR', label: this.$t('language.ko_kr') }
      ]
    }
  },
  methods: {
    onSelect(value) {
      this.settingsStore.setLocale(value)
      showToast({ message: this.$t('common.success'), type: 'success' })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 24px; background: var(--bg); }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
:deep(.van-cell-group--inset) {
  margin: 16px var(--page-gutter);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title) { color: var(--text); }
.settings-section { margin: 18px var(--page-gutter) 0; }
.settings-section h2 { margin: 0 0 9px 4px; color: var(--text); font-size: 13px; font-weight: 750; }
.settings-section > p { margin: -3px 4px 11px; color: var(--text-3); font-size: 11px; line-height: 1.45; }
.mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.mode-grid button, .accent-grid button { position: relative; min-width: 0; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-2); }
.mode-grid button { min-height: 66px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 13px; font-size: 13px; }
.mode-grid button > .van-icon:first-child { font-size: 20px; }
.mode-grid button.active, .accent-grid button.active { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); background: var(--accent-soft); color: var(--text); }
.selected-icon { margin-left: 2px; color: var(--accent); }
.accent-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.accent-grid button { min-height: 46px; display: flex; align-items: center; gap: 7px; padding: 0 9px; border-radius: 11px; text-align: left; font-size: 11px; }
.accent-grid button i { width: 16px; height: 16px; flex: 0 0 16px; border: 3px solid color-mix(in srgb, currentColor 12%, transparent); border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(255,255,255,.28); }
.accent-grid button span { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.accent-grid .selected-icon { position: absolute; right: 5px; bottom: 4px; margin: 0; font-size: 10px; }
.language-section :deep(.van-cell-group--inset) { margin: 0; }
@media (max-width: 350px) { .accent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
