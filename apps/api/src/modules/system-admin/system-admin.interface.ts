import type { AuditUserSummary, AuthMethodName } from '@haohaoxue/samepage-domain'
import type { DocumentStatus, UserStatus } from '@prisma/client'

/**
 * 系统后台概览。
 */
export interface SystemAdminOverview {
  totalUsers: number
  activeUsers: number
  disabledUsers: number
  systemAdminCount: number
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  aiConfigEnabled: boolean
  systemAiBaseUrl: string | null
  systemAiDefaultModel: string | null
}

/**
 * 系统后台用户项。
 */
export interface SystemAdminUserItem {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  status: UserStatus
  isSystemAdmin: boolean
  authMethods: AuthMethodName[]
  ownedDocumentCount: number
  sharedDocumentCount: number
  createdAt: Date
  lastLoginAt: Date | null
}

/**
 * 更新用户状态结果。
 */
export interface UpdateSystemAdminUserResponse {
  id: string
  status: UserStatus
  isSystemAdmin: boolean
}

/**
 * 认证治理视图。
 */
export interface SystemAuthGovernance {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
  emailServiceEnabled: boolean
  systemAdminEmail: string
  systemAdminDisplayName: string | null
  systemAdminMustChangePassword: boolean
  systemAdminLastLoginAt: Date | null
  systemAdminPasswordUpdatedAt: Date | null
}

/**
 * 更新认证治理参数。
 */
export interface UpdateSystemAuthGovernanceInput {
  allowPasswordRegistration?: boolean
  allowGithubRegistration?: boolean
  allowLinuxDoRegistration?: boolean
}

/**
 * 系统 AI 配置。
 */
export interface SystemAiConfig {
  id: string | null
  baseUrl: string | null
  hasApiKey: boolean
  maskedApiKey: string | null
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

/**
 * 系统 AI 服务状态。
 */
export interface SystemAiServiceStatus {
  enabled: boolean
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

/**
 * 更新系统 AI 配置参数。
 */
export interface UpdateSystemAiConfigInput {
  baseUrl?: string
  apiKey?: string
  clearApiKey?: boolean
}

/**
 * 更新系统 AI 服务状态参数。
 */
export interface UpdateSystemAiServiceStatusInput {
  enabled: boolean
}

/**
 * 系统审计日志项。
 */
export interface SystemAdminAuditLogItem {
  id: string
  action: string
  targetType: string
  targetId: string | null
  actorUserId: string
  actorDisplayName: string
  actorAvatarUrl: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

/**
 * 平台治理摘要。
 */
export interface GovernanceSummary {
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  lockedStatus: DocumentStatus
  note: string
}
