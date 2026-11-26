<template>
  <section class="forthright-unlock" :class="{ unlocked: phase === 'unlocked' }">
    <div class="unlock-heading">
      <van-icon :name="phase === 'unlocked' ? 'passed' : 'shield-o'" size="24" />
      <div><strong>{{ t(phase === 'unlocked' ? 'brokerAccounts.forthright.unlocked' : 'brokerAccounts.forthright.unlockTitle') }}</strong><p v-if="phase === 'unlocked'">{{ t('brokerAccounts.forthright.authorizationRecorded') }}</p><p v-else>{{ t(phase === 'verify' ? 'brokerAccounts.forthright.secondAuthRequired' : 'brokerAccounts.forthright.unlockHelp') }}</p></div>
    </div>
    <van-button v-if="phase !== 'unlocked'" size="small" plain :loading="busy" @click="unlock('')">{{ t('brokerAccounts.forthright.unlock') }}</van-button>
    <form v-if="phase === 'verify'" class="unlock-code" @submit.prevent="unlock(code)">
      <label :for="`forthright-sms-${credentialId}`">{{ t('brokerAccounts.forthright.smsCode') }}</label>
      <div><input :id="`forthright-sms-${credentialId}`" v-model="code" :disabled="busy" maxlength="12" inputmode="numeric" autocomplete="one-time-code" :placeholder="t('brokerAccounts.forthright.smsCode')" /><van-button type="primary" size="small" native-type="submit" :disabled="!code.trim()" :loading="busy">{{ t('brokerAccounts.forthright.verify') }}</van-button></div>
    </form>
    <p v-if="message" class="unlock-error" role="alert">{{ message }}</p>
  </section>
</template>
<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { brokerApi } from '@/api'
const props = defineProps({ credentialId: { type: Number, required: true } })
const { t } = useI18n()
const code = ref(''), message = ref(''), busy = ref(false), phase = ref('idle')
watch(() => props.credentialId, () => { code.value = ''; message.value = ''; phase.value = 'idle'; restore() }, { immediate: true })
async function restore() {
  const selectedId = props.credentialId
  busy.value = true
  try {
    const response = await brokerApi.authorization(selectedId)
    const data = response.data
    if (props.credentialId !== selectedId) return
    phase.value = data?.state === 'verified' ? 'unlocked' : data?.state === 'needs_sms' ? 'verify' : 'idle'
  } catch (error) {
    if (props.credentialId === selectedId) message.value = t('brokerAccounts.accountLoadFailed')
  } finally { if (props.credentialId === selectedId) busy.value = false }
}
async function unlock(smsCode) {
  if (busy.value) return
  const selectedId = props.credentialId
  busy.value = true; message.value = ''
  try {
    await brokerApi.unlock(selectedId, smsCode.trim())
    if (props.credentialId !== selectedId) return
    code.value = ''; phase.value = 'unlocked'
  } catch (error) {
    if (props.credentialId !== selectedId) return
    const key = error.response?.data?.error || error.message
    if (key === 'brokerAccounts.forthright.secondAuthRequired') phase.value = 'verify'
    else message.value = error.localizedMessage || t(key)
  } finally { busy.value = false }
}
</script>
<style scoped>
.forthright-unlock { margin: 14px 0; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elevated); }
.unlock-heading { display: flex; align-items: flex-start; gap: 10px; }
.unlock-heading > .van-icon { color: var(--accent); }
.unlocked .unlock-heading > .van-icon { color: var(--up); }
.unlock-heading strong { font-size: 13px; font-weight: 600; }
.unlock-heading p { margin: 5px 0 12px; color: var(--text-2); font-size: 12px; line-height: 1.6; }
.unlock-code { margin-top: 14px; }
.unlock-code label { display: block; margin-bottom: 8px; color: var(--text-2); font-size: 12px; }
.unlock-code > div { display: flex; gap: 8px; }
.unlock-code input { flex: 1; min-width: 0; width: 100%; border: 1px solid var(--border); border-radius: 7px; padding: 9px; color: var(--text); background: var(--bg); letter-spacing: 2px; }
.unlock-code button { height: 38px; border-radius: 7px; }
.unlock-error { margin: 12px 0 0; color: var(--down); font-size: 12px; line-height: 1.6; }
</style>
