<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  title?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true">
    <header class="overlay-head">
      <button class="overlay-close" aria-label="关闭" @click="emit('close')">
        ✕
      </button>
      <span class="overlay-title">{{ title }}</span>
      <span class="spacer" />
    </header>
    <div class="overlay-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  animation: slide-up 0.2s ease;
  z-index: 30;
}
@keyframes slide-up {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.overlay-head {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--separator);
}
.overlay-close {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 14px;
}
.overlay-close:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.overlay-title {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-size: 15px;
}
.spacer {
  width: 28px;
}
.overlay-body {
  flex: 1;
  overflow-y: auto;
}
</style>
