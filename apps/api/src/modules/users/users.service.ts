import type {
  AppearancePreference,
  AuthProviderName,
  ConfirmBindEmailDto,
  CurrentUserDto,
  LanguagePreference,
  UpdateCurrentUserAvatarResponseDto,
  UpdateUserPreferencesDto,
  UserSettingsDto,
} from '@haohaoxue/samepage-domain'
import type { FastifyRequest } from 'fastify'
import { Buffer } from 'node:buffer'
import { createHash, randomInt } from 'node:crypto'
import { SERVER_PATH } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  AuthProvider,
  UserAppearancePreference as DbUserAppearancePreference,
  UserLanguagePreference as DbUserLanguagePreference,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethods } from '../../utils/auth-methods'
import { hashPassword } from '../../utils/password'
import { AuthMailerService } from '../auth/auth-mailer.service'
import { AuthService } from '../auth/auth.service'
import { RbacService } from '../rbac/rbac.service'
import { StorageService } from '../storage/storage.service'
import { SystemEmailService } from '../system-email/system-email.service'

const BIND_EMAIL_CODE_TTL_SECONDS = 10 * 60
const BIND_EMAIL_CODE_RESEND_INTERVAL_MS = 60 * 1000
const MAX_BIND_EMAIL_CODE_ATTEMPTS = 5

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly authService: AuthService,
    private readonly authMailerService: AuthMailerService,
    private readonly storageService: StorageService,
    private readonly systemEmailService: SystemEmailService,
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

  async getCurrentUserSettings(userId: string): Promise<UserSettingsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        displayName: true,
        avatarUrl: true,
        localCredential: {
          select: {
            userId: true,
            emailVerifiedAt: true,
          },
        },
        preference: {
          select: {
            languagePreference: true,
            appearancePreference: true,
          },
        },
        oauthAccounts: {
          select: {
            provider: true,
            providerUsername: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const githubAccount = user.oauthAccounts.find(item => item.provider === AuthProvider.GITHUB)
    const linuxDoAccount = user.oauthAccounts.find(item => item.provider === AuthProvider.LINUX_DO)

    return {
      profile: {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      account: {
        email: user.email,
        hasPasswordAuth: Boolean(user.localCredential),
        emailVerified: Boolean(user.localCredential?.emailVerifiedAt),
        github: {
          connected: Boolean(githubAccount),
          username: githubAccount?.providerUsername ?? null,
        },
        linuxDo: {
          connected: Boolean(linuxDoAccount),
          username: linuxDoAccount?.providerUsername ?? null,
        },
      },
      preferences: {
        language: mapLanguagePreference(user.preference?.languagePreference),
        appearance: mapAppearancePreference(user.preference?.appearancePreference),
      },
    }
  }

  async getCurrentUserPermissions(userId: string): Promise<string[]> {
    const context = await this.rbacService.getUserRoleAndPermissions(userId)
    return context.permissions
  }

  async updateCurrentUserProfile(userId: string, displayName: string): Promise<CurrentUserDto> {
    const normalizedDisplayName = displayName.trim()

    if (!normalizedDisplayName.length) {
      throw new BadRequestException('显示名称不能为空')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: normalizedDisplayName,
      },
    })

    return this.getCurrentUser(userId)
  }

  async updateCurrentUserAvatar(
    userId: string,
    payload: {
      fileName: string
      mimeType: string
      buffer: Buffer
    },
  ): Promise<UpdateCurrentUserAvatarResponseDto> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarStorageKey: true,
      },
    })

    if (!currentUser) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const uploadedAvatar = await this.storageService.uploadAvatar({
      userId,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      buffer: payload.buffer,
    })

    const avatarUrl = buildAvatarUrl(userId)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        avatarStorageKey: uploadedAvatar.key,
      },
    })

    await this.storageService.removeAvatar(currentUser.avatarStorageKey)

    return {
      avatarUrl,
    }
  }

  async getUserAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarStorageKey: true,
      },
    })

    if (!user?.avatarStorageKey) {
      throw new NotFoundException('头像不存在')
    }

    return this.storageService.getAvatarObject(user.avatarStorageKey)
  }

  async requestBindEmailCode(userId: string, rawEmail: string): Promise<{ requested: boolean }> {
    if (!(await this.systemEmailService.isEnabled())) {
      throw new BadRequestException('当前暂不支持绑定邮箱')
    }

    const email = normalizeEmail(rawEmail)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    })

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    if (user.email === email) {
      throw new BadRequestException('当前邮箱已绑定到该账号')
    }

    await this.assertEmailAvailable(userId, email)

    const existingCode = await this.prisma.userEmailVerificationCode.findFirst({
      where: {
        userId,
        email,
        purpose: 'BIND_EMAIL',
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (existingCode && Date.now() - existingCode.lastSentAt.getTime() < BIND_EMAIL_CODE_RESEND_INTERVAL_MS) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试')
    }

    await this.prisma.userEmailVerificationCode.updateMany({
      where: {
        userId,
        purpose: 'BIND_EMAIL',
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    })

    const code = String(randomInt(100000, 1000000))

    await this.prisma.userEmailVerificationCode.create({
      data: {
        userId,
        email,
        purpose: 'BIND_EMAIL',
        codeHash: hashValue(code),
        expiresAt: new Date(Date.now() + BIND_EMAIL_CODE_TTL_SECONDS * 1000),
      },
    })

    await this.authMailerService.sendBindEmailCodeEmail({
      email,
      code,
    })

    return { requested: true }
  }

  async confirmBindEmail(userId: string, payload: ConfirmBindEmailDto): Promise<CurrentUserDto> {
    const email = normalizeEmail(payload.email)
    const code = payload.code.trim()
    const latestCode = await this.prisma.userEmailVerificationCode.findFirst({
      where: {
        userId,
        email,
        purpose: 'BIND_EMAIL',
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!latestCode || latestCode.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('验证码已失效，请重新获取')
    }

    if (latestCode.attemptCount >= MAX_BIND_EMAIL_CODE_ATTEMPTS) {
      throw new BadRequestException('验证码输入错误次数过多，请重新获取')
    }

    if (latestCode.codeHash !== hashValue(code)) {
      await this.prisma.userEmailVerificationCode.update({
        where: { id: latestCode.id },
        data: {
          attemptCount: {
            increment: 1,
          },
        },
      })
      throw new BadRequestException('验证码错误')
    }

    await this.assertEmailAvailable(userId, email)

    await this.prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          localCredential: {
            select: {
              userId: true,
            },
          },
        },
      })

      if (!currentUser) {
        throw new NotFoundException(`User "${userId}" not found`)
      }

      const consumed = await tx.userEmailVerificationCode.updateMany({
        where: {
          id: latestCode.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      })

      if (consumed.count !== 1) {
        throw new BadRequestException('验证码已失效，请重新获取')
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          email,
        },
      })

      if (currentUser.localCredential) {
        await tx.localCredential.update({
          where: { userId },
          data: {
            emailVerifiedAt: new Date(),
          },
        })
        return
      }

      const password = payload.newPassword?.trim()

      if (!password) {
        throw new BadRequestException('首次绑定邮箱需要同时设置登录密码')
      }

      await tx.localCredential.create({
        data: {
          userId,
          passwordHash: await hashPassword(password),
          emailVerifiedAt: new Date(),
          passwordUpdatedAt: new Date(),
        },
      })
    })

    return this.getCurrentUser(userId)
  }

  async startOauthBinding(
    userId: string,
    provider: AuthProviderName,
    request: FastifyRequest,
  ): Promise<string> {
    return this.authService.buildOAuthAuthorizationUrl(provider, request, {
      purpose: 'bind',
      initiatorUserId: userId,
      redirectPath: '/user',
    })
  }

  async disconnectOauthBinding(
    userId: string,
    provider: AuthProviderName,
  ): Promise<CurrentUserDto> {
    const dbProvider = resolveDbProvider(provider)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        localCredential: {
          select: {
            userId: true,
          },
        },
        oauthAccounts: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const targetAccount = user.oauthAccounts.find(item => item.provider === dbProvider)

    if (!targetAccount) {
      throw new BadRequestException('当前账号未绑定该第三方平台')
    }

    const remainingOauthCount = user.oauthAccounts.length - 1

    if (!user.localCredential && remainingOauthCount <= 0) {
      throw new BadRequestException('解绑后至少需要保留一种登录方式')
    }

    await this.prisma.oauthAccount.delete({
      where: { id: targetAccount.id },
    })

    return this.getCurrentUser(userId)
  }

  async updatePreferences(
    userId: string,
    payload: UpdateUserPreferencesDto,
  ): Promise<UserSettingsDto['preferences']> {
    if (payload.language === undefined && payload.appearance === undefined) {
      throw new BadRequestException('至少更新一项偏好设置')
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        preference: {
          select: {
            languagePreference: true,
            appearancePreference: true,
          },
        },
      },
    })

    if (!currentUser) {
      throw new NotFoundException(`User "${userId}" not found`)
    }

    const nextLanguage = payload.language ?? mapLanguagePreference(currentUser.preference?.languagePreference)
    const nextAppearance = payload.appearance ?? mapAppearancePreference(currentUser.preference?.appearancePreference)

    await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        languagePreference: payload.language === undefined
          ? undefined
          : mapLanguagePreferenceToDb(payload.language),
        appearancePreference: payload.appearance === undefined
          ? undefined
          : mapAppearancePreferenceToDb(payload.appearance),
      },
      create: {
        userId,
        ...(payload.language === undefined
          ? {}
          : { languagePreference: mapLanguagePreferenceToDb(payload.language) }),
        ...(payload.appearance === undefined
          ? {}
          : { appearancePreference: mapAppearancePreferenceToDb(payload.appearance) }),
      },
    })

    return {
      language: nextLanguage,
      appearance: nextAppearance,
    }
  }

  private async assertEmailAvailable(userId: string, email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
      },
    })

    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('该邮箱已被其他账号使用')
    }
  }
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail.length) {
    throw new BadRequestException('邮箱不能为空')
  }

  return normalizedEmail
}

function buildAvatarUrl(userId: string): string {
  return `${SERVER_PATH}/users/avatar/${userId}?v=${Date.now()}`
}

function mapLanguagePreference(value: DbUserLanguagePreference | null | undefined): LanguagePreference {
  if (value === 'ZH_CN') {
    return 'zh-CN'
  }

  if (value === 'EN_US') {
    return 'en-US'
  }

  return 'auto'
}

function mapAppearancePreference(value: DbUserAppearancePreference | null | undefined): AppearancePreference {
  if (value === 'LIGHT') {
    return 'light'
  }

  if (value === 'DARK') {
    return 'dark'
  }

  return 'auto'
}

function mapLanguagePreferenceToDb(value: LanguagePreference): DbUserLanguagePreference {
  if (value === 'zh-CN') {
    return 'ZH_CN'
  }

  if (value === 'en-US') {
    return 'EN_US'
  }

  return 'AUTO'
}

function mapAppearancePreferenceToDb(value: AppearancePreference): DbUserAppearancePreference {
  if (value === 'light') {
    return 'LIGHT'
  }

  if (value === 'dark') {
    return 'DARK'
  }

  return 'AUTO'
}

function resolveDbProvider(provider: AuthProviderName): AuthProvider {
  if (provider === 'github') {
    return AuthProvider.GITHUB
  }

  return AuthProvider.LINUX_DO
}
