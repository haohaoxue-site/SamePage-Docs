import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import type { JWTPayload } from 'jose'

/**
 * OAuth provider 返回的标准化身份信息
 */
export interface OAuthProfile {
  providerUserId: string
  username?: string
  displayName?: string
  email?: string
  emailVerified?: boolean
  avatarUrl?: string
  rawProfile: Record<string, unknown>
}

/**
 * 访问令牌载荷
 */
export interface AccessTokenPayload extends JWTPayload {
  tokenType: 'access'
  roles: string[]
  permissions: string[]
}

/**
 * 当前登录用户上下文
 */
export interface AuthUserContext {
  id: string
  roles: string[]
  permissions: string[]
}

/**
 * 当前登录用户响应。
 */
export interface AuthUserDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
  authMethods: AuthMethodName[]
  mustChangePassword: boolean
  emailVerified: boolean
}

/**
 * Token exchange 统一返回类型
 */
export interface TokenExchangeResult {
  accessToken: string
  expiresIn: number
  user: AuthUserDto
  refreshTokenCookie: string
}
