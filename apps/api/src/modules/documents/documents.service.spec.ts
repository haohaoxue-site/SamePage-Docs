import {
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentsService } from './documents.service'

function createPrismaMock() {
  const document = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  }
  const documentSnapshot = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  }
  const documentMember = {
    findMany: vi.fn(),
  }

  const transactionClient = {
    document,
    documentSnapshot,
  }

  return {
    document,
    documentSnapshot,
    documentMember,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
  }
}

function createPersistedDocument() {
  return {
    id: 'doc-1',
    ownerId: 'user-1',
    parentId: null,
    spaceScope: 'PERSONAL' as const,
    title: '原始标题',
    latestSnapshotId: 'snapshot-1',
    headRevision: 1,
    summary: '',
    status: 'ACTIVE' as const,
    order: 0,
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
  }
}

function createPersistedSnapshot() {
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
  }
}

describe('documentsService', () => {
  it('createDocumentSnapshot 会推进 headRevision 并回写标题投影', async () => {
    const prisma = createPrismaMock()
    prisma.document.findMany.mockResolvedValue([createPersistedDocument()])
    prisma.documentMember.findMany.mockResolvedValue([])
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 1,
    })
    prisma.documentSnapshot.create.mockResolvedValue(createPersistedSnapshot())
    prisma.document.update.mockResolvedValue(undefined)

    const service = new DocumentsService(prisma as never)
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
    prisma.document.findMany.mockResolvedValue([createPersistedDocument()])
    prisma.documentMember.findMany.mockResolvedValue([])
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 2,
    })

    const service = new DocumentsService(prisma as never)

    await expect(service.createDocumentSnapshot('user-1', 'doc-1', {
      baseRevision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      title: createDocumentTitleContent('新的标题'),
      body: [],
    })).rejects.toBeInstanceOf(ConflictException)
  })

  it('restoreDocumentSnapshot 生成新的 restore snapshot 并记录来源版本', async () => {
    const prisma = createPrismaMock()
    const currentSnapshot = createPersistedSnapshot()
    const targetSnapshot = {
      ...createPersistedSnapshot(),
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
    }
    const restoredSnapshot = {
      ...targetSnapshot,
      id: 'snapshot-3',
      revision: 3,
      source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
      restoredFromSnapshotId: 'snapshot-1',
      createdAt: new Date('2026-04-15T00:00:02.000Z'),
    }

    prisma.document.findMany.mockResolvedValue([createPersistedDocument()])
    prisma.documentMember.findMany.mockResolvedValue([])
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 2,
      latestSnapshot: currentSnapshot,
    })
    prisma.documentSnapshot.findFirst.mockResolvedValue(targetSnapshot)
    prisma.documentSnapshot.create.mockResolvedValue(restoredSnapshot)
    prisma.document.update.mockResolvedValue(undefined)

    const service = new DocumentsService(prisma as never)
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
    const targetSnapshot = {
      ...createPersistedSnapshot(),
      id: 'snapshot-1',
      revision: 1,
      createdAt: new Date('2026-04-14T23:59:00.000Z'),
    }

    prisma.document.findMany.mockResolvedValue([createPersistedDocument()])
    prisma.documentMember.findMany.mockResolvedValue([])
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      headRevision: 2,
      latestSnapshot: currentSnapshot,
    })
    prisma.documentSnapshot.findFirst.mockResolvedValue(targetSnapshot)

    const service = new DocumentsService(prisma as never)
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
