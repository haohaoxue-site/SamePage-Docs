import type {
  DocumentItem,
  DocumentPaneState,
  DocumentSaveState,
  DocumentSnapshot,
  TiptapJsonContent,
} from '@haohaoxue/samepage-domain'
import type { ComputedRef } from 'vue'
import type { ActiveDocumentDetail } from '../typing'
import type {
  CreateDocumentSnapshotResponseDto,
  DocumentHeadDto,
} from '@/apis/document'
import {
  DOCUMENT_PANE_STATE,
  DOCUMENT_SAVE_STATE,
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import {
  getDocumentSaveStateLabel,
  getDocumentSnapshotSummary,
  getDocumentTitlePlainText,
  hasDocumentContent,
} from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import {
  computed,
  shallowRef,
  watch,
} from 'vue'
import {
  createDocumentSnapshot as createDocumentSnapshotRequest,
  getDocumentHead as getDocumentHeadRequest,
  getDocumentSnapshots as getDocumentSnapshotsRequest,
  restoreDocumentSnapshot as restoreDocumentSnapshotRequest,
} from '@/apis/document'
import dayjs from '@/utils/dayjs'

const AUTO_SAVE_DELAY = 1200
const UNSUPPORTED_SCHEMA_VERSION_ERROR_CODE = 'DOCUMENT_UNSUPPORTED_SCHEMA_VERSION'

type RequestError = Error & { status?: number }
type UnsupportedSchemaVersionError = Error & {
  code: typeof UNSUPPORTED_SCHEMA_VERSION_ERROR_CODE
  schemaVersion: unknown
}

/**
 * 当前文档组合参数。
 */
interface UseActiveDocumentOptions {
  activeDocumentId: ComputedRef<string | null>
  ensureExpandedPath: (documentId: string | null) => void
  patchDocumentItem: (documentId: string, input: Partial<DocumentItem>) => void
  rememberLastOpenedDocument: (documentId: string) => void
}

/**
 * 当前文档状态组合参数。
 */
interface UseActiveDocumentStateOptions {
  patchDocumentItem: (documentId: string, input: Partial<DocumentItem>) => void
}

/**
 * 当前文档保存态组合参数。
 */
interface UseActiveDocumentSaveStateOptions {
  currentDocument: ReturnType<typeof shallowRef<ActiveDocumentDetail | null>>
}

/**
 * 保存成功后的快照应用参数。
 */
interface ApplyPersistedSnapshotOptions {
  draftDocument: ActiveDocumentDetail
  requestSignature: string
  snapshotResponse: CreateDocumentSnapshotResponseDto
}

/**
 * 恢复历史版本后的状态应用参数。
 */
interface ApplyRestoredSnapshotOptions {
  documentAtRestoreStart: ActiveDocumentDetail
  snapshotResponse: CreateDocumentSnapshotResponseDto
}

export function useActiveDocument({
  activeDocumentId,
  ensureExpandedPath,
  patchDocumentItem,
  rememberLastOpenedDocument,
}: UseActiveDocumentOptions) {
  const isDocumentItemLoading = shallowRef(false)
  const isSnapshotsLoading = shallowRef(false)
  const autoSaveTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
  let persistTask: Promise<boolean> | null = null

  const state = useActiveDocumentState({
    patchDocumentItem,
  })

  function updateDocumentTitle(title: TiptapJsonContent) {
    state.updateDocumentTitle(title)
    queueAutoSave()
  }

  function updateDocumentContent(content: TiptapJsonContent) {
    state.updateDocumentContent(content)
    queueAutoSave()
  }

  async function loadCurrentDocument(id: string | null) {
    clearAutoSaveTimer()

    if (!id) {
      state.resetCurrentDocument()
      return
    }

    isDocumentItemLoading.value = true
    isSnapshotsLoading.value = true
    state.resetCurrentDocument()

    try {
      const [documentHead, loadedSnapshots] = await Promise.all([
        getDocumentHeadRequest(id),
        getDocumentSnapshotsRequest(id),
      ])
      const loadedDocument = toActiveDocument(documentHead)

      state.applyLoadedDocument(loadedDocument, loadedSnapshots)
      rememberLastOpenedDocument(id)
      ensureExpandedPath(id)
    }
    catch (error) {
      state.setDocumentErrorState(resolveDocumentErrorState(error))
    }
    finally {
      isDocumentItemLoading.value = false
      isSnapshotsLoading.value = false
    }
  }

  async function persistCurrentDocument(options: { showErrorMessage?: boolean } = {}) {
    if (!state.currentDocument.value || !state.isDirty.value) {
      return true
    }

    const draftDocument = state.currentDocument.value

    if (persistTask) {
      return persistTask
    }

    persistTask = (async () => {
      clearAutoSaveTimer()

      const requestSignature = state.createDraftSignature(draftDocument)
      state.markSaving()

      try {
        const savedDocument = await createDocumentSnapshotRequest(draftDocument.id, {
          baseRevision: draftDocument.headRevision,
          schemaVersion: draftDocument.schemaVersion,
          source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
          title: draftDocument.title,
          body: draftDocument.body,
        })

        state.applyPersistedSnapshot({
          draftDocument,
          requestSignature,
          snapshotResponse: savedDocument,
        })
        return true
      }
      catch (error) {
        if (isUnsupportedSchemaVersionError(error)) {
          state.setDocumentErrorState(DOCUMENT_PANE_STATE.UNSUPPORTED_SCHEMA)
        }

        if (state.currentDocument.value?.id === draftDocument.id) {
          state.markSaveError()
        }

        const requestError = error as RequestError
        const shouldShowErrorMessage = isUnsupportedSchemaVersionError(error)
          || requestError.status === 409
          || options.showErrorMessage

        if (shouldShowErrorMessage) {
          ElMessage.error(resolveSaveErrorMessage(error))
        }

        return false
      }
      finally {
        state.finishSaving()

        if (state.currentDocument.value?.id === draftDocument.id && state.isDirty.value) {
          queueAutoSave()
        }
      }
    })()

    return await persistTask.finally(() => {
      persistTask = null
    })
  }

  async function confirmNavigation() {
    return await persistCurrentDocument({
      showErrorMessage: true,
    })
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!state.currentDocument.value || state.currentDocument.value.latestSnapshotId === snapshotId) {
      return
    }

    const canRestore = await persistCurrentDocument({
      showErrorMessage: true,
    })

    if (!canRestore || !state.currentDocument.value) {
      return
    }

    const documentAtRestoreStart = state.currentDocument.value
    state.startRestore()

    try {
      const restoredDocument = await restoreDocumentSnapshotRequest(documentAtRestoreStart.id, {
        baseRevision: documentAtRestoreStart.headRevision,
        snapshotId,
      })

      const { isNoopRestore } = state.applyRestoredSnapshot({
        documentAtRestoreStart,
        snapshotResponse: restoredDocument,
      })

      if (isNoopRestore) {
        ElMessage.info('该历史记录已是当前内容')
      }
      else {
        ElMessage.success('已恢复到所选版本')
      }
    }
    catch (error) {
      if (isUnsupportedSchemaVersionError(error)) {
        state.setDocumentErrorState(DOCUMENT_PANE_STATE.UNSUPPORTED_SCHEMA)
      }

      state.markSaveError()
      ElMessage.error(resolveSaveErrorMessage(error))
    }
    finally {
      state.finishRestore()
    }
  }

  async function reloadCurrentDocument() {
    await loadCurrentDocument(activeDocumentId.value)
  }

  function queueAutoSave() {
    clearAutoSaveTimer()

    if (!state.currentDocument.value || !state.isDirty.value) {
      return
    }

    autoSaveTimer.value = setTimeout(() => {
      void persistCurrentDocument()
    }, AUTO_SAVE_DELAY)
  }

  function clearAutoSaveTimer() {
    if (!autoSaveTimer.value) {
      return
    }

    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }

  watch(
    activeDocumentId,
    async (nextDocumentId) => {
      await loadCurrentDocument(nextDocumentId)
    },
    { immediate: true },
  )

  return {
    currentDocument: state.currentDocument,
    snapshots: state.snapshots,
    isDocumentItemLoading,
    isSnapshotsLoading,
    isSaving: state.isSaving,
    isRestoringSnapshot: state.isRestoringSnapshot,
    saveState: state.saveState,
    saveStateLabel: state.saveStateLabel,
    documentErrorState: state.documentErrorState,
    confirmNavigation,
    reloadCurrentDocument,
    restoreSnapshot,
    updateDocumentTitle,
    updateDocumentContent,
  }
}

export function useActiveDocumentState({
  patchDocumentItem,
}: UseActiveDocumentStateOptions) {
  const currentDocument = shallowRef<ActiveDocumentDetail | null>(null)
  const snapshots = shallowRef<DocumentSnapshot[]>([])
  const isSaving = shallowRef(false)
  const isRestoringSnapshot = shallowRef(false)
  const documentErrorState = shallowRef<DocumentPaneState | null>(null)
  const save = useActiveDocumentSaveState({
    currentDocument,
  })

  function updateDocumentTitle(title: TiptapJsonContent) {
    if (!currentDocument.value) {
      return
    }

    currentDocument.value = {
      ...currentDocument.value,
      title,
    }

    save.syncSaveState()
    patchDocumentItem(currentDocument.value.id, {
      title: getDocumentTitlePlainText(title),
    })
  }

  function updateDocumentContent(content: TiptapJsonContent) {
    if (!currentDocument.value) {
      return
    }

    currentDocument.value = {
      ...currentDocument.value,
      body: content,
    }

    save.syncSaveState()
  }

  function applyLoadedDocument(document: ActiveDocumentDetail, loadedSnapshots: DocumentSnapshot[]) {
    currentDocument.value = document
    snapshots.value = loadedSnapshots
    documentErrorState.value = null
    save.captureLoadedDocument(document)
  }

  function markSaving() {
    isSaving.value = true
    save.markSaving()
  }

  function finishSaving() {
    isSaving.value = false
  }

  function markSaveError() {
    save.markSaveError()
  }

  function startRestore() {
    isRestoringSnapshot.value = true
  }

  function finishRestore() {
    isRestoringSnapshot.value = false
  }

  function applyPersistedSnapshot({
    draftDocument,
    requestSignature,
    snapshotResponse,
  }: ApplyPersistedSnapshotOptions) {
    if (currentDocument.value?.id !== draftDocument.id) {
      patchDocumentItem(draftDocument.id, buildTreePatch({
        title: draftDocument.title,
        body: draftDocument.body,
        updatedAt: snapshotResponse.snapshot.createdAt,
      }))
      return false
    }

    const activeDocument = currentDocument.value

    if (activeDocument && createDraftSignature(activeDocument) === requestSignature) {
      const nextDocument = applySnapshotToActiveDocument(draftDocument, snapshotResponse)

      currentDocument.value = nextDocument
      snapshots.value = prependSnapshot(snapshots.value, snapshotResponse.snapshot)
      save.markSaved(nextDocument, snapshotResponse.snapshot.createdAt)
      patchDocumentItem(nextDocument.id, buildTreePatch({
        title: nextDocument.title,
        body: nextDocument.body,
        updatedAt: snapshotResponse.snapshot.createdAt,
      }))
      return true
    }

    save.capturePersistedSignature(requestSignature, snapshotResponse.snapshot.createdAt)
    return false
  }

  function applyRestoredSnapshot({
    documentAtRestoreStart,
    snapshotResponse,
  }: ApplyRestoredSnapshotOptions) {
    const nextDocument = applySnapshotToActiveDocument(documentAtRestoreStart, snapshotResponse)
    const isNoopRestore = snapshotResponse.headRevision === documentAtRestoreStart.headRevision
      && snapshotResponse.snapshot.id === documentAtRestoreStart.latestSnapshotId

    currentDocument.value = nextDocument
    snapshots.value = prependSnapshot(snapshots.value, snapshotResponse.snapshot)
    save.markSaved(nextDocument, snapshotResponse.snapshot.createdAt)
    patchDocumentItem(nextDocument.id, buildTreePatch({
      title: nextDocument.title,
      body: nextDocument.body,
      updatedAt: snapshotResponse.snapshot.createdAt,
    }))

    return {
      isNoopRestore,
    }
  }

  function resetCurrentDocument() {
    currentDocument.value = null
    snapshots.value = []
    documentErrorState.value = null
    save.reset()
  }

  function setDocumentErrorState(state: DocumentPaneState) {
    currentDocument.value = null
    snapshots.value = []
    documentErrorState.value = state
    save.reset()
  }

  return {
    currentDocument,
    snapshots,
    isSaving,
    isRestoringSnapshot,
    saveState: save.saveState,
    saveStateLabel: save.saveStateLabel,
    isDirty: save.isDirty,
    documentErrorState,
    updateDocumentTitle,
    updateDocumentContent,
    applyLoadedDocument,
    markSaving,
    finishSaving,
    markSaveError,
    startRestore,
    finishRestore,
    applyPersistedSnapshot,
    applyRestoredSnapshot,
    resetCurrentDocument,
    setDocumentErrorState,
    createDraftSignature,
  }
}

export function useActiveDocumentSaveState({
  currentDocument,
}: UseActiveDocumentSaveStateOptions) {
  const saveState = shallowRef<DocumentSaveState>(DOCUMENT_SAVE_STATE.IDLE)
  const savedSignature = shallowRef('')
  const lastPersistedAt = shallowRef<string | null>(null)

  const isDirty = computed(() => {
    if (!currentDocument.value) {
      return false
    }

    return createDraftSignature(currentDocument.value) !== savedSignature.value
  })
  const lastUpdatedFromNow = computed(() =>
    lastPersistedAt.value ? dayjs(lastPersistedAt.value).fromNow() : null,
  )
  const saveStateLabel = computed(() => getDocumentSaveStateLabel({
    hasDocument: Boolean(currentDocument.value),
    saveState: saveState.value,
    lastUpdatedFromNow: lastUpdatedFromNow.value,
  }))

  function captureLoadedDocument(document: ActiveDocumentDetail) {
    savedSignature.value = createDraftSignature(document)
    lastPersistedAt.value = document.updatedAt
    saveState.value = DOCUMENT_SAVE_STATE.IDLE
  }

  function syncSaveState() {
    if (!currentDocument.value) {
      saveState.value = DOCUMENT_SAVE_STATE.IDLE
      return
    }

    saveState.value = isDirty.value ? DOCUMENT_SAVE_STATE.DIRTY : DOCUMENT_SAVE_STATE.IDLE
  }

  function markSaving() {
    saveState.value = DOCUMENT_SAVE_STATE.SAVING
  }

  function markSaved(document: ActiveDocumentDetail, persistedAt: string) {
    savedSignature.value = createDraftSignature(document)
    lastPersistedAt.value = persistedAt
    saveState.value = DOCUMENT_SAVE_STATE.SAVED
  }

  function capturePersistedSignature(signature: string, persistedAt: string) {
    savedSignature.value = signature
    lastPersistedAt.value = persistedAt
    saveState.value = DOCUMENT_SAVE_STATE.SAVING
  }

  function markSaveError() {
    saveState.value = DOCUMENT_SAVE_STATE.ERROR
  }

  function reset() {
    savedSignature.value = ''
    lastPersistedAt.value = null
    saveState.value = DOCUMENT_SAVE_STATE.IDLE
  }

  return {
    saveState,
    saveStateLabel,
    isDirty,
    captureLoadedDocument,
    syncSaveState,
    markSaving,
    markSaved,
    capturePersistedSignature,
    markSaveError,
    reset,
  }
}

export function createDraftSignature(document: Pick<ActiveDocumentDetail, 'title' | 'body'>) {
  return JSON.stringify({
    title: document.title,
    body: document.body,
  })
}

export function toActiveDocument(documentHead: DocumentHeadDto): ActiveDocumentDetail {
  assertSupportedSchemaVersion(documentHead.latestSnapshot.schemaVersion)

  return {
    ...documentHead.document,
    latestSnapshotId: documentHead.latestSnapshot.id,
    headRevision: documentHead.headRevision,
    schemaVersion: documentHead.latestSnapshot.schemaVersion,
    title: documentHead.latestSnapshot.title,
    body: documentHead.latestSnapshot.body,
  }
}

export function applySnapshotToActiveDocument(
  document: ActiveDocumentDetail,
  snapshotResponse: CreateDocumentSnapshotResponseDto,
): ActiveDocumentDetail {
  assertSupportedSchemaVersion(snapshotResponse.snapshot.schemaVersion)

  return {
    ...document,
    latestSnapshotId: snapshotResponse.snapshot.id,
    headRevision: snapshotResponse.headRevision,
    summary: getDocumentSnapshotSummary(snapshotResponse.snapshot, 120, ''),
    updatedAt: snapshotResponse.snapshot.createdAt,
    title: snapshotResponse.snapshot.title,
    body: snapshotResponse.snapshot.body,
    schemaVersion: snapshotResponse.snapshot.schemaVersion,
  }
}

export function resolveDocumentErrorState(error: unknown): DocumentPaneState {
  if (isUnsupportedSchemaVersionError(error)) {
    return DOCUMENT_PANE_STATE.UNSUPPORTED_SCHEMA
  }

  const requestError = error as RequestError

  if (requestError.status === 403) {
    return DOCUMENT_PANE_STATE.FORBIDDEN
  }

  if (requestError.status === 404) {
    return DOCUMENT_PANE_STATE.NOT_FOUND
  }

  return DOCUMENT_PANE_STATE.ERROR
}

export function resolveSaveErrorMessage(error: unknown): string {
  if (isUnsupportedSchemaVersionError(error)) {
    return '当前编辑器版本不支持这篇文档，请刷新或升级后再试'
  }

  const requestError = error as RequestError

  if (requestError.status === 409) {
    return '文档版本已变化，请刷新后重试'
  }

  return '自动保存失败，当前更改尚未保存'
}

export function isUnsupportedSchemaVersionError(error: unknown): error is UnsupportedSchemaVersionError {
  return error instanceof Error
    && (error as Partial<UnsupportedSchemaVersionError>).code === UNSUPPORTED_SCHEMA_VERSION_ERROR_CODE
}

function buildTreePatch(options: {
  title: TiptapJsonContent
  body: TiptapJsonContent
  updatedAt: string
}): Partial<DocumentItem> {
  return {
    title: getDocumentTitlePlainText(options.title),
    summary: getDocumentSnapshotSummary({
      body: options.body,
    }, 120, ''),
    updatedAt: options.updatedAt,
    hasContent: hasDocumentContent(options.body),
  }
}

function prependSnapshot(snapshots: DocumentSnapshot[], nextSnapshot: DocumentSnapshot) {
  return [
    nextSnapshot,
    ...snapshots.filter(snapshot => snapshot.id !== nextSnapshot.id),
  ]
}

function assertSupportedSchemaVersion(schemaVersion: unknown): asserts schemaVersion is typeof TIPTAP_SCHEMA_VERSION {
  if (schemaVersion === TIPTAP_SCHEMA_VERSION) {
    return
  }

  throw createUnsupportedSchemaVersionError(schemaVersion)
}

function createUnsupportedSchemaVersionError(schemaVersion: unknown): UnsupportedSchemaVersionError {
  const error = new Error(`Unsupported document schema version: ${String(schemaVersion)}`) as UnsupportedSchemaVersionError
  error.code = UNSUPPORTED_SCHEMA_VERSION_ERROR_CODE
  error.schemaVersion = schemaVersion
  return error
}
