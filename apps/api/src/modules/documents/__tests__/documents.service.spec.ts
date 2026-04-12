import type { PrismaService } from '../../../database/prisma.service'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { describe, expect, it, vi } from 'vitest'
import { DocumentsService } from '../documents.service'

const baseDocuments = [
  {
    id: 'root',
    ownerId: 'owner-1',
    parentId: null,
    spaceScope: 'PERSONAL',
    title: '产品空间',
    content: '<p>根节点正文</p>',
    summary: '根节点正文',
    status: 'ACTIVE',
    order: 0,
    createdAt: new Date('2026-03-29T08:00:00.000Z'),
    updatedAt: new Date('2026-03-30T08:00:00.000Z'),
    owner: {
      displayName: '张三',
    },
  },
  {
    id: 'child',
    ownerId: 'owner-1',
    parentId: 'root',
    spaceScope: 'PERSONAL',
    title: '接口设计',
    content: '<p>接口正文</p>',
    summary: '接口正文',
    status: 'ACTIVE',
    order: 0,
    createdAt: new Date('2026-03-29T09:00:00.000Z'),
    updatedAt: new Date('2026-03-30T09:00:00.000Z'),
    owner: {
      displayName: '张三',
    },
  },
  {
    id: 'other-root',
    ownerId: 'owner-2',
    parentId: null,
    spaceScope: 'PERSONAL',
    title: '其他空间',
    content: '<p>其他正文</p>',
    summary: '其他正文',
    status: 'ACTIVE',
    order: 0,
    createdAt: new Date('2026-03-29T10:00:00.000Z'),
    updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    owner: {
      displayName: '李四',
    },
  },
] as const

describe('documentsService', () => {
  it('builds shared trees without exposing unauthorized ancestors', async () => {
    const prisma = {
      document: {
        findMany: vi.fn(async () => baseDocuments),
      },
      documentMember: {
        findMany: vi.fn(async () => [{ documentId: 'child' }]),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const sections = await service.getDocumentTree('viewer-1')

    expect(sections.find(section => section.id === DOCUMENT_COLLECTION.PERSONAL)?.nodes).toHaveLength(0)
    expect(sections.find(section => section.id === DOCUMENT_COLLECTION.SHARED)?.nodes).toHaveLength(1)
    expect(sections.find(section => section.id === DOCUMENT_COLLECTION.SHARED)?.nodes[0]?.id).toBe('child')
    expect(sections.find(section => section.id === DOCUMENT_COLLECTION.SHARED)?.nodes[0]?.sharedByDisplayName).toBe('张三')
  })

  it('updates an owned document draft', async () => {
    const prisma = {
      document: {
        findMany: vi.fn(async () => [
          {
            ...baseDocuments[0],
            ownerId: 'user-1',
          },
        ]),
        update: vi.fn(async () => ({
          ...baseDocuments[0],
          ownerId: 'user-1',
          title: '新的标题',
          content: '<p>新的正文</p>',
          summary: '新的正文',
        })),
      },
      documentMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const document = await service.updateDocument('user-1', 'root', {
      title: '新的标题',
      content: '<p>新的正文</p>',
    })

    expect(document.title).toBe('新的标题')
    expect(document.content).toBe('<p>新的正文</p>')
    expect(document.summary).toBe('新的正文')
  })

  it('builds recent documents with bounded ancestor titles', async () => {
    const prisma = {
      document: {
        findMany: vi.fn(async () => [
          {
            ...baseDocuments[0],
            id: 'owned-root',
            ownerId: 'user-1',
            title: '我的空间',
            parentId: null,
            updatedAt: new Date('2026-03-30T08:00:00.000Z'),
          },
          {
            ...baseDocuments[1],
            id: 'owned-child',
            ownerId: 'user-1',
            title: '项目方案',
            parentId: 'owned-root',
            updatedAt: new Date('2026-03-30T09:00:00.000Z'),
          },
          {
            ...baseDocuments[1],
            id: 'owned-leaf',
            ownerId: 'user-1',
            title: '接口设计',
            parentId: 'owned-child',
            updatedAt: new Date('2026-03-30T12:00:00.000Z'),
          },
          {
            ...baseDocuments[0],
            id: 'foreign-root',
            ownerId: 'owner-2',
            title: '外部空间',
            parentId: null,
            updatedAt: new Date('2026-03-30T10:00:00.000Z'),
            owner: {
              displayName: '李四',
            },
          },
          {
            ...baseDocuments[1],
            id: 'shared-root',
            ownerId: 'owner-2',
            title: '共享目录',
            parentId: 'foreign-root',
            updatedAt: new Date('2026-03-30T11:00:00.000Z'),
            owner: {
              displayName: '李四',
            },
          },
          {
            ...baseDocuments[1],
            id: 'shared-child',
            ownerId: 'owner-2',
            title: '共享纪要',
            parentId: 'shared-root',
            updatedAt: new Date('2026-03-30T13:00:00.000Z'),
            owner: {
              displayName: '李四',
            },
          },
        ]),
      },
      documentMember: {
        findMany: vi.fn(async () => [{ documentId: 'shared-root' }]),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const recentDocuments = await service.getRecentDocuments('user-1')

    expect(recentDocuments).toEqual([
      {
        id: 'shared-child',
        title: '共享纪要',
        collection: DOCUMENT_COLLECTION.SHARED,
        ancestorTitles: ['共享目录'],
        createdAt: baseDocuments[1].createdAt.toISOString(),
        updatedAt: '2026-03-30T13:00:00.000Z',
      },
      {
        id: 'owned-leaf',
        title: '接口设计',
        collection: DOCUMENT_COLLECTION.PERSONAL,
        ancestorTitles: ['我的空间', '项目方案'],
        createdAt: baseDocuments[1].createdAt.toISOString(),
        updatedAt: '2026-03-30T12:00:00.000Z',
      },
      {
        id: 'shared-root',
        title: '共享目录',
        collection: DOCUMENT_COLLECTION.SHARED,
        ancestorTitles: [],
        createdAt: baseDocuments[1].createdAt.toISOString(),
        updatedAt: '2026-03-30T11:00:00.000Z',
      },
      {
        id: 'owned-child',
        title: '项目方案',
        collection: DOCUMENT_COLLECTION.PERSONAL,
        ancestorTitles: ['我的空间'],
        createdAt: baseDocuments[1].createdAt.toISOString(),
        updatedAt: '2026-03-30T09:00:00.000Z',
      },
      {
        id: 'owned-root',
        title: '我的空间',
        collection: DOCUMENT_COLLECTION.PERSONAL,
        ancestorTitles: [],
        createdAt: baseDocuments[0].createdAt.toISOString(),
        updatedAt: '2026-03-30T08:00:00.000Z',
      },
    ])
    expect(recentDocuments[0]).not.toHaveProperty('summary')
  })

  it('creates a child document under owned parent', async () => {
    const prisma = {
      document: {
        findMany: vi.fn(async () => [
          {
            ...baseDocuments[0],
            ownerId: 'user-1',
          },
        ]),
        findFirst: vi.fn(async () => ({ order: 2 })),
        create: vi.fn(async () => ({
          ...baseDocuments[1],
          id: 'new-child',
          ownerId: 'user-1',
          parentId: 'root',
          title: '未命名',
          content: '',
          summary: '',
          order: 3,
        })),
      },
      documentMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const document = await service.createDocument('user-1', {
      title: '未命名',
      parentId: 'root',
    })

    expect(document.id).toBe('new-child')
    expect(document.parentId).toBe('root')
    expect(document.collection).toBe(DOCUMENT_COLLECTION.PERSONAL)
  })

  it('removes an owned subtree', async () => {
    const deleteMany = vi.fn(async () => ({ count: 2 }))
    const prisma = {
      document: {
        findMany: vi.fn(async () => [
          {
            ...baseDocuments[0],
            ownerId: 'user-1',
          },
          {
            ...baseDocuments[1],
            ownerId: 'user-1',
          },
        ]),
        deleteMany,
      },
      documentMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    await service.deleteDocument('user-1', 'root')

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['root', 'child'],
        },
      },
    })
  })
})
