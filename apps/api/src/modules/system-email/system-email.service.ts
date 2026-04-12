import type { CryptoConfig } from '../../config/auth.config'
import type {
  SystemEmailConfigDto,
  TestSystemEmailConfigResponseDto,
  UpdateSystemEmailConfigDto,
} from '../system-admin/system-admin.dto'
import { SYSTEM_EMAIL_PROVIDER, SYSTEM_EMAIL_PROVIDER_DEFAULTS } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SystemEmailProvider } from '@prisma/client'
import { createTransport } from 'nodemailer'
import { PrismaService } from '../../database/prisma.service'
import { decryptAes256Gcm, encryptAes256Gcm, isEncryptedValue } from '../../utils/crypto'

const DEFAULT_PROVIDER = SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL as SystemEmailProvider

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
      include: {
        updatedByUser: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!config) {
      const defaults = SYSTEM_EMAIL_PROVIDER_DEFAULTS[DEFAULT_PROVIDER]
      return {
        provider: DEFAULT_PROVIDER,
        enabled: false,
        smtpHost: defaults.smtpHost,
        smtpPort: defaults.smtpPort,
        smtpSecure: defaults.smtpSecure,
        smtpUsername: '',
        fromName: 'SamePage',
        fromEmail: '',
        hasPassword: false,
        updatedAt: null,
        updatedByDisplayName: null,
      }
    }

    return {
      provider: config.provider as SystemEmailProvider,
      enabled: config.enabled,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUsername: config.smtpUsername,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      hasPassword: Boolean(this.decryptPassword(config.smtpPasswordEncrypted)),
      updatedAt: config.updatedAt,
      updatedByDisplayName: config.updatedByUser?.displayName ?? null,
    }
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.prisma.systemEmailConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        enabled: true,
      },
    })

    return config?.enabled ?? false
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

    if (payload.enabled && !nextPassword) {
      throw new BadRequestException('启用发件服务前必须填写发件密码')
    }

    const data = {
      provider: payload.provider,
      enabled: payload.enabled,
      smtpHost: payload.smtpHost.trim(),
      smtpPort: payload.smtpPort,
      smtpSecure: payload.smtpSecure,
      smtpUsername: payload.smtpUsername.trim(),
      smtpPasswordEncrypted: nextPassword ? encryptAes256Gcm(nextPassword, this.encryptionKey) : null,
      fromName: payload.fromName.trim(),
      fromEmail: payload.fromEmail.trim().toLowerCase(),
      updatedByUserId: actorUserId,
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
