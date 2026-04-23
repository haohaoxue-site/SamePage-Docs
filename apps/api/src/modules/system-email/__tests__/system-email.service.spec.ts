import type { CryptoConfig } from '../../../config/auth.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemEmailService } from '../system-email.service'

const { createTransportMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  sendMailMock: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  createTransport: createTransportMock,
}))

function createPrismaMock() {
  return {
    systemEmailConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }
}

function createConfigServiceMock() {
  return {
    getOrThrow: vi.fn((_key: string): CryptoConfig => ({
      encryptionKey: '12345678901234567890123456789012',
    })),
  }
}

describe('systemEmailService', () => {
  beforeEach(() => {
    createTransportMock.mockReset()
    sendMailMock.mockReset()
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    })
  })

  it('getEmailConfig 会对历史存量配置做字段归一化', async () => {
    const prisma = createPrismaMock()
    prisma.systemEmailConfig.findFirst.mockResolvedValue({
      provider: 'TENCENT_EXMAIL',
      smtpHost: ' smtp.exmail.qq.com ',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: ' samepage ',
      smtpPasswordEncrypted: 'plain-password',
      fromName: ' SamePage Bot ',
      fromEmail: ' MAILER@EXAMPLE.COM ',
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedBy: 'user-1',
      updatedByUser: {
        id: 'user-1',
        displayName: '管理员',
        avatarUrl: null,
      },
    })
    const service = new SystemEmailService(
      prisma as never,
      createConfigServiceMock() as never,
    )

    await expect(service.getEmailConfig()).resolves.toEqual({
      provider: 'TENCENT_EXMAIL',
      smtpHost: 'smtp.exmail.qq.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: 'samepage',
      fromName: 'SamePage Bot',
      fromEmail: 'mailer@example.com',
      hasPassword: true,
      updatedAt: '2026-04-21T00:00:00.000Z',
      updatedBy: 'user-1',
      updatedByUser: {
        id: 'user-1',
        displayName: '管理员',
        avatarUrl: null,
      },
    })
  })

  it('sendMail 会使用归一化后的 transport 与 from 信息', async () => {
    const prisma = createPrismaMock()
    prisma.systemEmailConfig.findFirst.mockResolvedValue({
      enabled: true,
      provider: 'TENCENT_EXMAIL',
      smtpHost: ' smtp.exmail.qq.com ',
      smtpPort: 465,
      smtpSecure: true,
      smtpUsername: ' samepage ',
      smtpPasswordEncrypted: 'plain-password',
      fromName: ' SamePage Bot ',
      fromEmail: ' MAILER@EXAMPLE.COM ',
    })
    const service = new SystemEmailService(
      prisma as never,
      createConfigServiceMock() as never,
    )

    await service.sendMail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    })

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.exmail.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: 'samepage',
        pass: 'plain-password',
      },
    })
    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"SamePage Bot" <mailer@example.com>',
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    })
  })
})
