import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DocumentAccessService } from '../document-access.service'

function createPrismaMock() {
  return {
    document: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  }
}

function createWorkspaceMembership(overrides: Partial<{
  workspaceId: string
  workspaceType: 'PERSONAL' | 'TEAM'
}> = {}) {
  return {
    workspace: {
      id: overrides.workspaceId ?? 'workspace-team-1',
      type: overrides.workspaceType ?? 'TEAM',
    },
  }
}

function createPersistedDocument(overrides: Partial<{
  id: string
  workspaceId: string
  parentId: string | null
  visibility: 'PRIVATE' | 'WORKSPACE'
  createdBy: string
  workspaceType: 'PERSONAL' | 'TEAM'
  memberUserIds: string[]
}> = {}) {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-team-1',
    parentId: null,
    visibility: 'WORKSPACE' as const,
    createdBy: 'user-1',
    workspace: {
      type: overrides.workspaceType ?? 'TEAM',
      members: (overrides.memberUserIds ?? ['user-1']).map(userId => ({ userId })),
    },
    ...overrides,
  }
}

describe('documentAccessService', () => {
  it('assertAccessibleWorkspace 返回当前用户可访问的空间摘要', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(createWorkspaceMembership())

    const service = new DocumentAccessService(prisma as never)
    const workspace = await service.assertAccessibleWorkspace('user-1', 'workspace-team-1')

    expect(workspace).toEqual({
      id: 'workspace-team-1',
      type: 'TEAM',
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
  })

  it('listAccessibleWorkspaces 只返回 ACTIVE 成员所在空间', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findMany.mockResolvedValue([
      createWorkspaceMembership({
        workspaceId: 'workspace-personal-1',
        workspaceType: 'PERSONAL',
      }),
      createWorkspaceMembership(),
    ])

    const service = new DocumentAccessService(prisma as never)
    const workspaces = await service.listAccessibleWorkspaces('user-1')

    expect(workspaces).toEqual([
      {
        id: 'workspace-personal-1',
        type: 'PERSONAL',
      },
      {
        id: 'workspace-team-1',
        type: 'TEAM',
      },
    ])
  })

  it('团队私有文档只允许创建者访问', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocument({
      visibility: 'PRIVATE',
      createdBy: 'user-2',
      memberUserIds: ['user-1'],
    }))

    const service = new DocumentAccessService(prisma as never)

    await expect(service.assertCanReadDocument('user-1', 'doc-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('团队文档允许成员访问', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue(createPersistedDocument({
      visibility: 'WORKSPACE',
      createdBy: 'user-2',
      memberUserIds: ['user-1'],
    }))

    const service = new DocumentAccessService(prisma as never)
    const document = await service.assertCanReadDocument('user-1', 'doc-1')

    expect(document).toEqual({
      id: 'doc-1',
      workspaceId: 'workspace-team-1',
      parentId: null,
      visibility: 'WORKSPACE',
      createdBy: 'user-2',
      workspaceType: 'TEAM',
    })
  })

  it('assertCanManageTrashedDocument 会拒绝恢复他人的团队私有回收站文档', async () => {
    const prisma = createPrismaMock()
    prisma.document.findUnique.mockResolvedValue({
      ...createPersistedDocument({
        visibility: 'PRIVATE',
        createdBy: 'user-2',
        memberUserIds: ['user-1'],
      }),
      trashedAt: new Date('2026-04-21T09:00:00.000Z'),
    })

    const service = new DocumentAccessService(prisma as never)

    await expect(service.assertCanManageTrashedDocument('user-1', 'doc-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('hasWorkspaceOwnerAccess 只在当前用户是团队 owner 时返回 true', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      userId: 'user-1',
    })

    const service = new DocumentAccessService(prisma as never)
    const hasOwnerAccess = await service.hasWorkspaceOwnerAccess('user-1', 'workspace-team-1')

    expect(hasOwnerAccess).toBe(true)
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-team-1',
        userId: 'user-1',
        status: 'ACTIVE',
        role: 'OWNER',
      },
      select: {
        userId: true,
      },
    })
  })
})
