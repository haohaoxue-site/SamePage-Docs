import type {
  AuthProviderName,
  ConfirmBindEmailRequest,
  CurrentUser,
  DeleteCurrentUserRequest,
  UpdateCurrentUserAvatarResponse,
  UpdateUserPreferencesRequest,
  UserSettings,
} from '@haohaoxue/samepage-domain'
import type { FastifyRequest } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import type { StorageObject } from '../storage/storage.interface'
import type { UpdateCurrentUserAvatarInput } from './users.interface'
import { randomInt } from 'node:crypto'
import { ROLES } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuthProvider } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethods } from '../../utils/auth-methods'
import { normalizeEmail } from '../../utils/email'
import { sha256Hex } from '../../utils/hash'
import { hashPassword } from '../../utils/password'
import { AuthMailerService } from '../auth/auth-mailer.service'
import { AuthService } from '../auth/auth.service'
import { RbacService } from '../rbac/rbac.service'
import { StorageService } from '../storage/storage.service'
import { SystemEmailService } from '../system-email/system-email.service'
import {
  AVATAR_BUCKET,
  BIND_EMAIL_CODE_RESEND_INTERVAL_MS,
  BIND_EMAIL_CODE_TTL_SECONDS,
  MAX_BIND_EMAIL_CODE_ATTEMPTS,
} from './users.constants'
import {
  assertAvatarBuffer,
  assertAvatarMimeType,
  buildAvatarStorageKey,
  buildAvatarUrl,
  mapAppearancePreference,
  mapAppearancePreferenceToDb,
  mapLanguagePreference,
  mapLanguagePreferenceToDb,
  normalizeAccountDeletionConfirmation,
  resolveDbProvider,
} from './users.utils'

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

  async getCurrentUser(userId: string): Promise<CurrentUser> {
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
          where: {
            deletedAt: null,
          },
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

  async getCurrentUserSettings(userId: string): Promise<UserSettings> {
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
          where: {
            deletedAt: null,
          },
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

  async updateCurrentUserProfile(authUser: AuthUserContext, displayName: string): Promise<CurrentUser> {
    if (authUser.roles.includes(ROLES.SYSTEM_ADMIN)) {
      throw new BadRequestException('系统管理员账号不支持修改显示名称')
    }

    const normalizedDisplayName = displayName.trim()

    if (!normalizedDisplayName.length) {
      throw new BadRequestException('显示名称不能为空')
    }

    await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        displayName: normalizedDisplayName,
      },
    })

    return this.getCurrentUser(authUser.id)
  }

  async updateCurrentUserAvatar(
    userId: string,
    payload: UpdateCurrentUserAvatarInput,
  ): Promise<UpdateCurrentUserAvatarResponse> {
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

    const avatarMimeType = assertAvatarMimeType(payload.mimeType)
    assertAvatarBuffer(payload.buffer, avatarMimeType)
    const avatarStorageKey = buildAvatarStorageKey(userId, avatarMimeType)

    await this.storageService.putObject({
      bucket: AVATAR_BUCKET,
      key: avatarStorageKey,
      body: payload.buffer,
      contentType: avatarMimeType,
      contentDisposition: {
        type: 'inline',
        fileName: payload.fileName,
        fallbackFileName: 'avatar',
      },
      contentLength: payload.buffer.length,
    })

    const avatarUrl = buildAvatarUrl(userId)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        avatarStorageKey,
      },
    })

    await this.removeAvatarObject(currentUser.avatarStorageKey)

    return {
      avatarUrl,
    }
  }

  async getUserAvatar(userId: string): Promise<StorageObject> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarStorageKey: true,
      },
    })

    if (!user?.avatarStorageKey) {
      throw new NotFoundException('头像不存在')
    }

    return this.storageService.getObject({
      bucket: AVATAR_BUCKET,
      key: user.avatarStorageKey,
    })
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
        codeHash: sha256Hex(code),
        expiresAt: new Date(Date.now() + BIND_EMAIL_CODE_TTL_SECONDS * 1000),
      },
    })

    await this.authMailerService.sendBindEmailCodeEmail({
      email,
      code,
    })

    return { requested: true }
  }

  async confirmBindEmail(userId: string, payload: ConfirmBindEmailRequest): Promise<CurrentUser> {
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

    if (latestCode.codeHash !== sha256Hex(code)) {
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
  ): Promise<CurrentUser> {
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
          where: {
            deletedAt: null,
          },
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

  async deleteCurrentUser(
    authUser: AuthUserContext,
    payload: DeleteCurrentUserRequest,
  ): Promise<void> {
    if (authUser.roles.includes(ROLES.SYSTEM_ADMIN)) {
      throw new BadRequestException('系统管理员账号不支持在这里删除')
    }

    const currentUser = await this.prisma.$bypass.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarStorageKey: true,
      },
    })

    if (!currentUser) {
      throw new NotFoundException(`User "${authUser.id}" not found`)
    }

    const expectedConfirmation = currentUser.email ?? currentUser.displayName
    const normalizedAccountConfirmation = normalizeAccountDeletionConfirmation(payload.accountConfirmation, Boolean(currentUser.email))

    if (normalizedAccountConfirmation !== normalizeAccountDeletionConfirmation(expectedConfirmation, Boolean(currentUser.email))) {
      throw new BadRequestException(currentUser.email ? '请输入当前邮箱完成确认' : '请输入当前显示名称完成确认')
    }

    await this.prisma.$bypass.$transaction(async (tx) => {
      await tx.authOauthState.deleteMany({
        where: {
          initiatorUserId: authUser.id,
        },
      })

      await tx.user.delete({
        where: {
          id: authUser.id,
        },
      })
    })

    await this.removeAvatarObject(currentUser.avatarStorageKey)
  }

  async updatePreferences(
    userId: string,
    payload: UpdateUserPreferencesRequest,
  ): Promise<UserSettings['preferences']> {
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

  private async removeAvatarObject(key: string | null | undefined): Promise<void> {
    if (!key) {
      return
    }

    await this.storageService.deleteObject({
      bucket: AVATAR_BUCKET,
      key,
    })
  }
}
