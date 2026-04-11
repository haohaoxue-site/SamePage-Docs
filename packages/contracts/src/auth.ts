import { z } from 'zod'

export const AUTH_PROVIDER = {
  GITHUB: 'github',
  LINUX_DO: 'linux-do',
} as const

export const AUTH_PROVIDER_VALUES = [
  AUTH_PROVIDER.GITHUB,
  AUTH_PROVIDER.LINUX_DO,
] as const

export const AUTH_METHOD = {
  PASSWORD: 'password',
  ...AUTH_PROVIDER,
} as const

export const AUTH_METHOD_VALUES = [
  AUTH_METHOD.PASSWORD,
  ...AUTH_PROVIDER_VALUES,
] as const

export const AUTH_METHOD_LABELS = {
  [AUTH_METHOD.PASSWORD]: '邮箱密码',
  [AUTH_METHOD.GITHUB]: 'GitHub',
  [AUTH_METHOD.LINUX_DO]: 'LinuxDo',
} as const satisfies Record<(typeof AUTH_METHOD_VALUES)[number], string>

export const AUTH_CALLBACK_PATH = '/auth/callback'

export const AuthProviderSchema = z.enum(AUTH_PROVIDER_VALUES)
export const AuthMethodSchema = z.enum(AUTH_METHOD_VALUES)
