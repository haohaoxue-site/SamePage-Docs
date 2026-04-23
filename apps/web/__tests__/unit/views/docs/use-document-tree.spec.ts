import type { CreateDocumentResponse, DocumentTreeGroup, WorkspaceType } from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, shallowRef } from 'vue'
import { createDocument, getDocuments } from '@/apis/document'
import { useDocumentTree } from '@/views/docs/composables/useDocumentTree'

vi.mock('@/apis/document', () => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocuments: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

function createDocumentResponse(overrides: Partial<CreateDocumentResponse> = {}): CreateDocumentResponse {
  return {
    id: 'doc-1',
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

describe('useDocumentTree', () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('个人空间新建根文档时会提交 PRIVATE 可见性，且不显式提交空正文', async () => {
    setActivePinia(createPinia())
    const createDocumentMock = vi.mocked(createDocument)
    const getDocumentsMock = vi.mocked(getDocuments)
    const navigateToDocument = vi.fn().mockResolvedValue(true)
    const confirmNavigation = vi.fn().mockResolvedValue(true)

    createDocumentMock.mockResolvedValue(createDocumentResponse())
    getDocumentsMock.mockResolvedValue([] satisfies DocumentTreeGroup[])

    const activeDocumentId = shallowRef<string | null>(null)
    const scope = effectScope()
    const tree = scope.run(() => useDocumentTree({
      activeDocumentId: computed(() => activeDocumentId.value),
      currentWorkspaceId: computed(() => 'workspace-personal'),
      currentWorkspaceType: computed<WorkspaceType>(() => 'PERSONAL'),
      confirmNavigation,
      navigateToDocument,
    } as never))

    await tree!.createRootDocument()

    expect(createDocumentMock).toHaveBeenCalledWith({
      title: '未命名',
      workspaceId: 'workspace-personal',
      parentId: null,
      visibility: 'PRIVATE',
    })
    expect(getDocumentsMock).toHaveBeenCalledWith('workspace-personal')
    expect(navigateToDocument).toHaveBeenCalledWith('doc-1', {
      skipConfirm: true,
    })

    scope.stop()
  })

  it('支持在团队私有与团队分组下新建根文档，并带上对应可见性', async () => {
    setActivePinia(createPinia())
    const createDocumentMock = vi.mocked(createDocument)
    const getDocumentsMock = vi.mocked(getDocuments)
    const navigateToDocument = vi.fn().mockResolvedValue(true)
    const confirmNavigation = vi.fn().mockResolvedValue(true)

    createDocumentMock.mockResolvedValue(createDocumentResponse({
      id: 'team-doc-2',
    }))
    getDocumentsMock.mockResolvedValue([
      {
        id: 'team',
        nodes: [
          {
            id: 'team-doc-1',
            parentId: null,
            title: '团队根文档',
            summary: '',
            share: null,
            hasChildren: false,
            hasContent: true,
            createdAt: '2026-04-21T00:00:00.000Z',
            updatedAt: '2026-04-21T00:00:00.000Z',
            children: [],
          },
        ],
      },
    ] satisfies DocumentTreeGroup[])

    const activeDocumentId = shallowRef<string | null>('team-doc-1')
    const scope = effectScope()
    const tree = scope.run(() => useDocumentTree({
      activeDocumentId: computed(() => activeDocumentId.value),
      currentWorkspaceId: computed(() => 'workspace-team'),
      currentWorkspaceType: computed<WorkspaceType>(() => 'TEAM'),
      confirmNavigation,
      navigateToDocument,
    } as never))

    await tree!.loadTree()
    await tree!.createRootDocument(DOCUMENT_COLLECTION.PERSONAL)
    await tree!.createRootDocument(DOCUMENT_COLLECTION.TEAM)
    await tree!.createChildDocument('team-doc-1')

    expect(createDocumentMock).toHaveBeenNthCalledWith(1, {
      title: '未命名',
      workspaceId: 'workspace-team',
      parentId: null,
      visibility: 'PRIVATE',
    })
    expect(createDocumentMock).toHaveBeenNthCalledWith(2, {
      title: '未命名',
      workspaceId: 'workspace-team',
      parentId: null,
      visibility: 'WORKSPACE',
    })
    expect(createDocumentMock).toHaveBeenNthCalledWith(3, {
      title: '未命名',
      workspaceId: 'workspace-team',
      parentId: 'team-doc-1',
    })
    expect(getDocumentsMock).toHaveBeenNthCalledWith(1, 'workspace-team')

    scope.stop()
  })

  it('切换空间时会忽略旧树请求的回写结果', async () => {
    setActivePinia(createPinia())
    const getDocumentsMock = vi.mocked(getDocuments)
    const workspace1Deferred = createDeferred<DocumentTreeGroup[]>()
    const workspace2Deferred = createDeferred<DocumentTreeGroup[]>()

    getDocumentsMock.mockImplementation((workspaceId: string) =>
      workspaceId === 'workspace-1' ? workspace1Deferred.promise : workspace2Deferred.promise,
    )

    const currentWorkspaceId = shallowRef<string | null>('workspace-1')
    const scope = effectScope()
    const tree = scope.run(() => useDocumentTree({
      activeDocumentId: computed(() => null),
      currentWorkspaceId: computed(() => currentWorkspaceId.value),
      currentWorkspaceType: computed<WorkspaceType>(() => 'PERSONAL'),
      confirmNavigation: vi.fn().mockResolvedValue(true),
      navigateToDocument: vi.fn().mockResolvedValue(true),
    } as never))

    const firstLoadPromise = tree!.loadTree()
    await nextTick()

    currentWorkspaceId.value = 'workspace-2'
    const secondLoadPromise = tree!.loadTree()

    workspace2Deferred.resolve([
      {
        id: DOCUMENT_COLLECTION.PERSONAL,
        nodes: [
          {
            id: 'doc-2',
            parentId: null,
            title: '第二个空间文档',
            summary: '',
            share: null,
            hasChildren: false,
            hasContent: true,
            createdAt: '2026-04-21T00:00:00.000Z',
            updatedAt: '2026-04-21T00:00:00.000Z',
            children: [],
          },
        ],
      },
    ])
    await secondLoadPromise

    expect(tree!.treeGroups.value[0]?.nodes[0]?.id).toBe('doc-2')

    workspace1Deferred.resolve([
      {
        id: DOCUMENT_COLLECTION.PERSONAL,
        nodes: [
          {
            id: 'doc-1',
            parentId: null,
            title: '第一个空间旧文档',
            summary: '',
            share: null,
            hasChildren: false,
            hasContent: true,
            createdAt: '2026-04-20T00:00:00.000Z',
            updatedAt: '2026-04-20T00:00:00.000Z',
            children: [],
          },
        ],
      },
    ])
    await firstLoadPromise

    expect(tree!.treeGroups.value[0]?.nodes[0]?.id).toBe('doc-2')
    expect(tree!.isDocumentLoading.value).toBe(false)

    scope.stop()
  })

  it('静默刷新文档树时不切换加载态', async () => {
    setActivePinia(createPinia())
    const getDocumentsMock = vi.mocked(getDocuments)
    const treeDeferred = createDeferred<DocumentTreeGroup[]>()

    getDocumentsMock.mockReturnValue(treeDeferred.promise)

    const scope = effectScope()
    const tree = scope.run(() => useDocumentTree({
      activeDocumentId: computed(() => null),
      currentWorkspaceId: computed(() => 'workspace-personal'),
      currentWorkspaceType: computed<WorkspaceType>(() => 'PERSONAL'),
      confirmNavigation: vi.fn().mockResolvedValue(true),
      navigateToDocument: vi.fn().mockResolvedValue(true),
    } as never))

    const loadPromise = tree!.loadTree({
      silent: true,
    })
    await nextTick()

    expect(tree!.isDocumentLoading.value).toBe(false)

    treeDeferred.resolve([])
    await loadPromise

    expect(tree!.treeGroups.value).toEqual([])
    expect(tree!.isDocumentLoading.value).toBe(false)

    scope.stop()
  })
})
