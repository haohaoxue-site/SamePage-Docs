import type {
  AuditUserSummary,
  AuthMethodName,
  SystemAdminAuditLogItem,
  SystemAdminUserItem,
  SystemAdminUserStatus,
  SystemAiConfig,
  SystemAiServiceStatus,
  SystemAuthGovernance,
} from '@haohaoxue/samepage-domain'

export interface SystemAdminUserItemRecord {
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
  createdAt: Date
  lastLoginAt: Date | null
}

export interface SystemAuthGovernanceRecord {
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

export interface SystemAiConfigRecord {
  id: string
  baseUrl: string | null
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
  decryptedApiKey: string | null
}

export interface SystemAiServiceStatusRecord {
  enabled: boolean
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

export interface SystemAdminAuditLogItemRecord {
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

export function toSystemAdminUserItem(record: SystemAdminUserItemRecord): SystemAdminUserItem {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    userCode: record.userCode,
    avatarUrl: record.avatarUrl,
    status: record.status,
    isSystemAdmin: record.isSystemAdmin,
    authMethods: record.authMethods,
    ownedDocumentCount: record.ownedDocumentCount,
    sharedDocumentCount: record.sharedDocumentCount,
    createdAt: record.createdAt.toISOString(),
    lastLoginAt: toIsoDateTimeString(record.lastLoginAt),
  }
}

export function toSystemAuthGovernance(record: SystemAuthGovernanceRecord): SystemAuthGovernance {
  return {
    allowPasswordRegistration: record.allowPasswordRegistration,
    allowGithubRegistration: record.allowGithubRegistration,
    allowLinuxDoRegistration: record.allowLinuxDoRegistration,
    emailServiceEnabled: record.emailServiceEnabled,
    systemAdminEmail: record.systemAdminEmail,
    systemAdminDisplayName: record.systemAdminDisplayName,
    systemAdminMustChangePassword: record.systemAdminMustChangePassword,
    systemAdminLastLoginAt: toIsoDateTimeString(record.systemAdminLastLoginAt),
    systemAdminPasswordUpdatedAt: toIsoDateTimeString(record.systemAdminPasswordUpdatedAt),
  }
}

export function toSystemAiConfig(record: SystemAiConfigRecord): SystemAiConfig {
  return {
    id: record.id,
    baseUrl: record.baseUrl,
    hasApiKey: Boolean(record.decryptedApiKey),
    maskedApiKey: maskApiKey(record.decryptedApiKey),
    updatedAt: toIsoDateTimeString(record.updatedAt),
    updatedBy: record.updatedBy,
    updatedByUser: record.updatedByUser,
  }
}

export function toSystemAiServiceStatus(record: SystemAiServiceStatusRecord): SystemAiServiceStatus {
  return {
    enabled: record.enabled,
    updatedAt: toIsoDateTimeString(record.updatedAt),
    updatedBy: record.updatedBy,
    updatedByUser: record.updatedByUser,
  }
}

export function toSystemAdminAuditLogItem(record: SystemAdminAuditLogItemRecord): SystemAdminAuditLogItem {
  return {
    id: record.id,
    action: record.action,
    targetType: record.targetType,
    targetId: record.targetId,
    actorUserId: record.actorUserId,
    actorDisplayName: record.actorDisplayName,
    actorAvatarUrl: record.actorAvatarUrl,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
  }
}

function maskApiKey(apiKey: string | null | undefined) {
  if (!apiKey) {
    return null
  }

  const suffix = apiKey.slice(-4)
  return `••••••••${suffix}`
}

function toIsoDateTimeString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}
