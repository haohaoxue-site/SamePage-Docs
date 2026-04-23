import { describe, expect, it } from 'vitest'
import {
  toSystemAdminAuditLogItem,
  toSystemAdminUserItem,
  toSystemAiConfig,
  toSystemAuthGovernance,
} from '../system-admin.utils'

describe('system-admin.utils', () => {
  it('toSystemAdminUserItem 会把用户时间字段转成 ISO 字符串', () => {
    expect(toSystemAdminUserItem({
      id: 'user_1',
      email: 'admin@example.com',
      displayName: '管理员',
      userCode: 'SP-ADMIN1',
      avatarUrl: null,
      status: 'ACTIVE',
      isSystemAdmin: true,
      authMethods: ['password', 'github'],
      ownedDocumentCount: 3,
      sharedDocumentCount: 5,
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      lastLoginAt: new Date('2026-04-22T00:00:00.000Z'),
    })).toEqual({
      id: 'user_1',
      email: 'admin@example.com',
      displayName: '管理员',
      userCode: 'SP-ADMIN1',
      avatarUrl: null,
      status: 'ACTIVE',
      isSystemAdmin: true,
      authMethods: ['password', 'github'],
      ownedDocumentCount: 3,
      sharedDocumentCount: 5,
      createdAt: '2026-04-21T00:00:00.000Z',
      lastLoginAt: '2026-04-22T00:00:00.000Z',
    })
  })

  it('toSystemAuthGovernance 会把系统管理员时间字段转成 ISO 字符串', () => {
    expect(toSystemAuthGovernance({
      allowPasswordRegistration: true,
      allowGithubRegistration: false,
      allowLinuxDoRegistration: true,
      emailServiceEnabled: true,
      systemAdminEmail: 'admin@example.com',
      systemAdminDisplayName: '管理员',
      systemAdminMustChangePassword: false,
      systemAdminLastLoginAt: new Date('2026-04-21T00:00:00.000Z'),
      systemAdminPasswordUpdatedAt: new Date('2026-04-20T00:00:00.000Z'),
    })).toEqual({
      allowPasswordRegistration: true,
      allowGithubRegistration: false,
      allowLinuxDoRegistration: true,
      emailServiceEnabled: true,
      systemAdminEmail: 'admin@example.com',
      systemAdminDisplayName: '管理员',
      systemAdminMustChangePassword: false,
      systemAdminLastLoginAt: '2026-04-21T00:00:00.000Z',
      systemAdminPasswordUpdatedAt: '2026-04-20T00:00:00.000Z',
    })
  })

  it('toSystemAiConfig 会屏蔽 API Key 并保留审计用户', () => {
    expect(toSystemAiConfig({
      id: 'config_1',
      baseUrl: 'https://api.openai.com/v1',
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedBy: 'user_1',
      updatedByUser: {
        id: 'user_1',
        displayName: '管理员',
        avatarUrl: null,
      },
      decryptedApiKey: 'sk-12345678',
    })).toEqual({
      id: 'config_1',
      baseUrl: 'https://api.openai.com/v1',
      hasApiKey: true,
      maskedApiKey: '••••••••5678',
      updatedAt: '2026-04-21T00:00:00.000Z',
      updatedBy: 'user_1',
      updatedByUser: {
        id: 'user_1',
        displayName: '管理员',
        avatarUrl: null,
      },
    })
  })

  it('toSystemAdminAuditLogItem 会把日志时间字段转成 ISO 字符串', () => {
    expect(toSystemAdminAuditLogItem({
      id: 'log_1',
      action: 'user.status.updated',
      targetType: 'user',
      targetId: 'user_1',
      actorUserId: 'admin_1',
      actorDisplayName: '管理员',
      actorAvatarUrl: null,
      metadata: { status: 'DISABLED' },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
    })).toEqual({
      id: 'log_1',
      action: 'user.status.updated',
      targetType: 'user',
      targetId: 'user_1',
      actorUserId: 'admin_1',
      actorDisplayName: '管理员',
      actorAvatarUrl: null,
      metadata: { status: 'DISABLED' },
      createdAt: '2026-04-21T00:00:00.000Z',
    })
  })
})
