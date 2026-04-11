import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import type { AuthProvider, LocalCredential, Prisma, SystemAuthConfig, User } from '@prisma/client'
import type { BootstrapConfig } from '../../config/auth.config'
import { createHash, randomBytes } from 'node:crypto'
import { AUTH_METHOD } from '@haohaoxue/samepage-contracts'
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethod } from '../../utils/auth-methods'
import { generateTemporaryPassword, hashPassword } from '../../utils/password'
import { RbacService } from '../rbac/rbac.service'
import { AuthMailerService } from './auth-mailer.service'

const SYSTEM_AUTH_CONFIG_ID = 'default'
const EMAIL_VERIFICATION_TTL_SECONDS = 30 * 60
const DEV_VERIFICATION_ROUTE_PATH = '/register/verify'

export interface RegistrationOptions {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
}

@Injectable()
export class SystemAuthService implements OnModuleInit {
  private readonly logger = new Logger(SystemAuthService.name)
  private readonly bootstrapConfig: BootstrapConfig

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly authMailerService: AuthMailerService,
    configService: ConfigService,
  ) {
    this.bootstrapConfig = configService.getOrThrow<BootstrapConfig>('bootstrap')
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSystemAdminBootstrap()
  }

  async ensureSystemAdminBootstrap(): Promise<void> {
    const config = await this.getOrCreateConfig()
    const systemAdminEmail = this.bootstrapConfig.systemAdminEmail
    const existingSystemAdminUserId = config.systemAdminUserId
    const user = await this.ensureSystemAdminUser(systemAdminEmail)
    const localCredential = await this.ensureSystemAdminCredential(user.id)

    await this.prisma.systemAuthConfig.update({
      where: { id: SYSTEM_AUTH_CONFIG_ID },
      data: {
        systemAdminEmail,
        systemAdminUserId: user.id,
      },
    })

    await this.rbacService.ensureDefaultUserRole(user.id)
    await this.rbacService.enforceSystemAdminRole(user.id)

    if (localCredential.createdPassword) {
      this.logger.log(`System admin initialized: ${systemAdminEmail}`)
      this.logger.log(`System admin temporary password: ${localCredential.plainPassword}`)
    }

    if (existingSystemAdminUserId && existingSystemAdminUserId !== user.id) {
      await this.rbacService.revokeSystemAdminRole(existingSystemAdminUserId)
    }
  }

  async getRegistrationOptions(): Promise<RegistrationOptions> {
    const config = await this.getOrCreateConfig()

    return {
      allowPasswordRegistration: config.allowPasswordRegistration,
      allowGithubRegistration: config.allowGithubRegistration,
      allowLinuxDoRegistration: config.allowLinuxDoRegistration,
    }
  }

  async getGovernanceSnapshot(): Promise<{
    config: SystemAuthConfig
    systemAdminUser: Pick<User, 'id' | 'email' | 'displayName' | 'lastLoginAt'> | null
    localCredential: Pick<LocalCredential, 'mustChangePassword' | 'passwordUpdatedAt'> | null
  }> {
    const config = await this.getOrCreateConfig()
    const systemAdminUser = config.systemAdminUserId
      ? await this.prisma.user.findUnique({
          where: { id: config.systemAdminUserId },
          select: {
            id: true,
            email: true,
            displayName: true,
            lastLoginAt: true,
          },
        })
      : null

    const localCredential = config.systemAdminUserId
      ? await this.prisma.localCredential.findUnique({
          where: { userId: config.systemAdminUserId },
          select: {
            mustChangePassword: true,
            passwordUpdatedAt: true,
          },
        })
      : null

    return {
      config,
      systemAdminUser,
      localCredential,
    }
  }

  async updateRegistrationOptions(
    updatedByUserId: string,
    payload: RegistrationOptions,
  ): Promise<SystemAuthConfig> {
    await this.getOrCreateConfig()

    return this.prisma.systemAuthConfig.update({
      where: { id: SYSTEM_AUTH_CONFIG_ID },
      data: {
        ...payload,
        updatedByUserId,
      },
    })
  }

  async assertRegistrationAllowed(method: AuthMethodName): Promise<void> {
    const options = await this.getRegistrationOptions()

    if (method === AUTH_METHOD.PASSWORD && !options.allowPasswordRegistration) {
      throw new BadRequestException('当前未开放邮箱密码注册')
    }

    if (method === AUTH_METHOD.GITHUB && !options.allowGithubRegistration) {
      throw new BadRequestException('当前未开放 GitHub 注册')
    }

    if (method === AUTH_METHOD.LINUX_DO && !options.allowLinuxDoRegistration) {
      throw new BadRequestException('当前未开放 LinuxDo 注册')
    }
  }

  async issueRegistrationVerification(email: string, webOrigin: string): Promise<void> {
    await this.assertRegistrationAllowed(AUTH_METHOD.PASSWORD)

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      throw new BadRequestException('该邮箱已存在账号，请直接登录')
    }

    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = this.hash(rawToken)

    await this.prisma.authEmailVerificationToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        purpose: 'REGISTER_VERIFY',
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000),
      },
    })

    const verificationUrl = new URL(DEV_VERIFICATION_ROUTE_PATH, normalizeOrigin(webOrigin))
    verificationUrl.searchParams.set('token', rawToken)

    await this.authMailerService.sendRegistrationVerificationEmail({
      email: normalizedEmail,
      verificationUrl: verificationUrl.toString(),
    })
  }

  async validateRegistrationVerificationToken(rawToken: string): Promise<{ email: string }> {
    const token = await this.getAvailableVerificationToken(rawToken)
    return { email: token.email }
  }

  async consumeRegistrationVerificationToken(
    rawToken: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ email: string }> {
    const token = await this.getAvailableVerificationToken(rawToken, tx)

    const consumed = await tx.authEmailVerificationToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    })

    if (consumed.count !== 1) {
      throw new BadRequestException('邮箱验证令牌已失效')
    }

    return {
      email: token.email,
    }
  }

  async isSystemAdminUser(userId: string): Promise<boolean> {
    const config = await this.getOrCreateConfig()
    return config.systemAdminUserId === userId
  }

  async isNewUserRegistrationAllowedByOAuth(
    provider: AuthProvider,
    normalizedEmail: string | undefined,
    emailVerified: boolean | undefined,
  ): Promise<boolean> {
    const existingAccount = normalizedEmail
      ? await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        })
      : null

    if (existingAccount && emailVerified) {
      return true
    }

    await this.assertRegistrationAllowed(resolveAuthMethod(provider))
    return true
  }

  private async ensureSystemAdminUser(email: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: normalizedEmail,
          status: 'ACTIVE',
          displayName: existingUser.displayName || 'System Admin',
        },
      })
    }

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName: 'System Admin',
        status: 'ACTIVE',
      },
    })
  }

  private async ensureSystemAdminCredential(userId: string): Promise<{ createdPassword: boolean, plainPassword?: string }> {
    const credential = await this.prisma.localCredential.findUnique({
      where: { userId },
      select: {
        userId: true,
        emailVerifiedAt: true,
      },
    })

    if (credential) {
      if (!credential.emailVerifiedAt) {
        await this.prisma.localCredential.update({
          where: { userId },
          data: {
            emailVerifiedAt: new Date(),
          },
        })
      }

      return { createdPassword: false }
    }

    const plainPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(plainPassword)

    await this.prisma.localCredential.create({
      data: {
        userId,
        passwordHash,
        mustChangePassword: true,
        emailVerifiedAt: new Date(),
        passwordUpdatedAt: new Date(),
      },
    })

    return {
      createdPassword: true,
      plainPassword,
    }
  }

  private async getOrCreateConfig(): Promise<SystemAuthConfig> {
    const existing = await this.prisma.systemAuthConfig.findUnique({
      where: { id: SYSTEM_AUTH_CONFIG_ID },
    })

    if (existing) {
      return existing
    }

    try {
      return await this.prisma.systemAuthConfig.create({
        data: {
          id: SYSTEM_AUTH_CONFIG_ID,
          systemAdminEmail: this.bootstrapConfig.systemAdminEmail,
        },
      })
    }
    catch {
      return this.prisma.systemAuthConfig.findUniqueOrThrow({
        where: { id: SYSTEM_AUTH_CONFIG_ID },
      })
    }
  }

  private async getAvailableVerificationToken(
    rawToken: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const token = await tx.authEmailVerificationToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    })

    if (!token || token.purpose !== 'REGISTER_VERIFY') {
      throw new BadRequestException('邮箱验证令牌无效')
    }

    if (token.consumedAt || token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('邮箱验证令牌已过期')
    }

    return token
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}

function normalizeOrigin(rawWebOrigin: string): string {
  const normalizedValue = rawWebOrigin.trim().replace(/\/+$/g, '')
  const url = new URL(normalizedValue)

  if (url.origin !== normalizedValue || url.pathname !== '/' || url.search.length || url.hash.length) {
    throw new BadRequestException('Invalid web origin')
  }

  return url.origin
}
