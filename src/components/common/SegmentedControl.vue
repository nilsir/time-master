<script setup lang="ts" generic="T extends string">
const props = defineProps<{
  modelValue: T
  options: { value: T; label: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: T): void
}>()

function select(v: T) {
  emit('update:modelValue', v)
}
function onKey(e: KeyboardEvent) {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  if (e.key === 'ArrowRight' && idx < props.options.length - 1) {
    select(props.options[idx + 1].value)
    e.preventDefault()
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    select(props.options[idx - 1].value)
    e.preventDefault()
  }
}
</script>

<template>
  <div class="seg" role="tablist" @keydown="onKey">
    <button
      v-for="opt in options"
      :key="opt.value"
      role="tab"
      :aria-selected="opt.value === modelValue"
      :class="['seg-btn', { active: opt.value === modelValue }]"
      :tabindex="opt.value === modelValue ? 0 : -1"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  background: var(--surface-hover);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}
.seg-btn {
  height: 28px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition:
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}
.seg-btn.active {
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
.seg-btn:hover:not(.active) {
  color: var(--text-primary);
}
</style>
