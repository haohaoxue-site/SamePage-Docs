import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type {
  ExchangeCodeDto,
  LogoutResponseDto,
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
