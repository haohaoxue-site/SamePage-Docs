import type { DocumentShareProjection } from '@haohaoxue/samepage-domain'
import type { DocumentAccessService } from '../document-access.service'
import type { DocumentAssetsService } from '../document-assets.service'
import type { DocumentSharesService } from '../document-shares.service'
import {
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentSnapshotsService } from '../document-snapshots.service'

function createPrismaMock() {
  const document = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const documentSnapshot = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  }
  const documentRecentVisit = {
    upsert: vi.fn(),
  }

  const transactionClient = {
    document,
    documentSnapshot,
  }

  return {
    document,
    documentSnapshot,
    documentRecentVisit,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
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

function createPersistedSnapshot(overrides: Partial<{
  id: string
  documentId: string
  revision: number
  title: ReturnType<typeof createDocumentTitleContent>
  body: unknown[]
  source: string
  restoredFromSnapshotId: string | null
  createdAt: Date
}> = {}) {
  return {
    id: 'snapshot-2',
    documentId: 'doc-1',
    revision: 2,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('新的标题'),
    body: [],
    source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
    restoredFromSnapshotId: null,
    createdAt: new Date('2026-04-15T00:00:01.000Z'),
    createdBy: 'user-1',
    createdByUser: {
      id: 'user-1',
      displayName: '测试用户',
      avatarUrl: null,
    },
    ...overrides,
  }
}

function createPersistedDocumentHead(overrides: Partial<{
  id: string
  workspaceId: string
  createdBy: string
  visibility: 'PRIVATE' | 'WORKSPACE'
  parentId: string | null
  title: string
  latestSnapshotId: string | null
  headRevision: number
  summary: string
  status: 'ACTIVE' | 'LOCKED'
  order: number
  latestSnapshot: ReturnType<typeof createPersistedSnapshot>
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-team-1',
    createdBy: 'user-1',
    visibility: 'WORKSPACE' as const,
    parentId: null,
    title: '测试文档',
    latestSnapshotId: 'snapshot-2',
    headRevision: 2,
    summary: '',
    status: 'ACTIVE' as const,
    order: 0,
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    latestSnapshot: createPersistedSnapshot(),
    ...overrides,
  }
}

function createDocumentAssetsServiceMock(overrides: Partial<DocumentAssetsService> = {}) {
  return {
    assertAssetsBelongToDocument: vi.fn(async () => {}),
    ...overrides,
  } satisfies Pick<DocumentAssetsService, 'assertAssetsBelongToDocument'>
}

function createDocumentAccessServiceMock(overrides: Partial<DocumentAccessService> = {}) {
  return {
    assertCanReadDocument: vi.fn(async () => createAccessibleDocument()),
    assertCanEditDocument: vi.fn(async () => createAccessibleDocument()),
    ...overrides,
  } satisfies Pick<DocumentAccessService, 'assertCanReadDocument' | 'assertCanEditDocument'>
}

function createDocumentSharesServiceMock(overrides: Partial<DocumentSharesService> = {}) {
  return {
    resolveDocumentShareProjectionForDocument: vi.fn(async () => null),
    ...overrides,
  } satisfies Pick<DocumentSharesService, 'resolveDocumentShareProjectionForDocument'>
}

describe('documentSnapshotsService', () => {
  it('getDocumentHead 会委托 DocumentAccessService.assertCanReadDocument', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocumentHead({
      id: 'doc-1',
      title: '测试文档',
    }))

    const documentAccessService = createDocumentAccessServiceMock({
      assertCanReadDocument: vi.fn(async () => createAccessibleDocument({
        id: 'doc-1',
      })),
    })
    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      documentAccessService as never,
      createDocumentSharesServiceMock() as never,
    )

    await service.getDocumentHead('user-1', 'doc-1')

    expect(documentAccessService.assertCanReadDocument).toHaveBeenCalledWith('user-1', 'doc-1')
    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      select: expect.any(Object),
    })
  })

  it('getDocumentHead 会把祖先共享根节点投影到子文档', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocumentHead({
      id: 'team-doc-child',
      parentId: 'team-doc-root',
      title: '共享子文档',
    }))

    const shareProjection: DocumentShareProjection = {
      localPolicy: null,
      effectivePolicy: {
        mode: 'DIRECT_USER',
        shareId: 'share-team-root',
        rootDocumentId: 'team-doc-root',
        rootDocumentTitle: 'owner service 根投影',
        updatedAt: '2026-04-20T00:00:00.000Z',
        updatedBy: 'user-9',
      },
    }
    const documentSharesService = createDocumentSharesServiceMock({
      resolveDocumentShareProjectionForDocument: vi.fn(async () => shareProjection),
    })
    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      documentSharesService as never,
    )
    const result = await service.getDocumentHead('user-1', 'team-doc-child')

    expect(documentSharesService.resolveDocumentShareProjectionForDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'team-doc-child',
        workspaceId: 'workspace-team-1',
        parentId: 'team-doc-root',
        title: '共享子文档',
      }),
    )
    expect(result.document.share).toEqual(shareProjection)
  })

  it('getDocumentHead 默认不记录 recent visit', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocumentHead())

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )

    await service.getDocumentHead('user-1', 'doc-1')

    expect(prisma.documentRecentVisit.upsert).not.toHaveBeenCalled()
  })

  it('getDocumentHead 仅在显式 recordVisit 时才记录 recent visit', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocumentHead())

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )

    await service.getDocumentHead('user-1', 'doc-1', { recordVisit: true })

    expect(prisma.documentRecentVisit.upsert).toHaveBeenCalledWith({
      where: {
        documentId_userId: {
          documentId: 'doc-1',
          userId: 'user-1',
        },
      },
      create: {
        documentId: 'doc-1',
        userId: 'user-1',
        routeKind: 'DOCUMENT',
        routeEntryId: null,
        visitedAt: expect.any(Date),
      },
      update: {
        routeKind: 'DOCUMENT',
        routeEntryId: null,
        visitedAt: expect.any(Date),
      },
    })
  })

  it('createDocumentSnapshot 会推进 headRevision 并回写标题投影', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 1,
    })
    prisma.documentSnapshot.create.mockResolvedValue(createPersistedSnapshot())
    prisma.document.update.mockResolvedValue(undefined)

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )
    const result = await service.createDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      title: createDocumentTitleContent('新的标题'),
      body: [],
    })

    expect(result.headRevision).toBe(2)
    expect(result.snapshot.id).toBe('snapshot-2')
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: {
        latestSnapshotId: 'snapshot-2',
        headRevision: 2,
        title: '新的标题',
        summary: '',
      },
    })
  })

  it('createDocumentSnapshot 在 baseRevision 不匹配时拒绝覆盖', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 2,
    })

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )

    await expect(service.createDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      title: createDocumentTitleContent('新的标题'),
      body: [],
    })).rejects.toBeInstanceOf(ConflictException)
  })

  it('createDocumentSnapshot 会校验正文里所有 assetId 都属于当前文档', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 1,
    })
    prisma.documentSnapshot.create.mockResolvedValue(createPersistedSnapshot())
    prisma.document.update.mockResolvedValue(undefined)

    const documentAssetsService = createDocumentAssetsServiceMock()
    const service = new DocumentSnapshotsService(
      prisma as never,
      documentAssetsService as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )

    await service.createDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      title: createDocumentTitleContent('新的标题'),
      body: [
        {
          type: 'image',
          attrs: {
            id: 'block_a',
            assetId: 'asset_1',
            src: '/runtime/1',
          },
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'image',
              attrs: {
                id: 'block_b',
                assetId: 'asset_1',
              },
            },
            {
              type: 'image',
              attrs: {
                id: 'block_c',
                assetId: 'asset_2',
              },
            },
          ],
        },
      ],
    })

    expect(documentAssetsService.assertAssetsBelongToDocument).toHaveBeenCalledWith({
      documentId: 'doc-1',
      assetIds: ['asset_1', 'asset_2'],
    })
  })

  it('getDocumentSnapshots 会按 revision 倒序返回快照历史', async () => {
    const prisma = createPrismaMock()
    prisma.documentSnapshot.findMany.mockResolvedValue([
      createPersistedSnapshot({
        id: 'snapshot-3',
        revision: 3,
      }),
      createPersistedSnapshot({
        id: 'snapshot-2',
        revision: 2,
      }),
    ])

    const documentAccessService = createDocumentAccessServiceMock()
    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      documentAccessService as never,
      createDocumentSharesServiceMock() as never,
    )
    const snapshots = await service.getDocumentSnapshots('user-1', 'doc-1')

    expect(documentAccessService.assertCanReadDocument).toHaveBeenCalledWith('user-1', 'doc-1')
    expect(prisma.documentSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
      },
      select: expect.any(Object),
      orderBy: {
        revision: 'desc',
      },
    })
    expect(snapshots.map(snapshot => snapshot.id)).toEqual(['snapshot-3', 'snapshot-2'])
  })

  it('restoreDocumentSnapshot 生成新的 restore snapshot 并记录来源版本', async () => {
    const prisma = createPrismaMock()
    const currentSnapshot = createPersistedSnapshot()
    const targetSnapshot = createPersistedSnapshot({
      id: 'snapshot-1',
      revision: 1,
      title: createDocumentTitleContent('旧标题'),
      body: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '旧正文' }],
        },
      ],
      createdAt: new Date('2026-04-14T23:59:00.000Z'),
    })
    const restoredSnapshot = createPersistedSnapshot({
      id: 'snapshot-3',
      revision: 3,
      title: createDocumentTitleContent('旧标题'),
      body: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '旧正文' }],
        },
      ],
      source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
      restoredFromSnapshotId: 'snapshot-1',
      createdAt: new Date('2026-04-15T00:00:02.000Z'),
    })

    prisma.document.findUnique.mockResolvedValue({
      headRevision: 2,
      latestSnapshot: currentSnapshot,
    })
    prisma.documentSnapshot.findFirst.mockResolvedValue(targetSnapshot)
    prisma.documentSnapshot.create.mockResolvedValue(restoredSnapshot)
    prisma.document.update.mockResolvedValue(undefined)

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )
    const result = await service.restoreDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 2,
      snapshotId: 'snapshot-1',
    })

    expect(result.headRevision).toBe(3)
    expect(result.snapshot.id).toBe('snapshot-3')
    expect(result.snapshot.restoredFromSnapshotId).toBe('snapshot-1')
    expect(prisma.documentSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-1',
        revision: 3,
        source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
        restoredFromSnapshotId: 'snapshot-1',
        createdBy: 'user-1',
      }),
      select: expect.any(Object),
    })
  })

  it('restoreDocumentSnapshot 在目标内容已是当前 head 时不追加历史', async () => {
    const prisma = createPrismaMock()
    const currentSnapshot = createPersistedSnapshot()
    const targetSnapshot = createPersistedSnapshot({
      id: 'snapshot-1',
      revision: 1,
      createdAt: new Date('2026-04-14T23:59:00.000Z'),
    })

    prisma.document.findUnique.mockResolvedValue({
      headRevision: 2,
      latestSnapshot: currentSnapshot,
    })
    prisma.documentSnapshot.findFirst.mockResolvedValue(targetSnapshot)

    const service = new DocumentSnapshotsService(
      prisma as never,
      createDocumentAssetsServiceMock() as never,
      createDocumentAccessServiceMock() as never,
      createDocumentSharesServiceMock() as never,
    )
    const result = await service.restoreDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 2,
      snapshotId: 'snapshot-1',
    })

    expect(result.headRevision).toBe(2)
    expect(result.snapshot.id).toBe(currentSnapshot.id)
    expect(prisma.documentSnapshot.create).not.toHaveBeenCalled()
    expect(prisma.document.update).not.toHaveBeenCalled()
  })
})
