import type {
  DocumentDetail,
  DocumentItem,
  DocumentPaneState,
  DocumentSaveState,
  DocumentTitleContent,
  TiptapJsonContent,
} from '@haohaoxue/samepage-domain'
import type { ComputedRef } from 'vue'
import type { ActiveDocumentDetail } from '../typing'
import { DOCUMENT_PANE_STATE, DOCUMENT_SAVE_STATE } from '@haohaoxue/samepage-contracts'
import {
  createDocumentTitleContent,
  getDocumentSaveStateLabel,
  getDocumentTitlePlainText,
} from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import { computed, shallowRef, watch } from 'vue'
import {
  getDocumentById as getDocumentByIdRequest,
  updateDocument as updateDocumentRequest,
} from '@/apis/document'
import { normalizeBlockIds } from '@/components/tiptap-editor/helpers/blockId'
import dayjs from '@/utils/dayjs'

const AUTO_SAVE_DELAY = 1200

type RequestError = Error & { status?: number }

/**
 * 当前文档组合参数。
 */
interface UseActiveDocumentOptions {
  activeDocumentId: ComputedRef<string | null>
  ensureExpandedPath: (documentId: string | null) => void
  patchDocumentItem: (documentId: string, input: Partial<DocumentItem>) => void
  rememberLastOpenedDocument: (documentId: string) => void
}

export function useActiveDocument({
  activeDocumentId,
  ensureExpandedPath,
  patchDocumentItem,
  rememberLastOpenedDocument,
}: UseActiveDocumentOptions) {
  const currentDocument = shallowRef<ActiveDocumentDetail | null>(null)
  const isDocumentItemLoading = shallowRef(false)
  const isSaving = shallowRef(false)
  const saveState = shallowRef<DocumentSaveState>(DOCUMENT_SAVE_STATE.IDLE)
  const savedSignature = shallowRef('')
  const lastPersistedAt = shallowRef<string | null>(null)
  const autoSaveTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
  const documentErrorState = shallowRef<DocumentPaneState | null>(null)
  let persistTask: Promise<boolean> | null = null

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

  function updateDocumentTitle(title: DocumentTitleContent) {
    if (!currentDocument.value) {
      return
    }

    currentDocument.value = {
      ...currentDocument.value,
      title,
    }

    syncSaveState()
    patchDocumentItem(currentDocument.value.id, {
      title: getDocumentTitlePlainText(title),
    })
    queueAutoSave()
  }

  function updateDocumentContent(content: TiptapJsonContent) {
    if (!currentDocument.value) {
      return
    }

    const normalizedContent = normalizeBlockIds(content)

    currentDocument.value = {
      ...currentDocument.value,
      body: normalizedContent,
    }

    syncSaveState()
    queueAutoSave()
  }

  async function loadCurrentDocument(id: string | null) {
    clearAutoSaveTimer()

    if (!id) {
      resetCurrentDocument()
      return
    }

    isDocumentItemLoading.value = true
    resetCurrentDocument()

    try {
      const loadedDocument = toActiveDocument(await getDocumentByIdRequest(id))

      currentDocument.value = loadedDocument
      savedSignature.value = createDraftSignature(loadedDocument)
      lastPersistedAt.value = loadedDocument.updatedAt
      saveState.value = DOCUMENT_SAVE_STATE.IDLE
      rememberLastOpenedDocument(id)
      ensureExpandedPath(id)
    }
    catch (error) {
      resetCurrentDocument()
      documentErrorState.value = resolveDocumentErrorState(error)
    }
    finally {
      isDocumentItemLoading.value = false
    }
  }

  async function persistCurrentDocument(options: { showErrorMessage?: boolean } = {}) {
    if (!currentDocument.value || !isDirty.value) {
      return true
    }

    const draftDocument = currentDocument.value

    if (persistTask) {
      return persistTask
    }

    persistTask = (async () => {
      clearAutoSaveTimer()

      const requestSignature = createDraftSignature(draftDocument)
      saveState.value = DOCUMENT_SAVE_STATE.SAVING
      isSaving.value = true

      try {
        const savedDocument = await updateDocumentRequest(draftDocument.id, {
          title: getDocumentTitlePlainText(draftDocument.title),
          schemaVersion: draftDocument.schemaVersion,
          content: draftDocument.body,
        })

        if (currentDocument.value?.id !== savedDocument.id) {
          patchDocumentItem(savedDocument.id, savedDocument)
          return true
        }

        const activeDocument = currentDocument.value

        if (activeDocument && createDraftSignature(activeDocument) === requestSignature) {
          const nextDocument = toActiveDocument(savedDocument)

          currentDocument.value = nextDocument
          savedSignature.value = createDraftSignature(nextDocument)
          lastPersistedAt.value = savedDocument.updatedAt
          saveState.value = DOCUMENT_SAVE_STATE.SAVED
          patchDocumentItem(savedDocument.id, savedDocument)
          return true
        }

        savedSignature.value = requestSignature
        lastPersistedAt.value = savedDocument.updatedAt
        saveState.value = DOCUMENT_SAVE_STATE.SAVING
        return true
      }
      catch {
        if (currentDocument.value?.id === draftDocument.id) {
          saveState.value = DOCUMENT_SAVE_STATE.ERROR
        }

        if (options.showErrorMessage) {
          ElMessage.error('自动保存失败，当前更改尚未保存')
        }

        return false
      }
      finally {
        isSaving.value = false

        if (currentDocument.value?.id === draftDocument.id && isDirty.value) {
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

  async function reloadCurrentDocument() {
    await loadCurrentDocument(activeDocumentId.value)
  }

  function syncSaveState() {
    if (!currentDocument.value) {
      saveState.value = DOCUMENT_SAVE_STATE.IDLE
      return
    }

    saveState.value = isDirty.value ? DOCUMENT_SAVE_STATE.DIRTY : DOCUMENT_SAVE_STATE.IDLE
  }

  function queueAutoSave() {
    clearAutoSaveTimer()

    if (!currentDocument.value || !isDirty.value) {
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

  function resetCurrentDocument() {
    currentDocument.value = null
    savedSignature.value = ''
    lastPersistedAt.value = null
    saveState.value = DOCUMENT_SAVE_STATE.IDLE
    documentErrorState.value = null
  }

  watch(
    activeDocumentId,
    async (nextDocumentId) => {
      await loadCurrentDocument(nextDocumentId)
    },
    { immediate: true },
  )

  return {
    currentDocument,
    isDocumentItemLoading,
    isSaving,
    saveState,
    saveStateLabel,
    documentErrorState,
    confirmNavigation,
    reloadCurrentDocument,
    updateDocumentTitle,
    updateDocumentContent,
  }
}

function createDraftSignature(document: Pick<ActiveDocumentDetail, 'title' | 'body'>) {
  return JSON.stringify({
    title: document.title,
    body: document.body,
  })
}

function toActiveDocument(document: DocumentDetail): ActiveDocumentDetail {
  return {
    ...document,
    title: createDocumentTitleContent(document.title),
    body: normalizeBlockIds(document.content),
  }
}

function resolveDocumentErrorState(error: unknown): DocumentPaneState {
  const requestError = error as RequestError

  if (requestError.status === 403) {
    return DOCUMENT_PANE_STATE.FORBIDDEN
  }

  if (requestError.status === 404) {
    return DOCUMENT_PANE_STATE.NOT_FOUND
  }

  return DOCUMENT_PANE_STATE.ERROR
}
