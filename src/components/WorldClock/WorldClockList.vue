<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
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

function getSelectedList() {
  return Array.isArray(selectedTimezones.value) ? selectedTimezones.value : []
}

function add(tz: string) {
  const list = getSelectedList()
  if (list.includes(tz)) return
  selectedTimezones.value = [...list, tz]
}
function remove(tz: string) {
  selectedTimezones.value = getSelectedList().filter((t) => t !== tz)
}

// Drag-to-reorder
const listEl = ref<HTMLElement | null>(null)
const dragList = shallowRef<string[] | null>(null)
const dragIndex = ref<number | null>(null)

const displayList = computed(() => dragList.value ?? getSelectedList())

function onReorderStart(tz: string, e: PointerEvent) {
  const list = getSelectedList()
  const idx = list.indexOf(tz)
  if (idx === -1) return
  dragList.value = [...list]
  dragIndex.value = idx
  listEl.value?.setPointerCapture(e.pointerId)
}

function onListPointerMove(e: PointerEvent) {
  if (dragIndex.value === null || !dragList.value || !listEl.value) return

  const children = Array.from(listEl.value.children) as HTMLElement[]
  let targetIdx = dragList.value.length - 1

  for (let i = 0; i < children.length; i++) {
    const rect = children[i].getBoundingClientRect()
    if (e.clientY < rect.top + rect.height / 2) {
      targetIdx = i
      break
    }
  }

  targetIdx = Math.max(0, Math.min(targetIdx, dragList.value.length - 1))

  if (targetIdx !== dragIndex.value) {
    const list = [...dragList.value]
    const [item] = list.splice(dragIndex.value, 1)
    list.splice(targetIdx, 0, item)
    dragList.value = list
    dragIndex.value = targetIdx
  }
}

function onListPointerUp() {
  if (dragList.value) {
    selectedTimezones.value = [...dragList.value]
  }
  dragList.value = null
  dragIndex.value = null
}
</script>

<template>
  <div class="wc-wrap">
    <div v-if="displayList.length === 0" class="wc-empty">
      <div class="wc-empty-icon">🌐</div>
      <div class="wc-empty-title">{{ t('worldClock.emptyTitle') }}</div>
      <div class="wc-empty-desc">{{ t('worldClock.emptyDesc') }}</div>
    </div>

    <div
      v-else
      ref="listEl"
      class="wc-list"
      role="list"
      @pointermove="onListPointerMove"
      @pointerup="onListPointerUp"
      @pointercancel="onListPointerUp"
    >
      <TransitionGroup name="wc-sort">
        <WorldClockItem
          v-for="(tz, i) in displayList"
          :key="tz"
          :tz="tz"
          :ms="now"
          :format="timeFormat"
          :is-dragging="dragIndex !== null && i === dragIndex"
          @remove="remove(tz)"
          @reorder-start="(e: PointerEvent) => onReorderStart(tz, e)"
        />
      </TransitionGroup>
    </div>

    <div class="wc-bottom">
      <button class="add-btn" @click="showPicker = true">
        <span class="plus" aria-hidden="true">⊕</span> {{ t('worldClock.addTimezone') }}
      </button>
    </div>

    <TimezonePicker
      v-if="showPicker"
      :already-added="displayList"
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
.wc-sort-move {
  transition: transform 0.2s ease;
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
