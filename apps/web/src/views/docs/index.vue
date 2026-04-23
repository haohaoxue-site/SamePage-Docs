<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import DocumentShareDialog from './components/DocumentShareDialog.vue'
import { useDocs } from './composables/useDocs'
import DocsActiveSurfaceLayout from './layouts/DocsActiveSurfaceLayout.vue'
import DocsContextBarLayout from './layouts/DocsContextBarLayout.vue'
import DocsHistoryLayout from './layouts/DocsHistoryLayout.vue'

const {
  treeGroups,
  currentDocument,
  currentWorkspaceType,
  pendingShareCount,
  hasPendingShares,
  previewDocument,
  snapshots,
  activeDocumentId,
  activeBlockId,
  documentEditorMode,
  documentEditorMeta,
  canDeleteCurrentDocument,
  canMoveCurrentDocumentToTeam,
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
  currentSurface,
  isDocumentSurface,
  saveStateLabel,
  collapsedGroupIdSet,
  openHistoryMode,
  closeHistoryMode,
  openDocument,
  openDefaultDocument,
  reloadCurrentDocument,
  applyDocumentShareChanged,
  restoreSelectedSnapshot,
  selectHistorySnapshot,
  toggleDocument,
  toggleGroupCollapse,
  createRootDocument,
  createChildDocument,
  deleteDocument,
  deleteCurrentDocument,
  moveCurrentDocumentToTeam,
  moveDocumentToTeam,
  updateDocumentTitle,
  updateDocumentContent,
  handleRequestComment,
} = useDocs()

const router = useRouter()
const shareDialogDocumentId = shallowRef('')
const isShareDialogOpen = computed(() => Boolean(shareDialogDocumentId.value))
const contextSaveStateLabel = computed(() => {
  if (isDocumentItemLoading.value && activeDocumentId.value) {
    return '正在加载文档...'
  }

  return saveStateLabel.value
})

function openDocumentShareDialog(documentId: string) {
  shareDialogDocumentId.value = documentId
}

function handleShareDialogVisibleChange(visible: boolean) {
  if (visible) {
    return
  }

  shareDialogDocumentId.value = ''
}

function openPermissionsOverview() {
  void router.push({
    name: 'docs-permissions',
  })
}

function openTrashPage() {
  void router.push({
    name: 'docs-trash',
  })
}
</script>

<template>
  <WorkspacePage :show-context-bar="!isHistoryMode">
    <template v-if="!isHistoryMode" #context>
      <DocsContextBarLayout
        :is-document-surface="isDocumentSurface"
        :current-surface="currentSurface"
        :visible-breadcrumb-labels="visibleBreadcrumbLabels"
        :save-state-label="contextSaveStateLabel"
        :document-id="currentDocument?.id ?? ''"
        :document-share="currentDocument?.share ?? null"
        :can-delete-document="canDeleteCurrentDocument"
        :can-move-to-team="canMoveCurrentDocumentToTeam"
        @open-share="openDocumentShareDialog"
        @open-history="openHistoryMode"
        @move-document-to-team="moveCurrentDocumentToTeam"
        @delete-document="deleteCurrentDocument"
      />
    </template>

    <DocsHistoryLayout
      v-if="isHistoryMode"
      :preview-document="previewDocument"
      :current-document="currentDocument"
      :snapshots="snapshots"
      :document-editor-meta="documentEditorMeta"
      :document-editor-mode="documentEditorMode"
      :active-block-id="activeBlockId"
      :is-document-item-loading="isDocumentItemLoading"
      :is-snapshots-loading="isSnapshotsLoading"
      :is-restoring-snapshot="isRestoringSnapshot"
      :selected-snapshot-id="selectedHistorySnapshotId"
      :can-restore-selected-snapshot="canRestoreSelectedSnapshot"
      :document-pane-state="documentPaneState"
      :has-fallback-document="hasFallbackDocument"
      @close-history-mode="closeHistoryMode"
      @restore-selected-snapshot="restoreSelectedSnapshot"
      @select-history-snapshot="selectHistorySnapshot"
      @update-title="updateDocumentTitle"
      @update-content="updateDocumentContent"
      @request-comment="handleRequestComment"
      @create-document="createRootDocument"
      @open-fallback-document="openDefaultDocument"
      @retry-load="reloadCurrentDocument"
    />

    <DocsActiveSurfaceLayout
      v-else
      :tree-groups="treeGroups"
      :current-workspace-type="currentWorkspaceType"
      :active-document-id="activeDocumentId"
      :expanded-document-ids="expandedDocumentIdSet"
      :collapsed-group-ids="collapsedGroupIdSet"
      :is-document-loading="isDocumentLoading"
      :is-mutating-tree="isMutatingTree"
      :current-surface="currentSurface"
      :pending-share-count="pendingShareCount"
      :has-pending-shares="hasPendingShares"
      :is-document-surface="isDocumentSurface"
      :preview-document="previewDocument"
      :document-editor-meta="documentEditorMeta"
      :document-editor-mode="documentEditorMode"
      :active-block-id="activeBlockId"
      :is-document-item-loading="isDocumentItemLoading"
      :document-pane-state="documentPaneState"
      :has-fallback-document="hasFallbackDocument"
      @open-document="openDocument"
      @toggle-document="toggleDocument"
      @toggle-group-collapse="toggleGroupCollapse"
      @create-root-document="createRootDocument"
      @create-child-document="createChildDocument"
      @move-document-to-team="moveDocumentToTeam"
      @delete-document="deleteDocument"
      @open-permissions-overview="openPermissionsOverview"
      @open-trash-page="openTrashPage"
      @open-share="openDocumentShareDialog"
      @update-title="updateDocumentTitle"
      @update-content="updateDocumentContent"
      @request-comment="handleRequestComment"
      @create-document="createRootDocument"
      @open-fallback-document="openDefaultDocument"
      @retry-load="reloadCurrentDocument"
    />

    <DocumentShareDialog
      :model-value="isShareDialogOpen"
      :document-id="shareDialogDocumentId"
      @share-changed="applyDocumentShareChanged"
      @update:model-value="handleShareDialogVisibleChange"
    />
  </WorkspacePage>
</template>
