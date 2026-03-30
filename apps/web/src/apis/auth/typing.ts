/**
 * Web 端认证用户 DTO。
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
 * 一次性交换码请求。
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
