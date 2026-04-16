import type {
  DocumentCollectionId,
  DocumentPaneState,
  DocumentSnapshot,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_COLLECTION,
  DOCUMENT_PANE_STATE,
} from '@haohaoxue/samepage-contracts'
import { isSameDocumentSnapshotContent } from '@haohaoxue/samepage-shared'
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
import { useUserStore } from '@/stores/user'
import {
  buildDocumentEditorMeta,
  buildHistoryPreviewDocument,
  resolveDefaultHistorySnapshotId,
} from '../utils/documentEditor'
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
  const userStore = useUserStore()
  const activeDocumentId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
  const isSelectingInitialDocument = shallowRef(false)
  const isHistoryMode = shallowRef(false)
  const selectedHistorySnapshotId = shallowRef<string | null>(null)
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
  const currentLatestSnapshot = computed(() =>
    resolveSnapshotById(activeDocument.snapshots.value, activeDocument.currentDocument.value?.latestSnapshotId ?? null),
  )
  const selectedHistorySnapshot = computed(() =>
    resolveSnapshotById(activeDocument.snapshots.value, selectedHistorySnapshotId.value),
  )
  const previewDocument = computed(() => buildHistoryPreviewDocument({
    document: activeDocument.currentDocument.value,
    snapshot: isHistoryMode.value ? selectedHistorySnapshot.value : null,
  }))
  const documentEditorMode = computed(() => isHistoryMode.value ? 'history' : 'default')
  const canDeleteCurrentDocument = computed(() =>
    tree.activeCollectionId.value === DOCUMENT_COLLECTION.PERSONAL,
  )
  const documentEditorMeta = computed(() => buildDocumentEditorMeta({
    document: activeDocument.currentDocument.value,
    snapshots: activeDocument.snapshots.value,
    fallbackUser: userStore.currentUser,
  }))
  const isSelectedSnapshotCurrentContent = computed(() => {
    if (!selectedHistorySnapshot.value) {
      return false
    }

    if (!currentLatestSnapshot.value) {
      return activeDocument.currentDocument.value?.latestSnapshotId === selectedHistorySnapshot.value.id
    }

    return isSameDocumentSnapshotContent(currentLatestSnapshot.value, selectedHistorySnapshot.value)
  })
  const canRestoreSelectedSnapshot = computed(() =>
    Boolean(selectedHistorySnapshot.value)
    && !isSelectedSnapshotCurrentContent.value
    && !activeDocument.isRestoringSnapshot.value,
  )
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

  watch(
    [activeDocument.currentDocument, activeDocument.snapshots],
    ([nextDocument, nextSnapshots]) => {
      selectedHistorySnapshotId.value = resolveDefaultHistorySnapshotId({
        document: nextDocument,
        snapshots: nextSnapshots,
        currentSelectedSnapshotId: selectedHistorySnapshotId.value,
      })
    },
    { immediate: true },
  )

  watch(
    activeDocumentId,
    (nextDocumentId, previousDocumentId) => {
      if (nextDocumentId === previousDocumentId) {
        return
      }

      isHistoryMode.value = false
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
    previewDocument,
    snapshots: activeDocument.snapshots,
    activeDocumentId,
    documentEditorMode,
    documentEditorMeta,
    canDeleteCurrentDocument,
    expandedDocumentIdSet: tree.expandedDocumentIdSet,
    isDocumentLoading: tree.isDocumentLoading,
    isDocumentItemLoading: activeDocument.isDocumentItemLoading,
    isSnapshotsLoading: activeDocument.isSnapshotsLoading,
    isMutatingTree: tree.isMutatingTree,
    isRestoringSnapshot: activeDocument.isRestoringSnapshot,
    isHistoryMode,
    selectedHistorySnapshotId,
    canRestoreSelectedSnapshot,
    documentPaneState,
    hasFallbackDocument: tree.hasFallbackDocument,
    visibleBreadcrumbLabels,
    contextSaveStateLabel,
    collapsedGroupIdSet,
    openHistoryMode,
    closeHistoryMode,
    openDocument,
    openDefaultDocument,
    reloadCurrentDocument: activeDocument.reloadCurrentDocument,
    restoreSelectedSnapshot,
    selectHistorySnapshot,
    toggleDocument: tree.toggleDocument,
    toggleGroupCollapse,
    createRootDocument: tree.createRootDocument,
    createChildDocument: tree.createChildDocument,
    deleteDocument: tree.deleteDocument,
    deleteCurrentDocument,
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

  function openHistoryMode() {
    if (!activeDocument.currentDocument.value) {
      return
    }

    isHistoryMode.value = true
    selectedHistorySnapshotId.value = resolveDefaultHistorySnapshotId({
      document: activeDocument.currentDocument.value,
      snapshots: activeDocument.snapshots.value,
      currentSelectedSnapshotId: selectedHistorySnapshotId.value,
    })
  }

  function closeHistoryMode() {
    isHistoryMode.value = false
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

  function selectHistorySnapshot(snapshotId: string) {
    selectedHistorySnapshotId.value = snapshotId
  }

  async function restoreSelectedSnapshot() {
    if (!selectedHistorySnapshotId.value || !canRestoreSelectedSnapshot.value) {
      return
    }

    await activeDocument.restoreSnapshot(selectedHistorySnapshotId.value)
    selectedHistorySnapshotId.value = resolveDefaultHistorySnapshotId({
      document: activeDocument.currentDocument.value,
      snapshots: activeDocument.snapshots.value,
      currentSelectedSnapshotId: activeDocument.currentDocument.value?.latestSnapshotId ?? null,
    })
  }

  async function deleteCurrentDocument() {
    if (!activeDocument.currentDocument.value) {
      return
    }

    await tree.deleteDocument(activeDocument.currentDocument.value.id)
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

function resolveSnapshotById(snapshots: DocumentSnapshot[], snapshotId: string | null) {
  if (!snapshotId) {
    return null
  }

  return snapshots.find(snapshot => snapshot.id === snapshotId) ?? null
}
