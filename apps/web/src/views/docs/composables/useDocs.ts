import type {
  DocumentCollectionId,
  DocumentPaneState,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_COLLECTION,
  DOCUMENT_PANE_STATE,
} from '@haohaoxue/samepage-contracts'
import {
  computed,
  ref,
  shallowRef,
  watch,
} from 'vue'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from 'vue-router'
import { useActiveDocument } from './useActiveDocument'
import { useDocumentTree } from './useDocumentTree'

/**
 * 文档跳转选项。
 */
interface NavigateToDocumentOptions {
  replace?: boolean
  skipConfirm?: boolean
}

export function useDocs() {
  const route = useRoute()
  const router = useRouter()
  const activeDocumentId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
  const isSelectingInitialDocument = shallowRef(false)
  const collapsedGroupIds = ref<DocumentCollectionId[]>([
    DOCUMENT_COLLECTION.SHARED,
    DOCUMENT_COLLECTION.TEAM,
  ])
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

  const collapsedGroupIdSet = computed(() => new Set(collapsedGroupIds.value))
  const visibleBreadcrumbLabels = computed(() => tree.breadcrumbLabels.value.length > 1 ? tree.breadcrumbLabels.value : [])
  const contextSaveStateLabel = computed(() => {
    if (activeDocument.isDocumentItemLoading.value && activeDocumentId.value) {
      return '正在加载文档...'
    }

    return activeDocument.saveStateLabel.value
  })
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

  watch(
    tree.activeCollectionId,
    (nextCollectionId) => {
      if (!nextCollectionId) {
        return
      }

      collapsedGroupIds.value = collapsedGroupIds.value.filter(id => id !== nextCollectionId)
    },
  )

  onBeforeRouteUpdate(async (to, from) => {
    if (to.params.id === from.params.id) {
      return true
    }

    return await activeDocument.confirmNavigation()
  })

  onBeforeRouteLeave(activeDocument.confirmNavigation)
  void loadInitialTree()

  return {
    treeGroups: tree.treeGroups,
    activeCollectionId: tree.activeCollectionId,
    currentDocument: activeDocument.currentDocument,
    snapshots: activeDocument.snapshots,
    activeDocumentId,
    expandedDocumentIdSet: tree.expandedDocumentIdSet,
    isDocumentLoading: tree.isDocumentLoading,
    isDocumentItemLoading: activeDocument.isDocumentItemLoading,
    isSnapshotsLoading: activeDocument.isSnapshotsLoading,
    isMutatingTree: tree.isMutatingTree,
    isRestoringSnapshot: activeDocument.isRestoringSnapshot,
    documentPaneState,
    hasFallbackDocument: tree.hasFallbackDocument,
    visibleBreadcrumbLabels,
    contextSaveStateLabel,
    collapsedGroupIdSet,
    openDocument,
    openDefaultDocument,
    reloadCurrentDocument: activeDocument.reloadCurrentDocument,
    restoreSnapshot: activeDocument.restoreSnapshot,
    toggleDocument: tree.toggleDocument,
    toggleGroupCollapse,
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

  function toggleGroupCollapse(collectionId: DocumentCollectionId) {
    collapsedGroupIds.value = collapsedGroupIdSet.value.has(collectionId)
      ? collapsedGroupIds.value.filter(id => id !== collectionId)
      : [...collapsedGroupIds.value, collectionId]
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
