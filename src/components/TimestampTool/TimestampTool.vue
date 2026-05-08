<script setup lang="ts">
import NowPanel from './NowPanel.vue'
import TimestampToFormatted from './TimestampToFormatted.vue'
import FormattedToTimestamp from './FormattedToTimestamp.vue'
</script>

<template>
  <div class="tt-wrap">
    <NowPanel />
    <TimestampToFormatted />
    <FormattedToTimestamp />
  </div>
</template>

<style scoped>
.tt-wrap {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  height: 100%;
}
</style>
