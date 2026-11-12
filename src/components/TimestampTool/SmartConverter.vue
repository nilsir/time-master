<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import { useStoredValue } from '@/composables/useStorage'
import { parseTimeInput, formatMillis, formatIso, localTimezone, utcOffsetLabel, type InputUnit } from '@/lib/time'
import { FORMAT_PRESETS } from '@/lib/constants'
import TimezoneSelect from '../common/TimezoneSelect.vue'
import CopyButton from '../common/CopyButton.vue'

const { t } = useT()
const input = ref(String(Math.floor(Date.now() / 1000)))
const unit = ref<InputUnit>('auto')
const inputTz = ref(localTimezone())
const targetTz = useStoredValue('defaultTimezone')
const format = useStoredValue('defaultFormat')
const occurrence = ref(0)
const parsed = computed(() => parseTimeInput(input.value, inputTz.value, format.value, unit.value))
watch([input, inputTz, format, unit], () => { occurrence.value = 0 }, { flush: 'sync' })
const ms = computed(() => parsed.value.ok ? parsed.value.value.candidates[occurrence.value] ?? parsed.value.value.ms : null)
const output = computed(() => {
  if (ms.value === null) return null
  const iso = formatIso(ms.value)
  const utc = formatMillis(ms.value, 'UTC', format.value)
  const local = formatMillis(ms.value, localTimezone(), format.value)
  const target = formatMillis(ms.value, targetTz.value, format.value)
  if (!iso.ok || !utc.ok || !local.ok || !target.ok) return null
  return [
    { key: 'seconds', text: String(Math.floor(ms.value / 1000)) },
    { key: 'millis', text: String(ms.value) },
    { key: 'iso', text: iso.value },
    { key: 'utc', text: utc.value },
    { key: 'local', text: local.value },
    { key: 'target', text: target.value },
  ]
})
const error = computed(() => !parsed.value.ok ? t(`errors.${parsed.value.error}`) : !output.value ? t('errors.tzOrFmtInvalid', { detail: '' }) : '')
function fillNow() { unit.value = 'ms'; input.value = String(Date.now()) }
</script>

<template>
  <section class="converter card">
    <div class="card-heading"><h3>{{ t('converter.title') }}</h3><button class="text-button" @click="fillNow">{{ t('converter.useNow') }}</button></div>
    <label class="field-label" for="convert-input">{{ t('converter.input') }}</label>
    <textarea id="convert-input" v-model="input" class="time-input" rows="2" :placeholder="t('converter.placeholder')" spellcheck="false" />
    <div class="field-pair">
      <label class="field-label" for="input-unit">{{ t('converter.inputUnit') }}</label>
      <select id="input-unit" v-model="unit" class="time-input">
        <option value="auto">{{ t('converter.auto') }}</option><option value="s">{{ t('timestamp.seconds') }}</option><option value="ms">{{ t('timestamp.millis') }}</option>
      </select>
    </div>
    <label class="field-label">{{ t('converter.inputTimezone') }}</label>
    <TimezoneSelect v-model="inputTz" :at="ms ?? undefined" />
    <p class="field-hint">{{ t('converter.timezoneHint') }}</p>
    <label class="field-label">{{ t('converter.targetTimezone') }}</label>
    <TimezoneSelect v-model="targetTz" :at="ms ?? undefined" />
    <label class="field-label" for="convert-format">{{ t('converter.format') }}</label>
    <input id="convert-format" v-model="format" class="time-input" list="format-presets" spellcheck="false" />
    <datalist id="format-presets"><option v-for="p in FORMAT_PRESETS" :key="p.value" :value="p.value" /></datalist>
    <template v-if="parsed.ok && parsed.value.candidates.length > 1">
      <p class="notice" role="status">{{ t('planner.ambiguous') }}</p>
      <select v-model="occurrence" class="time-input" :aria-label="t('planner.occurrence')">
        <option v-for="(candidate, i) in parsed.value.candidates" :key="candidate" :value="i">{{ t(i === 0 ? 'planner.earlier' : 'planner.later') }} · {{ utcOffsetLabel(candidate, inputTz) }}</option>
      </select>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="output">
      <p v-if="parsed.ok" class="field-hint">{{ t('converter.detected') }}{{ t(`converter.kind.${parsed.value.kind}`) }}</p>
      <dl class="conversion-results">
        <div v-for="row in output" :key="row.key" class="conversion-row" :data-result="row.key">
          <dt>{{ t(`converter.output.${row.key}`) }}</dt><dd class="tabular">{{ row.text }}</dd><CopyButton :text="row.text" size="sm" />
        </div>
      </dl>
    </template>
  </section>
</template>

<style scoped>
.conversion-results { margin: 0; border-top: 1px solid var(--separator); }
.conversion-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; gap: 6px; align-items: center; padding: 9px 0; font-size: 12px; }
.conversion-row + .conversion-row { border-top: 1px solid var(--separator); }
dt { color: var(--text-secondary); } dd { margin: 0; overflow-wrap: anywhere; font-family: var(--font-mono); }
textarea { resize: vertical; min-height: 56px; }
</style>
