import type { TeamWorkspaceMembersService } from '../team-workspace-members.service'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { TeamWorkspaceInvitesService } from '../team-workspace-invites.service'

function createPrismaMock() {
  const user = {
    findUnique: vi.fn(),
  }
  const workspaceInvite = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }
  const workspaceMember = {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  }

  const transactionClient = {
    workspaceInvite,
    workspaceMember,
  }

  return {
    user,
    workspaceInvite,
    workspaceMember,
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => await callback(transactionClient)),
  }
}

function createDocumentShareRecipientsServiceMock() {
  return {
    removeWorkspaceShareRecipientsForJoinedMember: vi.fn(),
  }
}

function createTeamWorkspaceMembersServiceMock(overrides: Partial<TeamWorkspaceMembersService> = {}) {
  return {
    assertOwnerCanManageTeamWorkspace: vi.fn(async () => {}),
    hasActiveTeamWorkspaceMembership: vi.fn(async () => false),
    activateOrCreateInvitedTeamMember: vi.fn(async () => {}),
    ...overrides,
  } satisfies Partial<TeamWorkspaceMembersService>
}

describe('teamWorkspaceInvitesService', () => {
  it('listPendingWorkspaceInvites 会校验 OWNER 后返回当前团队待处理邀请', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspaceInvite.findMany.mockResolvedValue([
      {
        id: 'invite_1',
        status: 'PENDING',
        workspace: {
          id: 'workspace_team_1',
          name: '产品团队',
        },
        inviteeUser: {
          id: 'user_2',
          email: 'invitee@example.com',
          displayName: '待邀请用户',
          avatarUrl: null,
          userCode: 'SP-NVTTEX2',
        },
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
        updatedAt: new Date('2026-04-21T10:30:00.000Z'),
      },
    ])

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )
    const invites = await service.listPendingWorkspaceInvites('user_owner', 'workspace_team_1')

    expect(teamWorkspaceMembersService.assertOwnerCanManageTeamWorkspace).toHaveBeenCalledWith(
      'user_owner',
      'workspace_team_1',
    )
    expect(invites).toEqual([
      {
        id: 'invite_1',
        workspaceId: 'workspace_team_1',
        workspaceName: '产品团队',
        invitee: {
          id: 'user_2',
          email: 'invitee@example.com',
          displayName: '待邀请用户',
          avatarUrl: null,
          userCode: 'SP-NVTTEX2',
        },
        status: 'PENDING',
        createdAt: '2026-04-21T10:00:00.000Z',
        updatedAt: '2026-04-21T10:30:00.000Z',
      },
    ])
  })

  it('listPendingWorkspaceInvitesForInvitee 会返回当前用户收到的待处理邀请', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspaceInvite.findMany.mockResolvedValue([
      {
        id: 'invite_1',
        status: 'PENDING',
        workspace: {
          id: 'workspace_team_1',
          name: '产品团队',
        },
        inviteeUser: {
          id: 'user_2',
          email: null,
          displayName: '待邀请用户',
          avatarUrl: null,
          userCode: 'SP-NVTTEX2',
        },
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
        updatedAt: new Date('2026-04-21T10:30:00.000Z'),
      },
    ])

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )
    const invites = await service.listPendingWorkspaceInvitesForInvitee('user_2')

    expect(prisma.workspaceInvite.findMany).toHaveBeenCalledWith({
      where: {
        inviteeUserId: 'user_2',
        status: 'PENDING',
        workspace: {
          type: 'TEAM',
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: expect.any(Object),
    })
    expect(invites).toEqual([
      {
        id: 'invite_1',
        workspaceId: 'workspace_team_1',
        workspaceName: '产品团队',
        invitee: {
          id: 'user_2',
          email: null,
          displayName: '待邀请用户',
          avatarUrl: null,
          userCode: 'SP-NVTTEX2',
        },
        status: 'PENDING',
        createdAt: '2026-04-21T10:00:00.000Z',
        updatedAt: '2026-04-21T10:30:00.000Z',
      },
    ])
  })

  it('createWorkspaceInvite 会按完整 userCode 精确邀请 TEAM 的非成员用户', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      email: 'zhangsan@example.com',
      displayName: '张三',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })
    prisma.workspaceInvite.findFirst.mockResolvedValue(null)
    prisma.workspaceInvite.create.mockResolvedValue({
      id: 'invite_1',
      status: 'PENDING',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'zhangsan@example.com',
        displayName: '张三',
        avatarUrl: null,
        userCode: 'SP-ABC2345',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )
    const invite = await service.createWorkspaceInvite('user_1', 'workspace_team_1', {
      userCode: '  sp-abc2345 ',
    })

    expect(teamWorkspaceMembersService.assertOwnerCanManageTeamWorkspace).toHaveBeenCalledWith(
      'user_1',
      'workspace_team_1',
    )
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { userCode: 'SP-ABC2345' },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        userCode: true,
      },
    })
    expect(teamWorkspaceMembersService.hasActiveTeamWorkspaceMembership).toHaveBeenCalledWith(
      'workspace_team_1',
      'user_2',
    )
    expect(invite).toEqual({
      id: 'invite_1',
      workspaceId: 'workspace_team_1',
      workspaceName: '产品团队',
      invitee: {
        id: 'user_2',
        email: 'zhangsan@example.com',
        displayName: '张三',
        avatarUrl: null,
        userCode: 'SP-ABC2345',
      },
      status: 'PENDING',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
  })

  it('createWorkspaceInvite 会拒绝邀请已经是团队成员的用户', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock({
      hasActiveTeamWorkspaceMembership: vi.fn(async () => true),
    })
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      email: 'member@example.com',
      displayName: '成员',
      avatarUrl: null,
      userCode: 'SP-MEMBER2',
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.createWorkspaceInvite('user_1', 'workspace_team_1', {
      userCode: 'SP-MEMBER2',
    })).rejects.toEqual(expect.objectContaining<Partial<BadRequestException>>({
      message: '该用户已经是团队成员',
    }))
    expect(prisma.workspaceInvite.create).not.toHaveBeenCalled()
  })

  it('createWorkspaceInvite 会拒绝邀请自己', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'owner@example.com',
      displayName: '空间 owner',
      avatarUrl: null,
      userCode: 'SP-ABCD234',
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.createWorkspaceInvite('user_1', 'workspace_team_1', {
      userCode: 'SP-ABCD234',
    })).rejects.toEqual(expect.objectContaining<Partial<BadRequestException>>({
      message: '不能邀请自己',
    }))
    expect(prisma.workspaceInvite.findFirst).not.toHaveBeenCalled()
  })

  it('createWorkspaceInvite 会拦截同一用户重复的 PENDING 邀请', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      email: 'invitee@example.com',
      displayName: '待邀请用户',
      avatarUrl: null,
      userCode: 'SP-NVTTEX2',
    })
    prisma.workspaceInvite.findFirst.mockResolvedValue({
      id: 'invite_pending_1',
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.createWorkspaceInvite('user_1', 'workspace_team_1', {
      userCode: 'SP-NVTTEX2',
    })).rejects.toEqual(expect.objectContaining<Partial<ConflictException>>({
      message: '该用户已在邀请中',
    }))
    expect(prisma.workspaceInvite.create).not.toHaveBeenCalled()
  })

  it('acceptWorkspaceInvite 会恢复 LEFT 成员并清理冗余共享 recipient', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    const documentShareRecipientsService = createDocumentShareRecipientsServiceMock()
    prisma.workspaceInvite.findFirst.mockResolvedValue({
      id: 'invite_1',
      status: 'PENDING',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'invitee@example.com',
        displayName: '待邀请用户',
        avatarUrl: null,
        userCode: 'SP-NVTTEX2',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    })
    prisma.workspaceInvite.update.mockResolvedValue({
      id: 'invite_1',
      status: 'ACCEPTED',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'invitee@example.com',
        displayName: '待邀请用户',
        avatarUrl: null,
        userCode: 'SP-NVTTEX2',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T01:00:00.000Z'),
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
      documentShareRecipientsService as never,
    )
    const invite = await service.acceptWorkspaceInvite('user_2', 'invite_1')

    expect(teamWorkspaceMembersService.activateOrCreateInvitedTeamMember).toHaveBeenCalledWith(
      'workspace_team_1',
      'user_2',
      expect.any(Object),
    )
    expect(documentShareRecipientsService.removeWorkspaceShareRecipientsForJoinedMember).toHaveBeenCalledWith({
      workspaceId: 'workspace_team_1',
      userId: 'user_2',
    }, expect.any(Object))
    expect(invite.status).toBe('ACCEPTED')
  })

  it('cancelWorkspaceInvite 会把待处理邀请改成 CANCELED', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspaceInvite.findFirst.mockResolvedValue({
      id: 'invite_1',
    })
    prisma.workspaceInvite.update.mockResolvedValue({
      id: 'invite_1',
      status: 'CANCELED',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'invitee@example.com',
        displayName: '待邀请用户',
        avatarUrl: null,
        userCode: 'SP-NVTTEX2',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T02:00:00.000Z'),
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )
    const invite = await service.cancelWorkspaceInvite('user_1', 'workspace_team_1', 'invite_1')

    expect(teamWorkspaceMembersService.assertOwnerCanManageTeamWorkspace).toHaveBeenCalledWith(
      'user_1',
      'workspace_team_1',
    )
    expect(invite.status).toBe('CANCELED')
  })

  it('declineWorkspaceInvite 会把受邀人的待处理邀请改成 DECLINED', async () => {
    const prisma = createPrismaMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspaceInvite.findFirst.mockResolvedValue({
      id: 'invite_1',
      status: 'PENDING',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'invitee@example.com',
        displayName: '待邀请用户',
        avatarUrl: null,
        userCode: 'SP-NVTTEX2',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    })
    prisma.workspaceInvite.update.mockResolvedValue({
      id: 'invite_1',
      status: 'DECLINED',
      workspace: {
        id: 'workspace_team_1',
        name: '产品团队',
      },
      inviteeUser: {
        id: 'user_2',
        email: 'invitee@example.com',
        displayName: '待邀请用户',
        avatarUrl: null,
        userCode: 'SP-NVTTEX2',
      },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T03:00:00.000Z'),
    })

    const service = new TeamWorkspaceInvitesService(
      prisma as never,
      teamWorkspaceMembersService as never,
    )
    const invite = await service.declineWorkspaceInvite('user_2', 'invite_1')

    expect(prisma.workspaceInvite.update).toHaveBeenCalledWith({
      where: { id: 'invite_1' },
      data: {
        status: 'DECLINED',
        updatedBy: 'user_2',
      },
      select: expect.any(Object),
    })
    expect(invite.status).toBe('DECLINED')
  })
})
