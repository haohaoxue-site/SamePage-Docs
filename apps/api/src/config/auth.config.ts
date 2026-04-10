import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

const JWT_DEFAULTS = {
  issuer: 'samepage-api',
  audience: 'samepage-web',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 60 * 60 * 24 * 30,
} satisfies Omit<JwtConfig, 'accessSecret'>

const GITHUB_OAUTH_DEFAULTS = {
  issuer: 'https://github.com/login/oauth',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  userinfoEndpoint: 'https://api.github.com/user',
  scopes: 'read:user user:email',
} satisfies Omit<OAuthProviderConfig, 'clientId' | 'clientSecret'>

const LINUX_DO_OAUTH_DEFAULTS = {
  discoveryIssuer: 'https://connect.linux.do/',
  authorizationEndpoint: 'https://connect.linux.do/oauth2/authorize',
  tokenEndpoint: 'https://connect.linux.do/oauth2/token',
  userinfoEndpoint: 'https://connect.linux.do/api/user',
  scopes: 'openid profile email',
} satisfies Omit<OAuthProviderConfig, 'clientId' | 'clientSecret'>

/**
 * JWT 签发与校验配置
 */
export interface JwtConfig {
  issuer: string
  audience: string
  accessSecret: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
}

/**
 * OAuth 提供商运行时配置
 */
export interface OAuthProviderConfig {
  clientId?: string
  clientSecret?: string
  issuer?: string
  discoveryIssuer?: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  userinfoEndpoint?: string
  scopes: string
}

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  github: OAuthProviderConfig
  linuxDo: OAuthProviderConfig
}

export const jwtConfig = registerAs('jwt', (): JwtConfig => ({
  ...JWT_DEFAULTS,
  accessSecret: getEnv().JWT_ACCESS_SECRET,
}))

export const oauthConfig = registerAs('oauth', (): OAuthConfig => ({
  github: {
    ...GITHUB_OAUTH_DEFAULTS,
    clientId: getEnv().GITHUB_CLIENT_ID,
    clientSecret: getEnv().GITHUB_CLIENT_SECRET,
  },
  linuxDo: {
    ...LINUX_DO_OAUTH_DEFAULTS,
    clientId: getEnv().LINUX_DO_CLIENT_ID,
    clientSecret: getEnv().LINUX_DO_CLIENT_SECRET,
  },
}))
