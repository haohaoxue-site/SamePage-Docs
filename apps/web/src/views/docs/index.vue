<script setup lang="ts">
import type { DocumentSectionId } from '@haohaoxue/samepage-domain'
import { DOCUMENT_SECTION_ID } from '@haohaoxue/samepage-domain'
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import DocumentEditorPane from './components/DocumentEditorPane.vue'
import DocumentSectionPanel from './components/DocumentSectionPanel.vue'
import { useDocumentWorkspace } from './composables/useDocumentWorkspace'

const {
  treeSections,
  currentDocument,
  activeDocumentId,
  breadcrumbLabels,
  expandedDocumentIdSet,
  isDocumentLoading,
  isDocumentItemLoading,
  isMutatingTree,
  documentPaneState,
  hasFallbackDocument,
  saveStateLabel,
  confirmNavigation,
  openDocument,
  openDefaultDocument,
  reloadCurrentDocument,
  toggleDocument,
  createRootDocument,
  createChildDocument,
  deleteDocument,
  updateDocumentTitle,
  updateDocumentContent,
} = useDocumentWorkspace()

const collapsedSectionIds = ref<DocumentSectionId[]>([
  DOCUMENT_SECTION_ID.SHARED,
  DOCUMENT_SECTION_ID.TEAM,
])
const collapsedSectionIdSet = computed(() => new Set(collapsedSectionIds.value))
const visibleBreadcrumbLabels = computed(() => breadcrumbLabels.value.length > 1 ? breadcrumbLabels.value : [])
const contextSaveStateLabel = computed(() => {
  if (isDocumentItemLoading.value && activeDocumentId.value) {
    return '正在加载文档...'
  }

  return saveStateLabel.value
})

function toggleSectionCollapse(sectionId: DocumentSectionId) {
  collapsedSectionIds.value = collapsedSectionIdSet.value.has(sectionId)
    ? collapsedSectionIds.value.filter(id => id !== sectionId)
    : [...collapsedSectionIds.value, sectionId]
}

watch(
  () => currentDocument.value?.section,
  (nextSectionId) => {
    if (!nextSectionId) {
      return
    }

    collapsedSectionIds.value = collapsedSectionIds.value.filter(id => id !== nextSectionId)
  },
)

onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id === from.params.id) {
    return true
  }

  return await confirmNavigation()
})

onBeforeRouteLeave(confirmNavigation)
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div class="docs-view-context">
        <div class="docs-view-context__breadcrumb-shell">
          <ElBreadcrumb v-if="visibleBreadcrumbLabels.length" separator="/" class="docs-view-context__breadcrumb">
            <ElBreadcrumbItem
              v-for="label in visibleBreadcrumbLabels"
              :key="label"
            >
              <span class="truncate text-sm text-secondary">{{ label }}</span>
            </ElBreadcrumbItem>
          </ElBreadcrumb>
        </div>

        <div class="docs-view-context__save-state">
          {{ contextSaveStateLabel }}
        </div>
      </div>
    </template>

    <div class="docs-view">
      <aside class="docs-view__sidebar">
        <div class="docs-view__sidebar-scroll">
          <div v-if="isDocumentLoading" class="docs-view__tree-loading">
            正在加载文档树...
          </div>

          <div v-else class="docs-view__tree-sections">
            <DocumentSectionPanel
              v-for="section in treeSections"
              :key="section.id"
              :section="section"
              :active-document-id="activeDocumentId"
              :expanded-document-ids="expandedDocumentIdSet"
              :is-collapsed="collapsedSectionIdSet.has(section.id)"
              :is-action-pending="isMutatingTree"
              @open="openDocument"
              @toggle="toggleDocument"
              @toggle-collapse="toggleSectionCollapse"
              @create-root="createRootDocument"
              @create-child="createChildDocument"
              @delete-document="deleteDocument"
            />
          </div>
        </div>
      </aside>

      <DocumentEditorPane
        :document="currentDocument"
        :is-loading="isDocumentItemLoading"
        :pane-state="documentPaneState"
        :has-fallback-document="hasFallbackDocument"
        @update-title="updateDocumentTitle"
        @update-content="updateDocumentContent"
        @create-document="createRootDocument"
        @open-fallback-document="openDefaultDocument"
        @retry-load="reloadCurrentDocument"
      />
    </div>
  </WorkspacePage>
</template>

<style scoped lang="scss">
.docs-view-context {
  display: grid;
  gap: 0.25rem;
  grid-template-rows: 1.25rem 1.25rem;
  align-content: center;
  height: 2.75rem;
  min-width: 0;
  overflow: hidden;

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
    font-size: 11px;
    line-height: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.docs-view {
  display: flex;
  height: 100%;
  min-height: 0;

  .docs-view__sidebar {
    flex-shrink: 0;
    width: 100%;
    max-width: 21rem;
    border-right: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    background: var(--brand-bg-sidebar);
  }

  .docs-view__sidebar-scroll {
    height: 100%;
    overflow-y: auto;
    padding: 1rem 0.75rem;
  }

  .docs-view__tree-loading {
    padding: 1.5rem 0.75rem;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
  }

  .docs-view__tree-sections {
    padding-bottom: 5rem;

    > * + * {
      margin-top: 1.5rem;
    }
  }
}
</style>
