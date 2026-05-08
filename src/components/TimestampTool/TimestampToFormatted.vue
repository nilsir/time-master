<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatTimestamp } from '@/lib/time'
import { FORMAT_PRESETS } from '@/lib/constants'
import { useStoredValue } from '@/composables/useStorage'
import TimezoneSelect from '../common/TimezoneSelect.vue'
import CopyButton from '../common/CopyButton.vue'

const input = ref(String(Math.floor(Date.now() / 1000)))
const tz = useStoredValue('defaultTimezone')
const fmtPreset = ref<string>(FORMAT_PRESETS[0].value)
const customFmt = ref('')

const activeFmt = computed(() =>
  fmtPreset.value === '__custom' ? customFmt.value || 'YYYY-MM-DD HH:mm:ss' : fmtPreset.value,
)

const result = computed(() =>
  formatTimestamp(input.value.trim(), tz.value, activeFmt.value),
)
</script>

<template>
  <section class="card">
    <h3 class="card-title">时间戳 → 格式化</h3>

    <input
      v-model="input"
      type="text"
      class="ts-input tabular"
      placeholder="输入时间戳（10位秒 / 13位毫秒，自动识别）"
    />

    <div class="row">
      <label>时区</label>
      <TimezoneSelect v-model="tz" />
    </div>

    <div class="row">
      <label>格式</label>
      <select v-model="fmtPreset" class="select">
        <option v-for="p in FORMAT_PRESETS" :key="p.value" :value="p.value">
          {{ p.label }}
        </option>
        <option value="__custom">自定义...</option>
      </select>
    </div>

    <input
      v-if="fmtPreset === '__custom'"
      v-model="customFmt"
      type="text"
      class="ts-input"
      placeholder="自定义格式（dayjs tokens，如 YYYY-MM-DD HH:mm）"
    />

    <div class="divider" />

    <div class="result-row">
      <div v-if="result.ok" class="result-text tabular">{{ result.value }}</div>
      <div v-else class="result-error">{{ result.error }}</div>
      <CopyButton v-if="result.ok" :text="result.value" size="sm" />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 5;
}
.card-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ts-input {
  width: 100%;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  padding: 0 10px;
  font-size: 13px;
  outline: none;
  color: var(--text-primary);
  transition: border-color 0.18s ease;
}
.ts-input:focus {
  border-color: var(--accent);
  background: var(--surface);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row label {
  width: 36px;
  font-size: 12px;
  color: var(--text-secondary);
}
.select {
  flex: 1;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  padding: 0 8px;
  font-size: 13px;
  outline: none;
}
.select:focus {
  border-color: var(--accent);
}
.divider {
  height: 1px;
  background: var(--separator);
  margin: 4px 0;
}
.result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}
.result-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-error {
  flex: 1;
  font-size: 13px;
  color: var(--danger);
}
</style>
