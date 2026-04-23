import type { DocumentAccessService } from '../document-access.service'
import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentTrashService } from '../document-trash.service'

function createPrismaMock() {
  const document = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  }
  const documentRecentVisit = {
    deleteMany: vi.fn(),
  }

  const transactionClient = {
    document,
    documentRecentVisit,
  }

  const bypass = {
    document,
    documentRecentVisit,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
  }

  return {
    document,
    documentRecentVisit,
    $bypass: bypass,
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

function createDocumentAccessServiceMock(overrides: Partial<DocumentAccessService> = {}) {
  return {
    assertAccessibleWorkspace: vi.fn(async () => createAccessibleWorkspaceSummary()),
    assertCanEditDocument: vi.fn(async () => createAccessibleDocument()),
    assertCanManageTrashedDocument: vi.fn(async () => createAccessibleDocument()),
    ...overrides,
  } satisfies Pick<
    DocumentAccessService,
    | 'assertAccessibleWorkspace'
    | 'assertCanEditDocument'
    | 'assertCanManageTrashedDocument'
  >
}

describe('documentTrashService', () => {
  it('deleteDocument 会把整棵子树移入回收站并清理最近访问', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-root',
        workspaceId: 'workspace-team-1',
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }),
      createPersistedDocument({
        id: 'doc-child',
        workspaceId: 'workspace-team-1',
        parentId: 'doc-root',
        visibility: 'WORKSPACE',
        createdBy: 'user-1',
      }),
    ])

    const service = new DocumentTrashService(
      prisma as never,
      createDocumentAccessServiceMock({
        assertCanEditDocument: vi.fn(async () => createAccessibleDocument({
          id: 'doc-root',
          workspaceId: 'workspace-team-1',
          visibility: 'WORKSPACE',
          createdBy: 'user-1',
          workspaceType: 'TEAM',
        })),
      }) as never,
    )

    await service.deleteDocument('user-1', 'doc-root')

    expect(prisma.document.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['doc-root', 'doc-child'],
        },
      },
      data: {
        trashedAt: expect.any(Date),
        trashedBy: 'user-1',
      },
    })
    expect(prisma.documentRecentVisit.deleteMany).toHaveBeenCalledWith({
      where: {
        documentId: {
          in: ['doc-root', 'doc-child'],
        },
      },
    })
    expect(prisma.document.deleteMany).not.toHaveBeenCalled()
  })

  it('getTrashDocuments 只返回回收站根节点，并带上删除时间', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-trash-root',
        workspaceId: 'workspace-team-1',
        title: '已删除根文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
      createPersistedDocument({
        id: 'doc-trash-child',
        workspaceId: 'workspace-team-1',
        parentId: 'doc-trash-root',
        title: '已删除子文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
    ])

    const service = new DocumentTrashService(prisma as never, createDocumentAccessServiceMock() as never)
    const result = await service.getTrashDocuments('user-1', 'workspace-team-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'doc-trash-root',
        title: '已删除根文档',
        collection: 'team',
        trashedAt: '2026-04-21T08:00:00.000Z',
      }),
    ])
  })

  it('getTrashDocuments 不返回团队中他人的私有回收站文档', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-trash-team',
        workspaceId: 'workspace-team-1',
        title: '团队回收站文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T10:00:00.000Z'),
      }),
      createPersistedDocument({
        id: 'doc-trash-own-private',
        workspaceId: 'workspace-team-1',
        title: '我的私有草稿',
        visibility: 'PRIVATE',
        createdBy: 'user-1',
        trashedAt: new Date('2026-04-21T09:00:00.000Z'),
      }),
      createPersistedDocument({
        id: 'doc-trash-other-private',
        workspaceId: 'workspace-team-1',
        title: '别人的私有草稿',
        visibility: 'PRIVATE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
    ])

    const service = new DocumentTrashService(prisma as never, createDocumentAccessServiceMock() as never)
    const result = await service.getTrashDocuments('user-1', 'workspace-team-1')

    expect(result.map(item => item.id)).toEqual(['doc-trash-team', 'doc-trash-own-private'])
  })

  it('restoreDocumentFromTrash 会恢复整棵子树且不自动恢复最近访问', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-trash-root',
        workspaceId: 'workspace-team-1',
        title: '已删除根文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
      createPersistedDocument({
        id: 'doc-trash-child',
        workspaceId: 'workspace-team-1',
        parentId: 'doc-trash-root',
        title: '已删除子文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
    ])

    const service = new DocumentTrashService(
      prisma as never,
      createDocumentAccessServiceMock({
        assertCanManageTrashedDocument: vi.fn(async () => ({
          ...createAccessibleDocument({
            id: 'doc-trash-root',
            workspaceId: 'workspace-team-1',
            visibility: 'WORKSPACE',
            createdBy: 'user-2',
          }),
          trashedAt: new Date('2026-04-21T08:00:00.000Z'),
          trashedBy: 'user-1',
        })),
      }) as never,
    )

    await service.restoreDocumentFromTrash('user-1', 'doc-trash-root')

    expect(prisma.document.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['doc-trash-root', 'doc-trash-child'],
        },
      },
      data: {
        trashedAt: null,
        trashedBy: null,
      },
    })
    expect(prisma.documentRecentVisit.deleteMany).not.toHaveBeenCalled()
  })

  it('restoreDocumentFromTrash 拒绝恢复他人的团队私有回收站文档', async () => {
    const prisma = createPrismaMock()
    const service = new DocumentTrashService(
      prisma as never,
      createDocumentAccessServiceMock({
        assertCanManageTrashedDocument: vi.fn(async () => {
          throw new NotFoundException('Document "doc-trash-other-private" not found')
        }),
      }) as never,
    )

    await expect(service.restoreDocumentFromTrash('user-1', 'doc-trash-other-private')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(prisma.document.updateMany).not.toHaveBeenCalled()
  })

  it('permanentlyDeleteDocument 会彻底删除回收站中的整棵子树', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([
      createPersistedDocument({
        id: 'doc-trash-root',
        workspaceId: 'workspace-team-1',
        title: '已删除根文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
      createPersistedDocument({
        id: 'doc-trash-child',
        workspaceId: 'workspace-team-1',
        parentId: 'doc-trash-root',
        title: '已删除子文档',
        visibility: 'WORKSPACE',
        createdBy: 'user-2',
        trashedAt: new Date('2026-04-21T08:00:00.000Z'),
      }),
    ])

    const service = new DocumentTrashService(
      prisma as never,
      createDocumentAccessServiceMock({
        assertCanManageTrashedDocument: vi.fn(async () => ({
          ...createAccessibleDocument({
            id: 'doc-trash-root',
            workspaceId: 'workspace-team-1',
            visibility: 'WORKSPACE',
            createdBy: 'user-2',
          }),
          trashedAt: new Date('2026-04-21T08:00:00.000Z'),
          trashedBy: 'user-1',
        })),
      }) as never,
    )

    await service.permanentlyDeleteDocument('user-1', 'doc-trash-root')

    expect(prisma.document.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['doc-trash-root', 'doc-trash-child'],
        },
      },
    })
  })

  it('permanentlyDeleteDocument 拒绝彻底删除他人的团队私有回收站文档', async () => {
    const prisma = createPrismaMock()
    const service = new DocumentTrashService(
      prisma as never,
      createDocumentAccessServiceMock({
        assertCanManageTrashedDocument: vi.fn(async () => {
          throw new NotFoundException('Document "doc-trash-other-private" not found')
        }),
      }) as never,
    )

    await expect(service.permanentlyDeleteDocument('user-1', 'doc-trash-other-private')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(prisma.document.deleteMany).not.toHaveBeenCalled()
  })
})
