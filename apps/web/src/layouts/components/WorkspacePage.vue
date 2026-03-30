<script setup lang="ts">
import WorkspaceContextBar from './WorkspaceContextBar.vue'
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <WorkspaceContextBar>
      <template #context>
        <slot name="context" />
      </template>
    </WorkspaceContextBar>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
