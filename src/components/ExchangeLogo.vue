<template>
  <span class="exchange-logo" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="source && !failed" :src="source" :alt="exchange" @error="failed = true">
    <van-icon v-else name="exchange" :aria-label="exchange" />
  </span>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({ exchange: { type: String, default: '' }, size: { type: Number, default: 32 } })
const files = import.meta.glob('../assets/exchanges/*', { eager: true, query: '?url', import: 'default' })
const aliases = { gateio: 'gate', 'gate.io': 'gate', huobi: 'htx', okex: 'okx', ibkr: 'interactive-brokers' }
const failed = ref(false)
const source = computed(() => {
  const raw = props.exchange.toLowerCase()
  const id = aliases[raw] || raw
  return Object.entries(files).find(([path]) => path.split('/').at(-1).split('.')[0] === id)?.[1]
})
watch(source, () => { failed.value = false })
</script>
<style scoped>
.exchange-logo{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;background:var(--surface-raised);overflow:hidden;vertical-align:middle}.exchange-logo img{width:78%;height:78%;object-fit:contain}.exchange-logo .van-icon{font-size:22px}
</style>
