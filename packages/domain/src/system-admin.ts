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
  systemAdminEmail: string
  systemAdminDisplayName: string | null
  systemAdminMustChangePassword: boolean
  systemAdminLastLoginAt: string | null
  systemAdminPasswordUpdatedAt: string | null
}

export interface UpdateSystemAuthGovernanceDto {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
}

export interface SystemEmailConfigDto {
  provider: SystemEmailProvider
  enabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  fromName: string
  fromEmail: string
  hasPassword: boolean
  updatedAt: string | null
  updatedByDisplayName: string | null
}

export interface UpdateSystemEmailConfigDto {
  provider: SystemEmailProvider
  enabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword?: string
  clearPassword?: boolean
  fromName: string
  fromEmail: string
}

export interface TestSystemEmailConfigResponseDto {
  sent: boolean
}

export interface SystemAiConfigDto {
  id: string | null
  enabled: boolean
  provider: string
  baseUrl: string | null
  defaultModel: string | null
  hasApiKey: boolean
  maskedApiKey: string | null
  updatedAt: string | null
  updatedByDisplayName: string | null
}

export interface UpdateSystemAiConfigDto {
  enabled: boolean
  baseUrl?: string
  defaultModel?: string
  apiKey?: string
  clearApiKey?: boolean
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
}

export interface GovernanceSummaryDto {
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  lockedStatus: 'LOCKED'
  note: string
}
