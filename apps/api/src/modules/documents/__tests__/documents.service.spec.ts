import type { DocumentShareProjection } from '@haohaoxue/samepage-domain'
import type { DocumentAccessService } from '../document-access.service'
import type { DocumentAssetsService } from '../document-assets.service'
import type { DocumentShareRecipientsService } from '../document-share-recipients.service'
import type { DocumentSharesService } from '../document-shares.service'
import type { DocumentSnapshotsService } from '../document-snapshots.service'
import {
  DOCUMENT_COLLECTION,
} from '@haohaoxue/samepage-contracts'
import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentAccessService as DefaultDocumentAccessService } from '../document-access.service'
import { DocumentsService } from '../documents.service'

function createPrismaMock() {
  const document = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  }
  const documentRecentVisit = {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  }
  const documentSnapshot = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  }
  const documentShare = {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn(),
  }
  const documentShareRecipient = {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn(),
  }
  const workspaceMember = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  }

  const transactionClient = {
    document,
    documentRecentVisit,
    documentSnapshot,
    documentShare,
    documentShareRecipient,
  }

  const bypass = {
    document,
    documentRecentVisit,
    documentSnapshot,
    documentShare,
    documentShareRecipient,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
  }

  return {
    document,
    documentRecentVisit,
    documentSnapshot,
    documentShare,
    documentShareRecipient,
    workspaceMember,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
    $bypass: bypass,
  }
}

function createAccessibleWorkspace(overrides: Partial<{ id: string, type: 'PERSONAL' | 'TEAM' }> = {}) {
  return {
    workspace: {
      id: 'workspace-team-1',
      type: 'TEAM' as const,
      ...overrides,
    },
  }
}

function createAccessibleWorkspaceSummary(overrides: Partial<{ id: string, type: 'PERSONAL' | 'TEAM' }> = {}) {
  return {
    id: 'workspace-team-1',
    type: 'TEAM' as const,
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
    id: 'doc-1',
    workspaceId: 'workspace-team-1',
    parentId: null,
    visibility: 'WORKSPACE' as const,
    createdBy: 'user-1',
    workspaceType: 'TEAM' as const,
    workspace: {
      type: 'TEAM' as const,
      members: [{ userId: 'user-1' }],
    },
    ...overrides,
  }
}

function createPersistedDocument(overrides: Partial<{
  id: string
  workspaceId: string
  parentId: string | null
  title: string
  latestSnapshotId: string | null
  headRevision: number
  summary: string
  status: 'ACTIVE' | 'LOCKED'
  order: number
  visibility: 'PRIVATE' | 'WORKSPACE'
  createdBy: string
  trashedAt: Date | null
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-team-1',
    parentId: null,
    title: '原始标题',
    latestSnapshotId: 'snapshot-1',
    headRevision: 1,
    summary: '',
    status: 'ACTIVE' as const,
    order: 0,
    visibility: 'WORKSPACE' as const,
    createdBy: 'user-1',
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    trashedAt: null,
    ...overrides,
  }
}

function createPersistedRecentVisit(overrides: Partial<{
  documentId: string
  routeKind: 'DOCUMENT' | 'SHARE' | 'SHARE_RECIPIENT'
  routeEntryId: string | null
  visitedAt: Date
  document: ReturnType<typeof createPersistedDocument>
}> = {}) {
  return {
    documentId: 'doc-1',
    routeKind: 'DOCUMENT' as const,
    routeEntryId: null,
    visitedAt: new Date('2026-04-21T09:00:00.000Z'),
    document: createPersistedDocument(),
    ...overrides,
  }
}

describe('documentsService', () => {
  it('createDocument 会委托 DocumentAccessService.assertAccessibleWorkspace', async () => {
    const prisma = createPrismaMock()
    prisma.document.findFirst.mockResolvedValue({
      order: 2,
    })
    prisma.document.create.mockResolvedValue({
      id: 'doc-team-1',
    })
    prisma.documentSnapshot.create.mockResolvedValue({
      id: 'snapshot-team-1',
    })
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const documentAccessService = createDocumentAccessServiceMock({
      assertAccessibleWorkspace: vi.fn(async () => createAccessibleWorkspaceSummary()),
    })
    const service = createDocumentsService(
      prisma,
      documentAssetsService,
      undefined,
      createDocumentSharesServiceMock(),
      documentAccessService,
    )

    await service.createDocument('user-1', {
      title: '团队根文档',
      workspaceId: 'workspace-team-1',
    })

    expect(documentAccessService.assertAccessibleWorkspace).toHaveBeenCalledWith('user-1', 'workspace-team-1')
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled()
  })

  it('createDocument 按 workspaceId 创建团队根文档', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace())
    prisma.document.findFirst.mockResolvedValue({
      order: 2,
    })
    prisma.document.create.mockResolvedValue({
      id: 'doc-team-1',
    })
    prisma.documentSnapshot.create.mockResolvedValue({
      id: 'snapshot-team-1',
    })
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    const result = await service.createDocument('user-1', {
      title: '团队根文档',
      workspaceId: 'workspace-team-1',
    })

    expect(result).toEqual({
      id: 'doc-team-1',
    })
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-team-1',
        userId: 'user-1',
        status: 'ACTIVE',
      },
      select: {
        workspace: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    })
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-team-1',
        parentId: null,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    })
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-team-1',
        parentId: null,
        title: '团队根文档',
        order: 3,
      }),
      select: {
        id: true,
      },
    })
  })

  it('createDocument 在团队空间根节点会记录创建者与可见性', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace())
    prisma.document.findFirst.mockResolvedValue({
      order: 0,
    })
    prisma.document.create.mockResolvedValue({
      id: 'doc-private-1',
    })
    prisma.documentSnapshot.create.mockResolvedValue({
      id: 'snapshot-private-1',
    })
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    await service.createDocument('user-1', {
      title: '团队私有草稿',
      workspaceId: 'workspace-team-1',
      visibility: 'PRIVATE',
    } as never)

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-team-1',
        parentId: null,
        createdBy: 'user-1',
        visibility: 'PRIVATE',
      }),
      select: {
        id: true,
      },
    })
  })

  it('createDocument 在同一 workspace 的父文档下创建子文档时会继承父文档可见性', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace())
    prisma.document.findUnique.mockResolvedValueOnce(createAccessibleDocument({
      id: 'doc-parent-1',
      workspaceId: 'workspace-team-1',
      visibility: 'WORKSPACE',
      createdBy: 'user-1',
    }))
    prisma.document.findFirst.mockResolvedValue({
      order: 1,
    })
    prisma.document.create.mockResolvedValue({
      id: 'doc-child-1',
    })
    prisma.documentSnapshot.create.mockResolvedValue({
      id: 'snapshot-child-1',
    })
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    await service.createDocument('user-1', {
      title: '团队子文档',
      workspaceId: 'workspace-team-1',
      parentId: 'doc-parent-1',
      visibility: 'PRIVATE',
    } as never)

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-team-1',
        parentId: 'doc-parent-1',
        visibility: 'WORKSPACE',
      }),
      select: {
        id: true,
      },
    })
  })

  it('createDocument 会拒绝把文档创建到其他 workspace 的父节点下', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace({
      id: 'workspace-team-1',
      type: 'TEAM',
    }))
    prisma.document.findUnique.mockResolvedValueOnce(createAccessibleDocument({
      id: 'doc-parent-other',
      workspaceId: 'workspace-team-2',
      visibility: 'WORKSPACE',
      createdBy: 'user-1',
      workspaceType: 'TEAM',
    }))

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    await expect(service.createDocument('user-1', {
      title: '跨空间子文档',
      workspaceId: 'workspace-team-1',
      parentId: 'doc-parent-other',
    })).rejects.toEqual(expect.objectContaining<Partial<BadRequestException>>({
      message: '父文档与目标空间不一致',
    }))
    expect(prisma.document.create).not.toHaveBeenCalled()
  })

  it('getDocumentTree 在团队空间会分成私有与团队两个分组', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace())
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'private-doc-self',
        title: '我的私有草稿',
        visibility: 'PRIVATE',
        createdBy: 'user-1',
      }),
      createPersistedDocument({
        id: 'private-doc-other',
        title: '别人的私有草稿',
        visibility: 'PRIVATE',
        createdBy: 'user-2',
      }),
      createPersistedDocument({
        id: 'team-doc-1',
        title: '团队根文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
      }),
      createPersistedDocument({
        id: 'team-doc-2',
        parentId: 'team-doc-1',
        title: '团队子文档',
        order: 1,
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
      }),
    ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)
    const result = await service.getDocumentTree('user-1', 'workspace-team-1')

    expect(result).toEqual([
      {
        id: DOCUMENT_COLLECTION.PERSONAL,
        nodes: [
          expect.objectContaining({
            id: 'private-doc-self',
          }),
        ],
      },
      {
        id: DOCUMENT_COLLECTION.TEAM,
        nodes: [
          expect.objectContaining({
            id: 'team-doc-1',
            children: [
              expect.objectContaining({
                id: 'team-doc-2',
              }),
            ],
          }),
        ],
      },
    ])
  })

  it('getDocumentTree 会委托 owner service 生成整棵子树共享投影', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace())
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'team-doc-root',
        title: '共享根文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }),
      createPersistedDocument({
        id: 'team-doc-child',
        parentId: 'team-doc-root',
        title: '共享子文档',
        order: 1,
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }),
    ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const projectionByDocumentId = new Map<string, DocumentShareProjection>([
      ['team-doc-root', {
        localPolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          directUserCount: 0,
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
        effectivePolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          rootDocumentId: 'team-doc-root',
          rootDocumentTitle: 'owner service 根投影',
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
      }],
      ['team-doc-child', {
        localPolicy: null,
        effectivePolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          rootDocumentId: 'team-doc-root',
          rootDocumentTitle: 'owner service 根投影',
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
      }],
    ])
    const documentSharesService = createDocumentSharesServiceMock({
      buildDocumentShareProjectionMap: vi.fn(async () => projectionByDocumentId),
    })
    const service = createDocumentsService(prisma, documentAssetsService, undefined, documentSharesService)
    const result = await service.getDocumentTree('user-1', 'workspace-team-1')

    expect(documentSharesService.buildDocumentShareProjectionMap).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'team-doc-root',
        title: '共享根文档',
      }),
      expect.objectContaining({
        id: 'team-doc-child',
        parentId: 'team-doc-root',
        title: '共享子文档',
      }),
    ])
    expect(prisma.documentShare.findMany).not.toHaveBeenCalled()
    expect(result[1]?.nodes[0]).toEqual(expect.objectContaining({
      id: 'team-doc-root',
      share: {
        localPolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          directUserCount: 0,
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
        effectivePolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          rootDocumentId: 'team-doc-root',
          rootDocumentTitle: 'owner service 根投影',
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
      },
    }))
    expect(result[1]?.nodes[0]?.children[0]).toEqual(expect.objectContaining({
      id: 'team-doc-child',
      share: {
        localPolicy: null,
        effectivePolicy: {
          mode: 'PUBLIC_TO_LOGGED_IN',
          shareId: 'share-team-root',
          rootDocumentId: 'team-doc-root',
          rootDocumentTitle: 'owner service 根投影',
          updatedAt: '2026-04-20T00:00:00.000Z',
          updatedBy: 'user-7',
        },
      },
    }))
  })

  it('patchDocumentMeta 会拒绝把文档移动到其他 workspace', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique
      .mockResolvedValueOnce(createAccessibleDocument({
        id: 'doc-team-1',
        workspaceId: 'workspace-team-1',
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }))
      .mockResolvedValueOnce(createAccessibleDocument({
        id: 'doc-parent-other',
        workspaceId: 'workspace-team-2',
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }))

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    await expect(service.patchDocumentMeta('user-1', 'doc-team-1', {
      parentId: 'doc-parent-other',
    })).rejects.toEqual(expect.objectContaining<Partial<BadRequestException>>({
      message: '不允许跨空间移动文档',
    }))
    expect(prisma.document.update).not.toHaveBeenCalled()
  })

  it('patchDocumentMeta 在同一 workspace 移动后会清理被新祖先覆盖的分享源', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique
      .mockResolvedValueOnce(createAccessibleDocument({
        id: 'doc-moved-root',
        workspaceId: 'workspace-team-1',
        parentId: null,
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }))
      .mockResolvedValueOnce(createAccessibleDocument({
        id: 'doc-parent-root',
        workspaceId: 'workspace-team-1',
        parentId: null,
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
      }))

    prisma.document.findMany
      .mockResolvedValueOnce([
        createPersistedDocument({
          id: 'doc-parent-root',
          workspaceId: 'workspace-team-1',
          parentId: null,
          visibility: 'WORKSPACE',
          createdBy: 'user-2',
        }),
        createPersistedDocument({
          id: 'doc-moved-root',
          workspaceId: 'workspace-team-1',
          parentId: null,
          visibility: 'WORKSPACE',
          createdBy: 'user-1',
        }),
        createPersistedDocument({
          id: 'doc-moved-child',
          workspaceId: 'workspace-team-1',
          parentId: 'doc-moved-root',
          visibility: 'WORKSPACE',
          createdBy: 'user-1',
        }),
      ])
      .mockResolvedValueOnce([
        createPersistedDocument({
          id: 'doc-parent-root',
          workspaceId: 'workspace-team-1',
          parentId: null,
          visibility: 'WORKSPACE',
          createdBy: 'user-2',
        }),
        createPersistedDocument({
          id: 'doc-moved-root',
          workspaceId: 'workspace-team-1',
          parentId: 'doc-parent-root',
          visibility: 'WORKSPACE',
          createdBy: 'user-1',
        }),
        createPersistedDocument({
          id: 'doc-moved-child',
          workspaceId: 'workspace-team-1',
          parentId: 'doc-moved-root',
          visibility: 'WORKSPACE',
          createdBy: 'user-1',
        }),
      ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const documentSharesService = createDocumentSharesServiceMock()
    const documentSnapshotsService = createDocumentSnapshotsServiceMock({
      getDocumentHead: vi.fn(async () => ({
        document: {
          id: 'doc-moved-root',
        },
      } as never)),
    })
    const service = createDocumentsService(
      prisma,
      documentAssetsService,
      undefined,
      documentSharesService,
      undefined,
      documentSnapshotsService,
    )

    await service.patchDocumentMeta('user-1', 'doc-moved-root', {
      parentId: 'doc-parent-root',
    })

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-moved-root' },
      data: {
        parentId: 'doc-parent-root',
        visibility: 'WORKSPACE',
      },
    })
    expect(documentSharesService.reconcileSharesAfterDocumentMove).not.toHaveBeenCalled()
    expect(prisma.documentShare.findMany).not.toHaveBeenCalled()
    expect(documentSnapshotsService.getDocumentHead).toHaveBeenCalledWith('user-1', 'doc-moved-root')
  })

  it('个人空间根文档始终视为 PRIVATE', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createAccessibleWorkspace({
      id: 'workspace-personal-1',
      type: 'PERSONAL',
    }))
    prisma.document.findFirst.mockResolvedValue({
      order: 0,
    })
    prisma.document.create.mockResolvedValue({
      id: 'doc-personal-1',
    })
    prisma.documentSnapshot.create.mockResolvedValue({
      id: 'snapshot-personal-1',
    })
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = createDocumentsService(prisma, documentAssetsService)

    await service.createDocument('user-1', {
      title: '我的文档',
      workspaceId: 'workspace-personal-1',
      visibility: 'WORKSPACE',
    } as never)

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-personal-1',
        createdBy: 'user-1',
        visibility: 'PRIVATE',
      }),
      select: {
        id: true,
      },
    })
  })

  it('getRecentDocuments 只返回私有与共享来源，并隐藏团队与回收站文档', async () => {
    const prisma = createPrismaMock()
    prisma.documentRecentVisit.findMany.mockResolvedValue([
      createPersistedRecentVisit({
        documentId: 'doc-personal',
        visitedAt: new Date('2026-04-21T10:00:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-personal',
          workspaceId: 'workspace-personal-1',
          title: '我的私有文档',
          visibility: 'PRIVATE',
          createdBy: 'user-1',
          summary: '个人摘要',
        }),
      }),
      createPersistedRecentVisit({
        documentId: 'doc-shared',
        routeKind: 'SHARE_RECIPIENT',
        routeEntryId: 'recipient-1',
        visitedAt: new Date('2026-04-21T09:30:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-shared',
          workspaceId: 'workspace-external-1',
          title: '共享给我的文档',
          visibility: 'PRIVATE',
          createdBy: 'user-9',
          summary: '共享摘要',
        }),
      }),
      createPersistedRecentVisit({
        documentId: 'doc-team',
        visitedAt: new Date('2026-04-21T09:15:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-team',
          workspaceId: 'workspace-team-1',
          title: '团队文档',
          visibility: 'WORKSPACE',
          createdBy: 'user-2',
          summary: '团队摘要',
        }),
      }),
      createPersistedRecentVisit({
        documentId: 'doc-trashed',
        visitedAt: new Date('2026-04-21T09:45:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-trashed',
          workspaceId: 'workspace-personal-1',
          title: '已删除文档',
          visibility: 'PRIVATE',
          createdBy: 'user-1',
          summary: '已删除摘要',
          trashedAt: new Date('2026-04-21T09:50:00.000Z'),
        }),
      }),
    ])
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-personal',
        workspaceId: 'workspace-personal-1',
        title: '我的私有文档',
        visibility: 'PRIVATE',
        createdBy: 'user-1',
        summary: '个人摘要',
      }),
      createPersistedDocument({
        id: 'doc-team',
        workspaceId: 'workspace-team-1',
        title: '团队文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        summary: '团队摘要',
      }),
    ])
    prisma.documentShareRecipient.findMany.mockResolvedValue([
      {
        id: 'recipient-1',
      },
    ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const documentAccessService = createDocumentAccessServiceMock({
      listAccessibleWorkspaces: vi.fn(async () => [
        createAccessibleWorkspaceSummary({
          id: 'workspace-personal-1',
          type: 'PERSONAL',
        }),
        createAccessibleWorkspaceSummary({
          id: 'workspace-team-1',
          type: 'TEAM',
        }),
      ]),
    })
    const service = createDocumentsService(
      prisma,
      documentAssetsService,
      undefined,
      createDocumentSharesServiceMock(),
      documentAccessService,
    )
    const result = await service.getRecentDocuments('user-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'doc-personal',
        title: '我的私有文档',
        collection: 'personal',
        link: '/docs/doc-personal',
      }),
      expect.objectContaining({
        id: 'doc-shared',
        title: '共享给我的文档',
        collection: 'shared',
        link: '/shared/recipients/recipient-1',
        ancestorTitles: [],
      }),
    ])
    expect(documentAccessService.listAccessibleWorkspaces).toHaveBeenCalledWith('user-1')
    expect(prisma.workspaceMember.findMany).not.toHaveBeenCalled()
  })

  it('getRecentDocuments 会过滤已失效的共享最近访问记录', async () => {
    const prisma = createPrismaMock()
    prisma.documentRecentVisit.findMany.mockResolvedValue([
      createPersistedRecentVisit({
        documentId: 'doc-personal',
        visitedAt: new Date('2026-04-21T10:00:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-personal',
          workspaceId: 'workspace-personal-1',
          title: '我的私有文档',
          visibility: 'PRIVATE',
          createdBy: 'user-1',
          summary: '个人摘要',
        }),
      }),
      createPersistedRecentVisit({
        documentId: 'doc-shared-invalid',
        routeKind: 'SHARE_RECIPIENT',
        routeEntryId: 'recipient-invalid-1',
        visitedAt: new Date('2026-04-21T09:30:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-shared-invalid',
          workspaceId: 'workspace-external-1',
          title: '已失效共享文档',
          visibility: 'PRIVATE',
          createdBy: 'user-9',
          summary: '共享摘要',
        }),
      }),
    ])
    prisma.workspaceMember.findMany.mockResolvedValue([
      {
        workspaceId: 'workspace-personal-1',
        workspace: {
          type: 'PERSONAL',
        },
      },
    ])
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-personal',
        workspaceId: 'workspace-personal-1',
        title: '我的私有文档',
        visibility: 'PRIVATE',
        createdBy: 'user-1',
        summary: '个人摘要',
      }),
    ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock({
      resolveActiveShareRecipientIds: vi.fn(async () => new Set<string>()),
    })
    const service = createDocumentsService(prisma, documentAssetsService, documentShareRecipientsService)
    const result = await service.getRecentDocuments('user-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'doc-personal',
        title: '我的私有文档',
        collection: 'personal',
        link: '/docs/doc-personal',
      }),
    ])
    expect(documentShareRecipientsService.resolveActiveShareRecipientIds).toHaveBeenCalledWith('user-1', ['recipient-invalid-1'])
    expect(prisma.documentShareRecipient.findMany).not.toHaveBeenCalled()
  })

  it('getRecentDocuments 会保留公开分享最近访问记录并生成 share 链接', async () => {
    const prisma = createPrismaMock()
    prisma.documentRecentVisit.findMany.mockResolvedValue([
      createPersistedRecentVisit({
        documentId: 'doc-shared-public',
        routeKind: 'SHARE',
        routeEntryId: 'share-public-1',
        visitedAt: new Date('2026-04-21T10:00:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-shared-public',
          workspaceId: 'workspace-external-1',
          title: '公开分享文档',
          visibility: 'PRIVATE',
          createdBy: 'user-9',
          summary: '公开分享摘要',
        }),
      }),
      createPersistedRecentVisit({
        documentId: 'doc-personal',
        visitedAt: new Date('2026-04-21T09:00:00.000Z'),
        document: createPersistedDocument({
          id: 'doc-personal',
          workspaceId: 'workspace-personal-1',
          title: '我的私有文档',
          visibility: 'PRIVATE',
          createdBy: 'user-1',
          summary: '个人摘要',
        }),
      }),
    ])
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-personal',
        workspaceId: 'workspace-personal-1',
        title: '我的私有文档',
        visibility: 'PRIVATE',
        createdBy: 'user-1',
        summary: '个人摘要',
      }),
    ])

    const documentAssetsService = createDocumentAssetsServiceMock()
    const documentAccessService = createDocumentAccessServiceMock({
      listAccessibleWorkspaces: vi.fn(async () => [
        createAccessibleWorkspaceSummary({
          id: 'workspace-personal-1',
          type: 'PERSONAL',
        }),
      ]),
    })
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock({
      resolveActiveShareIds: vi.fn(async (_userId: string, shareIds: string[]) => new Set(shareIds)),
    })
    const service = createDocumentsService(
      prisma,
      documentAssetsService,
      documentShareRecipientsService,
      createDocumentSharesServiceMock(),
      documentAccessService,
    )

    const result = await service.getRecentDocuments('user-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'doc-shared-public',
        title: '公开分享文档',
        collection: 'shared',
        link: '/shared/share-public-1',
        ancestorTitles: [],
      }),
      expect.objectContaining({
        id: 'doc-personal',
        title: '我的私有文档',
        collection: 'personal',
        link: '/docs/doc-personal',
      }),
    ])
    expect(documentShareRecipientsService.resolveActiveShareIds).toHaveBeenCalledWith('user-1', ['share-public-1'])
  })
})

function createDocumentAssetsServiceMock() {
  return {
    assertAssetsBelongToDocument: vi.fn(async () => {}),
  } satisfies Pick<DocumentAssetsService, 'assertAssetsBelongToDocument'>
}

function createDocumentAccessServiceMock(overrides: Partial<DocumentAccessService> = {}) {
  return {
    assertAccessibleWorkspace: vi.fn(async () => createAccessibleWorkspaceSummary()),
    listAccessibleWorkspaces: vi.fn(async () => [createAccessibleWorkspaceSummary()]),
    assertCanReadDocument: vi.fn(async () => createAccessibleDocument()),
    assertCanEditDocument: vi.fn(async () => createAccessibleDocument()),
    assertCanManageTrashedDocument: vi.fn(async () => createAccessibleDocument()),
    hasWorkspaceAccess: vi.fn(async () => false),
    hasWorkspaceOwnerAccess: vi.fn(async () => false),
    ...overrides,
  } satisfies Pick<
    DocumentAccessService,
    | 'assertAccessibleWorkspace'
    | 'listAccessibleWorkspaces'
    | 'assertCanReadDocument'
    | 'assertCanEditDocument'
    | 'assertCanManageTrashedDocument'
    | 'hasWorkspaceAccess'
    | 'hasWorkspaceOwnerAccess'
  >
}

function createDocumentsService(
  prisma: ReturnType<typeof createPrismaMock>,
  documentAssetsService: ReturnType<typeof createDocumentAssetsServiceMock>,
  documentShareRecipientsService: ReturnType<typeof createDocumentShareRecipientsServiceMock> = createDocumentShareRecipientsServiceMock(),
  documentSharesService: ReturnType<typeof createDocumentSharesServiceMock> = createDocumentSharesServiceMock(),
  documentAccessService: Pick<
    DocumentAccessService,
    | 'assertAccessibleWorkspace'
    | 'listAccessibleWorkspaces'
    | 'assertCanReadDocument'
    | 'assertCanEditDocument'
    | 'assertCanManageTrashedDocument'
  > = new DefaultDocumentAccessService(prisma as never),
  documentSnapshotsService: ReturnType<typeof createDocumentSnapshotsServiceMock> = createDocumentSnapshotsServiceMock(),
) {
  void documentAssetsService

  return new DocumentsService(
    prisma as never,
    documentAccessService as never,
    documentShareRecipientsService as never,
    documentSharesService as never,
    documentSnapshotsService as never,
  )
}

function createDocumentShareRecipientsServiceMock(overrides: Partial<DocumentShareRecipientsService> = {}) {
  return {
    assertCanReadSharedDocument: vi.fn(async () => ({
      id: 'share-1',
      documentId: 'doc-1',
    } as never)),
    resolveActiveShareIds: vi.fn(async (_userId: string, shareIds: string[]) => new Set(shareIds)),
    resolveActiveShareRecipientIds: vi.fn(async (_userId: string, recipientIds: string[]) => new Set(recipientIds)),
    ...overrides,
  } satisfies Pick<
    DocumentShareRecipientsService,
    | 'assertCanReadSharedDocument'
    | 'resolveActiveShareIds'
    | 'resolveActiveShareRecipientIds'
  >
}

function createDocumentSharesServiceMock(overrides: Partial<DocumentSharesService> = {}) {
  return {
    buildDocumentShareProjectionMap: vi.fn(async () => new Map()),
    reconcileSharesAfterDocumentMove: vi.fn(async () => {}),
    resolveDocumentShareProjectionForDocument: vi.fn(async () => null),
    ...overrides,
  } satisfies Pick<
    DocumentSharesService,
    | 'buildDocumentShareProjectionMap'
    | 'reconcileSharesAfterDocumentMove'
    | 'resolveDocumentShareProjectionForDocument'
  >
}

function createDocumentSnapshotsServiceMock(overrides: Partial<DocumentSnapshotsService> = {}) {
  return {
    getDocumentHead: vi.fn(async () => ({
      document: {
        id: 'doc-1',
      },
    } as never)),
    ...overrides,
  } satisfies Pick<DocumentSnapshotsService, 'getDocumentHead'>
}
