import type { AUTH_METHOD_VALUES, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'

export type AuthProviderName = (typeof AUTH_PROVIDER_VALUES)[number]
export type AuthMethodName = (typeof AUTH_METHOD_VALUES)[number]

/**
 * 当前登录用户信息。
 */
export interface AuthUser {
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
 * 一次性登录码交换请求。
 */
export interface ExchangeCodeRequest {
  code: string
}

/**
 * 访问令牌交换响应。
 */
export interface TokenExchangeResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

/**
 * 登出响应。
 */
export interface LogoutResponse {
  loggedOut: boolean
}

export interface PasswordLoginRequest {
  email: string
  password: string
}

export interface RequestEmailVerificationRequest {
  email: string
}

export interface RequestEmailVerificationResponse {
  requested: boolean
}

export interface PasswordRegisterRequest {
  email: string
  code: string
  displayName: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/**
 * 第三方认证能力。
 */
export interface AuthProviderCapability {
  enabled: boolean
  allowRegistration: boolean
}

/**
 * 认证能力配置。
 */
export interface AuthCapabilities {
  emailBindingEnabled: boolean
  passwordRegistrationEnabled: boolean
  providers: Record<AuthProviderName, AuthProviderCapability>
}
