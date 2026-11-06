<template>
  <div
    class="quant-cat"
    :class="[`mood-${mood}`, { 'reduced-motion': reducedMotion }]"
    aria-hidden="true"
  >
    <img class="cat-art cat-ears" src="@/assets/quant-cat-mark.png" alt="" draggable="false" />
    <span class="cat-gaze" aria-hidden="true">
      <span class="cat-blink">
        <img class="cat-art cat-eye cat-eye-left" src="@/assets/quant-cat-mark.png" alt="" draggable="false" />
        <img class="cat-art cat-eye cat-eye-right" src="@/assets/quant-cat-mark.png" alt="" draggable="false" />
      </span>
    </span>
  </div>
</template>

<script setup>
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'

const props = defineProps({ typing: { type: Boolean, default: false } })

const mood = ref('calm')
const reducedMotion = ref(false)
const idleMoods = ['look-left', 'look-right', 'sleepy', 'curious', 'wink', 'smile']
let lastIdleMood = ''
let idleTimer
let resetTimer
let motionQuery
let active = true

function clearTimers() {
  window.clearTimeout(idleTimer)
  window.clearTimeout(resetTimer)
}

function scheduleIdle() {
  window.clearTimeout(idleTimer)
  if (props.typing || reducedMotion.value || document.hidden || !active) return
  idleTimer = window.setTimeout(() => {
    const candidates = idleMoods.filter(value => value !== lastIdleMood)
    lastIdleMood = candidates[Math.floor(Math.random() * candidates.length)]
    showMood(lastIdleMood, 1700)
  }, 8000 + Math.random() * 4000)
}

function settle() {
  clearTimers()
  mood.value = props.typing ? 'closed' : 'calm'
  scheduleIdle()
}

function showMood(nextMood, duration = 1500) {
  clearTimers()
  if (props.typing) {
    mood.value = 'closed'
    return
  }
  mood.value = nextMood
  resetTimer = window.setTimeout(settle, duration)
}

function react(trigger) {
  if (!active || document.hidden) return
  const reactions = { diagnose: 'curious', news: 'surprised', risk: 'look-left' }
  if (reactions[trigger]) showMood(reactions[trigger], 1800)
}

defineExpose({ react })

watch(() => props.typing, settle)

function updateMotionPreference() {
  reducedMotion.value = motionQuery.matches
  settle()
}

function onVisibilityChange() {
  settle()
}

onActivated(() => {
  active = true
  settle()
})

onDeactivated(() => {
  active = false
  clearTimers()
})

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  clearTimers()
  motionQuery?.removeEventListener('change', updateMotionPreference)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.quant-cat {
  position: relative;
  display: block;
  width: 132px;
  aspect-ratio: 841 / 565;
  justify-self: center;
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: none;
  user-select: none;
}

.cat-art {
  position: absolute;
  display: block;
  width: 149.11%;
  max-width: none;
  height: auto;
  left: -23.42%;
  top: -64.96%;
  pointer-events: none;
}

.cat-ears {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 74% 100%, 74% 57%, 26% 57%, 26% 100%, 0 100%);
}

.cat-gaze,
.cat-blink {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cat-gaze {
  transform: translate(0, 0);
  transition: transform 180ms ease-out;
}

.cat-blink {
  transform-origin: 50% 81%;
  animation: cat-blink 6.4s ease-in-out infinite;
}

.cat-eye {
  transition: transform 240ms cubic-bezier(.2, .8, .2, 1);
}

.cat-eye-left {
  clip-path: inset(57% 55% 25% 26%);
  transform-origin: 35.6% 65.75%;
}

.cat-eye-right {
  clip-path: inset(57% 26.8% 25% 54%);
  transform-origin: 63.6% 65.75%;
}

.mood-closed .cat-eye { transform: scaleY(.06); }
.mood-wink .cat-eye-left { transform: scaleY(.1) rotate(-8deg); }
.mood-wink .cat-eye-right { transform: scale(1.06); }
.mood-smile .cat-eye-left { transform: rotate(-8deg) scaleY(.25); }
.mood-smile .cat-eye-right { transform: rotate(8deg) scaleY(.25); }
.mood-surprised .cat-eye { transform: scale(1.16); }
.mood-curious .cat-eye-left { transform: translateY(-1px) rotate(-6deg) scaleY(1.08); }
.mood-curious .cat-eye-right { transform: translateY(1px) rotate(6deg) scaleY(.65); }
.mood-sleepy .cat-eye { transform: translateY(1px) scaleY(.35); }
.mood-look-left .cat-gaze { transform: translate(-3px, -1px); }
.mood-look-right .cat-gaze { transform: translate(3px, 0); }
.quant-cat:not(.mood-calm) .cat-blink { animation: none; }

@keyframes cat-blink {
  0%, 43%, 47%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(.08); }
}

@media (max-width: 480px) {
  .quant-cat { width: 84px; }
}

.reduced-motion .cat-blink { animation: none; }
.reduced-motion .cat-eye,
.reduced-motion .cat-gaze { transition: none; }

@media (prefers-reduced-motion: reduce) {
  .cat-blink { animation: none; }
  .cat-eye, .cat-gaze { transition: none; }
}
</style>
