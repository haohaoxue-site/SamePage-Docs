import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

/**
 * JWT 签发与校验配置
 */
export interface JwtConfig {
  issuer: string
  audience: string
  accessSecret: string
  refreshSecret: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
}

/**
 * OAuth 提供商运行时配置
 */
export interface OAuthProviderConfig {
  clientId?: string
  clientSecret?: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  userinfoEndpoint?: string
  scopes: string
}

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  localCallbackUrl: string
  productionCallbackUrl: string
  apiBaseUrlLocal: string
  apiBaseUrlProduction: string
  github: OAuthProviderConfig
  linuxDo: OAuthProviderConfig
}

export const jwtConfig = registerAs('jwt', (): JwtConfig => ({
  issuer: getEnv().JWT_ISSUER,
  audience: getEnv().JWT_AUDIENCE,
  accessSecret: getEnv().JWT_ACCESS_SECRET,
  refreshSecret: getEnv().JWT_REFRESH_SECRET,
  accessTtlSeconds: getEnv().JWT_ACCESS_EXPIRES_IN_SEC,
  refreshTtlSeconds: getEnv().JWT_REFRESH_EXPIRES_IN_SEC,
}))

export const oauthConfig = registerAs('oauth', (): OAuthConfig => ({
  localCallbackUrl: getEnv().AUTH_WEB_CALLBACK_LOCAL,
  productionCallbackUrl: getEnv().AUTH_WEB_CALLBACK_PROD,
  apiBaseUrlLocal: getEnv().AUTH_API_BASE_URL_LOCAL,
  apiBaseUrlProduction: getEnv().AUTH_API_BASE_URL_PROD,
  github: {
    clientId: getEnv().GITHUB_CLIENT_ID,
    clientSecret: getEnv().GITHUB_CLIENT_SECRET,
    authorizationEndpoint: getEnv().GITHUB_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: getEnv().GITHUB_TOKEN_ENDPOINT,
    userinfoEndpoint: getEnv().GITHUB_USERINFO_ENDPOINT,
    scopes: getEnv().GITHUB_SCOPE,
  },
  linuxDo: {
    clientId: getEnv().LINUX_DO_CLIENT_ID,
    clientSecret: getEnv().LINUX_DO_CLIENT_SECRET,
    authorizationEndpoint: getEnv().LINUX_DO_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: getEnv().LINUX_DO_TOKEN_ENDPOINT,
    userinfoEndpoint: getEnv().LINUX_DO_USERINFO_ENDPOINT,
    scopes: getEnv().LINUX_DO_SCOPE,
  },
}))
