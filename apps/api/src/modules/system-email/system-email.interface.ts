import type { SYSTEM_EMAIL_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import type { AuditUserSummary } from '@haohaoxue/samepage-domain'

/**
 * 系统发件配置。
 */
export interface SystemEmailConfig {
  provider: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  fromName: string
  fromEmail: string
  hasPassword: boolean
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

/**
 * 系统发件服务状态。
 */
export interface SystemEmailServiceStatus {
  enabled: boolean
  updatedAt: Date | null
  updatedBy: string | null
  updatedByUser: AuditUserSummary | null
}

/**
 * 更新系统发件配置参数。
 */
export interface UpdateSystemEmailConfigInput {
  provider: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword?: string
  clearPassword?: boolean
  fromName: string
  fromEmail: string
}

/**
 * 更新系统发件服务状态参数。
 */
export interface UpdateSystemEmailServiceStatusInput {
  enabled: boolean
}

/**
 * 发件测试参数。
 */
export interface TestSystemEmailConfigInput {
  email: string
}

/**
 * 发件测试结果。
 */
export interface TestSystemEmailConfigResponse {
  sent: boolean
}
