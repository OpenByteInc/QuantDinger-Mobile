<template>
  <div class="page">
    <van-nav-bar :title="$t('profile.language')" left-arrow @click-left="$router.back()" />
    <van-cell-group inset>
      <van-cell
        v-for="item in options"
        :key="item.value"
        :title="item.label"
        clickable
        @click="onSelect(item.value)"
      >
        <template #right-icon>
          <van-icon v-if="current === item.value" name="success" color="#7c5cff" size="18" />
        </template>
      </van-cell>
    </van-cell-group>
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
.page { min-height: 100vh; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
:deep(.van-cell-group--inset) {
  margin: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title) { color: var(--text); }
</style>
