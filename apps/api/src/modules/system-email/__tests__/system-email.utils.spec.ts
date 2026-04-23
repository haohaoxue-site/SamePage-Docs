import { describe, expect, it } from 'vitest'
import {
  createDefaultSystemEmailConfig,
  toSystemEmailConfig,
  toSystemEmailServiceStatus,
} from '../system-email.utils'

describe('system-email.utils', () => {
  it('createDefaultSystemEmailConfig 返回默认发件配置', () => {
    expect(createDefaultSystemEmailConfig()).toEqual({
      provider: 'TENCENT_EXMAIL',
      smtpHost: 'smtp.exmail.qq.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: '',
      fromName: 'SamePage',
      fromEmail: '',
      hasPassword: false,
      updatedAt: null,
      updatedBy: null,
      updatedByUser: null,
    })
  })

  it('toSystemEmailConfig 会把更新时间转成 ISO 字符串', () => {
    expect(toSystemEmailConfig({
      provider: 'TENCENT_EXMAIL',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: 'mailer',
      fromName: 'SamePage',
      fromEmail: 'mailer@example.com',
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedBy: 'user_1',
      updatedByUser: {
        id: 'user_1',
        displayName: '管理员',
        avatarUrl: null,
      },
    }, true)).toEqual({
      provider: 'TENCENT_EXMAIL',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: 'mailer',
      fromName: 'SamePage',
      fromEmail: 'mailer@example.com',
      hasPassword: true,
      updatedAt: '2026-04-21T00:00:00.000Z',
      updatedBy: 'user_1',
      updatedByUser: {
        id: 'user_1',
        displayName: '管理员',
        avatarUrl: null,
      },
    })
  })

  it('toSystemEmailServiceStatus 缺省时返回关闭态', () => {
    expect(toSystemEmailServiceStatus(null)).toEqual({
      enabled: false,
      updatedAt: null,
      updatedBy: null,
      updatedByUser: null,
    })
  })
})
