import type { ExecutionContext } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Reflector } from '@nestjs/core'
import type { PrismaService } from '../../database/prisma.service'
import type { RbacService } from '../../modules/rbac/rbac.service'
import { UserStatus } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { AccessTokenGuard } from '../access-token.guard'

/**
 * 可被测试替身覆盖的 guard 结构。
 */
interface AccessTokenGuardForTest {
  verifyToken: (token: string) => Promise<{
    tokenType: 'access'
    sub: string
  }>
}

function createContext() {
  const request: {
    headers: Record<string, string | undefined>
    authUser?: {
      id: string
      roles: string[]
      permissions: string[]
    }
  } = {
    headers: {
      authorization: 'Bearer test-access-token',
    },
  }

  const context = {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext

  return {
    context,
    request,
  }
}

describe('accessTokenGuard', () => {
  it('syncs bootstrap roles before resolving permissions', async () => {
    const reflector = {
      getAllAndOverride: vi.fn(() => false),
    } as unknown as Reflector
    const configService = {
      getOrThrow: vi.fn(() => ({
        issuer: 'samepage-api',
        audience: 'samepage-web',
        accessSecret: 'dev-access-secret-change-me',
      })),
    } as unknown as ConfigService
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          status: UserStatus.ACTIVE,
        })),
      },
    } as unknown as PrismaService
    const rbacService = {
      syncBootstrapRolesForUser: vi.fn(async () => undefined),
      getUserRoleAndPermissions: vi.fn(async () => ({
        roles: ['user', 'system_admin'],
        permissions: ['user:read_self', 'system_admin:overview:read'],
      })),
    } as unknown as RbacService
    const guard = new AccessTokenGuard(reflector, configService, prisma, rbacService)
    const verifyToken = vi.spyOn(guard as unknown as AccessTokenGuardForTest, 'verifyToken').mockResolvedValue({
      tokenType: 'access',
      sub: 'user-1',
    })
    const { context, request } = createContext()

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(verifyToken).toHaveBeenCalledWith('test-access-token')
    expect(rbacService.syncBootstrapRolesForUser).toHaveBeenCalledWith('user-1')
    expect(rbacService.getUserRoleAndPermissions).toHaveBeenCalledWith('user-1')
    expect(request.authUser).toEqual({
      id: 'user-1',
      roles: ['user', 'system_admin'],
      permissions: ['user:read_self', 'system_admin:overview:read'],
    })
  })
})
