<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import { getTimezoneList } from '@/composables/useTimezones'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const { t } = useT()
const open = ref(false)
const query = ref('')
const all = getTimezoneList()
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return all.slice(0, 100)
  return all.filter((entry) => entry.haystack.includes(q)).slice(0, 200)
})

const current = computed(() => all.find((entry) => entry.tz === props.modelValue))

watch(open, (v) => {
  if (!v) query.value = ''
})

function pick(tz: string) {
  emit('update:modelValue', tz)
  open.value = false
}
</script>

<template>
  <div class="tz-select" :class="{ open }">
    <button
      class="tz-trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <span class="tz-label">{{
        current?.city ?? modelValue ?? placeholder ?? t('tzSelect.placeholder')
      }}</span>
      <span class="tz-offset">{{ current?.offsetLabel ?? '' }}</span>
      <span class="caret" aria-hidden="true">▾</span>
    </button>
    <div v-if="open" class="tz-pop" role="listbox">
      <input
        v-model="query"
        class="tz-search"
        type="text"
        :placeholder="t('tzSelect.searchPlaceholder')"
        autofocus
      />
      <div class="tz-list">
        <button
          v-for="entry in filtered"
          :key="entry.tz"
          class="tz-item"
          :class="{ active: entry.tz === modelValue }"
          role="option"
          :aria-selected="entry.tz === modelValue"
          @click="pick(entry.tz)"
        >
          <span class="tz-item-city">{{ entry.city }}</span>
          <span class="tz-item-tz">{{ entry.tz }}</span>
          <span class="tz-item-offset">{{ entry.offsetLabel }}</span>
        </button>
        <div v-if="filtered.length === 0" class="tz-empty">
          {{ t('tzSelect.noMatch') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-select {
  position: relative;
  width: 100%;
}
.tz-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  font-size: 13px;
  text-align: left;
}
.tz-label {
  flex: 1;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tz-offset {
  color: var(--text-secondary);
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
}
.caret {
  color: var(--text-tertiary);
  font-size: 11px;
}
.tz-pop {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 6px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
}
.tz-search {
  height: 30px;
  border: 1px solid var(--separator);
  border-radius: var(--radius-sm);
  background: var(--bg);
  padding: 0 8px;
  font-size: 13px;
  margin-bottom: 6px;
  outline: none;
}
.tz-search:focus {
  border-color: var(--accent);
}
.tz-list {
  overflow-y: auto;
  flex: 1;
}
.tz-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: left;
  font-size: 13px;
}
.tz-item:hover,
.tz-item.active {
  background: var(--surface-hover);
}
.tz-item-city {
  flex: 1;
  color: var(--text-primary);
}
.tz-item-tz {
  color: var(--text-tertiary);
  font-size: 11px;
}
.tz-item-offset {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.tz-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
