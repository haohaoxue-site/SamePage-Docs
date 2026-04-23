import type { DocumentHead, DocumentShareAccess } from '@haohaoxue/samepage-domain'
import { TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { useSharedDocs } from '@/views/shared-docs/composables/useSharedDocs'

const routeMocks = vi.hoisted(() => ({
  route: {
    name: 'shared-docs',
    params: {
      shareId: 'share-1' as string | undefined,
      recipientId: undefined as string | undefined,
    },
  },
  replace: vi.fn(),
}))

const apiMocks = vi.hoisted(() => ({
  getDocumentShareAccess: vi.fn(),
  acceptDocumentShare: vi.fn(),
  declineDocumentShare: vi.fn(),
  getSharedDocumentHead: vi.fn(),
  resolveSharedDocumentAssets: vi.fn(),
  getDocumentShareRecipientAccess: vi.fn(),
  acceptDocumentShareRecipient: vi.fn(),
  declineDocumentShareRecipient: vi.fn(),
  getSharedRecipientDocumentHead: vi.fn(),
  resolveSharedRecipientDocumentAssets: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMocks.route,
  useRouter: () => ({
    replace: routeMocks.replace,
  }),
}))

vi.mock('@/apis/document-share', () => ({
  getDocumentShareAccess: apiMocks.getDocumentShareAccess,
  acceptDocumentShare: apiMocks.acceptDocumentShare,
  declineDocumentShare: apiMocks.declineDocumentShare,
  getSharedDocumentHead: apiMocks.getSharedDocumentHead,
  resolveSharedDocumentAssets: apiMocks.resolveSharedDocumentAssets,
  getDocumentShareRecipientAccess: apiMocks.getDocumentShareRecipientAccess,
  acceptDocumentShareRecipient: apiMocks.acceptDocumentShareRecipient,
  declineDocumentShareRecipient: apiMocks.declineDocumentShareRecipient,
  getSharedRecipientDocumentHead: apiMocks.getSharedRecipientDocumentHead,
  resolveSharedRecipientDocumentAssets: apiMocks.resolveSharedRecipientDocumentAssets,
}))

function createShareAccess(overrides: Partial<DocumentShareAccess> = {}): DocumentShareAccess {
  return {
    accessSource: 'PUBLIC_SHARE',
    permission: 'VIEW',
    authorizationRootDocumentId: 'doc-1',
    authorizationShareId: 'share-1',
    authorizationRecipientId: null,
    entryShareId: 'share-1',
    entryRecipientId: null,
    canEditTree: false,
    share: {
      id: 'share-1',
      documentId: 'doc-1',
      mode: 'PUBLIC_TO_LOGGED_IN',
      permission: 'VIEW',
      status: 'ACTIVE',
      createdAt: '2026-04-21T00:00:00.000Z',
      createdBy: 'user-1',
      createdByUser: {
        id: 'user-1',
        displayName: '分享发起人',
        avatarUrl: null,
      },
      updatedAt: '2026-04-21T00:00:00.000Z',
      updatedBy: 'user-1',
      updatedByUser: {
        id: 'user-1',
        displayName: '分享发起人',
        avatarUrl: null,
      },
    },
    recipient: null,
    recipientStatus: 'PENDING',
    sharedByUser: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: '分享发起人',
      avatarUrl: null,
      userCode: 'SP-OWNER01',
    },
    documentId: 'doc-1',
    documentTitle: '公开分享文档',
    workspaceName: '我的空间',
    workspaceType: 'PERSONAL',
    ...overrides,
  }
}

function createDocumentHead(): DocumentHead {
  return {
    document: {
      id: 'doc-1',
      workspaceId: 'workspace-personal-1',
      createdBy: 'user-1',
      visibility: 'PRIVATE',
      parentId: null,
      latestSnapshotId: 'snapshot-1',
      order: 0,
      status: 'ACTIVE',
      share: null,
      summary: '摘要',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    },
    latestSnapshot: {
      id: 'snapshot-1',
      documentId: 'doc-1',
      revision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      title: createDocumentTitleContent('公开分享文档'),
      body: [],
      source: 'autosave',
      restoredFromSnapshotId: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      createdBy: 'user-1',
      createdByUser: {
        id: 'user-1',
        displayName: '分享发起人',
        avatarUrl: null,
      },
    },
    headRevision: 1,
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

async function flushSharedDocsState() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useSharedDocs', () => {
  beforeEach(() => {
    routeMocks.route = reactive({
      name: 'shared-docs',
      params: {
        shareId: 'share-1',
        recipientId: undefined,
      },
    })
    routeMocks.replace.mockReset()
    apiMocks.getDocumentShareAccess.mockReset()
    apiMocks.acceptDocumentShare.mockReset()
    apiMocks.declineDocumentShare.mockReset()
    apiMocks.getSharedDocumentHead.mockReset()
    apiMocks.resolveSharedDocumentAssets.mockReset()
    apiMocks.getDocumentShareRecipientAccess.mockReset()
    apiMocks.acceptDocumentShareRecipient.mockReset()
    apiMocks.declineDocumentShareRecipient.mockReset()
    apiMocks.getSharedRecipientDocumentHead.mockReset()
    apiMocks.resolveSharedRecipientDocumentAssets.mockReset()
    apiMocks.resolveSharedDocumentAssets.mockResolvedValue({
      assets: [],
      unresolvedAssetIds: [],
    })
    apiMocks.resolveSharedRecipientDocumentAssets.mockResolvedValue({
      assets: [],
      unresolvedAssetIds: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('待接收共享只进入确认态，不提前拉正文', async () => {
    apiMocks.getDocumentShareAccess.mockResolvedValue(createShareAccess())

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('confirm')
    expect(apiMocks.getSharedDocumentHead).not.toHaveBeenCalled()

    scope.stop()
  })

  it('已接收 public 共享保持 public share 入口并加载正文', async () => {
    apiMocks.getDocumentShareAccess.mockResolvedValue(createShareAccess({
      recipientStatus: 'ACTIVE',
      recipient: {
        id: 'recipient-1',
        documentShareId: 'share-1',
        recipientUserId: 'viewer-1',
        permission: 'VIEW',
        status: 'ACTIVE',
        createdAt: '2026-04-21T00:00:00.000Z',
        createdBy: 'user-1',
        createdByUser: {
          id: 'user-1',
          displayName: '分享发起人',
          avatarUrl: null,
        },
        updatedAt: '2026-04-21T00:00:00.000Z',
        updatedBy: 'user-1',
        updatedByUser: {
          id: 'user-1',
          displayName: '分享发起人',
          avatarUrl: null,
        },
      },
    }))
    apiMocks.getSharedDocumentHead.mockResolvedValue(createDocumentHead())

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await flushSharedDocsState()

    expect(routeMocks.replace).not.toHaveBeenCalled()
    expect(apiMocks.getSharedDocumentHead).toHaveBeenCalledWith('share-1', 'doc-1')
    expect(sharedDocs?.surfaceState.value).toBe('reader')

    scope.stop()
  })

  it('acceptShare 在确认后会切到阅读态', async () => {
    apiMocks.getDocumentShareAccess.mockResolvedValue(createShareAccess())
    apiMocks.acceptDocumentShare.mockResolvedValue(createShareAccess({
      recipientStatus: 'ACTIVE',
    }))
    apiMocks.getSharedDocumentHead.mockResolvedValue(createDocumentHead())

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await flushSharedDocsState()
    await sharedDocs?.acceptShare()
    await flushSharedDocsState()

    expect(apiMocks.acceptDocumentShare).toHaveBeenCalledWith('share-1')
    expect(sharedDocs?.surfaceState.value).toBe('reader')
    expect(sharedDocs?.document.value?.title).toEqual(createDocumentTitleContent('公开分享文档'))

    scope.stop()
  })

  it('共享暂时不可用时会进入 invalid 态并展示临时不可用文案', async () => {
    const error = Object.assign(new Error('该共享暂时不可用'), {
      status: 404,
    })
    apiMocks.getDocumentShareAccess.mockRejectedValue(error)

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('invalid')
    expect(sharedDocs?.errorMessage.value).toBe('该共享暂时不可用')

    scope.stop()
  })

  it('切换分享入口时会忽略旧 access 请求的回写结果', async () => {
    const share1AccessDeferred = createDeferred<DocumentShareAccess>()
    const share2AccessDeferred = createDeferred<DocumentShareAccess>()

    apiMocks.getDocumentShareAccess.mockImplementation((shareId: string) =>
      shareId === 'share-1' ? share1AccessDeferred.promise : share2AccessDeferred.promise,
    )

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await nextTick()

    routeMocks.route.params.shareId = 'share-2'
    await nextTick()

    share2AccessDeferred.resolve(createShareAccess({
      documentTitle: '第二个共享文档',
      share: {
        ...createShareAccess().share,
        id: 'share-2',
      },
    }))
    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('confirm')
    expect(sharedDocs?.access.value?.share.id).toBe('share-2')
    expect(sharedDocs?.access.value?.documentTitle).toBe('第二个共享文档')

    share1AccessDeferred.resolve(createShareAccess({
      documentTitle: '第一个共享文档',
      share: {
        ...createShareAccess().share,
        id: 'share-1',
      },
    }))
    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('confirm')
    expect(sharedDocs?.access.value?.share.id).toBe('share-2')
    expect(sharedDocs?.access.value?.documentTitle).toBe('第二个共享文档')

    scope.stop()
  })

  it('路由切换后会忽略旧正文请求的回写结果', async () => {
    routeMocks.route = reactive({
      name: 'shared-docs-recipient',
      params: {
        shareId: undefined,
        recipientId: 'recipient-1',
      },
    })

    const recipient1DocumentDeferred = createDeferred<DocumentHead>()
    const recipient2DocumentDeferred = createDeferred<DocumentHead>()

    apiMocks.getDocumentShareRecipientAccess.mockImplementation((recipientId: string) =>
      Promise.resolve(createShareAccess({
        recipientStatus: 'ACTIVE',
        recipient: {
          id: recipientId,
          documentShareId: `share-${recipientId}`,
          recipientUserId: 'viewer-1',
          permission: 'VIEW',
          status: 'ACTIVE',
          createdAt: '2026-04-21T00:00:00.000Z',
          createdBy: 'user-1',
          createdByUser: {
            id: 'user-1',
            displayName: '分享发起人',
            avatarUrl: null,
          },
          updatedAt: '2026-04-21T00:00:00.000Z',
          updatedBy: 'user-1',
          updatedByUser: {
            id: 'user-1',
            displayName: '分享发起人',
            avatarUrl: null,
          },
        },
        documentTitle: recipientId === 'recipient-1' ? '第一篇共享文档' : '第二篇共享文档',
      })),
    )
    apiMocks.getSharedRecipientDocumentHead.mockImplementation((recipientId: string) =>
      recipientId === 'recipient-1' ? recipient1DocumentDeferred.promise : recipient2DocumentDeferred.promise,
    )

    const scope = effectScope()
    const sharedDocs = scope.run(() => useSharedDocs())

    await flushSharedDocsState()

    routeMocks.route.params.recipientId = 'recipient-2'
    await flushSharedDocsState()

    recipient2DocumentDeferred.resolve(createDocumentHead())
    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('reader')
    expect(sharedDocs?.document.value?.id).toBe('doc-1')

    recipient1DocumentDeferred.resolve({
      ...createDocumentHead(),
      document: {
        ...createDocumentHead().document,
        id: 'doc-stale',
      },
      latestSnapshot: {
        ...createDocumentHead().latestSnapshot,
        documentId: 'doc-stale',
        title: createDocumentTitleContent('旧正文'),
      },
    })
    await flushSharedDocsState()

    expect(sharedDocs?.surfaceState.value).toBe('reader')
    expect(sharedDocs?.document.value?.id).toBe('doc-1')
    expect(sharedDocs?.document.value?.title).toEqual(createDocumentTitleContent('公开分享文档'))

    scope.stop()
  })
})
