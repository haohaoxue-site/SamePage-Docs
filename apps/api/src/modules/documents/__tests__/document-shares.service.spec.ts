import type { DocumentAccessService } from '../document-access.service'
import type { DocumentShareAccessService } from '../document-share-access.service'
import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { DocumentSharesService } from '../document-shares.service'

function createPrismaMock() {
  const documentShare = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  }
  const documentShareRecipient = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  }
  const document = {
    findUnique: vi.fn(),
  }
  const user = {
    findUnique: vi.fn(),
  }

  const transactionClient = {
    documentShare,
    documentShareRecipient,
    document,
    user,
  }

  return {
    documentShare,
    documentShareRecipient,
    document,
    transactionClient,
    user,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
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

function createDocumentShareAccessServiceMock(
  documentAccessService: ReturnType<typeof createDocumentAccessServiceMock>,
  overrides: Partial<DocumentShareAccessService> = {},
) {
  return {
    assertCanManageDocumentShare: vi.fn(async (input: { userId: string, documentId: string, mode: string }) => {
      if (input.mode === 'DIRECT_USER') {
        return await documentAccessService.assertCanReadDocument(input.userId, input.documentId)
      }

      return await documentAccessService.assertCanEditDocument(input.userId, input.documentId)
    }),
    ...overrides,
  }
}

function createDocumentSharesService(
  prisma: ReturnType<typeof createPrismaMock>,
  documentAccessService: ReturnType<typeof createDocumentAccessServiceMock>,
  documentShareAccessService = createDocumentShareAccessServiceMock(documentAccessService),
) {
  return new DocumentSharesService(
    prisma as never,
    documentAccessService as never,
    documentShareAccessService as never,
  )
}

function createAccessibleDocument(overrides: Partial<{
  id: string
  workspaceId: string
  parentId: string | null
  visibility: 'PRIVATE' | 'WORKSPACE'
  createdBy: string
  workspaceType: 'PERSONAL' | 'TEAM'
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-personal-1',
    parentId: null,
    visibility: 'PRIVATE' as const,
    createdBy: 'user-1',
    workspaceType: 'PERSONAL' as const,
    ...overrides,
  }
}

function createPersistedShare(overrides: Partial<{
  id: string
  documentId: string
  mode: 'NONE' | 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER'
  permission: 'VIEW'
  status: 'ACTIVE' | 'REMOVED'
  createdBy: string
  updatedBy: string
}> = {}) {
  return {
    id: 'share-1',
    documentId: 'doc-1',
    mode: 'PUBLIC_TO_LOGGED_IN' as const,
    permission: 'VIEW' as const,
    status: 'ACTIVE' as const,
    createdBy: 'user-1',
    createdByUser: {
      id: 'user-1',
      displayName: '分享发起人',
      avatarUrl: null,
      email: 'user-1@example.com',
      userCode: 'SP-USER001',
    },
    updatedBy: 'user-1',
    updatedByUser: {
      id: 'user-1',
      displayName: '分享发起人',
      avatarUrl: null,
      email: 'user-1@example.com',
      userCode: 'SP-USER001',
    },
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    ...overrides,
  }
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
    createdBy: 'user-1',
    createdByUser: createCollabUser({ id: 'user-1' }),
    updatedBy: 'user-1',
    updatedByUser: createCollabUser({ id: 'user-1' }),
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    ...overrides,
  }
}

function createPersistedRecipientRecord(overrides: Partial<{
  id: string
  documentShareId: string
  recipientUserId: string
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED' | 'REMOVED'
  documentId: string
  shareId: string
  shareMode: 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER' | 'NONE'
}> = {}) {
  return {
    ...createPersistedRecipient({
      id: overrides.id ?? 'recipient-1',
      documentShareId: overrides.documentShareId ?? 'share-1',
      recipientUserId: overrides.recipientUserId ?? 'viewer-1',
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
      document: {
        id: overrides.documentId ?? 'doc-1',
        workspaceId: 'workspace-personal-1',
        title: '共享文档',
        trashedAt: null,
        workspace: {
          name: '我的空间',
          type: 'PERSONAL',
        },
      },
    },
  }
}

function createPersistedTreeDocument(overrides: Partial<{
  id: string
  workspaceId: string
  parentId: string | null
  trashedAt: Date | null
}> = {}) {
  return {
    id: 'doc-parent-1',
    workspaceId: 'workspace-personal-1',
    parentId: null,
    trashedAt: null,
    ...overrides,
  }
}

describe('documentSharesService', () => {
  it('enablePublicShare 只替换当前节点已有本地策略，不清理祖先或后代', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument()),
    })
    prisma.documentShare.findFirst.mockResolvedValueOnce(createPersistedShare({
      id: 'share-direct-1',
      mode: 'DIRECT_USER',
    }))
    prisma.documentShare.create.mockResolvedValue(createPersistedShare({
      id: 'share-public-1',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    const result = await service.enablePublicShare('user-1', 'doc-1')

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(prisma.documentShare.updateMany).toHaveBeenCalledWith({
      where: { id: 'share-direct-1' },
      data: {
        status: 'REMOVED',
        updatedBy: 'user-1',
      },
    })
    expect(prisma.documentShare.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }),
      select: expect.any(Object),
    })
    expect(prisma.document.findUnique).not.toHaveBeenCalled()
    expect(result.share?.id).toBe('share-public-1')
  })

  it('enablePublicShare 遇到 Serializable 并发冲突会重试事务', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument()),
    })
    const conflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: 'test',
    })

    prisma.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (callback: (tx: typeof prisma.transactionClient) => unknown) => {
        return await callback(prisma.transactionClient)
      })
    prisma.documentShare.findFirst.mockResolvedValueOnce(null)
    prisma.documentShare.create.mockResolvedValue(createPersistedShare({
      id: 'share-public-retry',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    const result = await service.enablePublicShare('user-1', 'doc-1')

    expect(result.share?.id).toBe('share-public-retry')
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(prisma.$transaction).toHaveBeenNthCalledWith(1, expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(prisma.$transaction).toHaveBeenNthCalledWith(2, expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
  })

  it('createDirectShare 会在父级公开继承下要求确认解除继承', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanReadDocument: vi.fn().mockResolvedValue(createAccessibleDocument({
        id: 'doc-child-1',
        parentId: 'doc-parent-1',
      })),
    })
    prisma.user.findUnique.mockResolvedValue(createCollabUser())
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-parent-public',
        documentId: 'doc-parent-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
    prisma.document.findUnique.mockResolvedValue(createPersistedTreeDocument())
    const service = createDocumentSharesService(prisma, documentAccessService)

    await expect(service.createDirectShare('user-1', 'doc-child-1', {
      userCode: 'SP-ABCD234',
    })).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.documentShare.create).not.toHaveBeenCalled()
  })

  it('createDirectShare 确认后在子节点创建自己的 DIRECT_USER 策略并添加 recipient', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanReadDocument: vi.fn().mockResolvedValue(createAccessibleDocument({
        id: 'doc-child-1',
        parentId: 'doc-parent-1',
      })),
    })
    prisma.user.findUnique.mockResolvedValue(createCollabUser())
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-parent-public',
        documentId: 'doc-parent-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(null)
    prisma.document.findUnique.mockResolvedValue(createPersistedTreeDocument())
    prisma.documentShare.create.mockResolvedValue(createPersistedShare({
      id: 'share-child-direct',
      documentId: 'doc-child-1',
      mode: 'DIRECT_USER',
    }))
    prisma.documentShareRecipient.findUnique.mockResolvedValue(null)
    prisma.documentShareRecipient.create.mockResolvedValue(createPersistedRecipient({
      id: 'recipient-child-1',
      documentShareId: 'share-child-direct',
    }))
    prisma.documentShareRecipient.findUnique.mockResolvedValueOnce(null)
    prisma.documentShareRecipient.findUnique.mockResolvedValueOnce(createPersistedRecipientRecord({
      id: 'recipient-child-1',
      documentShareId: 'share-child-direct',
      shareId: 'share-child-direct',
      documentId: 'doc-child-1',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    const result = await service.createDirectShare('user-1', 'doc-child-1', {
      userCode: 'SP-ABCD234',
      confirmUnlinkInheritance: true,
    })

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(prisma.documentShare.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-child-1',
        mode: 'DIRECT_USER',
      }),
      select: expect.any(Object),
    })
    expect(prisma.documentShareRecipient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentShareId: 'share-child-direct',
        recipientUserId: 'viewer-1',
        permission: 'VIEW',
        status: 'PENDING',
      }),
      select: expect.any(Object),
    })
    expect(result.recipient.id).toBe('recipient-child-1')
  })

  it('enablePublicShare 确认后允许子节点在父级公开下创建自己的 PUBLIC 策略', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument({
        id: 'doc-child-1',
        parentId: 'doc-parent-1',
      })),
    })
    prisma.documentShare.findFirst.mockResolvedValueOnce(null)
    prisma.documentShare.create.mockResolvedValue(createPersistedShare({
      id: 'share-child-public',
      documentId: 'doc-child-1',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    const result = await service.enablePublicShare('user-1', 'doc-child-1', {
      confirmUnlinkInheritance: true,
    })

    expect(prisma.documentShare.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-child-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }),
      select: expect.any(Object),
    })
    expect(prisma.documentShare.updateMany).not.toHaveBeenCalled()
    expect(result.share?.id).toBe('share-child-public')
  })

  it('setNoSharePolicy 会创建 NONE 本地策略阻断继承', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument({
        id: 'doc-child-1',
        parentId: 'doc-parent-1',
      })),
    })
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPersistedShare({
        id: 'share-parent-public',
        documentId: 'doc-parent-1',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(null)
    prisma.document.findUnique.mockResolvedValue(createPersistedTreeDocument())
    prisma.documentShare.create.mockResolvedValue(createPersistedShare({
      id: 'share-child-none',
      documentId: 'doc-child-1',
      mode: 'NONE',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    await service.setNoSharePolicy('user-1', 'doc-child-1', {
      confirmUnlinkInheritance: true,
    })

    expect(prisma.documentShare.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-child-1',
        mode: 'NONE',
      }),
      select: {
        id: true,
      },
    })
  })

  it('setNoSharePolicy 在根节点只移除本地策略，不创建 NONE 策略', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument({
        id: 'doc-root-1',
        parentId: null,
      })),
    })
    prisma.documentShare.findFirst.mockResolvedValueOnce(createPersistedShare({
      id: 'share-root-public',
      documentId: 'doc-root-1',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    await service.setNoSharePolicy('user-1', 'doc-root-1')

    expect(prisma.documentShare.updateMany).toHaveBeenCalledWith({
      where: { id: 'share-root-public' },
      data: {
        status: 'REMOVED',
        updatedBy: 'user-1',
      },
    })
    expect(prisma.documentShare.create).not.toHaveBeenCalled()
  })

  it('restoreInheritedPolicy 会移除当前节点本地策略而不是创建继承记录', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanReadDocument: vi.fn().mockResolvedValue(createAccessibleDocument()),
      assertCanEditDocument: vi.fn().mockResolvedValue(createAccessibleDocument()),
    })
    prisma.documentShare.findFirst.mockResolvedValue(createPersistedShare({
      id: 'share-child-none',
      mode: 'NONE',
    }))
    const service = createDocumentSharesService(prisma, documentAccessService)

    await service.restoreInheritedPolicy('user-1', 'doc-1')

    expect(prisma.documentShare.updateMany).toHaveBeenCalledWith({
      where: { id: 'share-child-none' },
      data: {
        status: 'REMOVED',
        updatedBy: 'user-1',
      },
    })
    expect(prisma.documentShare.create).not.toHaveBeenCalled()
  })
})
