<script setup lang="ts">
import type {
  DocsContextBarLayoutEmits,
  DocsContextBarLayoutProps,
} from './typing'
import { computed } from 'vue'
import DocumentContextActions from '../components/DocumentContextActions.vue'
import DocumentShareStatusEntry from '../components/DocumentShareStatusEntry.vue'

const props = defineProps<DocsContextBarLayoutProps>()
const emits = defineEmits<DocsContextBarLayoutEmits>()

const surfaceContext = computed(() => {
  if (props.currentSurface === 'pending-shares') {
    return {
      title: '待接收分享',
      description: '查看还未确认接收的分享',
    }
  }

  if (props.currentSurface === 'permissions') {
    return {
      title: '权限管理',
      description: '查看当前空间内已开启分享的文档',
    }
  }

  if (props.currentSurface === 'trash') {
    return {
      title: '回收站',
      description: '',
    }
  }

  return {
    title: '',
    description: '',
  }
})
const isSingleLine = computed(() => !props.isDocumentSurface && !surfaceContext.value.description)
</script>

<template>
  <div class="docs-view-context w-full">
    <div
      class="docs-view-context__content"
      :class="{ 'is-single-line': isSingleLine }"
    >
      <template v-if="props.isDocumentSurface">
        <div class="docs-view-context__breadcrumb-shell">
          <ElBreadcrumb v-if="props.visibleBreadcrumbLabels.length" separator="/" class="docs-view-context__breadcrumb">
            <ElBreadcrumbItem
              v-for="label in props.visibleBreadcrumbLabels"
              :key="label"
            >
              <span class="truncate text-sm text-secondary">{{ label }}</span>
            </ElBreadcrumbItem>
          </ElBreadcrumb>
        </div>

        <div class="docs-view-context__save-state">
          {{ props.saveStateLabel }}
        </div>
      </template>

      <template v-else>
        <div class="docs-view-context__surface-title">
          {{ surfaceContext.title }}
        </div>

        <div v-if="surfaceContext.description" class="docs-view-context__surface-description">
          {{ surfaceContext.description }}
        </div>
      </template>
    </div>

    <div v-if="props.isDocumentSurface && props.documentId" class="docs-view-context__actions">
      <DocumentShareStatusEntry
        :document-id="props.documentId"
        :share="props.documentShare"
        @open-share="emits('openShare', $event)"
      />

      <DocumentContextActions
        :can-delete-document="props.canDeleteDocument"
        :can-move-to-team="props.canMoveToTeam"
        @open-history="emits('openHistory')"
        @move-document-to-team="emits('moveDocumentToTeam')"
        @delete-document="emits('deleteDocument')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.docs-view-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  .docs-view-context__content {
    display: grid;
    gap: 0.25rem;
    grid-template-rows: 1.25rem 1.25rem;
    align-content: center;
    height: 2.75rem;
    min-width: 0;
    overflow: hidden;
    flex: 1 1 0%;
  }

  .docs-view-context__content.is-single-line {
    grid-template-rows: 1.25rem;
    height: 1.25rem;
  }

  .docs-view-context__breadcrumb-shell {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .docs-view-context__breadcrumb {
    min-width: 0;
  }

  .docs-view-context__save-state {
    display: flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    color: color-mix(in srgb, var(--brand-text-secondary) 75%, transparent);
    font-size: 12px;
    line-height: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .docs-view-context__surface-title {
    display: flex;
    align-items: center;
    color: var(--brand-text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.25rem;
  }

  .docs-view-context__surface-description {
    display: flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    color: color-mix(in srgb, var(--brand-text-secondary) 75%, transparent);
    font-size: 12px;
    line-height: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .docs-view-context__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
}
</style>
