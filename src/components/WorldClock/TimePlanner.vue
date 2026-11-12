<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import { formatMillis, localTimezone, resolveWallTime, utcOffsetLabel, workOverlap } from '@/lib/time'
import TimezoneSelect from '../common/TimezoneSelect.vue'
const props = defineProps<{ zones: string[]; now: number }>()
const emit = defineEmits<{ (e: 'change', value: { ms: number | null; active: boolean; start: number; end: number; timezone: string }): void }>()
const { t } = useT()
const active = ref(false)
const reference = ref(localTimezone())
function text(ms: number, tz: string, fmt: string) { const r = formatMillis(ms, tz, fmt); return r.ok ? r.value : '' }
const date = ref(text(props.now, reference.value, 'YYYY-MM-DD'))
const clock = ref(text(props.now, reference.value, 'HH:mm'))
const occurrence = ref(0)
const start = ref(9), end = ref(18)
const resolution = computed(() => resolveWallTime(`${date.value} ${clock.value}:00`, reference.value))
const ms = computed(() => resolution.value.ok ? resolution.value.value[occurrence.value] ?? resolution.value.value[0] : null)
const slider = computed({
  get: () => { const [h, m] = clock.value.split(':').map(Number); return h * 60 + m },
  set: (value: number) => { clock.value = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` },
})
const overlap = computed(() => workOverlap(date.value, reference.value, props.zones, start.value, end.value))
watch([date, clock, reference], () => { occurrence.value = 0 }, { flush: 'sync' })
watch([active, ms, start, end, reference, () => overlap.value.ok], () => {
  emit('change', { ms: active.value && overlap.value.ok ? ms.value : null, active: active.value, start: start.value, end: end.value, timezone: reference.value })
}, { immediate: true })
function toggle() {
  if (!active.value) {
    date.value = text(props.now, reference.value, 'YYYY-MM-DD')
    clock.value = text(props.now, reference.value, 'HH:mm')
  }
  active.value = !active.value
}
</script>

<template>
  <section class="planner" :class="{ active }">
    <div class="planner-heading"><button class="text-button" :aria-expanded="active" @click="toggle">{{ t(active ? 'planner.backToLive' : 'planner.open') }}</button><span class="field-hint">{{ t(active ? 'planner.fixedTime' : 'planner.live') }}</span></div>
    <div v-if="active" class="planner-fields">
      <label class="field-label">{{ t('planner.reference') }}</label><TimezoneSelect v-model="reference" :at="ms ?? now" />
      <div class="date-time"><label><span class="field-label">{{ t('planner.date') }}</span><input v-model="date" type="date" class="time-input" :aria-label="t('planner.date')" /></label><label><span class="field-label">{{ t('planner.time') }}</span><input v-model="clock" type="time" class="time-input" :aria-label="t('planner.time')" /></label></div>
      <input v-model.number="slider" type="range" min="0" max="1425" step="15" :aria-label="t('planner.slider')" />
      <p v-if="!resolution.ok" class="error" role="alert">{{ t(`errors.${resolution.error}`) }}</p>
      <template v-else-if="resolution.value.length > 1">
        <p class="notice" role="status">{{ t('planner.ambiguous') }}</p>
        <select v-model="occurrence" class="time-input" :aria-label="t('planner.occurrence')"><option v-for="(candidate, i) in resolution.value" :key="candidate" :value="i">{{ t(i === 0 ? 'planner.earlier' : 'planner.later') }} · {{ utcOffsetLabel(candidate, reference) }}</option></select>
      </template>
      <div class="work-hours"><span class="field-label">{{ t('planner.workHours') }}</span><select v-model.number="start" class="time-input" :aria-label="t('planner.workStart')"><option v-for="hour in 24" :key="hour" :value="hour - 1">{{ String(hour - 1).padStart(2, '0') }}:00</option></select><span>–</span><select v-model.number="end" class="time-input" :aria-label="t('planner.workEnd')"><option v-for="hour in 24" :key="hour" :value="hour">{{ String(hour).padStart(2, '0') }}:00</option></select></div>
      <p class="field-hint">{{ t('planner.workHint') }}</p>
      <div class="overlap" aria-live="polite">
        <span class="field-label">{{ t('planner.overlap') }}</span>
        <p v-if="!overlap.ok" class="error">{{ t(`errors.${overlap.error}`) }}</p>
        <p v-else-if="!zones.length" class="field-hint">{{ t('planner.addZones') }}</p>
        <p v-else-if="!overlap.value.length" class="field-hint">{{ t('planner.noOverlap') }}</p>
        <ul v-else><li v-for="slot in overlap.value" :key="slot.start">{{ text(slot.start, reference, 'HH:mm Z') }} – {{ text(slot.end, reference, 'HH:mm Z') }}</li></ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.planner { flex-shrink: 0; margin: 0 12px; border-radius: var(--radius-sm); background: var(--surface); }
.planner-heading { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; }
.planner-fields { display: flex; flex-direction: column; gap: 7px; padding: 4px 10px 10px; }
.date-time { display: flex; gap: 8px; } .date-time label { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
input[type='range'] { width: 100%; accent-color: var(--accent); }
.work-hours { display: flex; align-items: center; gap: 6px; }
.work-hours .time-input { width: auto; flex: 1; padding: 3px; font-size: 12px; }
.overlap { padding-top: 5px; border-top: 1px solid var(--separator); }
ul { margin: 4px 0 0; padding-left: 16px; font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
