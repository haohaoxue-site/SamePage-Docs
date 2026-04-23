import type { SYSTEM_EMAIL_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import type { AuthMethodName } from './auth'
import type { IsoDateTimeString } from './common'
import type { AuditUserSummary, UserStatus } from './user'

export type SystemAdminUserStatus = UserStatus
export type SystemEmailProvider = (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

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

export interface SystemAdminUserItem {
  id: string
  email: string | null
  displayName: string
  userCode: string
  avatarUrl: string | null
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
  authMethods: AuthMethodName[]
  ownedDocumentCount: number
  sharedDocumentCount: number
  createdAt: IsoDateTimeString
  lastLoginAt: IsoDateTimeString | null
}

export interface UpdateSystemAdminUserStatusRequest {
  status: SystemAdminUserStatus
}

export interface UpdateSystemAdminUserResponse {
  id: string
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
}

export interface SystemAuthGovernance {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
  emailServiceEnabled: boolean
  systemAdminEmail: string
  systemAdminDisplayName: string | null
  systemAdminMustChangePassword: boolean
  systemAdminLastLoginAt: IsoDateTimeString | null
  systemAdminPasswordUpdatedAt: IsoDateTimeString | null
}

export interface UpdateSystemAuthGovernanceRequest {
  allowPasswordRegistration?: boolean
  allowGithubRegistration?: boolean
  allowLinuxDoRegistration?: boolean
}

export interface SystemEmailConfig {
  provider: SystemEmailProvider
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  fromName: string
  fromEmail: string
  hasPassword: boolean
  updatedAt: IsoDateTimeString | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

export interface SystemEmailServiceStatus {
  enabled: boolean
  updatedAt: IsoDateTimeString | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

export interface UpdateSystemEmailConfigRequest {
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

export interface UpdateSystemEmailServiceStatusRequest {
  enabled: boolean
}

/**
 * 发送测试邮件请求。
 */
export interface TestSystemEmailConfigRequest {
  email: string
}

export interface TestSystemEmailConfigResponse {
  sent: boolean
}

export interface SystemAiConfig {
  id: string | null
  baseUrl: string | null
  hasApiKey: boolean
  maskedApiKey: string | null
  updatedAt: IsoDateTimeString | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

export interface SystemAiServiceStatus {
  enabled: boolean
  updatedAt: IsoDateTimeString | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

export interface UpdateSystemAiConfigRequest {
  baseUrl?: string
  apiKey?: string
  clearApiKey?: boolean
}

export interface UpdateSystemAiServiceStatusRequest {
  enabled: boolean
}

export interface SystemAdminAuditLogItem {
  id: string
  action: string
  targetType: string
  targetId: string | null
  actorUserId: string
  actorDisplayName: string
  actorAvatarUrl: string | null
  metadata: Record<string, unknown> | null
  createdAt: IsoDateTimeString
}

export interface GovernanceSummary {
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  lockedStatus: 'LOCKED'
  note: string
}
