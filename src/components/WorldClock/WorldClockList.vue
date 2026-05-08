<script setup lang="ts">
import { ref } from 'vue'
import { useT } from '@/composables/useT'
import { useNow } from '@/composables/useNow'
import { useStoredValue } from '@/composables/useStorage'
import WorldClockItem from './WorldClockItem.vue'
import TimezonePicker from './TimezonePicker.vue'

const { t } = useT()
const { now } = useNow()
const selectedTimezones = useStoredValue('selectedTimezones')
const timeFormat = useStoredValue('timeFormat')

const showPicker = ref(false)

function add(tz: string) {
  const list = selectedTimezones.value
  if (list.includes(tz)) return
  selectedTimezones.value = [...list, tz]
}
function remove(tz: string) {
  selectedTimezones.value = selectedTimezones.value.filter((t) => t !== tz)
}
</script>

<template>
  <div class="wc-wrap">
    <div v-if="selectedTimezones.length === 0" class="wc-empty">
      <div class="wc-empty-icon">🌐</div>
      <div class="wc-empty-title">{{ t('worldClock.emptyTitle') }}</div>
      <div class="wc-empty-desc">{{ t('worldClock.emptyDesc') }}</div>
    </div>

    <div v-else class="wc-list" role="list">
      <WorldClockItem
        v-for="tz in selectedTimezones"
        :key="tz"
        :tz="tz"
        :ms="now"
        :format="timeFormat"
        @remove="remove(tz)"
      />
    </div>

    <div class="wc-bottom">
      <button class="add-btn" @click="showPicker = true">
        <span class="plus" aria-hidden="true">⊕</span> {{ t('worldClock.addTimezone') }}
      </button>
    </div>

    <TimezonePicker
      v-if="showPicker"
      :already-added="selectedTimezones"
      @add="add"
      @close="showPicker = false"
    />
  </div>
</template>

<style scoped>
.wc-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.wc-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wc-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-secondary);
}
.wc-empty-icon {
  font-size: 36px;
  margin-bottom: 6px;
}
.wc-empty-title {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}
.wc-empty-desc {
  font-size: 13px;
}
.wc-bottom {
  flex-shrink: 0;
  border-top: 1px solid var(--separator);
  padding: 8px;
  background: var(--bg);
}
.add-btn {
  width: 100%;
  height: 36px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.add-btn:hover {
  background: var(--accent-soft);
}
.plus {
  font-size: 16px;
}
</style>
