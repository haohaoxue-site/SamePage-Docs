export const PERMISSIONS = {
  USER_READ_SELF: 'user:read_self',
  USER_UPDATE_SELF: 'user:update_self',
  USER_DELETE_SELF: 'user:delete_self',
  SYSTEM_ADMIN_OVERVIEW_READ: 'system_admin:overview:read',
  SYSTEM_ADMIN_USER_LIST: 'system_admin:user:list',
  SYSTEM_ADMIN_USER_UPDATE_STATUS: 'system_admin:user:update_status',
  SYSTEM_ADMIN_AUTH_GOVERNANCE_READ: 'system_admin:auth_governance:read',
  SYSTEM_ADMIN_AUTH_GOVERNANCE_UPDATE: 'system_admin:auth_governance:update',
  SYSTEM_ADMIN_EMAIL_CONFIG_READ: 'system_admin:email_config:read',
  SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE: 'system_admin:email_config:update',
  SYSTEM_ADMIN_AI_CONFIG_READ: 'system_admin:ai_config:read',
  SYSTEM_ADMIN_AI_CONFIG_UPDATE: 'system_admin:ai_config:update',
  SYSTEM_ADMIN_AUDIT_LOG_LIST: 'system_admin:audit_log:list',
  SYSTEM_ADMIN_GOVERNANCE_READ: 'system_admin:governance:read',
} as const

export const ROLES = {
  USER: 'user',
  SYSTEM_ADMIN: 'system_admin',
} as const
