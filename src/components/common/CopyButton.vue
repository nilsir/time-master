<script setup lang="ts">
import { useT } from '@/composables/useT'
import { useClipboard } from '@/composables/useClipboard'

const props = defineProps<{
  text: string
  label?: string
  size?: 'sm' | 'md'
}>()

const { t } = useT()
const { copied, copy } = useClipboard()

async function onClick() {
  await copy(props.text)
}
</script>

<template>
  <button
    class="copy-btn"
    :class="[size === 'sm' ? 'sm' : 'md', { copied }]"
    :title="copied ? t('copy.copied') : t('copy.copy')"
    :aria-label="copied ? t('copy.copied') : t('copy.copy')"
    @click="onClick"
  >
    <span v-if="copied" class="ico" aria-hidden="true">✓</span>
    <span v-else class="ico" aria-hidden="true">⧉</span>
    <span v-if="label" class="lbl">{{ copied ? t('copy.copied') : label }}</span>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  color: var(--text-secondary);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}
.copy-btn.md {
  height: 28px;
  padding: 0 10px;
  font-size: 13px;
}
.copy-btn.sm {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
}
.copy-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.copy-btn.copied {
  background: var(--success-soft);
  color: var(--success);
}
.ico {
  font-size: 14px;
  line-height: 1;
}
.lbl {
  font-weight: 500;
}
</style>
