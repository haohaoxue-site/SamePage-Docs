import { PERMISSIONS, ROLES } from '@haohaoxue/samepage-contracts'

export const DEFAULT_RBAC_SEED = {
  permissions: [
    {
      code: PERMISSIONS.USER_READ_SELF,
      description: '读取当前用户信息',
    },
    {
      code: PERMISSIONS.USER_UPDATE_SELF,
      description: '更新当前用户信息',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_OVERVIEW_READ,
      description: '查看系统后台概览',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_USER_LIST,
      description: '查看系统后台用户列表',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_USER_UPDATE_STATUS,
      description: '更新用户状态',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_READ,
      description: '读取认证治理配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_UPDATE,
      description: '更新认证治理配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_READ,
      description: '读取系统发件配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE,
      description: '更新系统发件配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_READ,
      description: '读取系统 AI 配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_UPDATE,
      description: '更新系统 AI 配置',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_AUDIT_LOG_LIST,
      description: '查看系统审计日志',
    },
    {
      code: PERMISSIONS.SYSTEM_ADMIN_GOVERNANCE_READ,
      description: '查看平台治理信息',
    },
  ],
  roles: [
    {
      code: ROLES.USER,
      name: '普通用户',
      permissions: [PERMISSIONS.USER_READ_SELF, PERMISSIONS.USER_UPDATE_SELF],
    },
    {
      code: ROLES.SYSTEM_ADMIN,
      name: '系统管理员',
      permissions: [
        PERMISSIONS.USER_READ_SELF,
        PERMISSIONS.USER_UPDATE_SELF,
        PERMISSIONS.SYSTEM_ADMIN_OVERVIEW_READ,
        PERMISSIONS.SYSTEM_ADMIN_USER_LIST,
        PERMISSIONS.SYSTEM_ADMIN_USER_UPDATE_STATUS,
        PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_READ,
        PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_UPDATE,
        PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_READ,
        PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE,
        PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_READ,
        PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_UPDATE,
        PERMISSIONS.SYSTEM_ADMIN_AUDIT_LOG_LIST,
        PERMISSIONS.SYSTEM_ADMIN_GOVERNANCE_READ,
      ],
    },
  ],
} as const
