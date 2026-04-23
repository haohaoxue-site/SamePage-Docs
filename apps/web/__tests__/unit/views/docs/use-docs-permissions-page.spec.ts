import type { DocumentShareProjection } from '@haohaoxue/samepage-domain'
import type { DocumentHead } from '@/apis/document'
import { DOCUMENT_SHARE_MODE } from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { ElMessage, ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
import { useDocsPermissionsPage } from '@/views/docs/composables/useDocsPermissionsPage'

const routeMocks = vi.hoisted(() => ({
  route: {
    params: {
      id: 'doc-1',
    },
  },
}))

const apiMocks = vi.hoisted(() => ({
  getDocumentPublicShare: vi.fn(),
  enableDocumentPublicShare: vi.fn(),
  revokeDocumentPublicShare: vi.fn(),
  getDocumentDirectShares: vi.fn(),
  createDocumentDirectShare: vi.fn(),
  revokeDocumentDirectShare: vi.fn(),
  setDocumentNoSharePolicy: vi.fn(),
  restoreDocumentShareInheritance: vi.fn(),
}))

const documentApiMocks = vi.hoisted(() => ({
  getDocumentHead: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMocks.route,
}))

vi.mock('@/apis/document-share', () => ({
  getDocumentPublicShare: apiMocks.getDocumentPublicShare,
  enableDocumentPublicShare: apiMocks.enableDocumentPublicShare,
  revokeDocumentPublicShare: apiMocks.revokeDocumentPublicShare,
  getDocumentDirectShares: apiMocks.getDocumentDirectShares,
  createDocumentDirectShare: apiMocks.createDocumentDirectShare,
  revokeDocumentDirectShare: apiMocks.revokeDocumentDirectShare,
  setDocumentNoSharePolicy: apiMocks.setDocumentNoSharePolicy,
  restoreDocumentShareInheritance: apiMocks.restoreDocumentShareInheritance,
}))

vi.mock('@/apis/document', () => ({
  getDocumentHead: documentApiMocks.getDocumentHead,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')

  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  }
})

function createPublicShareInfo(overrides: Partial<{
  share: null | {
    id: string
    link: string
  }
}> = {}) {
  return {
    share: {
      id: 'share-1',
      documentId: 'doc-1',
      mode: 'PUBLIC_TO_LOGGED_IN' as const,
      permission: 'VIEW' as const,
      status: 'ACTIVE' as const,
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
      link: '/shared/share-1',
    },
    ...overrides,
  }
}

function createDirectShareItem(overrides: Partial<{
  id: string
  link: string
  status: 'PENDING' | 'ACTIVE'
  documentId: string
  title: string
}> = {}) {
  return {
    recipient: {
      id: overrides.id ?? 'recipient-1',
      documentShareId: 'share-direct-1',
      recipientUserId: 'viewer-1',
      permission: 'VIEW' as const,
      status: overrides.status ?? 'PENDING',
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
    recipientUser: {
      id: 'viewer-1',
      email: 'viewer@example.com',
      displayName: '目标用户',
      avatarUrl: null,
      userCode: 'SP-VIEWER1',
    },
    sharedByUser: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: '分享发起人',
      avatarUrl: null,
      userCode: 'SP-OWNER01',
    },
    share: {
      id: 'share-direct-1',
      documentId: 'doc-1',
      mode: 'DIRECT_USER' as const,
      permission: 'VIEW' as const,
      status: 'ACTIVE' as const,
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
    documentId: overrides.documentId ?? 'doc-1',
    documentTitle: overrides.title ?? '测试文档',
    workspaceName: '我的空间',
    workspaceType: 'PERSONAL' as const,
    link: overrides.link ?? '/shared/recipients/recipient-1',
  }
}

function createDocumentHead(
  documentId = 'doc-1',
  title = '测试文档',
  share: DocumentHead['document']['share'] = null,
): DocumentHead {
  return {
    document: {
      id: documentId,
      workspaceId: 'workspace-personal-1',
      createdBy: 'user-1',
      visibility: 'PRIVATE',
      parentId: null,
      latestSnapshotId: `snapshot-${documentId}`,
      order: 0,
      status: 'ACTIVE',
      share,
      summary: '',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    },
    latestSnapshot: {
      id: `snapshot-${documentId}`,
      documentId,
      revision: 1,
      schemaVersion: 1,
      title: createDocumentTitleContent(title),
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

function createNoShareProjection(): DocumentShareProjection {
  return {
    localPolicy: {
      shareId: 'share-none-1',
      mode: DOCUMENT_SHARE_MODE.NONE,
      directUserCount: 0,
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
    effectivePolicy: {
      shareId: 'share-none-1',
      mode: DOCUMENT_SHARE_MODE.NONE,
      rootDocumentId: 'doc-1',
      rootDocumentTitle: '测试文档',
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

async function flushPermissionsState() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useDocsPermissionsPage', () => {
  beforeEach(() => {
    routeMocks.route.params.id = 'doc-1'
    apiMocks.getDocumentPublicShare.mockReset()
    apiMocks.enableDocumentPublicShare.mockReset()
    apiMocks.revokeDocumentPublicShare.mockReset()
    apiMocks.getDocumentDirectShares.mockReset()
    apiMocks.createDocumentDirectShare.mockReset()
    apiMocks.revokeDocumentDirectShare.mockReset()
    apiMocks.setDocumentNoSharePolicy.mockReset()
    apiMocks.restoreDocumentShareInheritance.mockReset()
    documentApiMocks.getDocumentHead.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
    vi.mocked(ElMessageBox.confirm).mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof ElMessageBox.confirm>>,
    )
    apiMocks.getDocumentPublicShare.mockResolvedValue({
      share: null,
    })
    apiMocks.getDocumentDirectShares.mockResolvedValue([])
    apiMocks.setDocumentNoSharePolicy.mockResolvedValue(null)
    apiMocks.restoreDocumentShareInheritance.mockResolvedValue(null)
    documentApiMocks.getDocumentHead.mockResolvedValue(createDocumentHead())
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('开启公开分享后会刷新当前分享信息', async () => {
    apiMocks.enableDocumentPublicShare.mockResolvedValue(createPublicShareInfo())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.enablePublicShare()

    expect(apiMocks.enableDocumentPublicShare).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: false,
    })
    expect(page?.publicShareInfo.value?.share?.id).toBe('share-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已开启公开链接')

    scope.stop()
  })

  it('撤销公开分享后会把当前分享信息清空', async () => {
    apiMocks.getDocumentPublicShare.mockResolvedValue(createPublicShareInfo())
    apiMocks.revokeDocumentPublicShare.mockResolvedValue(null)

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.revokePublicShare()

    expect(apiMocks.revokeDocumentPublicShare).toHaveBeenCalledWith('doc-1')
    expect(page?.publicShareInfo.value).toEqual({
      share: null,
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已关闭本页公开链接')

    scope.stop()
  })

  it('复制链接时会把完整链接写入剪贴板', async () => {
    apiMocks.getDocumentPublicShare.mockResolvedValue(createPublicShareInfo())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.copyPublicShareLink()

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/shared/share-1')
    expect(ElMessage.success).toHaveBeenCalledWith('公开链接已复制')

    scope.stop()
  })

  it('createDirectShare 成功后会把新共享插入当前定向共享列表', async () => {
    apiMocks.createDocumentDirectShare.mockResolvedValue(createDirectShareItem())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    page?.handleDirectShareResolved({
      id: 'viewer-1',
      email: 'viewer@example.com',
      displayName: '目标用户',
      avatarUrl: null,
      userCode: 'SP-VIEWER1',
    })
    await page?.createDirectShare()

    expect(apiMocks.createDocumentDirectShare).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: false,
      userCode: 'SP-VIEWER1',
    })
    expect(page?.directShareItems.value[0]?.recipient.id).toBe('recipient-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已分享给 目标用户')

    scope.stop()
  })

  it('copyDirectShareLink 会复制定向共享的完整链接', async () => {
    apiMocks.getDocumentDirectShares.mockResolvedValue([createDirectShareItem()])

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    const directShareItem = page?.directShareItems.value[0]

    expect(directShareItem).toBeTruthy()

    if (!directShareItem) {
      scope.stop()
      return
    }

    await page?.copyDirectShareLink(directShareItem)

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/shared/recipients/recipient-1')
    expect(ElMessage.success).toHaveBeenCalledWith('分享链接已复制')

    scope.stop()
  })

  it('revokeDirectShare 成功后会把该目标用户从列表移除', async () => {
    apiMocks.getDocumentDirectShares.mockResolvedValue([
      createDirectShareItem(),
    ])
    apiMocks.revokeDocumentDirectShare.mockResolvedValue(null)

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    const directShareItem = page?.directShareItems.value[0]

    expect(directShareItem).toBeTruthy()

    if (!directShareItem) {
      scope.stop()
      return
    }

    await page?.revokeDirectShare(directShareItem)

    expect(apiMocks.revokeDocumentDirectShare).toHaveBeenCalledWith('doc-1', 'recipient-1')
    expect(page?.directShareItems.value).toEqual([])
    expect(ElMessage.success).toHaveBeenCalledWith('已取消对 目标用户 的分享')

    scope.stop()
  })

  it('切到公开链接时只切换当前页面本地策略，不再逐个撤销指定成员共享', async () => {
    apiMocks.getDocumentDirectShares.mockResolvedValue([createDirectShareItem()])
    apiMocks.enableDocumentPublicShare.mockResolvedValue(createPublicShareInfo())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.enablePublicShare()

    expect(apiMocks.revokeDocumentDirectShare).not.toHaveBeenCalled()
    expect(apiMocks.enableDocumentPublicShare).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: false,
    })
    expect(page?.directShareItems.value).toEqual([])
    expect(page?.publicShareInfo.value?.share?.id).toBe('share-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已开启公开链接')

    scope.stop()
  })

  it('创建指定成员共享时只切换当前页面本地策略，不再主动关闭公开链接', async () => {
    apiMocks.getDocumentPublicShare.mockResolvedValue(createPublicShareInfo())
    apiMocks.createDocumentDirectShare.mockResolvedValue(createDirectShareItem())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    page?.handleDirectShareResolved({
      id: 'viewer-1',
      email: 'viewer@example.com',
      displayName: '目标用户',
      avatarUrl: null,
      userCode: 'SP-VIEWER1',
    })
    await page?.createDirectShare()

    expect(apiMocks.revokeDocumentPublicShare).not.toHaveBeenCalled()
    expect(apiMocks.createDocumentDirectShare).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: false,
      userCode: 'SP-VIEWER1',
    })
    expect(page?.publicShareInfo.value).toEqual({
      share: null,
    })
    expect(page?.directShareItems.value[0]?.recipient.id).toBe('recipient-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已分享给 目标用户')

    scope.stop()
  })

  it('设置不分享时会写入当前页面本地不分享策略', async () => {
    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.setNoShare()

    expect(apiMocks.setDocumentNoSharePolicy).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: false,
    })
    expect(page?.selectedShareMode.value).toBe(DOCUMENT_SHARE_MODE.NONE)
    expect(page?.publicShareInfo.value).toEqual({
      share: null,
    })
    expect(page?.directShareItems.value).toEqual([])
    expect(ElMessage.success).toHaveBeenCalledWith('当前页面已设为不分享')

    scope.stop()
  })

  it('设置成功后会把最新分享投影通知页面 owner', async () => {
    const onShareChanged = vi.fn()
    const share = createNoShareProjection()

    documentApiMocks.getDocumentHead
      .mockResolvedValueOnce(createDocumentHead())
      .mockResolvedValueOnce(createDocumentHead('doc-1', '测试文档', share))

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage({
      onShareChanged,
    }))

    await flushPermissionsState()
    await page?.setNoShare()

    expect(onShareChanged).toHaveBeenCalledWith({
      documentId: 'doc-1',
      share,
    })

    scope.stop()
  })

  it('恢复继承时会删除当前页面本地分享策略并重新加载分享信息', async () => {
    documentApiMocks.getDocumentHead
      .mockResolvedValueOnce(createDocumentHead('doc-1', '测试文档', {
        localPolicy: {
          shareId: 'local-direct-1',
          mode: 'DIRECT_USER',
          directUserCount: 1,
          updatedAt: '2026-04-21T00:00:00.000Z',
          updatedBy: 'user-1',
        },
        effectivePolicy: {
          shareId: 'local-direct-1',
          mode: 'DIRECT_USER',
          rootDocumentId: 'doc-1',
          rootDocumentTitle: '测试文档',
          updatedAt: '2026-04-21T00:00:00.000Z',
          updatedBy: 'user-1',
        },
      }))
      .mockResolvedValueOnce(createDocumentHead())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    expect(page?.selectedShareMode.value).toBe(DOCUMENT_SHARE_MODE.DIRECT_USER)

    await page?.restoreInheritance()

    expect(apiMocks.restoreDocumentShareInheritance).toHaveBeenCalledWith('doc-1')
    expect(apiMocks.getDocumentPublicShare).toHaveBeenCalledTimes(2)
    expect(apiMocks.getDocumentDirectShares).toHaveBeenCalledTimes(2)
    expect(page?.selectedShareMode.value).toBe(DOCUMENT_SHARE_MODE.NONE)
    expect(ElMessage.success).toHaveBeenCalledWith('已恢复继承父级权限')

    scope.stop()
  })

  it('根节点即使有本地分享策略也不提供恢复继承能力', async () => {
    documentApiMocks.getDocumentHead.mockResolvedValue(createDocumentHead('doc-1', '测试文档', {
      localPolicy: {
        shareId: 'root-share-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
        directUserCount: 0,
        updatedAt: '2026-04-21T00:00:00.000Z',
        updatedBy: 'user-1',
      },
      effectivePolicy: {
        shareId: 'root-share-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
        rootDocumentId: 'doc-1',
        rootDocumentTitle: '测试文档',
        updatedAt: '2026-04-21T00:00:00.000Z',
        updatedBy: 'user-1',
      },
    }))

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()

    expect(page?.canRestoreInheritance.value).toBe(false)

    scope.stop()
  })

  it('从继承状态改为本地公开分享时会要求确认解除继承', async () => {
    documentApiMocks.getDocumentHead.mockResolvedValue(createDocumentHead('doc-1', '测试文档', {
      localPolicy: null,
      effectivePolicy: {
        shareId: 'parent-share-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
        rootDocumentId: 'parent-1',
        rootDocumentTitle: '父级文档',
        updatedAt: '2026-04-21T00:00:00.000Z',
        updatedBy: 'user-1',
      },
    }))
    apiMocks.enableDocumentPublicShare.mockResolvedValue(createPublicShareInfo())

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage())

    await flushPermissionsState()
    await page?.enablePublicShare()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '操作将解除该页面与其上级页面之间的关联，从而不再延用分享设置',
      '解除继承确认',
      expect.objectContaining({
        confirmButtonText: '继续操作',
      }),
    )
    expect(apiMocks.enableDocumentPublicShare).toHaveBeenCalledWith('doc-1', {
      confirmUnlinkInheritance: true,
    })

    scope.stop()
  })

  it('切换目标文档时会忽略旧请求的回写结果', async () => {
    const currentDocumentId = shallowRef('doc-1')
    const doc1HeadDeferred = createDeferred<DocumentHead>()
    const doc2HeadDeferred = createDeferred<DocumentHead>()
    const doc1PublicShareDeferred = createDeferred<ReturnType<typeof createPublicShareInfo>>()
    const doc2PublicShareDeferred = createDeferred<ReturnType<typeof createPublicShareInfo>>()
    const doc1DirectSharesDeferred = createDeferred<ReturnType<typeof createDirectShareItem>[]>()
    const doc2DirectSharesDeferred = createDeferred<ReturnType<typeof createDirectShareItem>[]>()

    documentApiMocks.getDocumentHead.mockImplementation((documentId: string) =>
      documentId === 'doc-1' ? doc1HeadDeferred.promise : doc2HeadDeferred.promise,
    )
    apiMocks.getDocumentPublicShare.mockImplementation((documentId: string) =>
      documentId === 'doc-1' ? doc1PublicShareDeferred.promise : doc2PublicShareDeferred.promise,
    )
    apiMocks.getDocumentDirectShares.mockImplementation((documentId: string) =>
      documentId === 'doc-1' ? doc1DirectSharesDeferred.promise : doc2DirectSharesDeferred.promise,
    )

    const scope = effectScope()
    const page = scope.run(() => useDocsPermissionsPage({
      documentId: currentDocumentId,
    }))

    await nextTick()

    currentDocumentId.value = 'doc-2'
    await nextTick()

    doc2HeadDeferred.resolve(createDocumentHead('doc-2', '第二篇文档'))
    doc2PublicShareDeferred.resolve(createPublicShareInfo({
      share: {
        id: 'share-2',
        link: '/shared/share-2',
      },
    }))
    doc2DirectSharesDeferred.resolve([
      createDirectShareItem({
        id: 'recipient-2',
        documentId: 'doc-2',
        title: '第二篇文档',
        link: '/shared/recipients/recipient-2',
      }),
    ])

    await flushPermissionsState()

    expect(page?.currentDocumentId.value).toBe('doc-2')
    expect(page?.currentDocumentTitle.value).toBe('第二篇文档')
    expect(page?.publicShareInfo.value?.share?.id).toBe('share-2')
    expect(page?.directShareItems.value.map(item => item.recipient.id)).toEqual(['recipient-2'])

    doc1HeadDeferred.resolve(createDocumentHead('doc-1', '第一篇文档'))
    doc1PublicShareDeferred.resolve(createPublicShareInfo({
      share: {
        id: 'share-1',
        link: '/shared/share-1',
      },
    }))
    doc1DirectSharesDeferred.resolve([
      createDirectShareItem({
        id: 'recipient-1',
        documentId: 'doc-1',
        title: '第一篇文档',
      }),
    ])

    await flushPermissionsState()

    expect(page?.currentDocumentId.value).toBe('doc-2')
    expect(page?.currentDocumentTitle.value).toBe('第二篇文档')
    expect(page?.publicShareInfo.value?.share?.id).toBe('share-2')
    expect(page?.directShareItems.value.map(item => item.recipient.id)).toEqual(['recipient-2'])

    scope.stop()
  })
})
