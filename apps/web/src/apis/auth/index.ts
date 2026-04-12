import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type {
  ChangePasswordDto,
  ExchangeCodeDto,
  LogoutResponseDto,
  PasswordLoginDto,
  PasswordRegisterDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  TokenExchangeResponseDto,
} from './typing'
import { SERVER_PATH } from '@haohaoxue/samepage-contracts'
import { axios } from '@/utils/axios'

export * from './typing'

export function buildOAuthStartUrl(provider: AuthProviderName) {
  return `${SERVER_PATH}/auth/oauth/${provider}/start`
}

export function exchangeAuthCode(data: ExchangeCodeDto): Promise<TokenExchangeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/exchange-code',
    data,
    withCookieAuth: true,
  })
}

export function loginWithPassword(data: PasswordLoginDto): Promise<TokenExchangeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/login/password',
    data,
    withCookieAuth: true,
  })
}

export function requestEmailVerification(
  data: RequestEmailVerificationDto,
): Promise<RequestEmailVerificationResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/verify-email/request',
    data,
  })
}

export function registerWithPassword(data: PasswordRegisterDto): Promise<TokenExchangeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/register/password',
    data,
    withCookieAuth: true,
  })
}

export function refreshAccessToken(): Promise<TokenExchangeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/refresh',
    withCookieAuth: true,
  })
}

export function logoutAuthSession(): Promise<LogoutResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/logout',
    withCookieAuth: true,
  })
}

export function changePassword(data: ChangePasswordDto): Promise<TokenExchangeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/password/change',
    data,
    withCookieAuth: true,
  })
}
