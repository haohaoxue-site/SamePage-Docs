import type { DocumentCollectionId, WorkspaceType } from '@haohaoxue/samepage-domain'
import type { ComputedRef, ShallowRef } from 'vue'
import type { useActiveDocument } from './useActiveDocument'
import type { useDocsSurfaceState } from './useDocsSurfaceState'
import type { useDocumentTree } from './useDocumentTree'
import {
  DOCUMENT_COLLECTION,
  DOCUMENT_VISIBILITY,
  WORKSPACE_TYPE,
} from '@haohaoxue/samepage-contracts'
import { ElMessage } from 'element-plus'
import { computed, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { patchDocumentMeta as patchDocumentMetaRequest } from '@/apis/document'

/**
 * 文档页动作组合参数。
 */
interface UseDocsPageActionsOptions {
  activeDocumentId: ComputedRef<string | null>
  currentUserId: ComputedRef<string | null>
  currentWorkspaceId: ComputedRef<string | null>
  currentWorkspaceType: ComputedRef<WorkspaceType>
  isSelectingInitialDocument: ShallowRef<boolean>
  tree: Pick<
    ReturnType<typeof useDocumentTree>,
    'activeCollectionId' | 'createRootDocument' | 'deleteDocument' | 'loadTree'
  >
  activeDocument: Pick<
    ReturnType<typeof useActiveDocument>,
    'confirmNavigation' | 'currentDocument' | 'reloadCurrentDocument'
  >
  surfaceState: Pick<
    ReturnType<typeof useDocsSurfaceState>,
    'isDocumentSurface' | 'visibleActiveCollectionId' | 'visibleDefaultDocumentId'
  >
  navigateToDocument: (
    documentId: string | null,
    options?: {
      replace?: boolean
      skipConfirm?: boolean
    },
  ) => Promise<boolean>
}

export function useDocsPageActions(options: UseDocsPageActionsOptions) {
  const canDeleteCurrentDocument = computed(() =>
    Boolean(options.surfaceState.visibleActiveCollectionId.value)
    && options.surfaceState.visibleActiveCollectionId.value !== DOCUMENT_COLLECTION.SHARED,
  )
  const canMoveCurrentDocumentToTeam = computed(() =>
    options.currentWorkspaceType.value === WORKSPACE_TYPE.TEAM
    && options.activeDocument.currentDocument.value?.visibility === DOCUMENT_VISIBILITY.PRIVATE
    && options.activeDocument.currentDocument.value.parentId === null
    && options.activeDocument.currentDocument.value.createdBy === options.currentUserId.value,
  )

  watch(
    options.currentWorkspaceId,
    async (nextWorkspaceId, previousWorkspaceId) => {
      if (nextWorkspaceId === previousWorkspaceId) {
        return
      }

      await options.tree.loadTree()

      if (
        !options.surfaceState.isDocumentSurface.value
        || !nextWorkspaceId
        || options.activeDocumentId.value === options.surfaceState.visibleDefaultDocumentId.value
      ) {
        return
      }

      await options.navigateToDocument(options.surfaceState.visibleDefaultDocumentId.value, {
        replace: true,
        skipConfirm: true,
      })
    },
  )

  watch(
    [options.currentWorkspaceId, options.tree.activeCollectionId],
    async ([, nextActiveCollectionId], previousState) => {
      const [, previousActiveCollectionId] = previousState ?? []
      const isInitialRun = previousState === undefined
      const hasResolvedHiddenDocument
        = !isInitialRun && Boolean(nextActiveCollectionId) && nextActiveCollectionId !== previousActiveCollectionId

      if (!isInitialRun && !hasResolvedHiddenDocument) {
        return
      }

      if (!options.surfaceState.isDocumentSurface.value) {
        return
      }

      if (
        !options.activeDocumentId.value
        || !nextActiveCollectionId
        || options.surfaceState.visibleActiveCollectionId.value
      ) {
        return
      }

      await options.navigateToDocument(options.surfaceState.visibleDefaultDocumentId.value, {
        replace: true,
        skipConfirm: true,
      })
    },
    { immediate: true },
  )

  onBeforeRouteUpdate(async (to, from) => {
    if (to.params.id === from.params.id) {
      return true
    }

    return await options.activeDocument.confirmNavigation()
  })

  onBeforeRouteLeave(options.activeDocument.confirmNavigation)
  void loadInitialTree()

  return {
    canDeleteCurrentDocument,
    canMoveCurrentDocumentToTeam,
    openDocument,
    openDefaultDocument,
    createRootDocument,
    deleteCurrentDocument,
    moveCurrentDocumentToTeam,
    moveDocumentToTeam,
  }

  async function openDocument(documentId: string) {
    await options.navigateToDocument(documentId)
  }

  async function openDefaultDocument(input: { replace?: boolean } = {}) {
    if (!options.surfaceState.visibleDefaultDocumentId.value) {
      return
    }

    await options.navigateToDocument(options.surfaceState.visibleDefaultDocumentId.value, input)
  }

  function resolveDefaultRootCollectionId() {
    return options.currentWorkspaceType.value === WORKSPACE_TYPE.TEAM
      ? DOCUMENT_COLLECTION.TEAM
      : DOCUMENT_COLLECTION.PERSONAL
  }

  async function createRootDocument(collectionId: DocumentCollectionId = resolveDefaultRootCollectionId()) {
    if (collectionId === DOCUMENT_COLLECTION.SHARED) {
      return
    }

    await options.tree.createRootDocument(collectionId)
  }

  async function deleteCurrentDocument() {
    if (!options.activeDocument.currentDocument.value) {
      return
    }

    await options.tree.deleteDocument(options.activeDocument.currentDocument.value.id)
  }

  async function moveCurrentDocumentToTeam() {
    if (!options.activeDocument.currentDocument.value) {
      return
    }

    await moveDocumentToTeam(options.activeDocument.currentDocument.value.id)
  }

  async function moveDocumentToTeam(documentId: string) {
    const isCurrentDocument = options.activeDocument.currentDocument.value?.id === documentId

    if (isCurrentDocument) {
      const canContinue = await options.activeDocument.confirmNavigation()

      if (!canContinue) {
        return
      }
    }

    try {
      await patchDocumentMetaRequest(documentId, {
        visibility: DOCUMENT_VISIBILITY.WORKSPACE,
      })
      await options.tree.loadTree()

      if (isCurrentDocument) {
        await options.activeDocument.reloadCurrentDocument()
      }

      ElMessage.success('文档已移到团队')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '移到团队失败')
    }
  }

  async function loadInitialTree() {
    await options.tree.loadTree()

    if (
      !options.surfaceState.isDocumentSurface.value
      || options.activeDocumentId.value
      || !options.surfaceState.visibleDefaultDocumentId.value
    ) {
      return
    }

    options.isSelectingInitialDocument.value = true

    try {
      await options.navigateToDocument(options.surfaceState.visibleDefaultDocumentId.value, {
        replace: true,
        skipConfirm: true,
      })
    }
    finally {
      options.isSelectingInitialDocument.value = false
    }
  }
}
