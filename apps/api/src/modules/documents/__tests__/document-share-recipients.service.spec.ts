import type { DocumentAccessService } from '../document-access.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentShareAccessService } from '../document-share-access.service'
import { DocumentShareRecipientsService } from '../document-share-recipients.service'

function createPrismaMock() {
  const documentShare = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  }
  const documentShareRecipient = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  }
  const document = {
    findUnique: vi.fn(),
  }
  const documentRecentVisit = {
    upsert: vi.fn(),
  }

  return {
    documentShare,
    documentShareRecipient,
    document,
    documentRecentVisit,
  }
}

function createDocumentAccessServiceMock(overrides: Partial<DocumentAccessService> = {}) {
  return {
    assertCanReadDocument: vi.fn(),
    assertCanEditDocument: vi.fn(),
    hasWorkspaceAccess: vi.fn(async () => false),
    hasWorkspaceOwnerAccess: vi.fn(async () => false),
    ...overrides,
  }
}

function createDocumentShareRecipientsService(
  prisma: ReturnType<typeof createPrismaMock>,
  documentAccessService: ReturnType<typeof createDocumentAccessServiceMock>,
) {
  const documentShareAccessService = new DocumentShareAccessService(prisma as never, documentAccessService as never)

  return new DocumentShareRecipientsService(
    prisma as never,
    documentAccessService as never,
    documentShareAccessService,
  )
}

function createCollabUser(overrides: Partial<{
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  userCode: string
}> = {}) {
  return {
    id: 'viewer-1',
    email: 'viewer@example.com',
    displayName: '目标用户',
    avatarUrl: null,
    userCode: 'SP-ABCD234',
    ...overrides,
  }
}

function createPersistedShare(overrides: Partial<{
  id: string
  documentId: string
  mode: 'NONE' | 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER'
  permission: 'VIEW'
  status: 'ACTIVE' | 'REMOVED'
}> = {}) {
  return {
    id: 'share-1',
    documentId: 'doc-1',
    mode: 'PUBLIC_TO_LOGGED_IN' as const,
    permission: 'VIEW' as const,
    status: 'ACTIVE' as const,
    createdBy: 'user-1',
    createdByUser: createCollabUser({
      id: 'user-1',
      displayName: '分享发起人',
      userCode: 'SP-USER001',
    }),
    updatedBy: 'user-1',
    updatedByUser: createCollabUser({
      id: 'user-1',
      displayName: '分享发起人',
      userCode: 'SP-USER001',
    }),
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    ...overrides,
  }
}

function createPersistedRecipient(overrides: Partial<{
  id: string
  documentShareId: string
  recipientUserId: string
  permission: 'VIEW'
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED' | 'REMOVED'
}> = {}) {
  return {
    id: 'recipient-1',
    documentShareId: 'share-1',
    recipientUserId: 'viewer-1',
    permission: 'VIEW' as const,
    status: 'PENDING' as const,
    createdBy: 'viewer-1',
    createdByUser: createCollabUser(),
    updatedBy: 'viewer-1',
    updatedByUser: createCollabUser(),
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    ...overrides,
  }
}

function createPersistedRecipientRecord(overrides: Partial<{
  id: string
  documentShareId: string
  recipientUserId: string
  permission: 'VIEW'
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED' | 'REMOVED'
  shareMode: 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER' | 'NONE'
  shareId: string
  documentId: string
}> = {}) {
  return {
    ...createPersistedRecipient({
      id: overrides.id ?? 'recipient-1',
      documentShareId: overrides.documentShareId ?? 'share-1',
      recipientUserId: overrides.recipientUserId ?? 'viewer-1',
      permission: overrides.permission ?? 'VIEW',
      status: overrides.status ?? 'PENDING',
    }),
    recipientUser: createCollabUser({
      id: overrides.recipientUserId ?? 'viewer-1',
    }),
    documentShare: {
      ...createPersistedShare({
        id: overrides.shareId ?? 'share-1',
        documentId: overrides.documentId ?? 'doc-1',
        mode: overrides.shareMode ?? 'DIRECT_USER',
      }),
      document: createSharedDocument({
        id: overrides.documentId ?? 'doc-1',
      }),
    },
  }
}

function createSharedDocument(overrides: Partial<{
  id: string
  workspaceId: string
  title: string
  trashedAt: Date | null
  workspaceName: string
  workspaceType: 'PERSONAL' | 'TEAM'
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-personal-1',
    title: '共享文档',
    trashedAt: null,
    workspace: {
      name: overrides.workspaceName ?? '我的空间',
      type: overrides.workspaceType ?? 'PERSONAL',
    },
    ...overrides,
  }
}

function createTreeDocument(overrides: Partial<{
  id: string
  workspaceId: string
  parentId: string | null
  trashedAt: Date | null
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-personal-1',
    parentId: null,
    trashedAt: null,
    ...overrides,
  }
}

describe('documentShareRecipientsService', () => {
  it('getShareAccess 首次访问公开分享会创建 PENDING recipient', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createPersistedShare())
      .mockResolvedValueOnce(createPersistedShare())
    prisma.document.findUnique.mockResolvedValue(createSharedDocument())
    prisma.documentShareRecipient.findUnique.mockResolvedValue(null)
    prisma.documentShareRecipient.create.mockResolvedValue(createPersistedRecipient())
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    const result = await service.getShareAccess('viewer-1', 'share-1')

    expect(result.accessSource).toBe('PUBLIC_SHARE')
    expect(result.recipientStatus).toBe('PENDING')
    expect(prisma.documentShareRecipient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentShareId: 'share-1',
        recipientUserId: 'viewer-1',
        permission: 'VIEW',
        status: 'PENDING',
      }),
      select: expect.any(Object),
    })
  })

  it('getShareAccess 团队成员访问公开分享会清理冗余 recipient 且不创建 PENDING', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      hasWorkspaceAccess: vi.fn(async () => true),
    })
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-team-public',
        documentId: 'doc-team',
      }))
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-team-public',
        documentId: 'doc-team',
      }))
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      id: 'doc-team',
      workspaceId: 'workspace-team-1',
      workspaceType: 'TEAM',
    }))
    prisma.documentShareRecipient.findMany.mockResolvedValue([{ id: 'recipient-redundant-1' }])
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    const result = await service.getShareAccess('member-1', 'share-team-public')

    expect(result.accessSource).toBe('WORKSPACE_MEMBER')
    expect(prisma.documentShareRecipient.create).not.toHaveBeenCalled()
    expect(prisma.documentShareRecipient.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['recipient-redundant-1'],
        },
      },
      data: {
        status: 'REMOVED',
        updatedBy: 'member-1',
      },
    })
  })

  it('getActiveRecipients 会同时展示父级和子级本地真实 recipient', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findMany.mockResolvedValue([
      createPersistedRecipientRecord({
        id: 'recipient-parent-public',
        documentShareId: 'share-parent-public',
        shareId: 'share-parent-public',
        shareMode: 'PUBLIC_TO_LOGGED_IN',
        status: 'ACTIVE',
        documentId: 'doc-parent',
      }),
      createPersistedRecipientRecord({
        id: 'recipient-child-direct',
        documentShareId: 'share-child-direct',
        shareId: 'share-child-direct',
        shareMode: 'DIRECT_USER',
        status: 'ACTIVE',
        documentId: 'doc-child',
      }),
    ])
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    const result = await service.getActiveRecipients('viewer-1')

    expect(result.map(item => item.recipient.id)).toEqual([
      'recipient-parent-public',
      'recipient-child-direct',
    ])
    expect(result.map(item => item.share.mode)).toEqual([
      'PUBLIC_TO_LOGGED_IN',
      'DIRECT_USER',
    ])
  })

  it('getActiveRecipients 查询时会隐藏垃圾箱中的共享文档', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findMany.mockResolvedValue([])
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    await service.getActiveRecipients('viewer-1')

    expect(prisma.documentShareRecipient.findMany).toHaveBeenCalledWith({
      where: {
        recipientUserId: 'viewer-1',
        status: 'ACTIVE',
        documentShare: {
          status: 'ACTIVE',
          document: {
            trashedAt: null,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: expect.any(Object),
    })
  })

  it('getShareAccess 在文档进入垃圾箱期间提示共享暂时不可用', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst.mockResolvedValueOnce(createPersistedShare())
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      trashedAt: new Date('2026-04-23T00:00:00.000Z'),
    }))
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    await expect(service.getShareAccess('viewer-1', 'share-1')).rejects.toMatchObject({
      response: {
        message: '该共享暂时不可用',
      },
    })
  })

  it('assertCanReadSharedDocument 在 public 未接收时拒绝读取', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createPersistedShare())
      .mockResolvedValueOnce(createPersistedShare())
    prisma.document.findUnique.mockResolvedValue(createSharedDocument())
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createPersistedRecipient({
      status: 'PENDING',
    }))
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    await expect(service.assertCanReadSharedDocument('viewer-1', 'share-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('public 入口在目标子页面被本地策略覆盖后失效', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-parent-public',
        documentId: 'doc-parent',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-child-none',
        documentId: 'doc-child',
        mode: 'NONE',
      }))
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      id: 'doc-child',
    }))
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    await expect(service.assertCanReadSharedDocument(
      'viewer-1',
      'share-parent-public',
      'doc-child',
    )).rejects.toBeInstanceOf(NotFoundException)
  })

  it('direct recipient 接收后可以读取仍由该 direct share 授权的子页面', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findUnique
      .mockResolvedValueOnce(createPersistedRecipientRecord({
        id: 'recipient-1',
        documentShareId: 'share-direct',
        shareId: 'share-direct',
        shareMode: 'DIRECT_USER',
        status: 'ACTIVE',
        documentId: 'doc-parent',
      }))
    prisma.document.findUnique
      .mockResolvedValueOnce(createSharedDocument({
        id: 'doc-child',
      }))
      .mockResolvedValueOnce(createTreeDocument({
        id: 'doc-child',
        parentId: 'doc-parent',
      }))
      .mockResolvedValueOnce(createTreeDocument({
        id: 'doc-parent',
        parentId: null,
      }))
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-direct',
        documentId: 'doc-parent',
        mode: 'DIRECT_USER',
      }))
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    const result = await service.assertCanReadSharedRecipientDocument(
      'viewer-1',
      'recipient-1',
      'doc-child',
    )

    expect(result.documentId).toBe('doc-child')
    expect(result.share.mode).toBe('DIRECT_USER')
  })

  it('getRecipientAccess 不允许 public recipient 走 direct 确认入口', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createPersistedRecipientRecord({
      id: 'recipient-public-1',
      documentShareId: 'share-public',
      shareId: 'share-public',
      shareMode: 'PUBLIC_TO_LOGGED_IN',
      status: 'ACTIVE',
      documentId: 'doc-public',
    }))
    prisma.document.findUnique.mockResolvedValue(createTreeDocument({
      id: 'doc-public',
      parentId: null,
    }))
    prisma.documentShare.findFirst.mockResolvedValue(createPersistedShare({
      id: 'share-public',
      documentId: 'doc-public',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = createDocumentShareRecipientsService(prisma, documentAccessService)

    await expect(service.getRecipientAccess('viewer-1', 'recipient-public-1')).rejects.toBeInstanceOf(NotFoundException)
  })
})
