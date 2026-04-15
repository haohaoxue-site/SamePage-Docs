import type { DocumentPaneState } from '@haohaoxue/samepage-domain'
import { DOCUMENT_PANE_STATE } from '@haohaoxue/samepage-contracts'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActiveDocument } from './useActiveDocument'
import { useDocumentTree } from './useDocumentTree'

/**
 * 文档跳转选项。
 */
interface NavigateToDocumentOptions {
  replace?: boolean
  skipConfirm?: boolean
}

export function useDocumentWorkspace() {
  const route = useRoute()
  const router = useRouter()
  const activeDocumentId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
  const isSelectingInitialDocument = shallowRef(false)
  let confirmPendingNavigation = async () => true

  const tree = useDocumentTree({
    activeDocumentId,
    confirmNavigation: () => confirmPendingNavigation(),
    navigateToDocument,
  })
  const activeDocument = useActiveDocument({
    activeDocumentId,
    ensureExpandedPath: tree.ensureExpandedPath,
    patchDocumentItem: tree.patchDocumentItem,
    rememberLastOpenedDocument: tree.rememberLastOpenedDocument,
  })
  confirmPendingNavigation = activeDocument.confirmNavigation

  const documentPaneState = computed<DocumentPaneState>(() => {
    if (activeDocument.currentDocument.value) {
      return DOCUMENT_PANE_STATE.READY
    }

    if (activeDocument.isDocumentItemLoading.value || tree.isDocumentLoading.value || isSelectingInitialDocument.value) {
      return DOCUMENT_PANE_STATE.LOADING
    }

    if (activeDocumentId.value) {
      return activeDocument.documentErrorState.value ?? DOCUMENT_PANE_STATE.ERROR
    }

    if (tree.hasFallbackDocument.value) {
      return DOCUMENT_PANE_STATE.UNSELECTED
    }

    return DOCUMENT_PANE_STATE.EMPTY
  })

  void loadInitialTree()

  return {
    treeGroups: tree.treeGroups,
    currentDocument: activeDocument.currentDocument,
    activeDocumentId,
    breadcrumbLabels: tree.breadcrumbLabels,
    expandedDocumentIdSet: tree.expandedDocumentIdSet,
    isDocumentLoading: tree.isDocumentLoading,
    isDocumentItemLoading: activeDocument.isDocumentItemLoading,
    isSaving: activeDocument.isSaving,
    isCreating: tree.isCreating,
    isMutatingTree: tree.isMutatingTree,
    documentPaneState,
    hasFallbackDocument: tree.hasFallbackDocument,
    saveState: activeDocument.saveState,
    saveStateLabel: activeDocument.saveStateLabel,
    confirmNavigation: activeDocument.confirmNavigation,
    openDocument,
    openDefaultDocument,
    reloadCurrentDocument: activeDocument.reloadCurrentDocument,
    toggleDocument: tree.toggleDocument,
    createRootDocument: tree.createRootDocument,
    createChildDocument: tree.createChildDocument,
    deleteDocument: tree.deleteDocument,
    updateDocumentTitle: activeDocument.updateDocumentTitle,
    updateDocumentContent: activeDocument.updateDocumentContent,
  }

  async function navigateToDocument(
    documentId: string | null,
    options: NavigateToDocumentOptions = {},
  ) {
    if (documentId === activeDocumentId.value) {
      return true
    }

    if (!options.skipConfirm) {
      const canNavigate = await activeDocument.confirmNavigation()

      if (!canNavigate) {
        return false
      }
    }

    await router[options.replace ? 'replace' : 'push']({
      name: 'docs',
      ...(documentId ? { params: { id: documentId } } : {}),
    })

    return true
  }

  async function openDocument(documentId: string) {
    await navigateToDocument(documentId)
  }

  async function openDefaultDocument(options: { replace?: boolean } = {}) {
    if (!tree.defaultDocumentId.value) {
      return
    }

    await navigateToDocument(tree.defaultDocumentId.value, options)
  }

  async function loadInitialTree() {
    await tree.loadTree()

    if (activeDocumentId.value || !tree.defaultDocumentId.value) {
      return
    }

    isSelectingInitialDocument.value = true

    try {
      await navigateToDocument(tree.defaultDocumentId.value, {
        replace: true,
        skipConfirm: true,
      })
    }
    finally {
      isSelectingInitialDocument.value = false
    }
  }
}
