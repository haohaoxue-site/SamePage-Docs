import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { UsersService } from '../users.service'

function createUsersService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
  }
  const rbacService = {
    getUserRoleAndPermissions: vi.fn(),
  }
  const userAvatarsService = {
    removeAvatarObject: vi.fn(),
  }

  return {
    prisma,
    service: new UsersService(
      prisma as never,
      rbacService as never,
      userAvatarsService as never,
    ),
  }
}

describe('usersService.findUserByUserCode', () => {
  it('会 trim 并大小写不敏感地精确命中 userCode', async () => {
    const { prisma, service } = createUsersService()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      email: null,
      displayName: '张三',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })

    const result = await service.findUserByUserCode('  sp-abc2345 ')

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
    expect(result).toEqual({
      id: 'user_2',
      email: null,
      displayName: '张三',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })
  })

  it('对不完整或未命中的 userCode 统一返回未找到用户', async () => {
    const { prisma, service } = createUsersService()

    await expect(service.findUserByUserCode('abc2345')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })
})
