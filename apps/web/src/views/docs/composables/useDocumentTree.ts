import type {
  DocumentItem,
  DocumentTreeGroup,
} from '@haohaoxue/samepage-domain'
import type { ComputedRef } from 'vue'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { formatDocumentCollectionLabel } from '@haohaoxue/samepage-shared'
import { useLocalStorage } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, shallowRef } from 'vue'
import {
  createDocument as createDocumentRequest,
  deleteDocument as deleteDocumentRequest,
  getDocuments,
} from '@/apis/document'
import {
  collectDocumentItemIds,
  findDocumentPath,
  resolveNextDocumentIdAfterDelete,
  resolvePreferredDocumentId,
  updateDocumentBranch,
} from '../utils/documentTree'

const EXPANDED_DOCUMENT_STORAGE_KEY = 'samepage_docs_expanded_documents'
const LAST_OPENED_DOCUMENT_STORAGE_KEY = 'samepage_docs_last_opened_document'

/**
 * 文档跳转选项。
 */
interface NavigateToDocumentOptions {
  replace?: boolean
  skipConfirm?: boolean
}

/**
 * 文档树组合参数。
 */
interface UseDocumentTreeOptions {
  activeDocumentId: ComputedRef<string | null>
  confirmNavigation: () => Promise<boolean>
  navigateToDocument: (documentId: string | null, options?: NavigateToDocumentOptions) => Promise<boolean>
}

/**
 * 文档树状态组合参数。
 */
interface UseDocumentTreeStateOptions {
  activeDocumentId: ComputedRef<string | null>
}

export function useDocumentTree({
  activeDocumentId,
  confirmNavigation,
  navigateToDocument,
}: UseDocumentTreeOptions) {
  const isDocumentLoading = shallowRef(false)
  const isCreating = shallowRef(false)
  const isDeleting = shallowRef(false)
  const state = useDocumentTreeState({
    activeDocumentId,
  })

  const isMutatingTree = computed(() => isCreating.value || isDeleting.value)

  async function loadTree() {
    isDocumentLoading.value = true

    try {
      state.applyLoadedTree(await getDocuments())
    }
    finally {
      isDocumentLoading.value = false
    }
  }

  async function createRootDocument() {
    await createDocument(null)
  }

  async function createChildDocument(parentDocumentId = activeDocumentId.value) {
    if (!parentDocumentId) {
      return
    }

    const parentPath = findDocumentPath(state.treeGroups.value, parentDocumentId)

    if (!parentPath || parentPath.collectionId !== DOCUMENT_COLLECTION.PERSONAL) {
      return
    }

    await createDocument(parentDocumentId)
  }

  async function deleteDocument(documentId: string) {
    const targetPath = findDocumentPath(state.treeGroups.value, documentId)
    const targetDocument = targetPath?.nodes.at(-1)

    if (!targetPath || !targetDocument || targetPath.collectionId !== DOCUMENT_COLLECTION.PERSONAL) {
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
      state.treeGroups.value,
      documentId,
      activeDocumentId.value,
    )

    isDeleting.value = true

    try {
      await deleteDocumentRequest(documentId)
      state.pruneExpandedDocumentIds(deletedDocumentIds)
      await loadTree()

      if (activeDocumentId.value && deletedDocumentIds.has(activeDocumentId.value)) {
        await navigateToDocument(nextDocumentId, {
          skipConfirm: true,
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

  async function createDocument(parentId: string | null) {
    const canNavigate = await confirmNavigation()

    if (!canNavigate) {
      return
    }

    isCreating.value = true

    try {
      const createdDocument = await createDocumentRequest({
        title: '未命名',
        parentId,
      })
      await loadTree()
      await navigateToDocument(createdDocument.id, {
        skipConfirm: true,
      })
    }
    finally {
      isCreating.value = false
    }
  }

  return {
    treeGroups: state.treeGroups,
    activeCollectionId: state.activeCollectionId,
    breadcrumbLabels: state.breadcrumbLabels,
    expandedDocumentIdSet: state.expandedDocumentIdSet,
    isDocumentLoading,
    isCreating,
    isMutatingTree,
    defaultDocumentId: state.defaultDocumentId,
    hasFallbackDocument: state.hasFallbackDocument,
    loadTree,
    toggleDocument: state.toggleDocument,
    ensureExpandedPath: state.ensureExpandedPath,
    patchDocumentItem: state.patchDocumentItem,
    rememberLastOpenedDocument: state.rememberLastOpenedDocument,
    createRootDocument,
    createChildDocument,
    deleteDocument,
  }
}

export function useDocumentTreeState({
  activeDocumentId,
}: UseDocumentTreeStateOptions) {
  const treeGroups = shallowRef<DocumentTreeGroup[]>([])
  const expandedDocumentIds = useLocalStorage<string[]>(EXPANDED_DOCUMENT_STORAGE_KEY, [])
  const lastOpenedDocumentId = useLocalStorage<string | null>(LAST_OPENED_DOCUMENT_STORAGE_KEY, null)

  const expandedDocumentIdSet = computed(() => new Set(expandedDocumentIds.value))
  const activePath = computed(() => activeDocumentId.value ? findDocumentPath(treeGroups.value, activeDocumentId.value) : null)
  const activeCollectionId = computed(() => activePath.value?.collectionId ?? null)
  const defaultDocumentId = computed(() => resolvePreferredDocumentId(
    treeGroups.value,
    lastOpenedDocumentId.value,
  ))
  const hasFallbackDocument = computed(() => Boolean(defaultDocumentId.value))
  const breadcrumbLabels = computed(() => {
    if (!activePath.value) {
      return ['文档']
    }

    return [
      formatDocumentCollectionLabel(activePath.value.collectionId),
      ...activePath.value.nodes.map(document => document.title),
    ]
  })

  function applyLoadedTree(groups: DocumentTreeGroup[]) {
    treeGroups.value = groups
    ensureExpandedPath(activeDocumentId.value)
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

    const path = findDocumentPath(treeGroups.value, documentId)

    if (!path) {
      return
    }

    const nextExpandedIds = new Set(expandedDocumentIds.value)

    for (const document of path.nodes) {
      nextExpandedIds.add(document.id)
    }

    expandedDocumentIds.value = Array.from(nextExpandedIds)
  }

  function pruneExpandedDocumentIds(documentIds: Set<string>) {
    expandedDocumentIds.value = expandedDocumentIds.value.filter(id => !documentIds.has(id))
  }

  function patchDocumentItem(documentId: string, input: Partial<DocumentItem>) {
    treeGroups.value = treeGroups.value.map(group => ({
      ...group,
      nodes: updateDocumentBranch(group.nodes, documentId, input),
    }))
  }

  function rememberLastOpenedDocument(documentId: string) {
    lastOpenedDocumentId.value = documentId
  }

  return {
    treeGroups,
    activeCollectionId,
    breadcrumbLabels,
    expandedDocumentIdSet,
    defaultDocumentId,
    hasFallbackDocument,
    applyLoadedTree,
    toggleDocument,
    ensureExpandedPath,
    pruneExpandedDocumentIds,
    patchDocumentItem,
    rememberLastOpenedDocument,
  }
}
