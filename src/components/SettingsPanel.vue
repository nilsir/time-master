<script setup lang="ts">
import { useStoredValue } from '@/composables/useStorage'
import type { ThemeMode, TimeFormat, TsUnitMode } from '@/types'

defineEmits<{ (e: 'close'): void }>()

const theme = useStoredValue('theme')
const timeFormat = useStoredValue('timeFormat')
const tsUnit = useStoredValue('tsUnit')

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]
const formatOptions: { value: TimeFormat; label: string }[] = [
  { value: '24h', label: '24 小时' },
  { value: '12h', label: '12 小时' },
]
const unitOptions: { value: TsUnitMode; label: string }[] = [
  { value: 'auto', label: '自适应（秒/毫秒）' },
  { value: 's', label: '仅秒' },
  { value: 'ms', label: '仅毫秒' },
]
</script>

<template>
  <div class="settings" role="dialog" aria-label="设置">
    <header class="settings-head">
      <span class="title">设置</span>
      <button class="close" aria-label="关闭" @click="$emit('close')">✕</button>
    </header>

    <div class="group">
      <div class="group-label">主题</div>
      <label v-for="o in themeOptions" :key="o.value" class="opt">
        <input
          type="radio"
          name="theme"
          :value="o.value"
          :checked="theme === o.value"
          @change="theme = o.value"
        />
        <span>{{ o.label }}</span>
      </label>
    </div>

    <div class="group">
      <div class="group-label">时间制</div>
      <label v-for="o in formatOptions" :key="o.value" class="opt">
        <input
          type="radio"
          name="timeFormat"
          :value="o.value"
          :checked="timeFormat === o.value"
          @change="timeFormat = o.value"
        />
        <span>{{ o.label }}</span>
      </label>
    </div>

    <div class="group">
      <div class="group-label">时间戳精度</div>
      <label v-for="o in unitOptions" :key="o.value" class="opt">
        <input
          type="radio"
          name="tsUnit"
          :value="o.value"
          :checked="tsUnit === o.value"
          @change="tsUnit = o.value"
        />
        <span>{{ o.label }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.settings {
  position: absolute;
  z-index: 25;
  top: 44px;
  left: 12px;
  right: 12px;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 12px;
  animation: drop 0.2s ease;
}
@keyframes drop {
  from {
    transform: translateY(-6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.title {
  font-weight: 600;
  font-size: 14px;
}
.close {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: var(--text-secondary);
}
.close:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.group {
  padding: 6px 0;
}
.group + .group {
  border-top: 1px solid var(--separator);
}
.group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
}
.opt:hover {
  background: var(--surface-hover);
}
.opt input {
  accent-color: var(--accent);
}
</style>
