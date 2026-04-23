import type {
  DocumentSnapshot,
} from '@haohaoxue/samepage-domain'
import type { ComputedRef, ShallowRef } from 'vue'
import type { ActiveDocumentDetail } from '../typing'
import { isSameDocumentSnapshotContent } from '@haohaoxue/samepage-shared'
import { computed, shallowRef, watch } from 'vue'
import {
  buildHistoryPreviewDocument,
  resolveDefaultHistorySnapshotId,
} from '../utils/documentEditor'

/**
 * 文档历史态组合参数。
 */
interface UseDocsHistoryStateOptions {
  activeDocumentId: ComputedRef<string | null>
  currentDocument: ShallowRef<ActiveDocumentDetail | null>
  snapshots: ShallowRef<DocumentSnapshot[]>
  isRestoringSnapshot: ShallowRef<boolean>
  restoreSnapshot: (snapshotId: string) => Promise<void>
}

export function useDocsHistoryState({
  activeDocumentId,
  currentDocument,
  snapshots,
  isRestoringSnapshot,
  restoreSnapshot,
}: UseDocsHistoryStateOptions) {
  const isHistoryMode = shallowRef(false)
  const selectedHistorySnapshotId = shallowRef<string | null>(null)
  const currentLatestSnapshot = computed(() =>
    resolveSnapshotById(snapshots.value, currentDocument.value?.latestSnapshotId ?? null),
  )
  const selectedHistorySnapshot = computed(() =>
    resolveSnapshotById(snapshots.value, selectedHistorySnapshotId.value),
  )
  const previewDocument = computed(() => buildHistoryPreviewDocument({
    document: currentDocument.value,
    snapshot: isHistoryMode.value ? selectedHistorySnapshot.value : null,
  }))
  const documentEditorMode = computed(() => isHistoryMode.value ? 'history' : 'default')
  const isSelectedSnapshotCurrentContent = computed(() => {
    if (!selectedHistorySnapshot.value) {
      return false
    }

    if (!currentLatestSnapshot.value) {
      return currentDocument.value?.latestSnapshotId === selectedHistorySnapshot.value.id
    }

    return isSameDocumentSnapshotContent(currentLatestSnapshot.value, selectedHistorySnapshot.value)
  })
  const canRestoreSelectedSnapshot = computed(() =>
    Boolean(selectedHistorySnapshot.value)
    && !isSelectedSnapshotCurrentContent.value
    && !isRestoringSnapshot.value,
  )

  watch(
    [currentDocument, snapshots],
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

  return {
    previewDocument,
    documentEditorMode,
    isHistoryMode,
    selectedHistorySnapshotId,
    canRestoreSelectedSnapshot,
    openHistoryMode,
    closeHistoryMode,
    selectHistorySnapshot,
    restoreSelectedSnapshot,
  }

  function openHistoryMode() {
    if (!currentDocument.value) {
      return
    }

    isHistoryMode.value = true
    selectedHistorySnapshotId.value = resolveDefaultHistorySnapshotId({
      document: currentDocument.value,
      snapshots: snapshots.value,
      currentSelectedSnapshotId: selectedHistorySnapshotId.value,
    })
  }

  function closeHistoryMode() {
    isHistoryMode.value = false
  }

  function selectHistorySnapshot(snapshotId: string) {
    selectedHistorySnapshotId.value = snapshotId
  }

  async function restoreSelectedSnapshot() {
    if (!selectedHistorySnapshotId.value || !canRestoreSelectedSnapshot.value) {
      return
    }

    await restoreSnapshot(selectedHistorySnapshotId.value)
    selectedHistorySnapshotId.value = resolveDefaultHistorySnapshotId({
      document: currentDocument.value,
      snapshots: snapshots.value,
      currentSelectedSnapshotId: currentDocument.value?.latestSnapshotId ?? null,
    })
  }
}

function resolveSnapshotById(snapshots: DocumentSnapshot[], snapshotId: string | null) {
  if (!snapshotId) {
    return null
  }

  return snapshots.find(snapshot => snapshot.id === snapshotId) ?? null
}
