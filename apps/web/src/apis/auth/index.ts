import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type {
  AuthRegistrationOptionsDto,
  ChangePasswordDto,
  ConfirmEmailVerificationDto,
  ConfirmEmailVerificationResponseDto,
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

export function getAuthRegistrationOptions(): Promise<AuthRegistrationOptionsDto> {
  return axios.request({
    method: 'get',
    url: '/auth/registration-options',
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

export function confirmEmailVerification(
  data: ConfirmEmailVerificationDto,
): Promise<ConfirmEmailVerificationResponseDto> {
  return axios.request({
    method: 'post',
    url: '/auth/verify-email/confirm',
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
