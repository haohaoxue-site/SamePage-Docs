import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { RbacService } from '../rbac/rbac.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async getCurrentUser(userId: string): Promise<{
    id: string
    email: string | null
    displayName: string
    avatarUrl: string | null
    status: 'ACTIVE' | 'DISABLED'
    roles: string[]
    permissions: string[]
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    })

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const context = await this.rbacService.getUserRoleAndPermissions(userId)

    return {
      ...user,
      roles: context.roles,
      permissions: context.permissions,
    }
  }

  async getCurrentUserPermissions(userId: string): Promise<string[]> {
    const context = await this.rbacService.getUserRoleAndPermissions(userId)
    return context.permissions
  }
}
