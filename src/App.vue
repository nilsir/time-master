<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import WorldClockList from '@/components/WorldClock/WorldClockList.vue'
import TimestampTool from '@/components/TimestampTool/TimestampTool.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const props = defineProps<{
  mode: 'popup' | 'standalone'
}>()

useTheme()
useLocale()
const { t } = useT()

type Tab = 'clock' | 'timestamp'
const tab = ref<Tab>('clock')
const showSettings = ref(false)

const tabOptions = computed(() => [
  { value: 'clock' as const, label: t('tabs.worldClock') },
  { value: 'timestamp' as const, label: t('tabs.timestamp') },
])

function openStandalone() {
  if (!chrome?.runtime?.sendMessage) return
  chrome.runtime.sendMessage({ type: 'OPEN_STANDALONE' }, () => {
    if (props.mode === 'popup') window.close()
  })
}
</script>

<template>
  <div class="app">
    <header class="app-head">
      <button
        class="icon-btn"
        :title="t('app.settings')"
        :aria-label="t('app.settings')"
        @click="showSettings = !showSettings"
      >
        ⚙
      </button>
      <button
        v-if="mode === 'popup'"
        class="icon-btn pop-out"
        :title="t('app.popOut')"
        :aria-label="t('app.popOut')"
        @click="openStandalone"
      >
        ⤢
      </button>
    </header>

    <div class="tabs">
      <SegmentedControl v-model="tab" :options="tabOptions" />
    </div>

    <main class="main">
      <Transition name="fade" mode="out-in">
        <WorldClockList v-if="tab === 'clock'" key="clock" />
        <TimestampTool v-else key="ts" />
      </Transition>
    </main>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}
.app-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  flex-shrink: 0;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.tabs {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
  flex-shrink: 0;
}
.main {
  flex: 1;
  min-height: 0;
  position: relative;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
