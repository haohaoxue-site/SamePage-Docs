import type { DocumentShareProjection, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type {
  CreateDocumentSnapshotResponse,
  DocumentHead,
  DocumentSnapshot,
} from '@/apis/document'
import {
  DOCUMENT_PANE_STATE,
  DOCUMENT_SAVE_STATE,
  DOCUMENT_SHARE_MODE,
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, shallowRef } from 'vue'
import {
  createDocumentSnapshot,
  getDocumentHead,
  getDocumentSnapshots,
  restoreDocumentSnapshot,
} from '@/apis/document'
import { useActiveDocument } from '@/views/docs/composables/useActiveDocument'

vi.mock('@/apis/document', () => ({
  createDocumentSnapshot: vi.fn(),
  getDocumentHead: vi.fn(),
  getDocumentSnapshots: vi.fn(),
  restoreDocumentSnapshot: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout

function createBodyContent(text: string): TiptapJsonContent {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ]
}

function createDocumentHead(overrides: Partial<DocumentHead> = {}): DocumentHead {
  return {
    document: {
      id: 'doc-1',
      workspaceId: 'workspace-personal',
      createdBy: 'user-1',
      visibility: 'PRIVATE',
      parentId: null,
      latestSnapshotId: 'snapshot-1',
      order: 0,
      status: 'ACTIVE',
      share: null,
      summary: '测试摘要',
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    },
    latestSnapshot: {
      id: 'snapshot-1',
      documentId: 'doc-1',
      revision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      title: createDocumentTitleContent('原始标题'),
      body: createBodyContent('初始正文'),
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      restoredFromSnapshotId: null,
      createdAt: '2026-04-14T00:00:00.000Z',
      createdBy: null,
      createdByUser: null,
    },
    headRevision: 1,
    ...overrides,
  }
}

function createSnapshotResponse(
  overrides: Partial<CreateDocumentSnapshotResponse> = {},
): CreateDocumentSnapshotResponse {
  return {
    snapshot: {
      id: 'snapshot-2',
      documentId: 'doc-1',
      revision: 2,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      title: createDocumentTitleContent('新的标题'),
      body: createBodyContent('保存后的正文'),
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      restoredFromSnapshotId: null,
      createdAt: '2026-04-14T00:00:01.000Z',
      createdBy: null,
      createdByUser: null,
    },
    headRevision: 2,
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  return {
    id: 'snapshot-1',
    documentId: 'doc-1',
    revision: 1,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('原始标题'),
    body: createBodyContent('初始正文'),
    source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
    restoredFromSnapshotId: null,
    createdAt: '2026-04-14T00:00:00.000Z',
    createdBy: null,
    createdByUser: null,
    ...overrides,
  }
}

function createPublicShareProjection(): DocumentShareProjection {
  return {
    localPolicy: {
      mode: DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN,
      shareId: 'share-public-1',
      directUserCount: 0,
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
    effectivePolicy: {
      mode: DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN,
      shareId: 'share-public-1',
      rootDocumentId: 'doc-1',
      rootDocumentTitle: '原始标题',
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
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

async function flushActiveDocumentState() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useActiveDocument', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  })

  it('把文档页 owner state 收口为 DocumentHead，并在保存时走 createDocumentSnapshot + baseRevision', async () => {
    vi.useFakeTimers()

    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const createDocumentSnapshotMock = vi.mocked(createDocumentSnapshot)
    const initialBody = createBodyContent('初始正文')
    const nextBody = createBodyContent('保存后的正文')
    const nextTitle = createDocumentTitleContent('新的标题')

    getDocumentHeadMock.mockResolvedValue(createDocumentHead({
      latestSnapshot: {
        id: 'snapshot-1',
        documentId: 'doc-1',
        revision: 1,
        schemaVersion: TIPTAP_SCHEMA_VERSION,
        title: createDocumentTitleContent('原始标题'),
        body: initialBody,
        source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
        restoredFromSnapshotId: null,
        createdAt: '2026-04-14T00:00:00.000Z',
        createdBy: null,
        createdByUser: null,
      },
      headRevision: 1,
    }))
    getDocumentSnapshotsMock.mockResolvedValue([
      createSnapshot(),
    ])
    createDocumentSnapshotMock.mockResolvedValue(createSnapshotResponse({
      snapshot: {
        id: 'snapshot-2',
        documentId: 'doc-1',
        revision: 2,
        schemaVersion: TIPTAP_SCHEMA_VERSION,
        title: nextTitle,
        body: nextBody,
        source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
        restoredFromSnapshotId: null,
        createdAt: '2026-04-14T00:00:01.000Z',
        createdBy: null,
        createdByUser: null,
      },
      headRevision: 2,
    }))

    const activeDocumentId = shallowRef('doc-1')
    const patchDocumentItem = vi.fn()
    const rememberLastOpenedDocument = vi.fn()
    const ensureExpandedPath = vi.fn()
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath,
      patchDocumentItem,
      rememberLastOpenedDocument,
    }))

    expect(activeDocument).toBeTruthy()

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.currentDocument.value).not.toBeNull()
    })

    expect(getDocumentHeadMock).toHaveBeenCalledWith('doc-1', {
      recordVisit: true,
    })
    expect(documentState.currentDocument.value?.title).toEqual(createDocumentTitleContent('原始标题'))
    expectDocumentBody(documentState.currentDocument.value?.body, '初始正文')
    expect(documentState.snapshots.value).toHaveLength(1)

    documentState.updateDocumentTitle(nextTitle)
    documentState.updateDocumentContent(nextBody)

    expect(patchDocumentItem).toHaveBeenLastCalledWith('doc-1', {
      title: '新的标题',
    })
    expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.DIRTY)

    await vi.advanceTimersByTimeAsync(1200)

    await vi.waitFor(() => {
      expect(createDocumentSnapshotMock).toHaveBeenCalledWith('doc-1', {
        baseRevision: 1,
        schemaVersion: TIPTAP_SCHEMA_VERSION,
        source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
        title: nextTitle,
        body: nextBody,
      })
    })

    await vi.waitFor(() => {
      expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.SAVED)
    })

    expect(documentState.currentDocument.value?.title).toEqual(nextTitle)
    expectDocumentBody(documentState.currentDocument.value?.body, '保存后的正文')
    expect(documentState.currentDocument.value?.headRevision).toBe(2)
    expect(documentState.snapshots.value.map(snapshot => snapshot.id)).toEqual(['snapshot-2', 'snapshot-1'])

    scope.stop()
  })

  it('patchDocumentShare 只更新当前文档分享投影，不影响编辑保存状态', async () => {
    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const share = createPublicShareProjection()

    getDocumentHeadMock.mockResolvedValue(createDocumentHead())
    getDocumentSnapshotsMock.mockResolvedValue([])

    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => 'doc-1'),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem: vi.fn(),
      rememberLastOpenedDocument: vi.fn(),
    }))

    await flushActiveDocumentState()

    const saveStateBeforePatch = activeDocument?.saveState.value
    activeDocument?.patchDocumentShare('other-doc', share)
    expect(activeDocument?.currentDocument.value?.share).toBeNull()

    activeDocument?.patchDocumentShare('doc-1', share)
    expect(activeDocument?.currentDocument.value?.share).toEqual(share)
    expect(activeDocument?.saveState.value).toBe(saveStateBeforePatch)

    scope.stop()
  })

  it('保存冲突时进入错误态并给出明确提示', async () => {
    vi.useFakeTimers()

    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const createDocumentSnapshotMock = vi.mocked(createDocumentSnapshot)

    getDocumentHeadMock.mockResolvedValue(createDocumentHead())
    getDocumentSnapshotsMock.mockResolvedValue([createSnapshot()])
    createDocumentSnapshotMock.mockRejectedValue(Object.assign(new Error('conflict'), {
      status: 409,
    }))

    const activeDocumentId = shallowRef('doc-1')
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem: vi.fn(),
      rememberLastOpenedDocument: vi.fn(),
    }))

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.currentDocument.value).not.toBeNull()
    })

    documentState.updateDocumentContent(createBodyContent('发生冲突的正文'))
    await vi.advanceTimersByTimeAsync(1200)

    await vi.waitFor(() => {
      expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.ERROR)
    })

    const { ElMessage } = await import('element-plus')
    expect(ElMessage.error).toHaveBeenCalledWith('文档版本已变化，请刷新后重试')

    scope.stop()
  })

  it('restore 后刷新当前 head 并更新 headRevision', async () => {
    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const restoreDocumentSnapshotMock = vi.mocked(restoreDocumentSnapshot)

    getDocumentHeadMock.mockResolvedValue(createDocumentHead())
    getDocumentSnapshotsMock.mockResolvedValue([
      createSnapshot(),
      createSnapshot({
        id: 'snapshot-0',
        revision: 0,
        title: createDocumentTitleContent('更早版本'),
        body: createBodyContent('更早正文'),
        createdAt: '2026-04-13T23:59:00.000Z',
      }),
    ])
    restoreDocumentSnapshotMock.mockResolvedValue(createSnapshotResponse({
      snapshot: {
        id: 'snapshot-2',
        documentId: 'doc-1',
        revision: 2,
        schemaVersion: TIPTAP_SCHEMA_VERSION,
        title: createDocumentTitleContent('更早版本'),
        body: createBodyContent('更早正文'),
        source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
        restoredFromSnapshotId: 'snapshot-0',
        createdAt: '2026-04-14T00:00:02.000Z',
        createdBy: null,
        createdByUser: null,
      },
      headRevision: 2,
    }))

    const activeDocumentId = shallowRef('doc-1')
    const patchDocumentItem = vi.fn()
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem,
      rememberLastOpenedDocument: vi.fn(),
    }))

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.currentDocument.value).not.toBeNull()
    })

    await documentState.restoreSnapshot('snapshot-0')

    expect(restoreDocumentSnapshotMock).toHaveBeenCalledWith('doc-1', {
      baseRevision: 1,
      snapshotId: 'snapshot-0',
    })
    expect(documentState.currentDocument.value?.headRevision).toBe(2)
    expect(documentState.currentDocument.value?.latestSnapshotId).toBe('snapshot-2')
    expect(documentState.currentDocument.value?.title).toEqual(createDocumentTitleContent('更早版本'))
    expectDocumentBody(documentState.currentDocument.value?.body, '更早正文')
    expect(documentState.snapshots.value.map(snapshot => snapshot.id)).toEqual(['snapshot-2', 'snapshot-1', 'snapshot-0'])
    expect(patchDocumentItem).toHaveBeenCalledWith('doc-1', expect.objectContaining({
      title: '更早版本',
    }))

    scope.stop()
  })

  it('restore 到当前内容时不追加历史并给出明确提示', async () => {
    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const restoreDocumentSnapshotMock = vi.mocked(restoreDocumentSnapshot)

    getDocumentHeadMock.mockResolvedValue(createDocumentHead())
    getDocumentSnapshotsMock.mockResolvedValue([
      createSnapshot(),
      createSnapshot({
        id: 'snapshot-0',
        revision: 0,
        title: createDocumentTitleContent('原始标题'),
        body: createBodyContent('初始正文'),
        createdAt: '2026-04-13T23:59:00.000Z',
      }),
    ])
    restoreDocumentSnapshotMock.mockResolvedValue(createSnapshotResponse({
      snapshot: {
        ...createSnapshot(),
        id: 'snapshot-1',
      },
      headRevision: 1,
    }))

    const activeDocumentId = shallowRef('doc-1')
    const patchDocumentItem = vi.fn()
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem,
      rememberLastOpenedDocument: vi.fn(),
    }))

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.currentDocument.value).not.toBeNull()
    })

    await documentState.restoreSnapshot('snapshot-0')

    const { ElMessage } = await import('element-plus')

    expect(documentState.currentDocument.value?.headRevision).toBe(1)
    expect(documentState.snapshots.value.map(snapshot => snapshot.id)).toEqual(['snapshot-1', 'snapshot-0'])
    expect(patchDocumentItem).toHaveBeenCalledWith('doc-1', expect.objectContaining({
      title: '原始标题',
    }))
    expect(ElMessage.info).toHaveBeenCalledWith('该历史记录已是当前内容')

    scope.stop()
  })

  it('加载到非兼容 schema 时阻断编辑并标记为不支持状态', async () => {
    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)

    getDocumentHeadMock.mockResolvedValue(createDocumentHead({
      latestSnapshot: {
        ...createDocumentHead().latestSnapshot,
        schemaVersion: 999 as never,
      },
    }))
    getDocumentSnapshotsMock.mockResolvedValue([createSnapshot()])

    const activeDocumentId = shallowRef('doc-1')
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem: vi.fn(),
      rememberLastOpenedDocument: vi.fn(),
    }))

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.documentErrorState.value).toBe(DOCUMENT_PANE_STATE.UNSUPPORTED_SCHEMA)
    })

    expect(documentState.currentDocument.value).toBeNull()
    expect(documentState.snapshots.value).toEqual([])

    scope.stop()
  })

  it('切换文档时会忽略旧请求的回写结果', async () => {
    const getDocumentHeadMock = vi.mocked(getDocumentHead)
    const getDocumentSnapshotsMock = vi.mocked(getDocumentSnapshots)
    const doc1HeadDeferred = createDeferred<DocumentHead>()
    const doc2HeadDeferred = createDeferred<DocumentHead>()
    const doc1SnapshotsDeferred = createDeferred<DocumentSnapshot[]>()
    const doc2SnapshotsDeferred = createDeferred<DocumentSnapshot[]>()

    getDocumentHeadMock.mockImplementation((documentId: string) =>
      documentId === 'doc-1' ? doc1HeadDeferred.promise : doc2HeadDeferred.promise,
    )
    getDocumentSnapshotsMock.mockImplementation((documentId: string) =>
      documentId === 'doc-1' ? doc1SnapshotsDeferred.promise : doc2SnapshotsDeferred.promise,
    )

    const activeDocumentId = shallowRef('doc-1')
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath: vi.fn(),
      patchDocumentItem: vi.fn(),
      rememberLastOpenedDocument: vi.fn(),
    }))

    await nextTick()

    activeDocumentId.value = 'doc-2'
    await nextTick()

    doc2HeadDeferred.resolve(createDocumentHead({
      document: {
        ...createDocumentHead().document,
        id: 'doc-2',
      },
      latestSnapshot: {
        ...createDocumentHead().latestSnapshot,
        documentId: 'doc-2',
        title: createDocumentTitleContent('第二篇文档'),
        body: createBodyContent('第二篇正文'),
      },
    }))
    doc2SnapshotsDeferred.resolve([
      createSnapshot({
        id: 'snapshot-2',
        documentId: 'doc-2',
        title: createDocumentTitleContent('第二篇文档'),
        body: createBodyContent('第二篇正文'),
      }),
    ])
    await flushActiveDocumentState()

    expect(activeDocument?.currentDocument.value?.id).toBe('doc-2')
    expect(activeDocument?.currentDocument.value?.title).toEqual(createDocumentTitleContent('第二篇文档'))

    doc1HeadDeferred.resolve(createDocumentHead({
      document: {
        ...createDocumentHead().document,
        id: 'doc-1',
      },
      latestSnapshot: {
        ...createDocumentHead().latestSnapshot,
        documentId: 'doc-1',
        title: createDocumentTitleContent('第一篇旧文档'),
        body: createBodyContent('第一篇旧正文'),
      },
    }))
    doc1SnapshotsDeferred.resolve([
      createSnapshot({
        id: 'snapshot-1',
        documentId: 'doc-1',
        title: createDocumentTitleContent('第一篇旧文档'),
        body: createBodyContent('第一篇旧正文'),
      }),
    ])
    await flushActiveDocumentState()

    expect(activeDocument?.currentDocument.value?.id).toBe('doc-2')
    expect(activeDocument?.currentDocument.value?.title).toEqual(createDocumentTitleContent('第二篇文档'))

    scope.stop()
  })
})

function expectDocumentBody(body: TiptapJsonContent | undefined, text: string) {
  expect(body).toEqual([
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ])
}
