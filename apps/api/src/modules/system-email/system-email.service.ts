import type { CryptoConfig } from '../../config/auth.config'
import type {
  SystemEmailConfigDto,
  SystemEmailServiceStatusDto,
  TestSystemEmailConfigResponseDto,
  UpdateSystemEmailConfigDto,
  UpdateSystemEmailServiceStatusDto,
} from '../system-admin/system-admin.dto'
import { SYSTEM_EMAIL_PROVIDER, SYSTEM_EMAIL_PROVIDER_DEFAULTS } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma, SystemEmailProvider } from '@prisma/client'
import { createTransport } from 'nodemailer'
import { PrismaService } from '../../database/prisma.service'
import { auditUserSummarySelect, toAuditUserSummary } from '../../utils/audit-user-summary'
import { decryptAes256Gcm, encryptAes256Gcm, isEncryptedValue } from '../../utils/crypto'

const DEFAULT_PROVIDER = SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL as SystemEmailProvider
const systemEmailConfigInclude = {
  updatedByUser: {
    select: auditUserSummarySelect,
  },
} satisfies Prisma.SystemEmailConfigInclude

@Injectable()
export class SystemEmailService {
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.encryptionKey = configService.getOrThrow<CryptoConfig>('crypto').encryptionKey
  }

  async getEmailConfig(): Promise<SystemEmailConfigDto> {
    const config = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: systemEmailConfigInclude,
    })

    if (!config) {
      const defaults = SYSTEM_EMAIL_PROVIDER_DEFAULTS[DEFAULT_PROVIDER]
      return {
        provider: DEFAULT_PROVIDER,
        smtpHost: defaults.smtpHost,
        smtpPort: defaults.smtpPort,
        smtpSecure: defaults.smtpSecure,
        smtpUsername: '',
        fromName: 'SamePage',
        fromEmail: '',
        hasPassword: false,
        updatedAt: null,
        updatedBy: null,
        updatedByUser: null,
      }
    }

    return {
      provider: config.provider as SystemEmailProvider,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUsername: config.smtpUsername,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      hasPassword: Boolean(this.decryptPassword(config.smtpPasswordEncrypted)),
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      updatedByUser: toAuditUserSummary(config.updatedByUser),
    }
  }

  async getEmailServiceStatus(): Promise<SystemEmailServiceStatusDto> {
    const config = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: systemEmailConfigInclude,
    })

    return {
      enabled: config?.enabled ?? false,
      updatedAt: config?.updatedAt ?? null,
      updatedBy: config?.updatedBy ?? null,
      updatedByUser: toAuditUserSummary(config?.updatedByUser),
    }
  }

  async isEnabled(): Promise<boolean> {
    return (await this.getEmailServiceStatus()).enabled
  }

  async updateEmailConfig(
    actorUserId: string,
    payload: UpdateSystemEmailConfigDto,
  ): Promise<SystemEmailConfigDto> {
    const existing = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    const existingPassword = this.decryptPassword(existing?.smtpPasswordEncrypted ?? null)
    const nextPassword = payload.clearPassword
      ? null
      : payload.smtpPassword?.trim()
        ? payload.smtpPassword.trim()
        : existingPassword
    const nextSmtpHost = payload.smtpHost.trim()
    const nextSmtpUsername = payload.smtpUsername.trim()
    const nextFromName = payload.fromName.trim()
    const nextFromEmail = payload.fromEmail.trim().toLowerCase()

    if (existing?.enabled) {
      this.assertEmailServiceReady({
        smtpHost: nextSmtpHost,
        smtpPort: payload.smtpPort,
        smtpUsername: nextSmtpUsername,
        fromName: nextFromName,
        fromEmail: nextFromEmail,
        smtpPassword: nextPassword,
      })
    }

    const data = {
      provider: payload.provider,
      enabled: existing?.enabled ?? false,
      smtpHost: nextSmtpHost,
      smtpPort: payload.smtpPort,
      smtpSecure: payload.smtpSecure,
      smtpUsername: nextSmtpUsername,
      smtpPasswordEncrypted: nextPassword ? encryptAes256Gcm(nextPassword, this.encryptionKey) : null,
      fromName: nextFromName,
      fromEmail: nextFromEmail,
      updatedBy: actorUserId,
    }

    if (existing) {
      await this.prisma.systemEmailConfig.update({
        where: { id: existing.id },
        data,
      })
    }
    else {
      await this.prisma.systemEmailConfig.create({
        data: {
          id: 'default',
          ...data,
        },
      })
    }

    return this.getEmailConfig()
  }

  async updateEmailServiceStatus(
    actorUserId: string,
    payload: UpdateSystemEmailServiceStatusDto,
  ): Promise<SystemEmailServiceStatusDto> {
    const existing = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (payload.enabled) {
      this.assertEmailServiceReady({
        smtpHost: existing?.smtpHost ?? '',
        smtpPort: existing?.smtpPort ?? 0,
        smtpUsername: existing?.smtpUsername ?? '',
        fromName: existing?.fromName ?? '',
        fromEmail: existing?.fromEmail ?? '',
        smtpPassword: this.decryptPassword(existing?.smtpPasswordEncrypted ?? null),
      })
    }

    if (!existing) {
      return {
        enabled: false,
        updatedAt: null,
        updatedBy: null,
        updatedByUser: null,
      }
    }

    await this.prisma.systemEmailConfig.update({
      where: { id: existing.id },
      data: {
        enabled: payload.enabled,
        updatedBy: actorUserId,
      },
    })

    return this.getEmailServiceStatus()
  }

  async sendTestEmail(recipientEmail: string): Promise<TestSystemEmailConfigResponseDto> {
    await this.sendMail({
      to: recipientEmail,
      subject: 'SamePage 发件配置测试',
      html: createSimpleEmailHtml({
        title: '发件配置已生效',
        content: '这是一封来自 SamePage 的测试邮件，说明当前系统发件配置可正常发送。',
      }),
      text: '这是一封来自 SamePage 的测试邮件，说明当前系统发件配置可正常发送。',
    })

    return { sent: true }
  }

  async sendMail(input: {
    to: string
    subject: string
    html: string
    text: string
  }): Promise<void> {
    const config = await this.getActiveTransportConfig()
    const transport = createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
    })

    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
  }

  getProviderDefaults(provider: SystemEmailProvider) {
    return SYSTEM_EMAIL_PROVIDER_DEFAULTS[provider]
  }

  private assertEmailServiceReady(input: {
    smtpHost: string
    smtpPort: number
    smtpUsername: string
    fromName: string
    fromEmail: string
    smtpPassword: string | null
  }) {
    if (
      !input.smtpHost.trim()
      || !Number.isFinite(input.smtpPort)
      || input.smtpPort <= 0
      || !input.smtpUsername.trim()
      || !input.fromName.trim()
      || !input.fromEmail.trim()
    ) {
      throw new BadRequestException('启用发件服务前请先保存完整的 SMTP 配置')
    }

    if (!input.smtpPassword) {
      throw new BadRequestException('启用发件服务前请先填写并保存发件密码')
    }
  }

  private async getActiveTransportConfig(): Promise<{
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUsername: string
    smtpPassword: string
    fromName: string
    fromEmail: string
  }> {
    const config = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!config || !config.enabled) {
      throw new BadRequestException('系统暂未启用发件邮箱，请先在后台完成配置')
    }

    const smtpPassword = this.decryptPassword(config.smtpPasswordEncrypted)

    if (!smtpPassword) {
      throw new BadRequestException('系统发件密码缺失，请先在后台补充配置')
    }

    return {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUsername: config.smtpUsername,
      smtpPassword,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
    }
  }

  private decryptPassword(value: string | null | undefined): string | null {
    if (!value) {
      return null
    }

    if (!isEncryptedValue(value)) {
      return value
    }

    return decryptAes256Gcm(value, this.encryptionKey)
  }
}

function createSimpleEmailHtml(input: {
  title: string
  content: string
}) {
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.7;">',
    `<h2 style="margin:0 0 16px;">${input.title}</h2>`,
    `<p style="margin:0;">${input.content}</p>`,
    '</div>',
  ].join('')
}
