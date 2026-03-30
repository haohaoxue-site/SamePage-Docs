import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

/**
 * 启动期引导配置
 */
export interface BootstrapConfig {
  systemAdminEmails: string[]
}

export const bootstrapConfig = registerAs('bootstrap', (): BootstrapConfig => ({
  systemAdminEmails: getEnv().SYSTEM_ADMIN_EMAILS,
}))
