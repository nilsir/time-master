<script setup lang="ts">
import { computed } from 'vue'
import dayjs from '@/lib/dayjs'
import { isDaytime, hourOffsetLabel, relativeDayLabel } from '@/lib/time'
import { TIMEZONE_CN_ALIASES } from '@/lib/constants'

const props = defineProps<{
  tz: string
  ms: number
  format: '12h' | '24h'
}>()

defineEmits<{ (e: 'remove'): void }>()

const daytime = computed(() => isDaytime(props.ms, props.tz))
const time = computed(() => {
  const fmt = props.format === '24h' ? 'HH:mm' : 'h:mm A'
  return dayjs(props.ms).tz(props.tz).format(fmt)
})
const cityName = computed(() => {
  const aliases = TIMEZONE_CN_ALIASES[props.tz]
  if (aliases && aliases.length > 0) return aliases[0]
  return props.tz.split('/').pop()?.replace(/_/g, ' ') ?? props.tz
})
const subtitle = computed(
  () => `${relativeDayLabel(props.ms, props.tz)} ${hourOffsetLabel(props.ms, props.tz)}`,
)
</script>

<template>
  <div :class="['wc-item', daytime ? 'day' : 'night']" role="listitem">
    <div class="wc-info">
      <div class="wc-city">{{ cityName }}</div>
      <div class="wc-sub tabular">{{ subtitle }}</div>
    </div>
    <div class="wc-time tabular">{{ time }}</div>
    <button
      class="wc-remove"
      title="删除"
      aria-label="删除时区"
      @click="$emit('remove')"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.wc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  position: relative;
  transition:
    background-color 1s ease,
    color 1s ease;
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
  font-size: 26px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
.wc-remove {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.wc-item:hover .wc-remove,
.wc-item:focus-within .wc-remove {
  opacity: 0.55;
}
.wc-remove:hover {
  opacity: 1 !important;
  background: rgba(255, 59, 48, 0.18);
  color: #ff3b30;
}
.wc-item.day .wc-remove {
  color: rgba(0, 0, 0, 0.6);
}
.wc-item.night .wc-remove {
  color: rgba(255, 255, 255, 0.7);
}
</style>
