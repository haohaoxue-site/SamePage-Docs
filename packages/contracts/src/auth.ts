import { z } from 'zod'

export const AUTH_PROVIDER = {
  GITHUB: 'github',
  LINUX_DO: 'linux-do',
} as const

export const AUTH_PROVIDER_VALUES = [
  AUTH_PROVIDER.GITHUB,
  AUTH_PROVIDER.LINUX_DO,
] as const

export const AuthProviderSchema = z.enum(AUTH_PROVIDER_VALUES)
