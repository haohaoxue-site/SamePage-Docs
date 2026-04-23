import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { PersonalWorkspacesService } from '../personal-workspaces.service'

function createPrismaMock() {
  const user = {
    findUnique: vi.fn(),
  }
  const workspace = {
    create: vi.fn(),
  }
  const workspaceMember = {
    findFirst: vi.fn(),
  }

  return {
    user,
    workspace,
    workspaceMember,
  }
}

describe('personalWorkspacesService', () => {
  it('provisionPersonalWorkspaceForUser 遇到已有 personal membership 时不会再创建第二个 workspace', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspace: {
        id: 'workspace_personal_1',
        type: 'PERSONAL',
        name: 'Personal SP-ABC2345',
        description: null,
        iconUrl: null,
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
        updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      },
    })

    const service = new PersonalWorkspacesService(prisma as never)
    const workspace = await service.provisionPersonalWorkspaceForUser({
      userId: 'user_1',
      userCode: 'SP-ABC2345',
    })

    expect(prisma.workspace.create).not.toHaveBeenCalled()
    expect(workspace).toEqual({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
  })

  it('provisionPersonalWorkspaceForUser 会创建 personal workspace 与 ACTIVE OWNER 成员关系', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst.mockResolvedValue(null)
    prisma.workspace.create.mockResolvedValue({
      id: 'workspace_personal_1',
      name: 'Personal SP-ABC2345',
      slug: 'personal-sp-abc2345',
      type: 'PERSONAL',
      description: null,
      iconUrl: null,
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    })

    const service = new PersonalWorkspacesService(prisma as never)

    await service.provisionPersonalWorkspaceForUser({
      userId: 'user_1',
      userCode: 'SP-ABC2345',
    })

    expect(prisma.workspace.create).toHaveBeenCalledWith({
      data: {
        type: 'PERSONAL',
        name: 'Personal SP-ABC2345',
        slug: 'personal-sp-abc2345',
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
  })

  it('getPersonalWorkspace 在缺少 personal membership 时会按 userCode 自动补建', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      userCode: 'SP-ABC2345',
    })
    prisma.workspace.create.mockResolvedValue({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      slug: 'personal-sp-abc2345',
      description: null,
      iconUrl: null,
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    })

    const service = new PersonalWorkspacesService(prisma as never)
    const workspace = await service.getPersonalWorkspace('user_1')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: {
        id: true,
        userCode: true,
      },
    })
    expect(workspace).toEqual({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
  })

  it('provisionPersonalWorkspaceForUser 遇到唯一约束冲突时会回读已有 personal workspace', async () => {
    const prisma = createPrismaMock()
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        workspace: {
          id: 'workspace_personal_1',
          type: 'PERSONAL',
          name: 'Personal SP-ABC2345',
          description: null,
          iconUrl: null,
          createdAt: new Date('2026-04-21T00:00:00.000Z'),
          updatedAt: new Date('2026-04-21T00:00:00.000Z'),
        },
      })
    prisma.workspace.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`slug`)',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    ))

    const service = new PersonalWorkspacesService(prisma as never)
    const workspace = await service.provisionPersonalWorkspaceForUser({
      userId: 'user_1',
      userCode: 'SP-ABC2345',
    })

    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledTimes(2)
    expect(prisma.workspace.create).toHaveBeenCalledTimes(1)
    expect(workspace).toEqual({
      id: 'workspace_personal_1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
  })
})
