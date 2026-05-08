<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import dayjs from '@/lib/dayjs'
import {
  isDaytime,
  hourOffsetLabel,
  relativeDayOffset,
  tzCityName,
} from '@/lib/time'
import { TIMEZONE_CN_ALIASES } from '@/lib/constants'

const props = defineProps<{
  tz: string
  ms: number
  format: '12h' | '24h'
}>()

const emit = defineEmits<{ (e: 'remove'): void }>()

const { t, locale } = useT()

const daytime = computed(() => isDaytime(props.ms, props.tz))
const date = computed(() => dayjs(props.ms).tz(props.tz).format('MM-DD'))
const clock = computed(() => {
  const fmt = props.format === '24h' ? 'HH:mm' : 'h:mm A'
  return dayjs(props.ms).tz(props.tz).format(fmt)
})
const cityName = computed(() => {
  if (locale.value === 'zh') {
    const aliases = TIMEZONE_CN_ALIASES[props.tz]
    if (aliases && aliases.length > 0) return aliases[0]
  }
  return tzCityName(props.tz)
})
const relative = computed(() => {
  const days = relativeDayOffset(props.ms, props.tz)
  if (days === 0) return t('worldClock.relative.today')
  if (days === 1) return t('worldClock.relative.tomorrow')
  if (days === -1) return t('worldClock.relative.yesterday')
  if (days > 1) return t('worldClock.relative.daysAfter', { n: days })
  return t('worldClock.relative.daysBefore', { n: Math.abs(days) })
})
const subtitle = computed(
  () => `${relative.value} ${hourOffsetLabel(props.ms, props.tz)}`,
)

// Swipe-to-delete
const THRESHOLD = 72
const wrapperEl = ref<HTMLElement | null>(null)
const swipeX = ref(0)
const dragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const axisLocked = ref<'h' | 'v' | null>(null)

const deleteOpacity = computed(() => Math.min(1, Math.abs(swipeX.value) / THRESHOLD))
const cardStyle = computed(() => ({
  transform: `translateX(${swipeX.value}px)`,
  transition: dragging.value
    ? 'background-color 1s ease, color 1s ease'
    : 'transform 0.3s ease, background-color 1s ease, color 1s ease',
}))

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  axisLocked.value = null
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value

  if (!axisLocked.value) {
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    axisLocked.value = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
    if (axisLocked.value === 'h') {
      wrapperEl.value?.setPointerCapture(e.pointerId)
    }
  }

  if (axisLocked.value !== 'h') return
  swipeX.value = Math.max(-THRESHOLD * 1.3, Math.min(0, dx))
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  axisLocked.value = null
  if (swipeX.value <= -THRESHOLD) {
    emit('remove')
  } else {
    swipeX.value = 0
  }
}

function onPointerCancel() {
  dragging.value = false
  axisLocked.value = null
  swipeX.value = 0
}
</script>

<template>
  <div
    ref="wrapperEl"
    class="wc-wrapper"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <div class="wc-delete-bg" :style="{ opacity: deleteOpacity }" aria-hidden="true">
      <span>{{ t('worldClock.removeTitle') }}</span>
    </div>
    <div :class="['wc-item', daytime ? 'day' : 'night']" :style="cardStyle" role="listitem">
      <div class="wc-info">
        <div class="wc-city">{{ cityName }}</div>
        <div class="wc-sub tabular">{{ subtitle }}</div>
      </div>
      <div class="wc-time tabular">
        <div class="wc-date">{{ date }}</div>
        <div class="wc-clock">{{ clock }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wc-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  touch-action: pan-y;
  user-select: none;
}

.wc-delete-bg {
  position: absolute;
  inset: 0;
  background: #ff3b30;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 20px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius);
  pointer-events: none;
}

.wc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  position: relative;
}
.wc-item.day {
  background: #ffffff;
  color: #000000;
}
.wc-item.day .wc-sub {
  color: rgba(60, 60, 67, 0.6);
}
.wc-item.night {
  background: #1c1c1e;
  color: #ffffff;
}
.wc-item.night .wc-sub {
  color: rgba(235, 235, 245, 0.6);
}
.wc-info {
  flex: 1;
  min-width: 0;
}
.wc-city {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wc-sub {
  font-size: 13px;
  font-weight: 400;
  margin-top: 2px;
}
.wc-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}
.wc-date {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.55;
}
.wc-clock {
  font-size: 26px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
</style>
