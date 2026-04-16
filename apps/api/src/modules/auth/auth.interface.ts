import type { AuthUser } from '@haohaoxue/samepage-domain'
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
 * OAuth state 载荷。
 */
export interface OAuthStatePayload {
  v: number
  nonce: string
  webOrigin: string
  purpose: 'login' | 'bind'
  redirectPath: string
}

/**
 * 构建 OAuth 授权地址参数。
 */
export interface BuildOAuthAuthorizationUrlOptions {
  purpose?: 'login' | 'bind'
  initiatorUserId?: string
  redirectPath?: string
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
 * Token exchange 统一返回类型
 */
export interface TokenExchangeResult {
  accessToken: string
  expiresIn: number
  user: AuthUser
  refreshTokenCookie: string
}
