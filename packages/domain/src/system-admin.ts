import type { UserStatus } from './user'

export type SystemAdminUserStatus = UserStatus

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
  ownedDocumentCount: number
  sharedDocumentCount: number
  createdAt: string
  lastLoginAt: string | null
}

export interface UpdateSystemAdminUserStatusDto {
  status: SystemAdminUserStatus
}

export interface UpdateSystemAdminUserSystemRoleDto {
  enabled: boolean
}

export interface UpdateSystemAdminUserResponseDto {
  id: string
  status: SystemAdminUserStatus
  isSystemAdmin: boolean
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
