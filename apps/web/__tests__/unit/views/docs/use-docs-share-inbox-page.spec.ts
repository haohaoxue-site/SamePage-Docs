import type { DocumentShareAccess, DocumentShareRecipientSummary } from '@haohaoxue/samepage-domain'
import { ElMessage } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useDocsShareInboxPage } from '@/views/docs/composables/useDocsShareInboxPage'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

const apiMocks = vi.hoisted(() => ({
  acceptDocumentShare: vi.fn(),
  acceptDocumentShareRecipient: vi.fn(),
  declineDocumentShare: vi.fn(),
  declineDocumentShareRecipient: vi.fn(),
  exitDocumentShareRecipient: vi.fn(),
  getActiveDocumentShareRecipients: vi.fn(),
  getPendingDocumentShareRecipients: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
  }),
}))

vi.mock('@/apis/document-share', () => ({
  acceptDocumentShare: apiMocks.acceptDocumentShare,
  acceptDocumentShareRecipient: apiMocks.acceptDocumentShareRecipient,
  declineDocumentShare: apiMocks.declineDocumentShare,
  declineDocumentShareRecipient: apiMocks.declineDocumentShareRecipient,
  exitDocumentShareRecipient: apiMocks.exitDocumentShareRecipient,
  getActiveDocumentShareRecipients: apiMocks.getActiveDocumentShareRecipients,
  getPendingDocumentShareRecipients: apiMocks.getPendingDocumentShareRecipients,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')

  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

function createRecipientSummary(overrides: Partial<DocumentShareRecipientSummary> = {}): DocumentShareRecipientSummary {
  return {
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
      id: 'share-1',
      documentId: 'doc-1',
      mode: 'DIRECT_USER',
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
    documentId: 'doc-1',
    documentTitle: '共享文档',
    workspaceName: '我的空间',
    workspaceType: 'PERSONAL',
    link: '/shared/recipients/recipient-1',
    ...overrides,
  }
}

function createPublicRecipientSummary(): DocumentShareRecipientSummary {
  const directSummary = createRecipientSummary()

  return {
    ...directSummary,
    recipient: {
      ...directSummary.recipient,
      id: 'recipient-public-1',
      documentShareId: 'share-public-1',
    },
    share: {
      ...directSummary.share,
      id: 'share-public-1',
      mode: 'PUBLIC_TO_LOGGED_IN',
    },
    link: '/shared/share-public-1',
  }
}

function createRecipientAccess(overrides: Partial<DocumentShareAccess> = {}): DocumentShareAccess {
  return {
    accessSource: 'DIRECT_SHARE',
    permission: 'VIEW',
    authorizationRootDocumentId: 'doc-1',
    authorizationShareId: 'share-1',
    authorizationRecipientId: 'recipient-1',
    entryShareId: null,
    entryRecipientId: 'recipient-1',
    canEditTree: false,
    share: {
      id: 'share-1',
      documentId: 'doc-1',
      mode: 'DIRECT_USER',
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
    recipient: {
      id: 'recipient-1',
      documentShareId: 'share-1',
      recipientUserId: 'viewer-1',
      permission: 'VIEW',
      status: 'EXITED',
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
    recipientStatus: 'EXITED',
    sharedByUser: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: '分享发起人',
      avatarUrl: null,
      userCode: 'SP-OWNER01',
    },
    documentId: 'doc-1',
    documentTitle: '共享文档',
    workspaceName: '我的空间',
    workspaceType: 'PERSONAL',
    ...overrides,
  }
}

async function flushInboxState() {
  await Promise.resolve()
  await nextTick()
}

describe('useDocsShareInboxPage', () => {
  beforeEach(() => {
    routerMocks.push.mockReset()
    apiMocks.acceptDocumentShare.mockReset()
    apiMocks.acceptDocumentShareRecipient.mockReset()
    apiMocks.declineDocumentShare.mockReset()
    apiMocks.declineDocumentShareRecipient.mockReset()
    apiMocks.exitDocumentShareRecipient.mockReset()
    apiMocks.getActiveDocumentShareRecipients.mockReset()
    apiMocks.getPendingDocumentShareRecipients.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    apiMocks.getPendingDocumentShareRecipients.mockResolvedValue([])
    apiMocks.getActiveDocumentShareRecipients.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('active 模式初始化时会加载共享给我列表', async () => {
    apiMocks.getActiveDocumentShareRecipients.mockResolvedValue([createRecipientSummary()])

    const scope = effectScope()
    const page = scope.run(() => useDocsShareInboxPage({
      mode: 'active',
    }))

    await flushInboxState()

    expect(apiMocks.getActiveDocumentShareRecipients).toHaveBeenCalledTimes(1)
    expect(page?.items.value.map(item => item.recipient.id)).toEqual(['recipient-1'])

    scope.stop()
  })

  it('openItem 会用 public shareId 打开公开共享入口', async () => {
    apiMocks.getActiveDocumentShareRecipients.mockResolvedValue([createPublicRecipientSummary()])

    const scope = effectScope()
    const page = scope.run(() => useDocsShareInboxPage({
      mode: 'active',
    }))

    await flushInboxState()
    await page?.openItem('recipient-public-1')

    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'shared-docs',
      params: {
        shareId: 'share-public-1',
      },
    })

    scope.stop()
  })

  it('acceptItem 会用 public shareId 接受公开共享并打开公开入口', async () => {
    apiMocks.getPendingDocumentShareRecipients.mockResolvedValue([createPublicRecipientSummary()])
    apiMocks.acceptDocumentShare.mockResolvedValue(createRecipientAccess({
      accessSource: 'PUBLIC_SHARE',
      authorizationShareId: 'share-public-1',
      entryShareId: 'share-public-1',
      entryRecipientId: null,
    }))

    const scope = effectScope()
    const page = scope.run(() => useDocsShareInboxPage({
      mode: 'pending',
    }))

    await flushInboxState()
    await page?.acceptItem('recipient-public-1')

    expect(apiMocks.acceptDocumentShare).toHaveBeenCalledWith('share-public-1')
    expect(apiMocks.acceptDocumentShareRecipient).not.toHaveBeenCalled()
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'shared-docs',
      params: {
        shareId: 'share-public-1',
      },
    })

    scope.stop()
  })

  it('exitItem 成功后会把共享从 active 列表移除', async () => {
    apiMocks.getActiveDocumentShareRecipients.mockResolvedValue([createRecipientSummary()])
    apiMocks.exitDocumentShareRecipient.mockResolvedValue(createRecipientAccess())

    const scope = effectScope()
    const page = scope.run(() => useDocsShareInboxPage({
      mode: 'active',
    }))

    await flushInboxState()
    await page?.exitItem('recipient-1')

    expect(apiMocks.exitDocumentShareRecipient).toHaveBeenCalledWith('recipient-1')
    expect(page?.items.value).toEqual([])
    expect(ElMessage.success).toHaveBeenCalledWith('已停止接收这次分享')

    scope.stop()
  })
})
