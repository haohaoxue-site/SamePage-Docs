import type { CurrentUserDto } from './users.dto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethods } from '../../utils/auth-methods'
import { RbacService } from '../rbac/rbac.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        localCredential: {
          select: {
            mustChangePassword: true,
            emailVerifiedAt: true,
          },
        },
        oauthAccounts: {
          select: {
            provider: true,
            providerEmailVerified: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const context = await this.rbacService.getUserRoleAndPermissions(userId)

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      roles: context.roles,
      permissions: context.permissions,
      authMethods: resolveAuthMethods(Boolean(user.localCredential), user.oauthAccounts),
      mustChangePassword: user.localCredential?.mustChangePassword ?? false,
      emailVerified: Boolean(user.localCredential?.emailVerifiedAt) || user.oauthAccounts.some(item => item.providerEmailVerified === true),
    }
  }

  async getCurrentUserPermissions(userId: string): Promise<string[]> {
    const context = await this.rbacService.getUserRoleAndPermissions(userId)
    return context.permissions
  }
}
