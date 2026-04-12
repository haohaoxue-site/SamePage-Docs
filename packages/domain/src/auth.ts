import type { AUTH_METHOD_VALUES, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'

export type AuthProviderName = (typeof AUTH_PROVIDER_VALUES)[number]
export type AuthMethodName = (typeof AUTH_METHOD_VALUES)[number]

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
  authMethods: AuthMethodName[]
  mustChangePassword: boolean
  emailVerified: boolean
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

export interface PasswordLoginDto {
  email: string
  password: string
}

export interface RequestEmailVerificationDto {
  email: string
}

export interface RequestEmailVerificationResponseDto {
  requested: boolean
}

export interface PasswordRegisterDto {
  email: string
  code: string
  displayName: string
  password: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

/**
 * 第三方认证能力。
 */
export interface AuthProviderCapabilityDto {
  enabled: boolean
  allowRegistration: boolean
}

/**
 * 认证能力配置。
 */
export interface AuthCapabilitiesDto {
  emailBindingEnabled: boolean
  passwordRegistrationEnabled: boolean
  providers: Record<AuthProviderName, AuthProviderCapabilityDto>
}
