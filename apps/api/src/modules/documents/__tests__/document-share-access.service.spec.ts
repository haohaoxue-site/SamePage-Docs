import type { DocumentAccessService } from '../document-access.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentShareAccessService } from '../document-share-access.service'

function createPrismaMock() {
  const documentShare = {
    findFirst: vi.fn(),
  }
  const documentShareRecipient = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  }
  const document = {
    findUnique: vi.fn(),
  }

  return {
    documentShare,
    documentShareRecipient,
    document,
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

function createCollabUser(overrides: Partial<{
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  userCode: string
}> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    displayName: '分享发起人',
    avatarUrl: null,
    userCode: 'SP-USER001',
    ...overrides,
  }
}

function createShare(overrides: Partial<{
  id: string
  documentId: string
  mode: 'NONE' | 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER'
  status: 'ACTIVE' | 'REMOVED'
}> = {}) {
  return {
    id: 'share-parent-public',
    documentId: 'doc-parent',
    mode: 'PUBLIC_TO_LOGGED_IN' as const,
    permission: 'VIEW' as const,
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    createdBy: 'user-1',
    createdByUser: createCollabUser(),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedBy: 'user-1',
    updatedByUser: createCollabUser(),
    ...overrides,
  }
}

function createRecipient(overrides: Partial<{
  id: string
  documentShareId: string
  recipientUserId: string
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED' | 'REMOVED'
}> = {}) {
  return {
    id: 'recipient-1',
    documentShareId: 'share-direct',
    recipientUserId: 'viewer-1',
    permission: 'VIEW' as const,
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    createdBy: 'user-1',
    createdByUser: createCollabUser(),
    updatedAt: new Date('2026-04-23T00:00:00.000Z'),
    updatedBy: 'user-1',
    updatedByUser: createCollabUser(),
    ...overrides,
  }
}

function createRecipientRecord(overrides: Partial<{
  id: string
  documentShareId: string
  recipientUserId: string
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED' | 'REMOVED'
  shareId: string
  shareMode: 'NONE' | 'PUBLIC_TO_LOGGED_IN' | 'DIRECT_USER'
  documentId: string
}> = {}) {
  return {
    ...createRecipient({
      id: overrides.id ?? 'recipient-1',
      documentShareId: overrides.documentShareId ?? 'share-direct',
      recipientUserId: overrides.recipientUserId ?? 'viewer-1',
      status: overrides.status ?? 'ACTIVE',
    }),
    recipientUser: createCollabUser({
      id: overrides.recipientUserId ?? 'viewer-1',
      displayName: '目标用户',
      userCode: 'SP-VIEWER1',
    }),
    documentShare: {
      ...createShare({
        id: overrides.shareId ?? 'share-direct',
        documentId: overrides.documentId ?? 'doc-parent',
        mode: overrides.shareMode ?? 'DIRECT_USER',
      }),
      document: createSharedDocument({
        id: overrides.documentId ?? 'doc-parent',
      }),
    },
  }
}

function createSharedDocument(overrides: Partial<{
  id: string
  workspaceId: string
  title: string
  trashedAt: Date | null
}> = {}) {
  return {
    id: 'doc-parent',
    workspaceId: 'workspace-personal-1',
    title: '共享文档',
    trashedAt: null,
    workspace: {
      name: '我的空间',
      type: 'PERSONAL',
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
    id: 'doc-parent',
    workspaceId: 'workspace-personal-1',
    parentId: null,
    trashedAt: null,
    ...overrides,
  }
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
    id: 'doc-parent',
    workspaceId: 'workspace-personal-1',
    parentId: null,
    visibility: 'PRIVATE' as const,
    createdBy: 'user-1',
    workspaceType: 'PERSONAL' as const,
    ...overrides,
  }
}

describe('documentShareAccessService', () => {
  it('assertCanEditDocument 只走普通文档编辑权限，不接受共享入口扩大写权限', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn(async () => createAccessibleDocument()),
    })
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    const document = await service.assertCanEditDocument({
      userId: 'user-1',
      documentId: 'doc-parent',
    })

    expect(document.id).toBe('doc-parent')
    expect(documentAccessService.assertCanEditDocument).toHaveBeenCalledWith('user-1', 'doc-parent')
    expect(prisma.documentShare.findFirst).not.toHaveBeenCalled()
    expect(prisma.documentShareRecipient.findUnique).not.toHaveBeenCalled()
  })

  it('assertCanManageDocumentShare 允许团队成员管理 direct 分享，但 public 和 none 需要团队 owner', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertCanEditDocument: vi.fn(async () => createAccessibleDocument({
        workspaceId: 'workspace-team-1',
        workspaceType: 'TEAM',
      })),
      hasWorkspaceOwnerAccess: vi.fn(async () => false),
    })
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.assertCanManageDocumentShare({
      userId: 'member-1',
      documentId: 'doc-team',
      mode: 'DIRECT_USER',
    })).resolves.toMatchObject({
      id: 'doc-parent',
      workspaceType: 'TEAM',
    })
    await expect(service.assertCanManageDocumentShare({
      userId: 'member-1',
      documentId: 'doc-team',
      mode: 'PUBLIC_TO_LOGGED_IN',
    })).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.assertCanManageDocumentShare({
      userId: 'member-1',
      documentId: 'doc-team',
      mode: 'NONE',
    })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('共享入口不能执行 manageShare 动作', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.resolve({
      userId: 'viewer-1',
      documentId: 'doc-parent',
      action: 'manageShare',
      entryShareId: 'share-parent-public',
    })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.documentShare.findFirst).not.toHaveBeenCalled()
  })

  it('public 入口读取子页面时按目标页面最近本地策略实时解析', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createShare({
        id: 'share-parent-public',
        documentId: 'doc-parent',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createShare({
        id: 'share-parent-public',
        documentId: 'doc-parent',
        mode: 'PUBLIC_TO_LOGGED_IN',
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
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createRecipient({
      documentShareId: 'share-parent-public',
      recipientUserId: 'viewer-1',
      status: 'ACTIVE',
    }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    const access = await service.resolve({
      userId: 'viewer-1',
      documentId: 'doc-child',
      action: 'read',
      entryShareId: 'share-parent-public',
    })

    expect(access.document.id).toBe('doc-child')
    expect(access.accessSource).toBe('PUBLIC_SHARE')
    expect(access.authorizationRootDocumentId).toBe('doc-parent')
    expect(access.entryShareId).toBe('share-parent-public')
  })

  it('direct 最近策略下 recipient 非 ACTIVE 时拒绝读取', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createRecipientRecord({
      id: 'recipient-1',
      documentShareId: 'share-direct',
      shareId: 'share-direct',
      status: 'PENDING',
      documentId: 'doc-parent',
    }))
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      id: 'doc-parent',
    }))
    prisma.documentShare.findFirst.mockResolvedValue(createShare({
      id: 'share-direct',
      documentId: 'doc-parent',
      mode: 'DIRECT_USER',
    }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.resolve({
      userId: 'viewer-1',
      documentId: 'doc-parent',
      action: 'read',
      entryRecipientId: 'recipient-1',
    })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('direct recipient 入口不能被非接收用户复用', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createRecipientRecord({
      id: 'recipient-1',
      documentShareId: 'share-direct',
      shareId: 'share-direct',
      status: 'ACTIVE',
      recipientUserId: 'viewer-2',
      documentId: 'doc-parent',
    }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.resolveRecipientEntry({
      userId: 'viewer-1',
      recipientId: 'recipient-1',
      action: 'read',
    })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('direct recipient 阅读入口不能复用 public recipient', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShareRecipient.findUnique.mockResolvedValue(createRecipientRecord({
      id: 'recipient-public-1',
      documentShareId: 'share-public',
      shareId: 'share-public',
      shareMode: 'PUBLIC_TO_LOGGED_IN',
      status: 'ACTIVE',
      documentId: 'doc-parent',
    }))
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      id: 'doc-parent',
    }))
    prisma.documentShare.findFirst.mockResolvedValue(createShare({
      id: 'share-public',
      documentId: 'doc-parent',
      mode: 'PUBLIC_TO_LOGGED_IN',
    }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.resolveRecipientEntry({
      userId: 'viewer-1',
      recipientId: 'recipient-public-1',
      action: 'read',
    })).rejects.toBeInstanceOf(NotFoundException)
  })

  it('团队成员访问 public 入口时不要求接收记录', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock({
      hasWorkspaceAccess: vi.fn(async () => true),
    })
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createShare({
        id: 'share-team-public',
        documentId: 'doc-team',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(createShare({
        id: 'share-team-public',
        documentId: 'doc-team',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
    prisma.document.findUnique.mockResolvedValue(createSharedDocument({
      id: 'doc-team',
      workspaceId: 'workspace-team-1',
    }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    const access = await service.resolve({
      userId: 'member-1',
      documentId: 'doc-team',
      action: 'read',
      entryShareId: 'share-team-public',
    })

    expect(access.accessSource).toBe('WORKSPACE_MEMBER')
    expect(prisma.documentShareRecipient.findUnique).not.toHaveBeenCalled()
  })

  it('入口锚点被子页面本地策略覆盖时返回共享失效', async () => {
    const prisma = createPrismaMock()
    const documentAccessService = createDocumentAccessServiceMock()
    prisma.documentShare.findFirst
      .mockResolvedValueOnce(createShare({
        id: 'share-parent-public',
        documentId: 'doc-parent',
        mode: 'PUBLIC_TO_LOGGED_IN',
      }))
      .mockResolvedValueOnce(createShare({
        id: 'share-child-none',
        documentId: 'doc-child',
        mode: 'NONE',
      }))
    prisma.document.findUnique
      .mockResolvedValueOnce(createSharedDocument({
        id: 'doc-child',
      }))
      .mockResolvedValueOnce(createTreeDocument({
        id: 'doc-child',
        parentId: 'doc-parent',
      }))
    const service = new DocumentShareAccessService(prisma as never, documentAccessService as never)

    await expect(service.resolve({
      userId: 'viewer-1',
      documentId: 'doc-child',
      action: 'read',
      entryShareId: 'share-parent-public',
    })).rejects.toBeInstanceOf(NotFoundException)
  })
})
