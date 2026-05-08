<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import dayjs from '@/lib/dayjs'
import { parseToTimestamp } from '@/lib/time'
import { FORMAT_PRESETS } from '@/lib/constants'
import { useStoredValue } from '@/composables/useStorage'
import TimezoneSelect from '../common/TimezoneSelect.vue'
import CopyButton from '../common/CopyButton.vue'

const { t } = useT()

const tz = useStoredValue('defaultTimezone')
const fmtPreset = ref<string>(FORMAT_PRESETS[0].value)
const customFmt = ref('')
const input = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))

const activeFmt = computed(() =>
  fmtPreset.value === '__custom' ? customFmt.value || 'YYYY-MM-DD HH:mm:ss' : fmtPreset.value,
)
const result = computed(() => parseToTimestamp(input.value, tz.value, activeFmt.value))

const seconds = computed(() => (result.value.ok ? Math.floor(result.value.value / 1000) : null))
const millis = computed(() => (result.value.ok ? result.value.value : null))

const errorText = computed(() => {
  if (result.value.ok) return ''
  if (result.value.error === 'tzOrFmtInvalid') {
    return t('errors.tzOrFmtInvalid', { detail: result.value.detail ?? '' })
  }
  return t(`errors.${result.value.error}`)
})
</script>

<template>
  <section class="card">
    <h3 class="card-title">{{ t('timestamp.fmtToTs') }}</h3>

    <div class="row">
      <label>{{ t('timestamp.timezone') }}</label>
      <TimezoneSelect v-model="tz" />
    </div>
    <div class="row">
      <label>{{ t('timestamp.format') }}</label>
      <select v-model="fmtPreset" class="select">
        <option v-for="p in FORMAT_PRESETS" :key="p.value" :value="p.value">
          {{ p.label }}
        </option>
        <option value="__custom">{{ t('timestamp.custom') }}</option>
      </select>
    </div>
    <input
      v-if="fmtPreset === '__custom'"
      v-model="customFmt"
      type="text"
      class="ts-input"
      :placeholder="t('timestamp.customFormatPlaceholder')"
    />

    <input
      v-model="input"
      type="text"
      class="ts-input"
      :class="{ invalid: !result.ok }"
      :placeholder="t('timestamp.inputFmtPlaceholder')"
    />
    <div v-if="!result.ok" class="err">{{ errorText }}</div>

    <div class="divider" />

    <div class="result-row">
      <span class="lbl">{{ t('timestamp.seconds') }}</span>
      <span v-if="seconds !== null" class="val tabular">{{ seconds }}</span>
      <span v-else class="val empty">—</span>
      <CopyButton v-if="seconds !== null" :text="String(seconds)" size="sm" />
    </div>
    <div class="result-row">
      <span class="lbl">{{ t('timestamp.millis') }}</span>
      <span v-if="millis !== null" class="val tabular">{{ millis }}</span>
      <span v-else class="val empty">—</span>
      <CopyButton v-if="millis !== null" :text="String(millis)" size="sm" />
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
  z-index: 4;
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
.ts-input.invalid {
  border-color: var(--danger);
}
.err {
  font-size: 12px;
  color: var(--danger);
  padding: 0 2px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row label {
  width: 48px;
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
  padding: 2px 0;
}
.lbl {
  width: 48px;
  font-size: 12px;
  color: var(--text-secondary);
}
.val {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.val.empty {
  color: var(--text-tertiary);
  font-weight: 400;
}
</style>
