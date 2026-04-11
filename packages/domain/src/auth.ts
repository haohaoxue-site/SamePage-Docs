import type { AuthMethodSchema, AuthProviderSchema } from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export { AuthMethodSchema, AuthProviderSchema } from '@haohaoxue/samepage-contracts'

export type AuthProviderName = z.infer<typeof AuthProviderSchema>
export type AuthMethodName = z.infer<typeof AuthMethodSchema>

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

export interface ConfirmEmailVerificationDto {
  token: string
}

export interface ConfirmEmailVerificationResponseDto {
  email: string
}

export interface PasswordRegisterDto {
  token: string
  displayName: string
  password: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface AuthRegistrationOptionsDto {
  allowPasswordRegistration: boolean
  allowGithubRegistration: boolean
  allowLinuxDoRegistration: boolean
}
