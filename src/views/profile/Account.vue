<template>
  <div class="account-page edit-profile-page">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="t('profile.edit_profile')" left-arrow @click-left="router.back()" />
    <van-button v-if="loadFailed" block @click="loadProfile">{{ t('audit.loadFailed') }}</van-button>
    <van-loading v-if="loading" class="profile-loading" />
    <div v-if="store.userInfo" class="profile-identity">
      <img :src="avatarFailed ? '/avatar2.jpg' : avatarUrl" :alt="t('profile_detail.avatar')" @error="avatarFailed = true" />
      <div><strong>{{ store.userInfo?.nickname || store.userInfo?.username }}</strong><span>{{ store.userInfo?.email }}</span></div>
    </div>
    <van-form v-if="!loading && !loadFailed" class="profile-form" @submit="save">
      <van-field v-model="form.nickname" label-align="top" :label="t('profile.nickname')" :placeholder="t('profile.nickname_placeholder')" maxlength="40" :rules="[{ required: true, message: t('profile.nickname_required') }]" />
      <van-field :model-value="form.timezone || t('profile_detail.systemTimezone')" label-align="top" :label="t('profile.timezone')" readonly right-icon="arrow" role="button" tabindex="0" @keydown.enter="timezoneVisible = true" @click="timezoneVisible = true" />
      <van-button block type="primary" native-type="submit" :loading="saving">{{ t('common.save') }}</van-button>
    </van-form>
    <van-popup v-model:show="timezoneVisible" position="bottom" round closeable class="timezone-sheet" :aria-label="t('profile.timezone')">
      <h2>{{ t('profile.timezone') }}</h2>
      <van-search v-model="timezoneSearch" :placeholder="t('profile_detail.searchTimezone')" />
      <div class="timezone-options">
        <button v-for="zone in filteredTimezones" :key="zone" type="button" :aria-pressed="form.timezone === zone" @click="selectTimezone(zone)">
          <span>{{ zone || t('profile_detail.systemTimezone') }}</span><van-icon v-if="form.timezone === zone" name="success" />
        </button>
        <p v-if="!filteredTimezones.length">{{ t('profile_detail.empty') }}</p>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { userApi, getBaseUrl } from '@/api'
import { useUserStore } from '@/stores'

const store = useUserStore()
const router = useRouter()
const { t } = useI18n()
const saving = ref(false)
const loading = ref(!store.userInfo)
const loadFailed = ref(false)
const avatarFailed = ref(false)
const timezoneVisible = ref(false)
const timezoneSearch = ref('')
const form = reactive({ nickname: store.userInfo?.nickname || store.userInfo?.username || '', timezone: store.userInfo?.timezone || '' })
const avatarUrl = computed(() => {
  const value = String(store.userInfo?.avatar || '').trim()
  if (!value || value === '/avatar2.jpg') return '/avatar2.jpg'
  if (/^https?:\/\//i.test(value)) return value
  return `${getBaseUrl().replace(/\/$/, '')}/${value.replace(/^\//, '')}`
})
const fallbackZones = ['UTC', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney']
const timezoneList = [...new Set(['', ...fallbackZones, ...(Intl.supportedValuesOf?.('timeZone') || [])])]
const filteredTimezones = computed(() => [...new Set([...timezoneList, form.timezone])].filter(zone => !timezoneSearch.value || (zone || t('profile_detail.systemTimezone')).toLowerCase().includes(timezoneSearch.value.toLowerCase())))
onMounted(() => { if (!store.userInfo) loadProfile() })
async function loadProfile() {
  loading.value = true
  loadFailed.value = false
  try {
    const { data } = await userApi.getProfile()
    if (!data) throw new Error(t('audit.loadFailed'))
    store.setUserInfo(data)
    form.nickname = data.nickname || data.username || ''
    form.timezone = data.timezone || ''
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
function selectTimezone(zone) {
  form.timezone = zone
  timezoneVisible.value = false
  timezoneSearch.value = ''
}
async function save() {
  if (saving.value) return
  const payload = { nickname: form.nickname.trim(), timezone: form.timezone }
  if (!payload.nickname) return showToast(t('profile.nickname_required'))
  saving.value = true
  try {
    await userApi.updateProfile(payload)
    store.setUserInfo({ ...store.userInfo, ...payload })
    showToast(t('profile.profile_saved'))
    router.back()
  } catch (error) {
    showToast(error?.message || t('audit.loadFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-identity{display:flex;align-items:center;gap:14px;padding:24px 0;border-bottom:1px solid var(--v2-line);margin:0 16px}
.profile-loading{padding:24px;text-align:center}
.profile-identity img{width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--v2-surface-2)}
.profile-identity div{min-width:0}.profile-identity strong{font-size:16px;overflow-wrap:anywhere}.profile-identity span{display:block;font-size:12px;color:var(--v2-muted);margin-top:6px;overflow-wrap:anywhere}
.profile-form{padding:12px 16px 24px}.profile-form :deep(.van-field){padding:12px 0;background:transparent}.profile-form :deep(.van-field::after){display:none}.profile-form :deep(.van-field__label){color:var(--v2-text);font-size:13px;margin-bottom:8px}.profile-form :deep(.van-field__body){padding:10px 12px;border:1px solid var(--v2-line);border-radius:8px;background:var(--v2-surface-2);min-height:44px}.profile-form :deep(.van-field__right-icon){padding:0;margin:0;color:var(--v2-muted)}.profile-form :deep(.van-field__control){padding-right:20px}.profile-form .van-button{margin-top:20px}
.timezone-sheet{height:70%;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}.timezone-sheet h2{font-size:16px;margin:20px 48px 12px 16px}.timezone-sheet :deep(.van-search){background:var(--v2-surface)}.timezone-sheet :deep(.van-search__content){background:var(--v2-surface-2)}.timezone-options{overflow:auto;padding:0 16px 16px}.timezone-options button{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:46px;padding:10px 0;border:0;border-bottom:1px solid var(--v2-line);background:transparent;color:var(--v2-text);text-align:left;gap:12px;font-size:14px}.timezone-options button[aria-pressed="true"]{font-weight:600}.timezone-options .van-icon{color:var(--v2-green)}.timezone-options p{font-size:13px;color:var(--v2-muted)}
</style>
