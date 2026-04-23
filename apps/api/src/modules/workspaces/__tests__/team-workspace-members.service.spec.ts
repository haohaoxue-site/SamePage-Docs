import { BadRequestException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { TeamWorkspaceMembersService } from '../team-workspace-members.service'

function createPrismaMock() {
  const workspaceMember = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }

  const transactionClient = {
    workspaceMember,
  }

  return {
    workspaceMember,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
  }
}

describe('teamWorkspaceMembersService', () => {
  it('listVisibleTeamWorkspaces 只返回当前用户 ACTIVE 的 TEAM workspace', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findMany.mockResolvedValue([
      {
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date('2026-04-21T00:00:00.000Z'),
        workspace: {
          id: 'workspace_team_1',
          type: 'TEAM',
          name: '产品团队',
          description: '协作空间',
          iconUrl: null,
          slug: 'product-team',
          createdAt: new Date('2026-04-20T00:00:00.000Z'),
          updatedAt: new Date('2026-04-21T00:00:00.000Z'),
        },
      },
    ])

    const service = new TeamWorkspaceMembersService(prisma as never)
    const workspaces = await service.listVisibleTeamWorkspaces('user_1')

    expect(workspaces).toEqual([
      expect.objectContaining({
        id: 'workspace_team_1',
        role: 'OWNER',
        status: 'ACTIVE',
      }),
    ])
  })

  it('listTeamWorkspaceMembers 会返回当前团队所有 ACTIVE 成员', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      role: 'OWNER',
      status: 'ACTIVE',
    })
    prisma.workspaceMember.findMany.mockResolvedValue([
      {
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date('2026-04-21T00:00:00.000Z'),
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        updatedAt: new Date('2026-04-21T01:00:00.000Z'),
        user: {
          id: 'user_owner',
          email: 'owner@example.com',
          displayName: '空间所有者',
          avatarUrl: null,
          userCode: 'SP-OWNER01',
        },
      },
      {
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date('2026-04-22T00:00:00.000Z'),
        createdAt: new Date('2026-04-22T00:00:00.000Z'),
        updatedAt: new Date('2026-04-22T00:00:00.000Z'),
        user: {
          id: 'user_member',
          email: null,
          displayName: '团队成员',
          avatarUrl: 'https://example.com/avatar.png',
          userCode: 'SP-MEMBER1',
        },
      },
    ])

    const service = new TeamWorkspaceMembersService(prisma as never)
    const members = await service.listTeamWorkspaceMembers('user_owner', 'workspace_team_1')

    expect(members).toEqual([
      {
        user: {
          id: 'user_owner',
          email: 'owner@example.com',
          displayName: '空间所有者',
          avatarUrl: null,
          userCode: 'SP-OWNER01',
        },
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-04-21T00:00:00.000Z',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-21T01:00:00.000Z',
      },
      {
        user: {
          id: 'user_member',
          email: null,
          displayName: '团队成员',
          avatarUrl: 'https://example.com/avatar.png',
          userCode: 'SP-MEMBER1',
        },
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: '2026-04-22T00:00:00.000Z',
        createdAt: '2026-04-22T00:00:00.000Z',
        updatedAt: '2026-04-22T00:00:00.000Z',
      },
    ])
  })

  it('activateOrCreateInvitedTeamMember 会把 LEFT 成员恢复为 ACTIVE MEMBER', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findUnique.mockResolvedValue({
      status: 'LEFT',
    })

    const service = new TeamWorkspaceMembersService(prisma as never)
    await service.activateOrCreateInvitedTeamMember('workspace_team_1', 'user_2')

    expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId: 'workspace_team_1',
          userId: 'user_2',
        },
      },
      data: {
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: expect.any(Date),
      },
    })
  })

  it('transferTeamWorkspaceOwnership 会把当前 OWNER 降为 MEMBER 并提升目标 ACTIVE MEMBER', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspace: {
        id: 'workspace_team_1',
      },
    })
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: 'MEMBER',
      status: 'ACTIVE',
    })

    const service = new TeamWorkspaceMembersService(prisma as never)
    await service.transferTeamWorkspaceOwnership('user_owner', 'workspace_team_1', 'user_member')

    expect(prisma.workspaceMember.update).toHaveBeenNthCalledWith(1, {
      where: {
        workspaceId_userId: {
          workspaceId: 'workspace_team_1',
          userId: 'user_owner',
        },
      },
      data: {
        role: 'MEMBER',
      },
    })
    expect(prisma.workspaceMember.update).toHaveBeenNthCalledWith(2, {
      where: {
        workspaceId_userId: {
          workspaceId: 'workspace_team_1',
          userId: 'user_member',
        },
      },
      data: {
        role: 'OWNER',
      },
    })
  })

  it('leaveTeamWorkspace 会拒绝 OWNER 直接退出团队', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      role: 'OWNER',
    })

    const service = new TeamWorkspaceMembersService(prisma as never)

    await expect(service.leaveTeamWorkspace('user_owner', 'workspace_team_1')).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: '请先转移团队所有权',
      }),
    )
  })

  it('leaveTeamWorkspace 会把 ACTIVE MEMBER 标记为 LEFT', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      role: 'MEMBER',
    })

    const service = new TeamWorkspaceMembersService(prisma as never)
    await expect(service.leaveTeamWorkspace('user_member', 'workspace_team_1')).resolves.toBeNull()

    expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId: 'workspace_team_1',
          userId: 'user_member',
        },
      },
      data: {
        status: 'LEFT',
      },
    })
  })

  it('removeTeamWorkspaceMember 会拒绝 OWNER 移除自己', async () => {
    const prisma = createPrismaMock()
    const service = new TeamWorkspaceMembersService(prisma as never)

    await expect(service.removeTeamWorkspaceMember('user_owner', 'workspace_team_1', 'user_owner')).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: '不能移除自己',
      }),
    )
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled()
  })

  it('removeTeamWorkspaceMember 会拒绝移除不存在的 ACTIVE 团队成员', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspace: {
        id: 'workspace_team_1',
      },
    })
    prisma.workspaceMember.findUnique.mockResolvedValue(null)

    const service = new TeamWorkspaceMembersService(prisma as never)

    await expect(service.removeTeamWorkspaceMember('user_owner', 'workspace_team_1', 'user_missing')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('removeTeamWorkspaceMember 会把 ACTIVE MEMBER 标记为 REMOVED', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspace: {
        id: 'workspace_team_1',
      },
    })
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: 'MEMBER',
      status: 'ACTIVE',
    })

    const service = new TeamWorkspaceMembersService(prisma as never)
    await expect(service.removeTeamWorkspaceMember('user_owner', 'workspace_team_1', 'user_member')).resolves.toBeNull()

    expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId: 'workspace_team_1',
          userId: 'user_member',
        },
      },
      data: {
        status: 'REMOVED',
      },
    })
  })
})
