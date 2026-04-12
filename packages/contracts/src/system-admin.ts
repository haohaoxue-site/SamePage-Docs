import { z } from 'zod'

export const SYSTEM_EMAIL_PROVIDER = {
  TENCENT_EXMAIL: 'TENCENT_EXMAIL',
  GOOGLE_WORKSPACE: 'GOOGLE_WORKSPACE',
} as const

export const SYSTEM_EMAIL_PROVIDER_VALUES = [
  SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL,
  SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE,
] as const

export const SYSTEM_EMAIL_PROVIDER_LABELS = {
  [SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL]: '腾讯企业邮箱',
  [SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE]: 'Google Workspace',
} as const satisfies Record<(typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number], string>

export const SYSTEM_EMAIL_PROVIDER_DEFAULTS = {
  [SYSTEM_EMAIL_PROVIDER.TENCENT_EXMAIL]: {
    smtpHost: 'smtp.exmail.qq.com',
    smtpPort: 465,
    smtpSecure: true,
  },
  [SYSTEM_EMAIL_PROVIDER.GOOGLE_WORKSPACE]: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
  },
} as const satisfies Record<(typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number], {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
}>

export const SystemEmailProviderSchema = z.enum(SYSTEM_EMAIL_PROVIDER_VALUES)
