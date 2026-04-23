import type { TeamWorkspaceMembersService } from '../team-workspace-members.service'
import { Buffer } from 'node:buffer'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { TeamWorkspacesService } from '../team-workspaces.service'

function createPrismaMock() {
  const workspace = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  }
  const workspaceMember = {
    findFirst: vi.fn(),
  }

  return {
    workspace,
    workspaceMember,
    $bypass: {
      workspace,
    },
  }
}

function createStorageServiceMock() {
  return {
    putObject: vi.fn(),
    getObject: vi.fn(),
    deleteObject: vi.fn(),
  }
}

function createTeamWorkspaceMembersServiceMock(overrides: Partial<TeamWorkspaceMembersService> = {}) {
  return {
    assertOwnerCanManageTeamWorkspace: vi.fn(async () => {}),
    getOwnedTeamWorkspaceSummary: vi.fn(async () => ({
      id: 'workspace_team_1',
      type: 'TEAM' as const,
      name: '产品团队',
      description: '协作空间',
      iconUrl: 'http://localhost:3000/api/workspaces/icon/workspace_team_1?v=2',
      slug: 'product-team',
      role: 'OWNER' as const,
      status: 'ACTIVE' as const,
      joinedAt: '2026-04-21T00:00:00.000Z',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })),
    ...overrides,
  } satisfies Partial<TeamWorkspaceMembersService>
}

describe('teamWorkspacesService', () => {
  it('createTeamWorkspace 会唯一化 slug 并创建唯一 OWNER', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findFirst
      .mockResolvedValueOnce({ id: 'workspace_team_existing' })
      .mockResolvedValueOnce(null)
    prisma.workspace.create.mockResolvedValue({
      id: 'workspace_team_2',
      type: 'TEAM',
      name: '研发团队',
      description: '平台协作',
      iconUrl: null,
      slug: 'team-2',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      members: [{
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date('2026-04-21T00:00:00.000Z'),
      }],
    })

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )
    const workspace = await service.createTeamWorkspace('user_1', {
      name: '研发团队',
      description: '平台协作',
    })

    expect(prisma.workspace.findFirst).toHaveBeenNthCalledWith(1, {
      where: { slug: 'team' },
      select: { id: true },
    })
    expect(prisma.workspace.findFirst).toHaveBeenNthCalledWith(2, {
      where: { slug: 'team-2' },
      select: { id: true },
    })
    expect(prisma.workspace.create).toHaveBeenCalledWith({
      data: {
        type: 'TEAM',
        name: '研发团队',
        description: '平台协作',
        slug: 'team-2',
        members: {
          create: {
            userId: 'user_1',
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: expect.any(Date),
          },
        },
      },
      select: expect.any(Object),
    })
    expect(workspace).toEqual(expect.objectContaining({
      slug: 'team-2',
      role: 'OWNER',
    }))
  })

  it('updateTeamWorkspaceIcon 会写入存储并返回更新后的团队空间摘要', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: 'workspace-icon/workspace_team_1/old.png',
    })
    prisma.workspace.update.mockResolvedValue(undefined)

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )
    const workspace = await service.updateTeamWorkspaceIcon('user_1', 'workspace_team_1', {
      fileName: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    })

    expect(teamWorkspaceMembersService.assertOwnerCanManageTeamWorkspace).toHaveBeenCalledWith(
      'user_1',
      'workspace_team_1',
      prisma,
    )
    expect(storageService.putObject).toHaveBeenCalledWith(expect.objectContaining({
      bucket: 'workspace-icon',
      contentType: 'image/png',
      contentDisposition: expect.objectContaining({
        fileName: 'logo.png',
      }),
    }))
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: 'workspace_team_1' },
      data: {
        iconUrl: expect.stringContaining('/workspaces/icon/workspace_team_1?v='),
        iconStorageKey: expect.stringContaining('workspace-icon/workspace_team_1/'),
      },
    })
    expect(storageService.deleteObject).toHaveBeenCalledWith({
      bucket: 'workspace-icon',
      key: 'workspace-icon/workspace_team_1/old.png',
    })
    expect(workspace).toEqual(expect.objectContaining({
      id: 'workspace_team_1',
      iconUrl: 'http://localhost:3000/api/workspaces/icon/workspace_team_1?v=2',
    }))
  })

  it('updateTeamWorkspaceIcon 在数据库写入失败时会回收新上传对象', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: 'workspace-icon/workspace_team_1/old.png',
    })
    prisma.workspace.update.mockRejectedValue(new Error('db write failed'))

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.updateTeamWorkspaceIcon('user_1', 'workspace_team_1', {
      fileName: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    })).rejects.toThrow('db write failed')

    const uploadedStorageKey = storageService.putObject.mock.calls[0]?.[0]?.key

    expect(uploadedStorageKey).toEqual(expect.stringContaining('workspace-icon/workspace_team_1/'))
    expect(storageService.deleteObject).toHaveBeenCalledTimes(1)
    expect(storageService.deleteObject).toHaveBeenCalledWith({
      bucket: 'workspace-icon',
      key: uploadedStorageKey,
    })
  })

  it('updateTeamWorkspaceIcon 在旧图标清理失败时仍返回成功结果', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: 'workspace-icon/workspace_team_1/old.png',
    })
    prisma.workspace.update.mockResolvedValue(undefined)
    storageService.deleteObject.mockRejectedValue(new Error('storage cleanup failed'))

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )
    const workspace = await service.updateTeamWorkspaceIcon('user_1', 'workspace_team_1', {
      fileName: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    })

    expect(storageService.deleteObject).toHaveBeenCalledWith({
      bucket: 'workspace-icon',
      key: 'workspace-icon/workspace_team_1/old.png',
    })
    expect(workspace).toEqual(expect.objectContaining({
      id: 'workspace_team_1',
    }))
  })

  it('deleteWorkspace 不允许删除 PERSONAL Workspace', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      iconStorageKey: null,
    })

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.deleteWorkspace('user_1', 'workspace_personal_1')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.workspace.delete).not.toHaveBeenCalled()
  })

  it('deleteWorkspace 会删除 TEAM Workspace 并清理团队图标对象', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: 'workspace-icon/workspace_team_1/icon.png',
    })
    prisma.workspace.delete.mockResolvedValue({
      id: 'workspace_team_1',
    })

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.deleteWorkspace('user_1', 'workspace_team_1')).resolves.toBeNull()
    expect(teamWorkspaceMembersService.assertOwnerCanManageTeamWorkspace).toHaveBeenCalledWith(
      'user_1',
      'workspace_team_1',
    )
    expect(prisma.$bypass.workspace.delete).toHaveBeenCalledWith({
      where: {
        id: 'workspace_team_1',
      },
    })
    expect(storageService.deleteObject).toHaveBeenCalledWith({
      bucket: 'workspace-icon',
      key: 'workspace-icon/workspace_team_1/icon.png',
    })
  })

  it('deleteWorkspace 会拒绝非 OWNER 删除 TEAM Workspace', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock({
      assertOwnerCanManageTeamWorkspace: vi.fn(async () => {
        throw new NotFoundException('未找到可管理的团队空间')
      }),
    })
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: null,
    })

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.deleteWorkspace('user_member', 'workspace_team_1')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.$bypass.workspace.delete).not.toHaveBeenCalled()
  })

  it('deleteWorkspace 在图标清理失败时仍返回成功', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace_team_1',
      type: 'TEAM',
      iconStorageKey: 'workspace-icon/workspace_team_1/icon.png',
    })
    prisma.workspace.delete.mockResolvedValue({
      id: 'workspace_team_1',
    })
    storageService.deleteObject.mockRejectedValue(new Error('storage cleanup failed'))

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )

    await expect(service.deleteWorkspace('user_1', 'workspace_team_1')).resolves.toBeNull()
    expect(prisma.$bypass.workspace.delete).toHaveBeenCalledWith({
      where: {
        id: 'workspace_team_1',
      },
    })
  })

  it('getWorkspaceIcon 会返回已保存的空间图标对象', async () => {
    const prisma = createPrismaMock()
    const storageService = createStorageServiceMock()
    const teamWorkspaceMembersService = createTeamWorkspaceMembersServiceMock()
    prisma.workspace.findUnique.mockResolvedValue({
      iconStorageKey: 'workspace-icon/workspace_team_1/icon.png',
    })
    storageService.getObject.mockResolvedValue({
      body: Buffer.from('icon'),
      contentType: 'image/png',
      contentLength: 4,
    })

    const service = new TeamWorkspacesService(
      prisma as never,
      storageService as never,
      teamWorkspaceMembersService as never,
    )
    const icon = await service.getWorkspaceIcon('workspace_team_1')

    expect(storageService.getObject).toHaveBeenCalledWith({
      bucket: 'workspace-icon',
      key: 'workspace-icon/workspace_team_1/icon.png',
    })
    expect(icon.contentType).toBe('image/png')
  })
})
