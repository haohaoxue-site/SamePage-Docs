<script setup lang="ts">
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import UnderConstructionPanel from '@/views/shared/components/UnderConstructionPanel.vue'
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div>
        <div class="text-2xl font-semibold tracking-tight text-main">
          知识库
        </div>
      </div>
    </template>

    <UnderConstructionPanel
      title="建设中"
      icon="i-carbon-data-base"
    />
  </WorkspacePage>
</template>
