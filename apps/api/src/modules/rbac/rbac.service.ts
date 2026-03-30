import type { Prisma } from '@prisma/client'
import type { BootstrapConfig } from '../../config/bootstrap.config'
import { ROLES } from '@haohaoxue/samepage-contracts'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'
import { DEFAULT_RBAC_SEED } from './rbac.constants'

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults()
    await this.syncConfiguredSystemAdmins()
  }

  async seedDefaults() {
    await this.prisma.$transaction(async (tx) => {
      const permissionByCode = new Map<string, { id: string }>()

      for (const permission of DEFAULT_RBAC_SEED.permissions) {
        const stored = await tx.permission.upsert({
          where: { code: permission.code },
          update: { description: permission.description },
          create: {
            code: permission.code,
            description: permission.description,
          },
          select: { id: true },
        })
        permissionByCode.set(permission.code, stored)
      }

      for (const role of DEFAULT_RBAC_SEED.roles) {
        const storedRole = await tx.role.upsert({
          where: { code: role.code },
          update: { name: role.name },
          create: {
            code: role.code,
            name: role.name,
          },
          select: { id: true },
        })

        await tx.rolePermission.deleteMany({
          where: { roleId: storedRole.id },
        })

        if (!role.permissions.length) {
          continue
        }

        await tx.rolePermission.createMany({
          data: role.permissions.map<Prisma.RolePermissionCreateManyInput>(permissionCode => ({
            roleId: storedRole.id,
            permissionId: permissionByCode.get(permissionCode)!.id,
          })),
          skipDuplicates: true,
        })
      }
    })
  }

  async getUserRoleAndPermissions(userId: string): Promise<{ roles: string[], permissions: string[] }> {
    const roleRows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            code: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const roles = roleRows.map(row => row.role.code)
    const permissionSet = new Set<string>()

    for (const row of roleRows) {
      for (const rolePermission of row.role.rolePermissions) {
        permissionSet.add(rolePermission.permission.code)
      }
    }

    return {
      roles,
      permissions: [...permissionSet],
    }
  }

  async ensureDefaultUserRole(userId: string) {
    const roleId = await this.getRoleIdByCode(ROLES.USER)
    await this.attachUserRole(userId, roleId)
  }

  async ensureConfiguredSystemAdminRole(userId: string, email?: string | null): Promise<boolean> {
    const bootstrapConfig = this.configService.getOrThrow<BootstrapConfig>('bootstrap')
    const normalizedEmail = email?.trim().toLowerCase()
    const shouldGrant = normalizedEmail
      ? bootstrapConfig.systemAdminEmails.includes(normalizedEmail)
      : false

    if (!shouldGrant) {
      return false
    }

    const roleId = await this.getRoleIdByCode(ROLES.SYSTEM_ADMIN)
    await this.attachUserRole(userId, roleId)
    return true
  }

  async syncBootstrapRolesForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    })

    if (!user) {
      return
    }

    await this.ensureDefaultUserRole(userId)
    await this.ensureConfiguredSystemAdminRole(userId, user.email)
  }

  private async attachUserRole(userId: string, roleId: string) {
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    })
  }

  private async syncConfiguredSystemAdmins() {
    const bootstrapConfig = this.configService.getOrThrow<BootstrapConfig>('bootstrap')

    if (!bootstrapConfig.systemAdminEmails.length) {
      return
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: {
          in: bootstrapConfig.systemAdminEmails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    for (const user of users) {
      await this.ensureConfiguredSystemAdminRole(user.id, user.email)
    }
  }

  async getRoleIdByCode(code: string): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: { code },
      select: { id: true },
    })

    if (role) {
      return role.id
    }

    await this.seedDefaults()
    return this.prisma.role.findUniqueOrThrow({
      where: { code },
      select: { id: true },
    }).then(result => result.id)
  }
}
