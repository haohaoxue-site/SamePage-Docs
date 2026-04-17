<script setup lang="ts">
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import DocumentContextActions from './components/DocumentContextActions.vue'
import DocumentEditorPane from './components/DocumentEditorPane.vue'
import DocumentHistoryPanel from './components/DocumentHistoryPanel.vue'
import DocumentSectionPanel from './components/DocumentSectionPanel.vue'
import { useDocs } from './composables/useDocs'

const {
  treeGroups,
  currentDocument,
  previewDocument,
  snapshots,
  activeDocumentId,
  documentEditorMode,
  documentEditorMeta,
  canDeleteCurrentDocument,
  expandedDocumentIdSet,
  isDocumentLoading,
  isDocumentItemLoading,
  isSnapshotsLoading,
  isMutatingTree,
  isRestoringSnapshot,
  isHistoryMode,
  selectedHistorySnapshotId,
  canRestoreSelectedSnapshot,
  documentPaneState,
  hasFallbackDocument,
  visibleBreadcrumbLabels,
  contextSaveStateLabel,
  collapsedGroupIdSet,
  openHistoryMode,
  closeHistoryMode,
  openDocument,
  openDefaultDocument,
  reloadCurrentDocument,
  restoreSelectedSnapshot,
  selectHistorySnapshot,
  toggleDocument,
  toggleGroupCollapse,
  createRootDocument,
  createChildDocument,
  deleteDocument,
  deleteCurrentDocument,
  updateDocumentTitle,
  updateDocumentContent,
  handleRequestComment,
} = useDocs()
</script>

<template>
  <WorkspacePage :show-context-bar="!isHistoryMode">
    <template v-if="!isHistoryMode" #context>
      <div class="docs-view-context">
        <div class="docs-view-context__content">
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

        <DocumentContextActions
          v-if="currentDocument"
          :can-delete-document="canDeleteCurrentDocument"
          @open-history="openHistoryMode"
          @delete-document="deleteCurrentDocument"
        />
      </div>
    </template>

    <section v-if="isHistoryMode" class="docs-history-view">
      <header class="docs-history-view__header">
        <ElButton
          text
          class="docs-history-view__back"
          @click="closeHistoryMode"
        >
          <span class="docs-history-view__back-content">
            <SvgIcon category="ui" icon="arrow-left" size="14px" />
            <span>返回文档</span>
          </span>
        </ElButton>

        <ElButton
          type="primary"
          class="docs-history-view__restore"
          :disabled="!canRestoreSelectedSnapshot"
          :loading="isRestoringSnapshot"
          @click="restoreSelectedSnapshot"
        >
          还原此历史记录
        </ElButton>

        <div class="docs-history-view__header-spacer" />
      </header>

      <div class="docs-history-view__content">
        <DocumentEditorPane
          :document="previewDocument"
          :metadata="documentEditorMeta"
          :mode="documentEditorMode"
          :is-loading="isDocumentItemLoading"
          :pane-state="documentPaneState"
          :has-fallback-document="hasFallbackDocument"
          @update-title="updateDocumentTitle"
          @update-content="updateDocumentContent"
          @request-comment="handleRequestComment"
          @create-document="createRootDocument"
          @open-fallback-document="openDefaultDocument"
          @retry-load="reloadCurrentDocument"
        />

        <DocumentHistoryPanel
          :document="currentDocument"
          :snapshots="snapshots"
          :selected-snapshot-id="selectedHistorySnapshotId"
          :is-loading="isSnapshotsLoading"
          @select="selectHistorySnapshot"
        />
      </div>
    </section>

    <div v-else class="docs-view">
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
        :document="previewDocument"
        :metadata="documentEditorMeta"
        :mode="documentEditorMode"
        :is-loading="isDocumentItemLoading"
        :pane-state="documentPaneState"
        :has-fallback-document="hasFallbackDocument"
        @update-title="updateDocumentTitle"
        @update-content="updateDocumentContent"
        @request-comment="handleRequestComment"
        @create-document="createRootDocument"
        @open-fallback-document="openDefaultDocument"
        @retry-load="reloadCurrentDocument"
      />
    </div>
  </WorkspacePage>
</template>

<style scoped lang="scss">
.docs-view-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;

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
    max-width: 16rem;
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

.docs-history-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--brand-bg-surface);

  .docs-history-view__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1.5rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    background: color-mix(in srgb, var(--brand-bg-surface) 92%, white 8%);
  }

  .docs-history-view__back {
    justify-self: start;
    color: var(--brand-text-secondary);

    &:hover {
      color: var(--brand-text-primary);
    }
  }

  .docs-history-view__back-content {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 13px;
    font-weight: 500;
  }

  .docs-history-view__restore {
    min-width: 8.5rem;
  }

  .docs-history-view__header-spacer {
    min-width: 0;
  }

  .docs-history-view__content {
    display: flex;
    flex: 1 1 0%;
    min-height: 0;
  }
}

@media (max-width: 1180px) {
  .docs-view,
  .docs-history-view .docs-history-view__content {
    flex-direction: column;
  }

  .docs-history-view {
    .docs-history-view__header {
      grid-template-columns: 1fr;
      justify-items: center;
    }

    .docs-history-view__back {
      justify-self: stretch;
    }

    .docs-history-view__header-spacer {
      display: none;
    }
  }
}
</style>
