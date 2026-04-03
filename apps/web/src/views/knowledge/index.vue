<script setup lang="ts">
import { UnderConstructionPanel } from '@/components/under-construction-panel'
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div class="knowledge-view-context">
        <div class="knowledge-view-context__title">
          知识库
        </div>
      </div>
    </template>

    <UnderConstructionPanel
      title="建设中"
      icon-category="nav"
      icon="knowledge-active"
    />
  </WorkspacePage>
</template>

<style scoped lang="scss">
.knowledge-view-context {
  .knowledge-view-context__title {
    color: var(--brand-text-primary);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 2rem;
  }
}
</style>
