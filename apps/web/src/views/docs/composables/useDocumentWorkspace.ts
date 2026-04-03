import type { DocumentDetail, DocumentItem, DocumentSection, DocumentSectionId } from '@haohaoxue/samepage-domain'
import { DOCUMENT_SECTION_ID } from '@haohaoxue/samepage-domain'
import { useLocalStorage } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createDocument as createDocumentRequest,
  deleteDocument as deleteDocumentRequest,
  getDocumentById as getDocumentByIdRequest,
  getDocuments,
  updateDocument as updateDocumentRequest,
} from '@/apis/document'
import dayjs from '@/utils/dayjs'

const EXPANDED_DOCUMENT_STORAGE_KEY = 'samepage_docs_expanded_documents'
const LAST_OPENED_DOCUMENT_STORAGE_KEY = 'samepage_docs_last_opened_document'
const AUTO_SAVE_DELAY = 1200

const DOCUMENT_TREE_SECTION_LABELS: Record<DocumentSectionId, string> = {
  [DOCUMENT_SECTION_ID.PERSONAL]: '私有',
  [DOCUMENT_SECTION_ID.SHARED]: '共享',
  [DOCUMENT_SECTION_ID.TEAM]: '团队',
}

const DOCUMENT_SAVE_STATE = {
  Idle: 'idle',
  Dirty: 'dirty',
  Saving: 'saving',
  Saved: 'saved',
  Error: 'error',
} as const

const DOCUMENT_PANE_STATE = {
  Ready: 'ready',
  Loading: 'loading',
  Empty: 'empty',
  Unselected: 'unselected',
  NotFound: 'not-found',
  Forbidden: 'forbidden',
  Error: 'error',
} as const

type DocumentSaveState = (typeof DOCUMENT_SAVE_STATE)[keyof typeof DOCUMENT_SAVE_STATE]
type DocumentPaneState = (typeof DOCUMENT_PANE_STATE)[keyof typeof DOCUMENT_PANE_STATE]
type RequestError = Error & { status?: number }

export function useDocumentWorkspace() {
  const route = useRoute()
  const router = useRouter()
  const treeSections = ref<DocumentSection[]>([])
  const currentDocument = ref<DocumentDetail | null>(null)
  const isDocumentLoading = shallowRef(false)
  const isDocumentItemLoading = shallowRef(false)
  const isCreating = shallowRef(false)
  const isDeleting = shallowRef(false)
  const isSaving = shallowRef(false)
  const saveState = shallowRef<DocumentSaveState>(DOCUMENT_SAVE_STATE.Idle)
  const savedSignature = shallowRef('')
  const lastPersistedAt = shallowRef<string | null>(null)
  const autoSaveTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
  const expandedDocumentIds = useLocalStorage<string[]>(EXPANDED_DOCUMENT_STORAGE_KEY, [])
  const lastOpenedDocumentId = useLocalStorage<string | null>(LAST_OPENED_DOCUMENT_STORAGE_KEY, null)
  const documentErrorState = shallowRef<DocumentPaneState | null>(null)
  const isSelectingInitialDocument = shallowRef(false)
  let persistTask: Promise<boolean> | null = null

  const activeDocumentId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
  const expandedDocumentIdSet = computed(() => new Set(expandedDocumentIds.value))
  const activePath = computed(() => activeDocumentId.value ? findDocumentPath(treeSections.value, activeDocumentId.value) : null)
  const isMutatingTree = computed(() => isCreating.value || isDeleting.value)
  const defaultDocumentId = computed(() => resolvePreferredDocumentId(
    treeSections.value,
    lastOpenedDocumentId.value,
  ))
  const hasFallbackDocument = computed(() => Boolean(defaultDocumentId.value))
  const breadcrumbLabels = computed(() => {
    if (!activePath.value) {
      return ['文档']
    }

    return [
      resolveDocumentSectionLabel(activePath.value.sectionId),
      ...activePath.value.nodes.map(document => document.title),
    ]
  })

  const isDirty = computed(() => {
    if (!currentDocument.value) {
      return false
    }

    return createDraftSignature(currentDocument.value) !== savedSignature.value
  })
  const documentPaneState = computed<DocumentPaneState>(() => {
    if (currentDocument.value) {
      return DOCUMENT_PANE_STATE.Ready
    }

    if (isDocumentItemLoading.value || isDocumentLoading.value || isSelectingInitialDocument.value) {
      return DOCUMENT_PANE_STATE.Loading
    }

    if (activeDocumentId.value) {
      return documentErrorState.value ?? DOCUMENT_PANE_STATE.Error
    }

    if (hasFallbackDocument.value) {
      return DOCUMENT_PANE_STATE.Unselected
    }

    return DOCUMENT_PANE_STATE.Empty
  })
  const saveStateLabel = computed(() => {
    if (!currentDocument.value) {
      return '未选择文档'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Dirty) {
      return '未保存'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Saving) {
      return '保存中'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Saved) {
      return '已保存到云端'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Error) {
      return '保存失败，内容未保存'
    }

    if (!lastPersistedAt.value) {
      return '暂无更新记录'
    }

    return `上次更新于 ${dayjs(lastPersistedAt.value).fromNow()}`
  })

  function createDraftSignature(document: Pick<DocumentDetail, 'title' | 'content'>) {
    return JSON.stringify({
      title: document.title,
      content: document.content,
    })
  }

  function clearAutoSaveTimer() {
    if (!autoSaveTimer.value) {
      return
    }

    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
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

  async function loadTree() {
    isDocumentLoading.value = true

    try {
      treeSections.value = await getDocuments()
      ensureExpandedPath(activeDocumentId.value)

      if (activeDocumentId.value || !defaultDocumentId.value) {
        return
      }

      isSelectingInitialDocument.value = true
      await router.replace({
        name: 'docs',
        params: { id: defaultDocumentId.value },
      })
    }
    finally {
      isSelectingInitialDocument.value = false
      isDocumentLoading.value = false
    }
  }

  async function loadCurrentDocument(id: string | null) {
    clearAutoSaveTimer()

    if (!id) {
      currentDocument.value = null
      savedSignature.value = ''
      lastPersistedAt.value = null
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      documentErrorState.value = null
      return
    }

    isDocumentItemLoading.value = true
    currentDocument.value = null
    savedSignature.value = ''
    lastPersistedAt.value = null
    saveState.value = DOCUMENT_SAVE_STATE.Idle
    documentErrorState.value = null

    try {
      currentDocument.value = await getDocumentByIdRequest(id)
      savedSignature.value = createDraftSignature(currentDocument.value)
      lastPersistedAt.value = currentDocument.value.updatedAt
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      lastOpenedDocumentId.value = id
      ensureExpandedPath(id)
    }
    catch (error) {
      currentDocument.value = null
      savedSignature.value = ''
      lastPersistedAt.value = null
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      documentErrorState.value = resolveDocumentErrorState(error)
    }
    finally {
      isDocumentItemLoading.value = false
    }
  }

  function updateDocumentTitle(title: string) {
    if (!currentDocument.value) {
      return
    }

    currentDocument.value = {
      ...currentDocument.value,
      title,
    }

    syncSaveState()
    patchDocumentItem(currentDocument.value.id, {
      title,
    })
    queueAutoSave()
  }

  function updateDocumentContent(content: string) {
    if (!currentDocument.value) {
      return
    }

    currentDocument.value = {
      ...currentDocument.value,
      content,
    }

    syncSaveState()
    queueAutoSave()
  }

  async function persistCurrentDocument(options: { showErrorMessage?: boolean } = {}) {
    if (!currentDocument.value || !isDirty.value) {
      return true
    }

    const draftDocument = currentDocument.value

    if (!draftDocument) {
      return true
    }

    if (persistTask) {
      return persistTask
    }

    persistTask = (async () => {
      clearAutoSaveTimer()

      const requestSignature = createDraftSignature(draftDocument)
      saveState.value = DOCUMENT_SAVE_STATE.Saving
      isSaving.value = true

      try {
        const savedDocument = await updateDocumentRequest(draftDocument.id, {
          title: draftDocument.title,
          content: draftDocument.content,
        })

        if (currentDocument.value?.id !== savedDocument.id) {
          patchDocumentItem(savedDocument.id, savedDocument)
          return true
        }

        const activeDocument = currentDocument.value

        if (activeDocument && createDraftSignature(activeDocument) === requestSignature) {
          currentDocument.value = savedDocument
          savedSignature.value = createDraftSignature(savedDocument)
          lastPersistedAt.value = savedDocument.updatedAt
          saveState.value = DOCUMENT_SAVE_STATE.Saved
          patchDocumentItem(savedDocument.id, savedDocument)
          return true
        }

        savedSignature.value = requestSignature
        lastPersistedAt.value = savedDocument.updatedAt
        saveState.value = DOCUMENT_SAVE_STATE.Saving
        return true
      }
      catch {
        if (currentDocument.value?.id === draftDocument.id) {
          saveState.value = DOCUMENT_SAVE_STATE.Error
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

    const result = await persistTask.finally(() => {
      persistTask = null
    })

    return result
  }

  async function createRootDocument() {
    await createDocument(null)
  }

  async function createChildDocument(parentDocumentId = currentDocument.value?.id ?? null) {
    if (!parentDocumentId) {
      return
    }

    const parentPath = findDocumentPath(treeSections.value, parentDocumentId)

    if (!parentPath || parentPath.sectionId !== 'personal') {
      return
    }

    await createDocument(parentDocumentId)
  }

  async function deleteDocument(documentId: string) {
    const targetPath = findDocumentPath(treeSections.value, documentId)
    const targetDocument = targetPath?.nodes.at(-1)

    if (!targetPath || !targetDocument || targetPath.sectionId !== 'personal') {
      return
    }

    const confirmed = await ElMessageBox.confirm(
      `将删除「${targetDocument.title}」及其所有子文档，此操作不可恢复。`,
      '删除文档',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    ).then(() => true).catch(() => false)

    if (!confirmed) {
      return
    }

    const deletedDocumentIds = collectDocumentItemIds([targetDocument])
    const nextDocumentId = resolveNextDocumentIdAfterDelete(
      treeSections.value,
      documentId,
      activeDocumentId.value,
    )

    isDeleting.value = true

    try {
      await deleteDocumentRequest(documentId)
      expandedDocumentIds.value = expandedDocumentIds.value.filter(id => !deletedDocumentIds.has(id))
      await loadTree()

      if (activeDocumentId.value && deletedDocumentIds.has(activeDocumentId.value)) {
        await router.push(nextDocumentId
          ? {
              name: 'docs',
              params: { id: nextDocumentId },
            }
          : {
              name: 'docs',
            })
      }

      ElMessage.success('文档已删除')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '删除文档失败')
    }
    finally {
      isDeleting.value = false
    }
  }

  function syncSaveState() {
    if (!currentDocument.value) {
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      return
    }

    saveState.value = isDirty.value ? DOCUMENT_SAVE_STATE.Dirty : DOCUMENT_SAVE_STATE.Idle
  }

  async function confirmNavigation() {
    return await persistCurrentDocument({
      showErrorMessage: true,
    })
  }

  async function navigateToDocument(documentId: string, options: { replace?: boolean } = {}) {
    if (documentId === activeDocumentId.value) {
      return true
    }

    const canNavigate = await confirmNavigation()

    if (!canNavigate) {
      return false
    }

    await router[options.replace ? 'replace' : 'push']({
      name: 'docs',
      params: { id: documentId },
    })

    return true
  }

  async function openDocument(documentId: string) {
    await navigateToDocument(documentId)
  }

  async function openDefaultDocument(options: { replace?: boolean } = {}) {
    if (!defaultDocumentId.value) {
      return
    }

    await navigateToDocument(defaultDocumentId.value, options)
  }

  async function reloadCurrentDocument() {
    await loadCurrentDocument(activeDocumentId.value)
  }

  async function createDocument(parentId: string | null) {
    const canNavigate = await confirmNavigation()

    if (!canNavigate) {
      return
    }

    isCreating.value = true

    try {
      const createdDocument = await createDocumentRequest({
        title: '未命名',
        content: '',
        parentId,
      })
      await loadTree()
      await navigateToDocument(createdDocument.id)
    }
    finally {
      isCreating.value = false
    }
  }

  function toggleDocument(documentId: string) {
    const nextExpandedIds = new Set(expandedDocumentIds.value)

    if (nextExpandedIds.has(documentId)) {
      nextExpandedIds.delete(documentId)
    }
    else {
      nextExpandedIds.add(documentId)
    }

    expandedDocumentIds.value = Array.from(nextExpandedIds)
  }

  function ensureExpandedPath(documentId: string | null) {
    if (!documentId) {
      return
    }

    const path = findDocumentPath(treeSections.value, documentId)

    if (!path) {
      return
    }

    const nextExpandedIds = new Set(expandedDocumentIds.value)

    for (const document of path.nodes) {
      nextExpandedIds.add(document.id)
    }

    expandedDocumentIds.value = Array.from(nextExpandedIds)
  }

  function patchDocumentItem(documentId: string, input: Partial<DocumentItem>) {
    treeSections.value = treeSections.value.map(section => ({
      ...section,
      nodes: updateDocumentBranch(section.nodes, documentId, input),
    }))
  }

  watch(
    activeDocumentId,
    async (nextDocumentId) => {
      await loadCurrentDocument(nextDocumentId)
    },
    { immediate: true },
  )

  void loadTree()

  return {
    treeSections,
    currentDocument,
    activeDocumentId,
    breadcrumbLabels,
    expandedDocumentIdSet,
    isDocumentLoading,
    isDocumentItemLoading,
    isSaving,
    isCreating,
    isMutatingTree,
    documentPaneState,
    hasFallbackDocument,
    saveState,
    saveStateLabel,
    confirmNavigation,
    openDocument,
    openDefaultDocument,
    reloadCurrentDocument,
    toggleDocument,
    createRootDocument,
    createChildDocument,
    deleteDocument,
    updateDocumentTitle,
    updateDocumentContent,
  }
}

function collectDocumentItemIds(items: DocumentItem[]): Set<string> {
  const documentIds = new Set<string>()

  for (const item of items) {
    documentIds.add(item.id)

    for (const childId of collectDocumentItemIds(item.children)) {
      documentIds.add(childId)
    }
  }

  return documentIds
}

function updateDocumentBranch(
  items: DocumentItem[],
  targetDocumentId: string,
  input: Partial<DocumentItem>,
): DocumentItem[] {
  return items.map((item) => {
    if (item.id === targetDocumentId) {
      return {
        ...item,
        ...input,
      }
    }

    return {
      ...item,
      children: updateDocumentBranch(item.children, targetDocumentId, input),
    }
  })
}

function findDocumentPath(
  sections: DocumentSection[],
  targetDocumentId: string,
): {
  sectionId: DocumentSectionId
  sectionLabel: string
  nodes: DocumentItem[]
} | null {
  for (const section of sections) {
    const items = findDocumentItems(section.nodes, targetDocumentId)

    if (items) {
      return {
        sectionId: section.id,
        sectionLabel: section.label,
        nodes: items,
      }
    }
  }

  return null
}

function findFirstAvailableDocumentId(
  items: DocumentItem[],
  deletedDocumentIds: Set<string>,
): string | null {
  for (const item of items) {
    if (!deletedDocumentIds.has(item.id)) {
      return item.id
    }

    const childDocumentId = findFirstAvailableDocumentId(item.children, deletedDocumentIds)

    if (childDocumentId) {
      return childDocumentId
    }
  }

  return null
}

function resolveNextDocumentIdAfterDelete(
  sections: DocumentSection[],
  deletedDocumentId: string,
  currentActiveDocumentId: string | null,
): string | null {
  const targetPath = findDocumentPath(sections, deletedDocumentId)
  const targetDocument = targetPath?.nodes.at(-1)

  if (!targetDocument) {
    return currentActiveDocumentId
  }

  const deletedDocumentIds = collectDocumentItemIds([targetDocument])

  if (!currentActiveDocumentId || !deletedDocumentIds.has(currentActiveDocumentId)) {
    return currentActiveDocumentId
  }

  if (targetDocument.parentId) {
    return targetDocument.parentId
  }

  return findFirstAvailableDocumentId(
    sections.flatMap(section => section.nodes),
    deletedDocumentIds,
  )
}

function resolveDocumentSectionLabel(sectionId: DocumentSectionId) {
  return DOCUMENT_TREE_SECTION_LABELS[sectionId]
}

function resolveDocumentErrorState(error: unknown): DocumentPaneState {
  const requestError = error as RequestError

  if (requestError.status === 403) {
    return DOCUMENT_PANE_STATE.Forbidden
  }

  if (requestError.status === 404) {
    return DOCUMENT_PANE_STATE.NotFound
  }

  return DOCUMENT_PANE_STATE.Error
}

function resolvePreferredDocumentId(
  sections: DocumentSection[],
  preferredDocumentId: string | null,
): string | null {
  if (preferredDocumentId && findDocumentPath(sections, preferredDocumentId)) {
    return preferredDocumentId
  }

  return findFirstAvailableDocumentId(
    sections.flatMap(section => section.nodes),
    new Set<string>(),
  )
}

function findDocumentItems(items: DocumentItem[], targetDocumentId: string): DocumentItem[] | null {
  for (const item of items) {
    if (item.id === targetDocumentId) {
      return [item]
    }

    const nestedItems = findDocumentItems(item.children, targetDocumentId)

    if (nestedItems) {
      return [item, ...nestedItems]
    }
  }

  return null
}
