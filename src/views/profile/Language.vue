<template>
  <div class="page account-page">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="$t('v2.profile.language')" left-arrow @click-left="$router.back()" />
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
.settings-section { margin: 24px 16px 0; }
.settings-section h2 { margin: 0 0 9px 4px; color: var(--text); font-size: 13px; font-weight: 750; }
.language-section :deep(.van-cell-group--inset) { margin: 0; }
</style>
