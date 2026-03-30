import type { ConfigService } from '@nestjs/config'
import type { PrismaService } from '../../../database/prisma.service'
import { describe, expect, it, vi } from 'vitest'
import { RbacService } from '../rbac.service'

describe('rbacService', () => {
  it('returns roles and permissions for a user', async () => {
    const prisma = {
      userRole: {
        findMany: vi.fn(async () => ([
          {
            role: {
              code: 'user',
              rolePermissions: [
                {
                  permission: {
                    code: 'user:read_self',
                  },
                },
              ],
            },
          },
          {
            role: {
              code: 'system_admin',
              rolePermissions: [
                {
                  permission: {
                    code: 'system_admin:overview:read',
                  },
                },
              ],
            },
          },
        ])),
      },
    } as unknown as PrismaService
    const configService = {
      getOrThrow: vi.fn(() => ({
        systemAdminEmails: ['864299347@qq.com'],
      })),
    } as unknown as ConfigService
    const service = new RbacService(prisma, configService)

    const context = await service.getUserRoleAndPermissions('user-id')

    expect(prisma.userRole.findMany).toHaveBeenCalledTimes(1)
    expect(context.roles).toEqual(['user', 'system_admin'])
    expect(context.permissions).toEqual([
      'user:read_self',
      'system_admin:overview:read',
    ])
  })
})
