import type { PrismaService } from '../../../database/prisma.service'
import { describe, expect, it, vi } from 'vitest'
import { DocumentsService } from '../documents.service'

const baseNodes = [
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
      documentNode: {
        findMany: vi.fn(async () => baseNodes),
      },
      documentNodeMember: {
        findMany: vi.fn(async () => [{ nodeId: 'child' }]),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const sections = await service.findTree('viewer-1')

    expect(sections.find(section => section.id === 'personal')?.nodes).toHaveLength(0)
    expect(sections.find(section => section.id === 'shared')?.nodes).toHaveLength(1)
    expect(sections.find(section => section.id === 'shared')?.nodes[0]?.id).toBe('child')
    expect(sections.find(section => section.id === 'shared')?.nodes[0]?.sharedByDisplayName).toBe('张三')
  })

  it('updates an owned node draft', async () => {
    const prisma = {
      documentNode: {
        findMany: vi.fn(async () => [
          {
            ...baseNodes[0],
            ownerId: 'user-1',
          },
        ]),
        update: vi.fn(async () => ({
          ...baseNodes[0],
          ownerId: 'user-1',
          title: '新的标题',
          content: '<p>新的正文</p>',
          summary: '新的正文',
        })),
      },
      documentNodeMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const document = await service.update('user-1', 'root', {
      title: '新的标题',
      content: '<p>新的正文</p>',
    })

    expect(document.title).toBe('新的标题')
    expect(document.content).toBe('<p>新的正文</p>')
    expect(document.summary).toBe('新的正文')
  })

  it('creates a child node under owned parent', async () => {
    const prisma = {
      documentNode: {
        findMany: vi.fn(async () => [
          {
            ...baseNodes[0],
            ownerId: 'user-1',
          },
        ]),
        findFirst: vi.fn(async () => ({ order: 2 })),
        create: vi.fn(async () => ({
          ...baseNodes[1],
          id: 'new-child',
          ownerId: 'user-1',
          parentId: 'root',
          title: '未命名',
          content: '',
          summary: '',
          order: 3,
        })),
      },
      documentNodeMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    const document = await service.create('user-1', {
      title: '未命名',
      parentId: 'root',
    })

    expect(document.id).toBe('new-child')
    expect(document.parentId).toBe('root')
    expect(document.section).toBe('personal')
  })

  it('removes an owned subtree', async () => {
    const deleteMany = vi.fn(async () => ({ count: 2 }))
    const prisma = {
      documentNode: {
        findMany: vi.fn(async () => [
          {
            ...baseNodes[0],
            ownerId: 'user-1',
          },
          {
            ...baseNodes[1],
            ownerId: 'user-1',
          },
        ]),
        deleteMany,
      },
      documentNodeMember: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaService

    const service = new DocumentsService(prisma)
    await service.remove('user-1', 'root')

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['root', 'child'],
        },
      },
    })
  })
})
