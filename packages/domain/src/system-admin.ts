import type { SYSTEM_EMAIL_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import type { AuthMethodName } from './auth'
import type { UserStatus } from './user'

export type SystemAdminUserStatus = UserStatus
export type SystemEmailProvider = (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

export interface SystemAdminOverviewDto {
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

export interface SystemAdminUserItemDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
  authMethods: AuthMethodName[]
  ownedDocumentCount: number
  sharedDocumentCount: number
  createdAt: string
  createdBy: string | null
  lastLoginAt: string | null
}

export interface UpdateSystemAdminUserStatusDto {
  status: SystemAdminUserStatus
}

export interface UpdateSystemAdminUserResponseDto {
  id: string
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
}

export interface SystemAuthGovernanceDto {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
  emailServiceEnabled: boolean
  systemAdminEmail: string
  systemAdminDisplayName: string | null
  systemAdminMustChangePassword: boolean
  systemAdminLastLoginAt: string | null
  systemAdminPasswordUpdatedAt: string | null
}

export interface UpdateSystemAuthGovernanceDto {
  allowPasswordRegistration?: boolean
  allowGithubRegistration?: boolean
  allowLinuxDoRegistration?: boolean
}

export interface SystemEmailConfigDto {
  provider: SystemEmailProvider
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  fromName: string
  fromEmail: string
  hasPassword: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export interface SystemEmailServiceStatusDto {
  enabled: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export interface UpdateSystemEmailConfigDto {
  provider: SystemEmailProvider
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword?: string
  clearPassword?: boolean
  fromName: string
  fromEmail: string
}

export interface UpdateSystemEmailServiceStatusDto {
  enabled: boolean
}

/**
 * 发送测试邮件请求。
 */
export interface TestSystemEmailConfigDto {
  email: string
}

export interface TestSystemEmailConfigResponseDto {
  sent: boolean
}

export interface SystemAiConfigDto {
  id: string | null
  baseUrl: string | null
  hasApiKey: boolean
  maskedApiKey: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface SystemAiServiceStatusDto {
  enabled: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export interface UpdateSystemAiConfigDto {
  baseUrl?: string
  apiKey?: string
  clearApiKey?: boolean
}

export interface UpdateSystemAiServiceStatusDto {
  enabled: boolean
}

export interface SystemAdminAuditLogItemDto {
  id: string
  action: string
  targetType: string
  targetId: string | null
  actorUserId: string
  actorDisplayName: string
  actorAvatarUrl: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  createdBy: string | null
}

export interface GovernanceSummaryDto {
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  lockedStatus: 'LOCKED'
  note: string
}
