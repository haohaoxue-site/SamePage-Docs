import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import type { AuthProvider, LocalCredential, Prisma, SystemAuthConfig, User } from '@prisma/client'
import type { BootstrapConfig } from '../../config/auth.config'
import { createHash, randomInt } from 'node:crypto'
import { AUTH_METHOD } from '@haohaoxue/samepage-contracts'
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethod } from '../../utils/auth-methods'
import { generateTemporaryPassword, hashPassword } from '../../utils/password'
import { RbacService } from '../rbac/rbac.service'
import { SystemEmailService } from '../system-email/system-email.service'
import { AuthMailerService } from './auth-mailer.service'

const SYSTEM_AUTH_CONFIG_ID = 'default'
const EMAIL_VERIFICATION_TTL_SECONDS = 10 * 60
const EMAIL_VERIFICATION_RESEND_INTERVAL_MS = 60 * 1000

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
    private readonly systemEmailService: SystemEmailService,
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
      this.logger.warn(`System admin temporary password: ${localCredential.plainPassword}`)
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
    updatedBy: string,
    payload: Partial<RegistrationOptions>,
  ): Promise<SystemAuthConfig> {
    await this.getOrCreateConfig()

    return this.prisma.systemAuthConfig.update({
      where: { id: SYSTEM_AUTH_CONFIG_ID },
      data: {
        ...payload,
        updatedBy,
      },
    })
  }

  async assertRegistrationAllowed(method: AuthMethodName): Promise<void> {
    const options = await this.getRegistrationOptions()

    if (method === AUTH_METHOD.PASSWORD) {
      if (!options.allowPasswordRegistration || !(await this.systemEmailService.isEnabled())) {
        throw new BadRequestException('当前未开放邮箱密码注册')
      }

      return
    }

    if (method === AUTH_METHOD.GITHUB && !options.allowGithubRegistration) {
      throw new BadRequestException('当前未开放 GitHub 注册')
    }

    if (method === AUTH_METHOD.LINUX_DO && !options.allowLinuxDoRegistration) {
      throw new BadRequestException('当前未开放 LinuxDo 注册')
    }
  }

  async issueRegistrationVerification(email: string): Promise<void> {
    await this.assertRegistrationAllowed(AUTH_METHOD.PASSWORD)

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      throw new BadRequestException('该邮箱已存在账号，请直接登录')
    }

    const latestVerification = await this.prisma.authEmailVerificationToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose: 'REGISTER_VERIFY',
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (latestVerification && Date.now() - latestVerification.createdAt.getTime() < EMAIL_VERIFICATION_RESEND_INTERVAL_MS) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试')
    }

    await this.prisma.authEmailVerificationToken.updateMany({
      where: {
        email: normalizedEmail,
        purpose: 'REGISTER_VERIFY',
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    })

    const code = String(randomInt(100000, 1000000))

    await this.prisma.authEmailVerificationToken.create({
      data: {
        email: normalizedEmail,
        tokenHash: this.hash(code),
        purpose: 'REGISTER_VERIFY',
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000),
      },
    })

    await this.authMailerService.sendRegistrationCodeEmail({
      email: normalizedEmail,
      code,
    })
  }

  async consumeRegistrationVerificationCode(
    email: string,
    code: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ email: string }> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedCode = code.trim()
    const token = await tx.authEmailVerificationToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose: 'REGISTER_VERIFY',
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!token || token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('验证码已失效，请重新获取')
    }

    if (token.tokenHash !== this.hash(normalizedCode)) {
      throw new BadRequestException('验证码错误')
    }

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
      throw new BadRequestException('验证码已失效，请重新获取')
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

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}
