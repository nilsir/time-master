<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import { useTimezones } from '@/composables/useTimezones'
import Overlay from '../common/Overlay.vue'

const props = defineProps<{
  alreadyAdded: string[]
}>()

const emit = defineEmits<{
  (e: 'add', tz: string): void
  (e: 'close'): void
}>()

const { t } = useT()
const query = ref('')
const { grouped } = useTimezones(() => query.value)
const addedSet = computed(() => new Set(props.alreadyAdded))

function pick(tz: string) {
  if (addedSet.value.has(tz)) return
  emit('add', tz)
  emit('close')
}
</script>

<template>
  <Overlay :title="t('worldClock.pickerTitle')" @close="emit('close')">
    <div class="picker">
      <div class="picker-search">
        <input
          v-model="query"
          type="text"
          :placeholder="t('worldClock.searchPlaceholder')"
          autofocus
        />
      </div>

      <div class="picker-list">
        <template v-for="g in grouped" :key="g.letter">
          <div class="letter-row">{{ g.letter }}</div>
          <button
            v-for="item in g.items"
            :key="item.tz"
            class="tz-row"
            :class="{ disabled: addedSet.has(item.tz) }"
            :disabled="addedSet.has(item.tz)"
            @click="pick(item.tz)"
          >
            <div class="tz-row-main">
              <div class="tz-row-city">{{ item.city }}</div>
              <div class="tz-row-tz">{{ item.tz }}</div>
            </div>
            <div class="tz-row-tail tabular">
              <span v-if="addedSet.has(item.tz)" class="badge">{{
                t('worldClock.added')
              }}</span>
              <span class="offset">{{ item.offsetLabel }}</span>
            </div>
          </button>
        </template>
        <div v-if="grouped.length === 0" class="empty">
          {{ t('worldClock.noMatch') }}
        </div>
      </div>
    </div>
  </Overlay>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.picker-search {
  padding: 12px;
  border-bottom: 1px solid var(--separator);
}
.picker-search input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--separator);
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}
.picker-search input:focus {
  border-color: var(--accent);
  background: var(--surface);
}
.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
}
.letter-row {
  position: sticky;
  top: 0;
  background: var(--bg);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 16px 4px;
}
.tz-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  border-radius: 0;
}
.tz-row:hover:not(.disabled) {
  background: var(--surface-hover);
}
.tz-row.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tz-row-main {
  flex: 1;
  min-width: 0;
}
.tz-row-city {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.tz-row-tz {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 1px;
}
.tz-row-tail {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 2px 6px;
  border-radius: 6px;
}
.offset {
  font-size: 12px;
  color: var(--text-secondary);
}
.empty {
  padding: 28px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
