import type { DocumentNodeDetail, DocumentTreeNode, DocumentTreeSection, DocumentTreeSectionId } from '@haohaoxue/samepage-domain'
import { useLocalStorage } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createDocumentNode,
  deleteDocumentNode,
  getDocumentNodeById,
  getDocumentTree,
  saveDocumentNode,
} from '@/apis/document'
import dayjs from '@/utils/dayjs'

const EXPANDED_NODE_STORAGE_KEY = 'samepage_docs_expanded_nodes'
const AUTO_SAVE_DELAY = 1200
const DOCUMENT_TREE_SECTION_LABELS: Record<DocumentTreeSectionId, string> = {
  personal: '私有',
  shared: '共享',
  team: '团队',
}

const DOCUMENT_SAVE_STATE = {
  Idle: 'idle',
  Saving: 'saving',
  Saved: 'saved',
  Error: 'error',
} as const

type DocumentSaveState = (typeof DOCUMENT_SAVE_STATE)[keyof typeof DOCUMENT_SAVE_STATE]

export function useDocumentWorkspace() {
  const route = useRoute()
  const router = useRouter()
  const treeSections = ref<DocumentTreeSection[]>([])
  const currentDocument = ref<DocumentNodeDetail | null>(null)
  const isTreeLoading = shallowRef(false)
  const isDocumentLoading = shallowRef(false)
  const isCreating = shallowRef(false)
  const isDeleting = shallowRef(false)
  const isSaving = shallowRef(false)
  const saveState = shallowRef<DocumentSaveState>(DOCUMENT_SAVE_STATE.Idle)
  const savedSignature = shallowRef('')
  const lastPersistedAt = shallowRef<string | null>(null)
  const autoSaveTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
  const expandedNodeIds = useLocalStorage<string[]>(EXPANDED_NODE_STORAGE_KEY, [])

  const activeNodeId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
  const expandedNodeIdSet = computed(() => new Set(expandedNodeIds.value))
  const activePath = computed(() => activeNodeId.value ? findNodePath(treeSections.value, activeNodeId.value) : null)
  const isMutatingTree = computed(() => isCreating.value || isDeleting.value)
  const breadcrumbLabels = computed(() => {
    if (!activePath.value) {
      return ['文档']
    }

    return [
      resolveDocumentTreeSectionLabel(activePath.value.sectionId),
      ...activePath.value.nodes.map(node => node.title),
    ]
  })

  const isDirty = computed(() => {
    if (!currentDocument.value) {
      return false
    }

    return createDraftSignature(currentDocument.value) !== savedSignature.value
  })
  const saveStateLabel = computed(() => {
    if (!currentDocument.value) {
      return '未选择文档'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Saving) {
      return '保存中'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Saved) {
      return '已保存到云端'
    }

    if (saveState.value === DOCUMENT_SAVE_STATE.Error) {
      return '保存到云端失败'
    }

    if (!lastPersistedAt.value) {
      return '暂无更新记录'
    }

    return `上次更新于 ${dayjs(lastPersistedAt.value).fromNow()}`
  })

  function createDraftSignature(document: Pick<DocumentNodeDetail, 'title' | 'content'>) {
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
    isTreeLoading.value = true

    try {
      treeSections.value = await getDocumentTree()
      ensureExpandedPath(activeNodeId.value)
    }
    finally {
      isTreeLoading.value = false
    }
  }

  async function loadCurrentDocument(id: string | null) {
    clearAutoSaveTimer()

    if (!id) {
      currentDocument.value = null
      savedSignature.value = ''
      lastPersistedAt.value = null
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      return
    }

    isDocumentLoading.value = true

    try {
      currentDocument.value = await getDocumentNodeById(id)
      savedSignature.value = createDraftSignature(currentDocument.value)
      lastPersistedAt.value = currentDocument.value.updatedAt
      saveState.value = DOCUMENT_SAVE_STATE.Idle
      ensureExpandedPath(id)
    }
    catch {
      currentDocument.value = null
      savedSignature.value = ''
      lastPersistedAt.value = null
      saveState.value = DOCUMENT_SAVE_STATE.Idle
    }
    finally {
      isDocumentLoading.value = false
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
    patchTreeNode(currentDocument.value.id, {
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
    if (!currentDocument.value || !isDirty.value || isSaving.value) {
      return
    }

    clearAutoSaveTimer()

    const draftDocument = currentDocument.value
    const requestSignature = createDraftSignature(draftDocument)
    saveState.value = DOCUMENT_SAVE_STATE.Saving
    isSaving.value = true

    try {
      const savedDocument = await saveDocumentNode(draftDocument.id, {
        title: draftDocument.title,
        content: draftDocument.content,
      })

      if (currentDocument.value?.id !== savedDocument.id) {
        patchTreeNode(savedDocument.id, savedDocument)
        return
      }

      if (createDraftSignature(currentDocument.value) === requestSignature) {
        currentDocument.value = savedDocument
        savedSignature.value = createDraftSignature(savedDocument)
        lastPersistedAt.value = savedDocument.updatedAt
        saveState.value = DOCUMENT_SAVE_STATE.Saved
        patchTreeNode(savedDocument.id, savedDocument)
        return
      }

      savedSignature.value = requestSignature
      lastPersistedAt.value = savedDocument.updatedAt
      saveState.value = DOCUMENT_SAVE_STATE.Saving
    }
    catch {
      if (currentDocument.value?.id === draftDocument.id) {
        saveState.value = DOCUMENT_SAVE_STATE.Error
      }

      if (options.showErrorMessage) {
        ElMessage.error('自动保存失败')
      }
    }
    finally {
      isSaving.value = false

      if (currentDocument.value?.id === draftDocument.id && isDirty.value) {
        queueAutoSave()
      }
    }
  }

  async function createRootNode() {
    await createNode(null)
  }

  async function createChildNode(parentNodeId = currentDocument.value?.id ?? null) {
    if (!parentNodeId) {
      return
    }

    const parentPath = findNodePath(treeSections.value, parentNodeId)

    if (!parentPath || parentPath.sectionId !== 'personal') {
      return
    }

    await createNode(parentNodeId)
  }

  async function deleteNode(nodeId: string) {
    const targetPath = findNodePath(treeSections.value, nodeId)
    const targetNode = targetPath?.nodes.at(-1)

    if (!targetPath || !targetNode || targetPath.sectionId !== 'personal') {
      return
    }

    const confirmed = await ElMessageBox.confirm(
      `将删除「${targetNode.title}」及其所有子文档，此操作不可恢复。`,
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

    const deletedNodeIds = collectTreeNodeIds([targetNode])
    const nextNodeId = resolveNextNodeIdAfterDelete(
      treeSections.value,
      nodeId,
      activeNodeId.value,
    )

    isDeleting.value = true

    try {
      await deleteDocumentNode(nodeId)
      expandedNodeIds.value = expandedNodeIds.value.filter(id => !deletedNodeIds.has(id))
      await loadTree()

      if (activeNodeId.value && deletedNodeIds.has(activeNodeId.value)) {
        await router.push(nextNodeId
          ? {
              name: 'docs',
              params: { id: nextNodeId },
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

    saveState.value = isDirty.value ? DOCUMENT_SAVE_STATE.Saving : DOCUMENT_SAVE_STATE.Idle
  }

  function openNode(nodeId: string) {
    router.push({
      name: 'docs',
      params: { id: nodeId },
    })
  }

  async function createNode(parentId: string | null) {
    isCreating.value = true

    try {
      const createdNode = await createDocumentNode({
        title: '未命名',
        content: '',
        parentId,
      })
      await loadTree()
      await router.push({
        name: 'docs',
        params: { id: createdNode.id },
      })
    }
    finally {
      isCreating.value = false
    }
  }

  function toggleNode(nodeId: string) {
    const nextExpandedIds = new Set(expandedNodeIds.value)

    if (nextExpandedIds.has(nodeId)) {
      nextExpandedIds.delete(nodeId)
    }
    else {
      nextExpandedIds.add(nodeId)
    }

    expandedNodeIds.value = Array.from(nextExpandedIds)
  }

  function ensureExpandedPath(nodeId: string | null) {
    if (!nodeId) {
      return
    }

    const path = findNodePath(treeSections.value, nodeId)

    if (!path) {
      return
    }

    const nextExpandedIds = new Set(expandedNodeIds.value)

    for (const node of path.nodes) {
      nextExpandedIds.add(node.id)
    }

    expandedNodeIds.value = Array.from(nextExpandedIds)
  }

  function patchTreeNode(nodeId: string, input: Partial<DocumentTreeNode>) {
    treeSections.value = treeSections.value.map(section => ({
      ...section,
      nodes: updateTreeBranch(section.nodes, nodeId, input),
    }))
  }

  watch(
    activeNodeId,
    async (nextNodeId, previousNodeId) => {
      if (previousNodeId && currentDocument.value?.id === previousNodeId && isDirty.value) {
        await persistCurrentDocument({
          showErrorMessage: true,
        })
      }

      await loadCurrentDocument(nextNodeId)
    },
    { immediate: true },
  )

  void loadTree()

  return {
    treeSections,
    currentDocument,
    activeNodeId,
    breadcrumbLabels,
    expandedNodeIdSet,
    isTreeLoading,
    isDocumentLoading,
    isSaving,
    isCreating,
    isMutatingTree,
    saveState,
    saveStateLabel,
    openNode,
    toggleNode,
    createRootNode,
    createChildNode,
    deleteNode,
    updateDocumentTitle,
    updateDocumentContent,
  }
}

function collectTreeNodeIds(nodes: DocumentTreeNode[]): Set<string> {
  const nodeIds = new Set<string>()

  for (const node of nodes) {
    nodeIds.add(node.id)

    for (const childId of collectTreeNodeIds(node.children)) {
      nodeIds.add(childId)
    }
  }

  return nodeIds
}

function updateTreeBranch(
  nodes: DocumentTreeNode[],
  targetNodeId: string,
  input: Partial<DocumentTreeNode>,
): DocumentTreeNode[] {
  return nodes.map((node) => {
    if (node.id === targetNodeId) {
      return {
        ...node,
        ...input,
      }
    }

    return {
      ...node,
      children: updateTreeBranch(node.children, targetNodeId, input),
    }
  })
}

function findNodePath(
  sections: DocumentTreeSection[],
  targetNodeId: string,
): {
  sectionId: DocumentTreeSectionId
  sectionLabel: string
  nodes: DocumentTreeNode[]
} | null {
  for (const section of sections) {
    const nodes = findNodes(section.nodes, targetNodeId)

    if (nodes) {
      return {
        sectionId: section.id,
        sectionLabel: section.label,
        nodes,
      }
    }
  }

  return null
}

function findFirstAvailableNodeId(
  nodes: DocumentTreeNode[],
  deletedNodeIds: Set<string>,
): string | null {
  for (const node of nodes) {
    if (!deletedNodeIds.has(node.id)) {
      return node.id
    }

    const childNodeId = findFirstAvailableNodeId(node.children, deletedNodeIds)

    if (childNodeId) {
      return childNodeId
    }
  }

  return null
}

function resolveNextNodeIdAfterDelete(
  sections: DocumentTreeSection[],
  deletedNodeId: string,
  currentActiveNodeId: string | null,
): string | null {
  const targetPath = findNodePath(sections, deletedNodeId)
  const targetNode = targetPath?.nodes.at(-1)

  if (!targetNode) {
    return currentActiveNodeId
  }

  const deletedNodeIds = collectTreeNodeIds([targetNode])

  if (!currentActiveNodeId || !deletedNodeIds.has(currentActiveNodeId)) {
    return currentActiveNodeId
  }

  if (targetNode.parentId) {
    return targetNode.parentId
  }

  return findFirstAvailableNodeId(
    sections.flatMap(section => section.nodes),
    deletedNodeIds,
  )
}

function resolveDocumentTreeSectionLabel(sectionId: DocumentTreeSectionId) {
  return DOCUMENT_TREE_SECTION_LABELS[sectionId]
}

function findNodes(nodes: DocumentTreeNode[], targetNodeId: string): DocumentTreeNode[] | null {
  for (const node of nodes) {
    if (node.id === targetNodeId) {
      return [node]
    }

    const nestedNodes = findNodes(node.children, targetNodeId)

    if (nestedNodes) {
      return [node, ...nestedNodes]
    }
  }

  return null
}
