import type { AuthProviderName } from '@haohaoxue/samepage-contracts'
import type { OAuthConfig, OAuthProviderConfig } from '../../../config/auth.config'
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthProvider } from '@prisma/client'
import * as client from 'openid-client'

export interface OAuthRuntimeProvider {
  name: AuthProviderName
  dbProvider: AuthProvider
  config: client.Configuration
  userinfoEndpoint: string
  scopes: string
}

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

    const result = provider === 'github'
      ? this.buildProvider('github', AuthProvider.GITHUB, oauthConfig.github)
      : this.buildProvider('linux-do', AuthProvider.LINUX_DO, oauthConfig.linuxDo)

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
