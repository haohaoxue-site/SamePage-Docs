import type { AuthProviderSchema } from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export { AUTH_PROVIDER, AUTH_PROVIDER_VALUES, AuthProviderSchema } from '@haohaoxue/samepage-contracts'

export type AuthProviderName = z.infer<typeof AuthProviderSchema>

/**
 * 当前登录用户信息。
 */
export interface AuthUserDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
}

/**
 * 一次性登录码交换请求。
 */
export interface ExchangeCodeDto {
  code: string
}

/**
 * 访问令牌交换响应。
 */
export interface TokenExchangeResponseDto {
  accessToken: string
  expiresIn: number
  user: AuthUserDto
}

/**
 * 登出响应。
 */
export interface LogoutResponseDto {
  loggedOut: boolean
}
