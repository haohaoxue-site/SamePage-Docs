import type { CryptoConfig } from '../../config/auth.config'
import type {
  GovernanceSummaryDto,
  SystemAdminAuditLogItemDto,
  SystemAdminOverviewDto,
  SystemAdminUserItemDto,
  SystemAiConfigDto,
  SystemAuthGovernanceDto,
  UpdateSystemAdminUserResponseDto,
  UpdateSystemAiConfigDto,
  UpdateSystemAuthGovernanceDto,
} from './system-admin.dto'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DocumentMemberRole,
  DocumentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthMethods } from '../../utils/auth-methods'
import { decryptAes256Gcm, encryptAes256Gcm, isEncryptedValue } from '../../utils/crypto'
import { SystemAuthService } from '../auth/system-auth.service'

const DEFAULT_SYSTEM_AI_BASE_URL = 'https://api.openai.com/v1'

@Injectable()
export class SystemAdminService {
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemAuthService: SystemAuthService,
    configService: ConfigService,
  ) {
    this.encryptionKey = configService.getOrThrow<CryptoConfig>('crypto').encryptionKey
  }

  async getOverview(): Promise<SystemAdminOverviewDto> {
    const [
      totalUsers,
      activeUsers,
      docStats,
      aiConfig,
      authGovernance,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.getDocumentStats(),
      this.prisma.systemAiConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      }),
      this.systemAuthService.getGovernanceSnapshot(),
    ])

    return {
      totalUsers,
      activeUsers,
      disabledUsers: totalUsers - activeUsers,
      systemAdminCount: authGovernance.config.systemAdminUserId ? 1 : 0,
      ...docStats,
      aiConfigEnabled: aiConfig?.enabled ?? false,
      systemAiBaseUrl: aiConfig?.baseUrl ?? null,
      systemAiDefaultModel: aiConfig?.defaultModel ?? null,
    }
  }

  async getUsers(): Promise<SystemAdminUserItemDto[]> {
    const governance = await this.systemAuthService.getGovernanceSnapshot()
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        localCredential: {
          select: {
            userId: true,
          },
        },
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
        documentMemberships: {
          where: {
            role: DocumentMemberRole.VIEWER,
          },
          select: {
            documentId: true,
          },
        },
        _count: {
          select: {
            ownedDocuments: true,
          },
        },
      },
    })

    return users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isSystemAdmin: user.id === governance.config.systemAdminUserId,
      authMethods: resolveAuthMethods(Boolean(user.localCredential), user.oauthAccounts),
      ownedDocumentCount: user._count.ownedDocuments,
      sharedDocumentCount: user.documentMemberships.length,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }))
  }

  async updateUserStatus(
    actorUserId: string,
    userId: string,
    status: UserStatus,
  ): Promise<UpdateSystemAdminUserResponseDto> {
    const isSystemAdmin = await this.systemAuthService.isSystemAdminUser(userId)

    if (isSystemAdmin && status === UserStatus.DISABLED) {
      throw new BadRequestException('不能禁用系统管理员')
    }

    if (actorUserId === userId && status === UserStatus.DISABLED) {
      throw new BadRequestException('不能禁用当前系统管理员自己')
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        status: true,
      },
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`User "${userId}" not found`)
      }
      throw error
    })

    await this.createAuditLog(actorUserId, {
      action: 'user.status.updated',
      targetType: 'user',
      targetId: userId,
      metadata: { status },
    })

    return {
      id: user.id,
      status: user.status,
      isSystemAdmin,
    }
  }

  async getAuthGovernance(): Promise<SystemAuthGovernanceDto> {
    const snapshot = await this.systemAuthService.getGovernanceSnapshot()

    return {
      allowPasswordRegistration: snapshot.config.allowPasswordRegistration,
      allowGithubRegistration: snapshot.config.allowGithubRegistration,
      allowLinuxDoRegistration: snapshot.config.allowLinuxDoRegistration,
      systemAdminEmail: snapshot.config.systemAdminEmail,
      systemAdminDisplayName: snapshot.systemAdminUser?.displayName ?? null,
      systemAdminMustChangePassword: snapshot.localCredential?.mustChangePassword ?? false,
      systemAdminLastLoginAt: snapshot.systemAdminUser?.lastLoginAt ?? null,
      systemAdminPasswordUpdatedAt: snapshot.localCredential?.passwordUpdatedAt ?? null,
    }
  }

  async updateAuthGovernance(
    actorUserId: string,
    payload: UpdateSystemAuthGovernanceDto,
  ): Promise<SystemAuthGovernanceDto> {
    await this.systemAuthService.updateRegistrationOptions(actorUserId, {
      allowPasswordRegistration: payload.allowPasswordRegistration,
      allowGithubRegistration: payload.allowGithubRegistration,
      allowLinuxDoRegistration: payload.allowLinuxDoRegistration,
    })

    await this.createAuditLog(actorUserId, {
      action: 'system_auth_governance.updated',
      targetType: 'system_auth_config',
      targetId: 'default',
      metadata: payload as Prisma.InputJsonValue,
    })

    return this.getAuthGovernance()
  }

  async getAiConfig(): Promise<SystemAiConfigDto> {
    const config = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        updatedByUser: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!config) {
      return {
        id: null,
        enabled: false,
        provider: 'openai-compatible',
        baseUrl: null,
        defaultModel: null,
        hasApiKey: false,
        maskedApiKey: null,
        updatedAt: null,
        updatedByDisplayName: null,
      }
    }

    const decryptedApiKey = this.decryptApiKey(config.apiKey)

    return {
      id: config.id,
      enabled: config.enabled,
      provider: config.provider,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      hasApiKey: Boolean(decryptedApiKey),
      maskedApiKey: maskApiKey(decryptedApiKey),
      updatedAt: config.updatedAt,
      updatedByDisplayName: config.updatedByUser?.displayName ?? null,
    }
  }

  async updateAiConfig(
    actorUserId: string,
    payload: UpdateSystemAiConfigDto,
  ): Promise<SystemAiConfigDto> {
    const existing = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const normalizedBaseUrl = payload.baseUrl?.trim()
      || existing?.baseUrl
      || DEFAULT_SYSTEM_AI_BASE_URL

    if (payload.enabled && !normalizedBaseUrl) {
      throw new BadRequestException('启用系统 AI 配置时必须提供 baseUrl')
    }

    const existingPlainApiKey = this.decryptApiKey(existing?.apiKey ?? null)
    const nextPlainApiKey = payload.clearApiKey
      ? null
      : payload.apiKey?.trim()
        ? payload.apiKey.trim()
        : existingPlainApiKey

    const configData = {
      enabled: payload.enabled,
      provider: 'openai-compatible',
      baseUrl: normalizedBaseUrl,
      defaultModel: payload.defaultModel?.trim() || null,
      apiKey: nextPlainApiKey ? encryptAes256Gcm(nextPlainApiKey, this.encryptionKey) : null,
      updatedByUserId: actorUserId,
    }

    if (existing) {
      await this.prisma.systemAiConfig.update({
        where: { id: existing.id },
        data: configData,
      })
    }
    else {
      await this.prisma.systemAiConfig.create({
        data: configData,
      })
    }

    await this.createAuditLog(actorUserId, {
      action: 'system_ai_config.updated',
      targetType: 'system_ai_config',
      targetId: existing?.id ?? null,
      metadata: {
        enabled: payload.enabled,
        baseUrl: normalizedBaseUrl,
        defaultModel: payload.defaultModel?.trim() || null,
        hasApiKey: Boolean(nextPlainApiKey),
        clearApiKey: payload.clearApiKey ?? false,
      },
    })

    return this.getAiConfig()
  }

  async getAuditLogs(): Promise<SystemAdminAuditLogItemDto[]> {
    const logs = await this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      actorUserId: log.actorUser.id,
      actorDisplayName: log.actorUser.displayName,
      actorAvatarUrl: log.actorUser.avatarUrl,
      metadata: asRecord(log.metadata),
      createdAt: log.createdAt,
    }))
  }

  async getGovernanceSummary(): Promise<GovernanceSummaryDto> {
    const stats = await this.getDocumentStats()

    return {
      ...stats,
      lockedStatus: DocumentStatus.LOCKED,
      note: '系统管理员默认只看文档元数据与风险态势，不直接查看正文内容，也不直接处置用户资产。',
    }
  }

  private async getDocumentStats() {
    const [totalDocuments, lockedDocuments, sharedDocumentGroups] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: DocumentStatus.LOCKED } }),
      this.prisma.documentMember.groupBy({
        by: ['documentId'],
        where: { role: DocumentMemberRole.VIEWER },
      }),
    ])

    return {
      totalDocuments,
      sharedDocuments: sharedDocumentGroups.length,
      lockedDocuments,
    }
  }

  private decryptApiKey(storedApiKey: string | null | undefined): string | null {
    if (!storedApiKey) {
      return null
    }

    if (!isEncryptedValue(storedApiKey)) {
      return storedApiKey
    }

    return decryptAes256Gcm(storedApiKey, this.encryptionKey)
  }

  private async createAuditLog(
    actorUserId: string,
    input: {
      action: string
      targetType: string
      targetId: string | null
      metadata?: Prisma.InputJsonValue
    },
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    })
  }
}

function maskApiKey(apiKey: string | null | undefined) {
  if (!apiKey) {
    return null
  }

  const suffix = apiKey.slice(-4)
  return `••••••••${suffix}`
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}
