import type { DocumentItem, DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import type { ComputedRef } from 'vue'
import { DOCUMENT_COLLECTION, TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
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
} from '../utils/document-tree'

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

export function useDocumentTree({
  activeDocumentId,
  confirmNavigation,
  navigateToDocument,
}: UseDocumentTreeOptions) {
  const treeGroups = shallowRef<DocumentTreeGroup[]>([])
  const isDocumentLoading = shallowRef(false)
  const isCreating = shallowRef(false)
  const isDeleting = shallowRef(false)
  const expandedDocumentIds = useLocalStorage<string[]>(EXPANDED_DOCUMENT_STORAGE_KEY, [])
  const lastOpenedDocumentId = useLocalStorage<string | null>(LAST_OPENED_DOCUMENT_STORAGE_KEY, null)

  const expandedDocumentIdSet = computed(() => new Set(expandedDocumentIds.value))
  const activePath = computed(() => activeDocumentId.value ? findDocumentPath(treeGroups.value, activeDocumentId.value) : null)
  const isMutatingTree = computed(() => isCreating.value || isDeleting.value)
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

  async function loadTree() {
    isDocumentLoading.value = true

    try {
      treeGroups.value = await getDocuments()
      ensureExpandedPath(activeDocumentId.value)
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

    const parentPath = findDocumentPath(treeGroups.value, parentDocumentId)

    if (!parentPath || parentPath.collectionId !== DOCUMENT_COLLECTION.PERSONAL) {
      return
    }

    await createDocument(parentDocumentId)
  }

  async function deleteDocument(documentId: string) {
    const targetPath = findDocumentPath(treeGroups.value, documentId)
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
      treeGroups.value,
      documentId,
      activeDocumentId.value,
    )

    isDeleting.value = true

    try {
      await deleteDocumentRequest(documentId)
      expandedDocumentIds.value = expandedDocumentIds.value.filter(id => !deletedDocumentIds.has(id))
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

  function patchDocumentItem(documentId: string, input: Partial<DocumentItem>) {
    treeGroups.value = treeGroups.value.map(group => ({
      ...group,
      nodes: updateDocumentBranch(group.nodes, documentId, input),
    }))
  }

  function rememberLastOpenedDocument(documentId: string) {
    lastOpenedDocumentId.value = documentId
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
        schemaVersion: TIPTAP_SCHEMA_VERSION,
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
    treeGroups,
    breadcrumbLabels,
    expandedDocumentIdSet,
    isDocumentLoading,
    isCreating,
    isMutatingTree,
    defaultDocumentId,
    hasFallbackDocument,
    loadTree,
    toggleDocument,
    ensureExpandedPath,
    patchDocumentItem,
    rememberLastOpenedDocument,
    createRootDocument,
    createChildDocument,
    deleteDocument,
  }
}
