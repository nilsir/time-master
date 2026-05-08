<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import dayjs from '@/lib/dayjs'
import { useNow, togglePause } from '@/composables/useNow'
import { useClipboard } from '@/composables/useClipboard'
import { useStoredValue } from '@/composables/useStorage'

const { t } = useT()
const { now, paused } = useNow()
const tsUnit = useStoredValue('tsUnit')
const seconds = computed(() => Math.floor(now.value / 1000))
const millis = computed(() => now.value)
const local = computed(() => dayjs(now.value).format('YYYY-MM-DD HH:mm:ss'))

const sClip = useClipboard()
const msClip = useClipboard()

async function copyS() {
  await sClip.copy(String(seconds.value))
}
async function copyMs() {
  await msClip.copy(String(millis.value))
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <h3>{{ t('timestamp.nowTitle') }}</h3>
      <button
        class="pause"
        :title="paused ? t('timestamp.resume') : t('timestamp.pause')"
        :aria-label="paused ? t('timestamp.resume') : t('timestamp.pause')"
        @click="togglePause"
      >
        <span aria-hidden="true">{{ paused ? '▶' : '⏸' }}</span>
      </button>
    </header>

    <button
      v-if="tsUnit !== 'ms'"
      class="row tabular"
      :class="{ flash: sClip.copied.value }"
      :title="sClip.copied.value ? t('copy.copied') : t('copy.copy')"
      @click="copyS"
    >
      <span class="num">{{ seconds }}</span>
      <span class="unit">{{ t('timestamp.seconds') }}</span>
      <span class="status">{{ sClip.copied.value ? '✓' : '⧉' }}</span>
    </button>

    <button
      v-if="tsUnit !== 's'"
      class="row tabular"
      :class="{ flash: msClip.copied.value }"
      :title="msClip.copied.value ? t('copy.copied') : t('copy.copy')"
      @click="copyMs"
    >
      <span class="num">{{ millis }}</span>
      <span class="unit">{{ t('timestamp.millis') }}</span>
      <span class="status">{{ msClip.copied.value ? '✓' : '⧉' }}</span>
    </button>

    <div class="local tabular">{{ t('timestamp.localPrefix') }}{{ local }}</div>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.card-head h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pause {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 11px;
}
.pause:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background 0.18s ease;
}
.row:hover {
  background: var(--surface-hover);
}
.row.flash {
  background: var(--success-soft);
}
.num {
  flex: 1;
  font-size: 22px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}
.unit {
  font-size: 12px;
  color: var(--text-secondary);
  width: 32px;
  text-align: right;
}
.status {
  width: 14px;
  text-align: right;
  color: var(--text-tertiary);
  font-size: 14px;
}
.row.flash .status {
  color: var(--success);
}
.local {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px 0;
}
</style>
