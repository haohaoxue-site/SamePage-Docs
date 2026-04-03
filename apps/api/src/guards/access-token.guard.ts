import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { JwtConfig } from '../config/auth.config'
import type { AccessTokenPayload, AuthUserContext } from '../modules/auth/auth.interface'
import { Buffer } from 'node:buffer'
import { createSecretKey } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { UserStatus } from '@prisma/client'
import { jwtVerify } from 'jose'
import { PrismaService } from '../database/prisma.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { RbacService } from '../modules/rbac/rbac.service'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly secretKey
  private readonly jwtConfig

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt')
    this.secretKey = createSecretKey(Buffer.from(this.jwtConfig.accessSecret, 'utf8'))
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>
      authUser?: AuthUserContext
    }>()

    const authorizationHeader = request.headers.authorization

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token')
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim()

    if (!accessToken) {
      throw new UnauthorizedException('Invalid access token')
    }

    const payload = await this.verifyToken(accessToken)

    if (payload.tokenType !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid access token payload')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive')
    }

    await this.rbacService.syncBootstrapRolesForUser(user.id)
    const roleContext = await this.rbacService.getUserRoleAndPermissions(user.id)

    request.authUser = {
      id: user.id,
      roles: roleContext.roles,
      permissions: roleContext.permissions,
    }

    return true
  }

  private async verifyToken(token: string): Promise<AccessTokenPayload & { sub?: string }> {
    try {
      const { payload } = await jwtVerify<AccessTokenPayload>(
        token,
        this.secretKey,
        {
          issuer: this.jwtConfig.issuer,
          audience: this.jwtConfig.audience,
        },
      )
      return payload
    }
    catch {
      throw new UnauthorizedException('Access token verification failed')
    }
  }
}
