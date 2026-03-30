/**
 * 系统后台用户状态。
 */
export type SystemAdminUserStatus = 'ACTIVE' | 'DISABLED'

/**
 * 系统后台概览 DTO。
 */
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

/**
 * 系统后台用户条目 DTO。
 */
export interface SystemAdminUserItemDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
  ownedDocumentCount: number
  sharedDocumentCount: number
  createdAt: string
  lastLoginAt: string | null
}

/**
 * 更新用户状态请求。
 */
export interface UpdateSystemAdminUserStatusDto {
  status: SystemAdminUserStatus
}

/**
 * 更新系统管理员状态请求。
 */
export interface UpdateSystemAdminUserSystemRoleDto {
  enabled: boolean
}

/**
 * 更新用户后台状态响应。
 */
export interface UpdateSystemAdminUserResponseDto {
  id: string
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
}

/**
 * 系统 AI 配置 DTO。
 */
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

/**
 * 更新系统 AI 配置请求。
 */
export interface UpdateSystemAiConfigDto {
  enabled: boolean
  baseUrl?: string
  defaultModel?: string
  apiKey?: string
  clearApiKey?: boolean
}

/**
 * 系统后台审计日志条目 DTO。
 */
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

/**
 * 平台治理摘要 DTO。
 */
export interface GovernanceSummaryDto {
  totalDocuments: number
  sharedDocuments: number
  lockedDocuments: number
  lockedStatus: 'LOCKED'
  note: string
}
