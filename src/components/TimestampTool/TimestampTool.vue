<script setup lang="ts">
import NowPanel from './NowPanel.vue'
import SmartConverter from './SmartConverter.vue'
</script>

<template>
  <div class="tt-wrap">
    <NowPanel />
    <SmartConverter />
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
