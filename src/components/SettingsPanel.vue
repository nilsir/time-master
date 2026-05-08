<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import { useStoredValue } from '@/composables/useStorage'
import type { LanguageMode, ThemeMode, TimeFormat, TsUnitMode } from '@/types'

defineEmits<{ (e: 'close'): void }>()

const { t } = useT()

const theme = useStoredValue('theme')
const timeFormat = useStoredValue('timeFormat')
const tsUnit = useStoredValue('tsUnit')
const language = useStoredValue('language')

const themeOptions = computed<{ value: ThemeMode; label: string }[]>(() => [
  { value: 'system', label: t('settings.themeSystem') },
  { value: 'light', label: t('settings.themeLight') },
  { value: 'dark', label: t('settings.themeDark') },
])
const formatOptions = computed<{ value: TimeFormat; label: string }[]>(() => [
  { value: '24h', label: t('settings.timeFormat24') },
  { value: '12h', label: t('settings.timeFormat12') },
])
const unitOptions = computed<{ value: TsUnitMode; label: string }[]>(() => [
  { value: 'auto', label: t('settings.tsUnitAuto') },
  { value: 's', label: t('settings.tsUnitS') },
  { value: 'ms', label: t('settings.tsUnitMs') },
])
const langOptions = computed<{ value: LanguageMode; label: string }[]>(() => [
  { value: 'system', label: t('settings.langSystem') },
  { value: 'zh', label: t('settings.langZh') },
  { value: 'en', label: t('settings.langEn') },
])
</script>

<template>
  <div class="settings" role="dialog" :aria-label="t('settings.title')">
    <header class="settings-head">
      <span class="title">{{ t('settings.title') }}</span>
      <button class="close" :aria-label="t('settings.close')" @click="$emit('close')">
        ✕
      </button>
    </header>

    <div class="group">
      <div class="group-label">{{ t('settings.theme') }}</div>
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
      <div class="group-label">{{ t('settings.language') }}</div>
      <label v-for="o in langOptions" :key="o.value" class="opt">
        <input
          type="radio"
          name="language"
          :value="o.value"
          :checked="language === o.value"
          @change="language = o.value"
        />
        <span>{{ o.label }}</span>
      </label>
    </div>

    <div class="group">
      <div class="group-label">{{ t('settings.timeFormat') }}</div>
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
      <div class="group-label">{{ t('settings.tsUnit') }}</div>
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
