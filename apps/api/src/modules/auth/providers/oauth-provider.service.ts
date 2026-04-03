import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { OAuthConfig, OAuthProviderConfig } from '../../../config/auth.config'
import { AUTH_PROVIDER } from '@haohaoxue/samepage-domain'
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthProvider } from '@prisma/client'
import * as client from 'openid-client'

/**
 * OAuth 提供商运行时配置。
 */
export interface OAuthRuntimeProvider {
  name: AuthProviderName
  dbProvider: AuthProvider
  config: client.Configuration
  userinfoEndpoint: string
  scopes: string
}

const OAUTH_PROVIDER_CONFIG_KEY = {
  [AUTH_PROVIDER.GITHUB]: 'github',
  [AUTH_PROVIDER.LINUX_DO]: 'linuxDo',
} as const satisfies Record<AuthProviderName, keyof Pick<OAuthConfig, 'github' | 'linuxDo'>>

const OAUTH_PROVIDER_DB_PROVIDER = {
  [AUTH_PROVIDER.GITHUB]: AuthProvider.GITHUB,
  [AUTH_PROVIDER.LINUX_DO]: AuthProvider.LINUX_DO,
} as const satisfies Record<AuthProviderName, AuthProvider>

@Injectable()
export class OAuthProviderService {
  private readonly providerCache = new Map<AuthProviderName, OAuthRuntimeProvider>()
  private readonly isProduction: boolean

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.getOrThrow<boolean>('server.isProduction')
  }

  getProvider(provider: AuthProviderName): OAuthRuntimeProvider {
    const cached = this.providerCache.get(provider)
    if (cached) {
      return cached
    }

    const oauthConfig = this.configService.getOrThrow<OAuthConfig>('oauth')

    const result = this.buildProvider(
      provider,
      OAUTH_PROVIDER_DB_PROVIDER[provider],
      oauthConfig[OAUTH_PROVIDER_CONFIG_KEY[provider]],
    )

    this.providerCache.set(provider, result)
    return result
  }

  resolveWebCallbackUrl(): string {
    const oauthConfig = this.configService.getOrThrow<OAuthConfig>('oauth')

    return this.isProduction
      ? oauthConfig.productionCallbackUrl
      : oauthConfig.localCallbackUrl
  }

  resolveApiCallbackUrl(provider: AuthProviderName): string {
    const apiBaseUrl = this.isProduction
      ? this.configService.getOrThrow<string>('oauth.apiBaseUrlProduction')
      : this.configService.getOrThrow<string>('oauth.apiBaseUrlLocal')

    return `${apiBaseUrl}/api/auth/oauth/${provider}/callback`
  }

  private buildProvider(
    name: AuthProviderName,
    dbProvider: AuthProvider,
    providerConfig: OAuthProviderConfig,
  ): OAuthRuntimeProvider {
    if (
      !providerConfig.clientId
      || !providerConfig.clientSecret
      || !providerConfig.authorizationEndpoint
      || !providerConfig.tokenEndpoint
      || !providerConfig.userinfoEndpoint
    ) {
      throw new BadRequestException(`${name} OAuth provider is not configured`)
    }

    const serverMetadata: client.ServerMetadata = {
      issuer: new URL(providerConfig.authorizationEndpoint).origin,
      authorization_endpoint: providerConfig.authorizationEndpoint,
      token_endpoint: providerConfig.tokenEndpoint,
      userinfo_endpoint: providerConfig.userinfoEndpoint,
    }

    let configuration: client.Configuration

    try {
      configuration = new client.Configuration(
        serverMetadata,
        providerConfig.clientId,
        providerConfig.clientSecret,
      )
    }
    catch {
      throw new InternalServerErrorException(`Failed to initialize ${name} OAuth provider`)
    }

    return {
      name,
      dbProvider,
      config: configuration,
      userinfoEndpoint: providerConfig.userinfoEndpoint,
      scopes: providerConfig.scopes,
    }
  }
}
