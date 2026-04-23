import type {
  GovernanceSummary,
  SystemAdminAuditLogItem,
  SystemAdminOverview,
  SystemAdminUserItem,
  SystemAdminUserStatus,
  SystemAiConfig,
  SystemAiServiceStatus,
  SystemAuthGovernance,
  SystemEmailConfig,
  SystemEmailServiceStatus,
  TestSystemEmailConfigRequest,
  TestSystemEmailConfigResponse,
  UpdateSystemAdminUserResponse,
  UpdateSystemAiConfigRequest,
  UpdateSystemAiServiceStatusRequest,
  UpdateSystemAuthGovernanceRequest,
  UpdateSystemEmailConfigRequest,
  UpdateSystemEmailServiceStatusRequest,
} from '@haohaoxue/samepage-domain'
import type { CryptoConfig } from '../../config/auth.config'
import { WORKSPACE_MEMBER_STATUS, WORKSPACE_TYPE } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DocumentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { auditUserSummarySelect, toAuditUserSummary } from '../../utils/audit-user-summary'
import { resolveAuthMethods } from '../../utils/auth-methods'
import { decryptAes256Gcm, encryptAes256Gcm, isEncryptedValue } from '../../utils/crypto'
import { SystemAuthService } from '../auth/system-auth.service'
import { SystemEmailService } from '../system-email/system-email.service'
import {
  toSystemAdminAuditLogItem,
  toSystemAdminUserItem,
  toSystemAiConfig,
  toSystemAiServiceStatus,
  toSystemAuthGovernance,
} from './system-admin.utils'

const DEFAULT_SYSTEM_AI_BASE_URL = 'https://api.openai.com/v1'
const systemAiConfigInclude = {
  updatedByUser: {
    select: auditUserSummarySelect,
  },
} satisfies Prisma.SystemAiConfigInclude

@Injectable()
export class SystemAdminService {
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemAuthService: SystemAuthService,
    private readonly systemEmailService: SystemEmailService,
    configService: ConfigService,
  ) {
    this.encryptionKey = configService.getOrThrow<CryptoConfig>('crypto').encryptionKey
  }

  async getOverview(): Promise<SystemAdminOverview> {
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
      systemAiDefaultModel: null,
    }
  }

  async getUsers(): Promise<SystemAdminUserItem[]> {
    const governance = await this.systemAuthService.getGovernanceSnapshot()
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        displayName: true,
        userCode: true,
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
          where: {
            deletedAt: null,
          },
          select: {
            provider: true,
          },
        },
        workspaceMemberships: {
          where: {
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
            workspace: {
              type: WORKSPACE_TYPE.PERSONAL,
            },
          },
          take: 1,
          select: {
            workspace: {
              select: {
                _count: {
                  select: {
                    documents: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return users.map(user => toSystemAdminUserItem({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      userCode: user.userCode,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isSystemAdmin: user.id === governance.config.systemAdminUserId,
      authMethods: resolveAuthMethods(Boolean(user.localCredential), user.oauthAccounts),
      ownedDocumentCount: user.workspaceMemberships[0]?.workspace._count.documents ?? 0,
      sharedDocumentCount: 0,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }))
  }

  async updateUserStatus(
    actorUserId: string,
    userId: string,
    status: SystemAdminUserStatus,
  ): Promise<UpdateSystemAdminUserResponse> {
    const isSystemAdmin = await this.systemAuthService.isSystemAdminUser(userId)

    if (isSystemAdmin && status === UserStatus.DISABLED) {
      throw new BadRequestException('不能禁用系统管理员')
    }

    if (actorUserId === userId && status === UserStatus.DISABLED) {
      throw new BadRequestException('不能禁用当前系统管理员自己')
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
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
      status: user.status as SystemAdminUserStatus,
      isSystemAdmin,
    }
  }

  async getAuthGovernance(): Promise<SystemAuthGovernance> {
    const [snapshot, emailServiceEnabled] = await Promise.all([
      this.systemAuthService.getGovernanceSnapshot(),
      this.systemEmailService.isEnabled(),
    ])

    return toSystemAuthGovernance({
      allowPasswordRegistration: snapshot.config.allowPasswordRegistration,
      allowGithubRegistration: snapshot.config.allowGithubRegistration,
      allowLinuxDoRegistration: snapshot.config.allowLinuxDoRegistration,
      emailServiceEnabled,
      systemAdminEmail: snapshot.config.systemAdminEmail,
      systemAdminDisplayName: snapshot.systemAdminUser?.displayName ?? null,
      systemAdminMustChangePassword: snapshot.localCredential?.mustChangePassword ?? false,
      systemAdminLastLoginAt: snapshot.systemAdminUser?.lastLoginAt ?? null,
      systemAdminPasswordUpdatedAt: snapshot.localCredential?.passwordUpdatedAt ?? null,
    })
  }

  async updateAuthGovernance(
    actorUserId: string,
    payload: UpdateSystemAuthGovernanceRequest,
  ): Promise<SystemAuthGovernance> {
    const nextRegistrationOptions = Object.fromEntries(
      Object.entries({
        allowPasswordRegistration: payload.allowPasswordRegistration,
        allowGithubRegistration: payload.allowGithubRegistration,
        allowLinuxDoRegistration: payload.allowLinuxDoRegistration,
      }).filter(([, value]) => value !== undefined),
    ) as UpdateSystemAuthGovernanceRequest

    if (Object.keys(nextRegistrationOptions).length === 0) {
      throw new BadRequestException('至少更新一项注册配置')
    }

    await this.systemAuthService.updateRegistrationOptions(actorUserId, nextRegistrationOptions)

    await this.createAuditLog(actorUserId, {
      action: 'system_auth_governance.updated',
      targetType: 'system_auth_config',
      targetId: 'default',
      metadata: nextRegistrationOptions as unknown as Prisma.InputJsonValue,
    })

    return this.getAuthGovernance()
  }

  async getEmailConfig(): Promise<SystemEmailConfig> {
    return this.systemEmailService.getEmailConfig()
  }

  async getEmailServiceStatus(): Promise<SystemEmailServiceStatus> {
    return this.systemEmailService.getEmailServiceStatus()
  }

  async updateEmailConfig(
    actorUserId: string,
    payload: UpdateSystemEmailConfigRequest,
  ): Promise<SystemEmailConfig> {
    const result = await this.systemEmailService.updateEmailConfig(actorUserId, payload)

    await this.createAuditLog(actorUserId, {
      action: 'system_email_config.updated',
      targetType: 'system_email_config',
      targetId: 'default',
      metadata: {
        provider: payload.provider,
        smtpHost: payload.smtpHost,
        smtpPort: payload.smtpPort,
        smtpSecure: payload.smtpSecure,
        smtpUsername: payload.smtpUsername,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        hasPassword: result.hasPassword,
        clearPassword: payload.clearPassword ?? false,
      },
    })

    return result
  }

  async updateEmailServiceStatus(
    actorUserId: string,
    payload: UpdateSystemEmailServiceStatusRequest,
  ): Promise<SystemEmailServiceStatus> {
    const result = await this.systemEmailService.updateEmailServiceStatus(actorUserId, payload)

    await this.createAuditLog(actorUserId, {
      action: 'system_email_service.updated',
      targetType: 'system_email_service',
      targetId: 'default',
      metadata: {
        enabled: payload.enabled,
      },
    })

    return result
  }

  async testEmailConfig(
    actorUserId: string,
    payload: TestSystemEmailConfigRequest,
  ): Promise<TestSystemEmailConfigResponse> {
    const result = await this.systemEmailService.sendTestEmail(payload.email)

    await this.createAuditLog(actorUserId, {
      action: 'system_email_config.tested',
      targetType: 'system_email_config',
      targetId: 'default',
      metadata: {
        recipientEmail: payload.email,
      },
    })

    return result
  }

  async getAiConfig(): Promise<SystemAiConfig> {
    const config = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: systemAiConfigInclude,
    })

    if (!config) {
      return {
        id: null,
        baseUrl: null,
        hasApiKey: false,
        maskedApiKey: null,
        updatedAt: null,
        updatedBy: null,
        updatedByUser: null,
      }
    }

    const decryptedApiKey = this.decryptApiKey(config.apiKey)

    return toSystemAiConfig({
      id: config.id,
      baseUrl: config.baseUrl,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      updatedByUser: toAuditUserSummary(config.updatedByUser),
      decryptedApiKey,
    })
  }

  async getAiServiceStatus(): Promise<SystemAiServiceStatus> {
    const config = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: systemAiConfigInclude,
    })

    return toSystemAiServiceStatus({
      enabled: config?.enabled ?? false,
      updatedAt: config?.updatedAt ?? null,
      updatedBy: config?.updatedBy ?? null,
      updatedByUser: toAuditUserSummary(config?.updatedByUser),
    })
  }

  async updateAiConfig(
    actorUserId: string,
    payload: UpdateSystemAiConfigRequest,
  ): Promise<SystemAiConfig> {
    const existing = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const normalizedBaseUrl = payload.baseUrl?.trim()
      || existing?.baseUrl
      || DEFAULT_SYSTEM_AI_BASE_URL

    const existingPlainApiKey = this.decryptApiKey(existing?.apiKey ?? null)
    const nextPlainApiKey = payload.clearApiKey
      ? null
      : payload.apiKey?.trim()
        ? payload.apiKey.trim()
        : existingPlainApiKey

    if (existing?.enabled) {
      this.assertAiServiceReady({
        baseUrl: normalizedBaseUrl,
        apiKey: nextPlainApiKey,
      })
    }

    const configData = {
      enabled: existing?.enabled ?? false,
      provider: 'openai-compatible',
      baseUrl: normalizedBaseUrl,
      defaultModel: null,
      apiKey: nextPlainApiKey ? encryptAes256Gcm(nextPlainApiKey, this.encryptionKey) : null,
      updatedBy: actorUserId,
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
        baseUrl: normalizedBaseUrl,
        hasApiKey: Boolean(nextPlainApiKey),
        clearApiKey: payload.clearApiKey ?? false,
      },
    })

    return this.getAiConfig()
  }

  async updateAiServiceStatus(
    actorUserId: string,
    payload: UpdateSystemAiServiceStatusRequest,
  ): Promise<SystemAiServiceStatus> {
    const existing = await this.prisma.systemAiConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (payload.enabled) {
      this.assertAiServiceReady({
        baseUrl: existing?.baseUrl ?? DEFAULT_SYSTEM_AI_BASE_URL,
        apiKey: this.decryptApiKey(existing?.apiKey ?? null),
      })
    }

    if (!existing) {
      return toSystemAiServiceStatus({
        enabled: false,
        updatedAt: null,
        updatedBy: null,
        updatedByUser: null,
      })
    }

    await this.prisma.systemAiConfig.update({
      where: { id: existing.id },
      data: {
        enabled: payload.enabled,
        updatedBy: actorUserId,
      },
    })

    await this.createAuditLog(actorUserId, {
      action: 'system_ai_service.updated',
      targetType: 'system_ai_service',
      targetId: 'default',
      metadata: {
        enabled: payload.enabled,
      },
    })

    return this.getAiServiceStatus()
  }

  async getAuditLogs(): Promise<SystemAdminAuditLogItem[]> {
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

    return logs.map(log => toSystemAdminAuditLogItem({
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

  async getGovernanceSummary(): Promise<GovernanceSummary> {
    const stats = await this.getDocumentStats()

    return {
      ...stats,
      lockedStatus: DocumentStatus.LOCKED as GovernanceSummary['lockedStatus'],
      note: '系统管理员默认只看文档元数据与风险态势，不直接查看正文内容，也不直接处置用户资产。',
    }
  }

  private async getDocumentStats() {
    const [totalDocuments, lockedDocuments] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: DocumentStatus.LOCKED } }),
    ])

    return {
      totalDocuments,
      sharedDocuments: 0,
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

  private assertAiServiceReady(input: {
    baseUrl: string | null
    apiKey: string | null
  }) {
    if (!input.baseUrl?.trim()) {
      throw new BadRequestException('启用 AI 服务前请先保存 API 地址')
    }

    if (!input.apiKey?.trim()) {
      throw new BadRequestException('启用 AI 服务前请先填写并保存 API Key')
    }
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

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}
