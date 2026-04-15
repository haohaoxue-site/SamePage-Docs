<script setup lang="ts">
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import DocumentEditorPane from './components/DocumentEditorPane.vue'
import DocumentHistoryPanel from './components/DocumentHistoryPanel.vue'
import DocumentSectionPanel from './components/DocumentSectionPanel.vue'
import { useDocs } from './composables/useDocs'

const {
  treeGroups,
  currentDocument,
  snapshots,
  activeDocumentId,
  expandedDocumentIdSet,
  isDocumentLoading,
  isDocumentItemLoading,
  isSnapshotsLoading,
  isMutatingTree,
  isRestoringSnapshot,
  documentPaneState,
  hasFallbackDocument,
  visibleBreadcrumbLabels,
  contextSaveStateLabel,
  collapsedGroupIdSet,
  openDocument,
  openDefaultDocument,
  reloadCurrentDocument,
  restoreSnapshot,
  toggleDocument,
  toggleGroupCollapse,
  createRootDocument,
  createChildDocument,
  deleteDocument,
  updateDocumentTitle,
  updateDocumentContent,
} = useDocs()
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
              v-for="group in treeGroups"
              :key="group.id"
              :group="group"
              :active-document-id="activeDocumentId"
              :expanded-document-ids="expandedDocumentIdSet"
              :is-collapsed="collapsedGroupIdSet.has(group.id)"
              :is-action-pending="isMutatingTree"
              @open="openDocument"
              @toggle="toggleDocument"
              @toggle-collapse="toggleGroupCollapse"
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

      <DocumentHistoryPanel
        :document="currentDocument"
        :snapshots="snapshots"
        :is-loading="isSnapshotsLoading"
        :is-restoring="isRestoringSnapshot"
        @restore="restoreSnapshot"
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

@media (max-width: 1180px) {
  .docs-view {
    flex-direction: column;
  }
}
</style>
