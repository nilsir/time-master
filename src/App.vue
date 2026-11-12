<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import { useStoredValue } from '@/composables/useStorage'
import { useWindowBounds } from '@/composables/useWindowBounds'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import WorldClockList from '@/components/WorldClock/WorldClockList.vue'
import TimestampTool from '@/components/TimestampTool/TimestampTool.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const props = defineProps<{
  mode: 'popup' | 'standalone'
}>()

if (props.mode === 'standalone') useWindowBounds()
useTheme()
useLocale()
const { t } = useT()

type Tab = 'clock' | 'timestamp'
const defaultTab = useStoredValue('defaultTab')
const tab = ref<Tab>(defaultTab.value)
const showSettings = ref(false)

// 存储异步加载完成后同步一次初始值，之后停止监听
const stopWatch = watch(defaultTab, (val) => {
  tab.value = val
  stopWatch()
})

const tabOptions = computed(() => [
  { value: 'clock' as const, label: t('tabs.worldClock') },
  { value: 'timestamp' as const, label: t('tabs.timestamp') },
])

function openStandalone() {
  if (!chrome?.runtime?.sendMessage) return
  chrome.runtime.sendMessage({ type: 'OPEN_STANDALONE' }, (response) => {
    if (!chrome.runtime.lastError && response?.ok && props.mode === 'popup') window.close()
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
      <WorldClockList v-if="tab === 'clock'" />
      <TimestampTool v-else />
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
</style>
