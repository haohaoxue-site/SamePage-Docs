import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { Prisma, User } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { JwtConfig } from '../../config/auth.config'
import type {
  AccessTokenPayload,
  AuthUserContext,
  OAuthProfile,
  TokenExchangeResult,
} from './auth.interface'
import { Buffer } from 'node:buffer'
import { createHash, createSecretKey, randomBytes, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  AuthProvider,
  UserStatus,
} from '@prisma/client'
import { parse, serialize } from 'cookie'
import { SignJWT } from 'jose'
import * as client from 'openid-client'
import { PrismaService } from '../../database/prisma.service'
import { RbacService } from '../rbac/rbac.service'
import { REFRESH_TOKEN_COOKIE_NAME } from './auth.constants'
import { OAuthProviderService } from './providers/oauth-provider.service'

const OAUTH_STATE_TTL_SECONDS = 10 * 60
const LOGIN_CODE_TTL_SECONDS = 2 * 60
const OAUTH_FETCH_RETRY_DELAYS_MS = [300, 900]
const RETRYABLE_OAUTH_FETCH_ERROR_RE = /fetch failed|timeout/i
const OAUTH_STATE_VERSION = 1

@Injectable()
export class AuthService {
  private readonly jwtConfig
  private readonly accessSecretKey
  private readonly isProduction

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly oauthProviderService: OAuthProviderService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt')
    this.accessSecretKey = createSecretKey(Buffer.from(this.jwtConfig.accessSecret, 'utf8'))
    this.isProduction = this.configService.getOrThrow<boolean>('server.isProduction')
  }

  async buildOAuthAuthorizationUrl(provider: AuthProviderName, request: FastifyRequest): Promise<string> {
    const runtimeProvider = await this.oauthProviderService.getProvider(provider)
    const webOrigin = this.resolveCurrentUrl(request).origin
    const callbackUrl = this.oauthProviderService.resolveApiCallbackUrl(provider, webOrigin)

    const state = this.createOAuthState(webOrigin)
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)

    await this.prisma.authOauthState.create({
      data: {
        provider: runtimeProvider.dbProvider,
        state,
        codeVerifier,
        redirectUri: callbackUrl,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000),
      },
    })

    const authorizationUrl = client.buildAuthorizationUrl(runtimeProvider.config, {
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: runtimeProvider.scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return authorizationUrl.toString()
  }

  async handleOAuthCallback(provider: AuthProviderName, request: FastifyRequest): Promise<string> {
    const runtimeProvider = await this.oauthProviderService.getProvider(provider)
    const currentUrl = this.resolveCurrentUrl(request)
    const state = currentUrl.searchParams.get('state')

    if (!state) {
      throw new UnauthorizedException('Missing OAuth state')
    }

    const oauthState = await this.prisma.authOauthState.findUnique({
      where: { state },
    })

    if (!oauthState || oauthState.provider !== runtimeProvider.dbProvider) {
      throw new UnauthorizedException('OAuth state is invalid')
    }

    if (oauthState.consumedAt || oauthState.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('OAuth state expired')
    }

    const tokens = await client.authorizationCodeGrant(
      runtimeProvider.config,
      currentUrl,
      {
        expectedState: state,
        pkceCodeVerifier: oauthState.codeVerifier,
      },
      {
        redirect_uri: oauthState.redirectUri,
      },
    )

    const accessToken = tokens.access_token

    if (!accessToken) {
      throw new UnauthorizedException('OAuth token exchange failed')
    }

    const profile = await this.fetchOAuthProfile(provider, accessToken, runtimeProvider.userinfoEndpoint)
    const user = await this.upsertUserByOAuth(
      runtimeProvider.dbProvider,
      profile,
    )

    await this.prisma.authOauthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    })

    const webOrigin = this.extractWebOriginFromState(oauthState.state)
    const webCallbackUrl = this.oauthProviderService.resolveWebCallbackUrl(webOrigin)
    const loginCode = await this.createLoginCode(user.id, webCallbackUrl)
    const redirectUrl = new URL(webCallbackUrl)
    redirectUrl.searchParams.set('code', loginCode)

    return redirectUrl.toString()
  }

  async exchangeCodeForTokens(
    rawCode: string,
    request: FastifyRequest,
  ): Promise<TokenExchangeResult> {
    const codeHash = this.hash(rawCode)

    const loginCode = await this.prisma.authLoginCode.findUnique({
      where: { codeHash },
      include: {
        user: true,
      },
    })

    if (!loginCode) {
      throw new UnauthorizedException('Invalid login code')
    }

    if (loginCode.consumedAt || loginCode.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Login code expired or consumed')
    }

    const consumed = await this.prisma.authLoginCode.updateMany({
      where: {
        id: loginCode.id,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    })

    if (consumed.count !== 1) {
      throw new UnauthorizedException('Login code already consumed')
    }

    await this.rbacService.syncBootstrapRolesForUser(loginCode.user.id)
    const authUser = await this.buildAuthUserContext(loginCode.user.id)
    await this.touchUserLastLogin(loginCode.user.id)
    const accessToken = await this.signAccessToken(authUser)

    const session = await this.createRefreshSession(
      loginCode.user.id,
      request,
    )

    return this.buildTokenExchangeResult(loginCode.user, authUser, accessToken, session.rawToken)
  }

  async refreshTokens(request: FastifyRequest): Promise<TokenExchangeResult> {
    const refreshToken = this.extractRefreshTokenFromCookie(request)

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found')
    }

    const refreshTokenHash = this.hash(refreshToken)

    const tokenRecord = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        user: true,
      },
    })

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token invalid')
    }

    const rotatedSession = await this.rotateRefreshSession(tokenRecord, request)
    await this.rbacService.syncBootstrapRolesForUser(tokenRecord.user.id)
    const authUser = await this.buildAuthUserContext(tokenRecord.user.id)
    await this.touchUserLastLogin(tokenRecord.user.id)
    const accessToken = await this.signAccessToken(authUser)

    return this.buildTokenExchangeResult(tokenRecord.user, authUser, accessToken, rotatedSession.rawToken)
  }

  async logout(request: FastifyRequest): Promise<{ clearCookie: string }> {
    const refreshToken = this.extractRefreshTokenFromCookie(request)

    if (refreshToken) {
      await this.prisma.authRefreshToken.updateMany({
        where: {
          tokenHash: this.hash(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      })
    }

    return {
      clearCookie: this.clearRefreshCookie(),
    }
  }

  private async createLoginCode(userId: string, redirectUri: string): Promise<string> {
    const loginCode = randomBytes(32).toString('base64url')

    await this.prisma.authLoginCode.create({
      data: {
        userId,
        codeHash: this.hash(loginCode),
        redirectUri,
        expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000),
      },
    })

    return loginCode
  }

  private createOAuthState(webOrigin: string): string {
    return Buffer.from(JSON.stringify({
      v: OAUTH_STATE_VERSION,
      nonce: client.randomState(),
      webOrigin,
    }), 'utf8').toString('base64url')
  }

  private extractWebOriginFromState(state: string): string {
    try {
      const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        v?: unknown
        webOrigin?: unknown
      }

      if (payload.v !== OAUTH_STATE_VERSION || typeof payload.webOrigin !== 'string') {
        throw new Error('Invalid OAuth state payload')
      }

      return payload.webOrigin
    }
    catch {
      throw new UnauthorizedException('OAuth state is invalid')
    }
  }

  private async upsertUserByOAuth(provider: AuthProvider, profile: OAuthProfile): Promise<User> {
    const normalizedEmail = profile.email?.trim().toLowerCase()
    const existingAccount = await this.prisma.oauthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    })

    if (existingAccount) {
      const existingUser = existingAccount.user.email || !normalizedEmail || !profile.emailVerified
        ? existingAccount.user
        : await this.prisma.user.update({
            where: { id: existingAccount.user.id },
            data: { email: normalizedEmail },
          })

      await this.prisma.oauthAccount.update({
        where: { id: existingAccount.id },
        data: {
          providerUsername: profile.username,
          providerEmail: normalizedEmail,
          providerEmailVerified: profile.emailVerified,
          rawProfile: profile.rawProfile as Prisma.InputJsonValue,
        },
      })
      await this.rbacService.ensureDefaultUserRole(existingUser.id)
      await this.rbacService.ensureConfiguredSystemAdminRole(existingUser.id, normalizedEmail ?? existingUser.email)
      return existingUser
    }

    const user = await this.prisma.$transaction(async (tx) => {
      let targetUser = normalizedEmail && profile.emailVerified
        ? await tx.user.findUnique({ where: { email: normalizedEmail } })
        : null

      if (!targetUser) {
        targetUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            displayName: profile.displayName ?? profile.username ?? `user-${randomUUID().slice(0, 8)}`,
            avatarUrl: profile.avatarUrl,
          },
        })
      }
      else {
        targetUser = await tx.user.update({
          where: { id: targetUser.id },
          data: {
            email: targetUser.email ?? (profile.emailVerified ? normalizedEmail : null),
            displayName: targetUser.displayName || profile.displayName || profile.username,
            avatarUrl: targetUser.avatarUrl ?? profile.avatarUrl,
          },
        })
      }

      await tx.oauthAccount.create({
        data: {
          userId: targetUser.id,
          provider,
          providerUserId: profile.providerUserId,
          providerUsername: profile.username,
          providerEmail: normalizedEmail,
          providerEmailVerified: profile.emailVerified,
          rawProfile: profile.rawProfile as Prisma.InputJsonValue,
        },
      })

      return targetUser
    })

    await this.rbacService.ensureDefaultUserRole(user.id)
    await this.rbacService.ensureConfiguredSystemAdminRole(user.id, user.email)

    return user
  }

  private async fetchOAuthProfile(
    provider: AuthProviderName,
    accessToken: string,
    userinfoEndpoint: string,
  ): Promise<OAuthProfile> {
    if (provider === AUTH_PROVIDER.GITHUB) {
      return this.fetchGithubProfile(accessToken, userinfoEndpoint)
    }

    return this.fetchLinuxDoProfile(accessToken, userinfoEndpoint)
  }

  private async fetchGithubProfile(accessToken: string, userinfoEndpoint: string): Promise<OAuthProfile> {
    const userResponse = await this.fetchOAuthResource(userinfoEndpoint, {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'samepage-api',
      'X-GitHub-Api-Version': '2022-11-28',
    })

    if (!userResponse.ok) {
      throw new UnauthorizedException('Failed to fetch GitHub user profile')
    }

    const profile = await userResponse.json() as Record<string, unknown>
    const id = profile.id

    if (!id) {
      throw new UnauthorizedException('GitHub user id is missing')
    }

    const emailsEndpoint = new URL('/user/emails', userinfoEndpoint).toString()
    let verifiedPrimaryEmail: string | undefined
    let anyEmail: string | undefined

    try {
      const emailsResponse = await this.fetchOAuthResource(emailsEndpoint, {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'samepage-api',
        'X-GitHub-Api-Version': '2022-11-28',
      })

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{
          email?: string
          verified?: boolean
          primary?: boolean
        }>

        for (const emailRow of emails) {
          if (emailRow.email && !anyEmail) {
            anyEmail = emailRow.email
          }

          if (emailRow.email && emailRow.verified && emailRow.primary) {
            verifiedPrimaryEmail = emailRow.email
            break
          }
        }

        if (!verifiedPrimaryEmail) {
          verifiedPrimaryEmail = emails.find(item => item.email && item.verified)?.email
        }
      }
    }
    catch {
      // GitHub 邮箱接口偶发超时时退回 profile.email。
    }

    const profileEmail = verifiedPrimaryEmail ?? anyEmail ?? (typeof profile.email === 'string' ? profile.email : undefined)

    return {
      providerUserId: String(id),
      username: typeof profile.login === 'string' ? profile.login : undefined,
      displayName: typeof profile.name === 'string' ? profile.name : undefined,
      email: profileEmail,
      emailVerified: Boolean(verifiedPrimaryEmail),
      avatarUrl: typeof profile.avatar_url === 'string' ? profile.avatar_url : undefined,
      rawProfile: profile,
    }
  }

  private async fetchLinuxDoProfile(accessToken: string, userinfoEndpoint: string): Promise<OAuthProfile> {
    const response = await this.fetchOAuthResource(userinfoEndpoint, {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    })

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Linux.do user profile')
    }

    const profile = await response.json() as Record<string, unknown>
    const providerUserId
      = (typeof profile.sub === 'string' && profile.sub)
        || (typeof profile.id === 'string' && profile.id)
        || (typeof profile.id === 'number' && String(profile.id))

    if (!providerUserId) {
      throw new UnauthorizedException('Linux.do user id is missing')
    }

    const email = typeof profile.email === 'string' ? profile.email : undefined

    return {
      providerUserId,
      username:
        (typeof profile.preferred_username === 'string' && profile.preferred_username)
        || (typeof profile.username === 'string' && profile.username)
        || (typeof profile.login === 'string' && profile.login)
        || undefined,
      displayName:
        (typeof profile.name === 'string' && profile.name)
        || (typeof profile.nickname === 'string' && profile.nickname)
        || undefined,
      email,
      emailVerified: profile.email_verified === true,
      avatarUrl:
        (typeof profile.picture === 'string' && profile.picture)
        || (typeof profile.avatar_url === 'string' && profile.avatar_url)
        || undefined,
      rawProfile: profile,
    }
  }

  private async fetchOAuthResource(url: string, headers: Record<string, string>): Promise<Response> {
    let lastError: unknown

    for (const retryDelayMs of [...OAUTH_FETCH_RETRY_DELAYS_MS, null]) {
      try {
        return await fetch(url, { headers })
      }
      catch (error) {
        lastError = error

        if (!this.isRetryableOAuthFetchError(error) || retryDelayMs === null) {
          throw error
        }

        await delay(retryDelayMs)
      }
    }

    throw lastError
  }

  private isRetryableOAuthFetchError(error: unknown): boolean {
    if (!(error instanceof TypeError)) {
      return false
    }

    const cause = error.cause

    if (cause && typeof cause === 'object' && 'code' in cause) {
      return [
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_HEADERS_TIMEOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EAI_AGAIN',
      ].includes(String(cause.code))
    }

    return RETRYABLE_OAUTH_FETCH_ERROR_RE.test(error.message)
  }

  private async buildAuthUserContext(userId: string): Promise<AuthUserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive')
    }

    const roleAndPermissions = await this.rbacService.getUserRoleAndPermissions(userId)

    return {
      id: userId,
      roles: roleAndPermissions.roles,
      permissions: roleAndPermissions.permissions,
    }
  }

  private async touchUserLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    })
  }

  private async signAccessToken(authUser: AuthUserContext): Promise<string> {
    const payload: AccessTokenPayload = {
      tokenType: 'access',
      roles: authUser.roles,
      permissions: authUser.permissions,
    }

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(authUser.id)
      .setIssuer(this.jwtConfig.issuer)
      .setAudience(this.jwtConfig.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.jwtConfig.accessTtlSeconds}s`)
      .setJti(randomUUID())
      .sign(this.accessSecretKey)
  }

  private async createRefreshSession(userId: string, request: FastifyRequest, familyId = randomUUID()): Promise<{ rawToken: string, tokenId: string, familyId: string }> {
    const tokenId = randomUUID()
    const rawToken = this.generateRefreshToken()
    const tokenHash = this.hash(rawToken)

    await this.prisma.authRefreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + this.jwtConfig.refreshTtlSeconds * 1000),
        createdIp: this.extractRequestIp(request),
        userAgent: request.headers['user-agent'],
      },
    })

    return { rawToken, tokenId, familyId }
  }

  private async rotateRefreshSession(
    tokenRecord: {
      id: string
      userId: string
      familyId: string
    },
    request: FastifyRequest,
  ): Promise<{ rawToken: string }> {
    return this.prisma.$transaction(async (tx) => {
      const tokenId = randomUUID()
      const rawToken = this.generateRefreshToken()
      const tokenHash = this.hash(rawToken)

      await tx.authRefreshToken.create({
        data: {
          id: tokenId,
          userId: tokenRecord.userId,
          familyId: tokenRecord.familyId,
          tokenHash,
          expiresAt: new Date(Date.now() + this.jwtConfig.refreshTtlSeconds * 1000),
          createdIp: this.extractRequestIp(request),
          userAgent: request.headers['user-agent'],
        },
      })

      const updated = await tx.authRefreshToken.updateMany({
        where: {
          id: tokenRecord.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          replacedById: tokenId,
        },
      })

      if (updated.count !== 1) {
        throw new UnauthorizedException('Refresh token already rotated')
      }

      return { rawToken }
    })
  }

  private buildTokenExchangeResult(
    user: { id: string, email: string | null, displayName: string, avatarUrl: string | null },
    authUser: AuthUserContext,
    accessToken: string,
    rawRefreshToken: string,
  ): TokenExchangeResult {
    return {
      accessToken,
      expiresIn: this.jwtConfig.accessTtlSeconds,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        roles: authUser.roles,
        permissions: authUser.permissions,
      },
      refreshTokenCookie: this.buildRefreshCookie(rawRefreshToken),
    }
  }

  private get refreshCookieOptions() {
    return {
      path: '/api/auth',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.isProduction,
    }
  }

  private buildRefreshCookie(refreshToken: string): string {
    return serialize(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...this.refreshCookieOptions,
      maxAge: this.jwtConfig.refreshTtlSeconds,
    })
  }

  private clearRefreshCookie(): string {
    return serialize(REFRESH_TOKEN_COOKIE_NAME, '', {
      ...this.refreshCookieOptions,
      maxAge: 0,
    })
  }

  private extractRefreshTokenFromCookie(request: FastifyRequest): string | undefined {
    const cookieHeader = request.headers.cookie

    if (!cookieHeader) {
      return undefined
    }

    return parse(cookieHeader)[REFRESH_TOKEN_COOKIE_NAME]
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url')
  }

  private extractRequestIp(request: FastifyRequest): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for']

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0]?.split(',').map(part => part.trim()).filter(Boolean)[0]
    }

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',').map(part => part.trim()).filter(Boolean)[0]
    }

    return request.ip
  }

  private resolveCurrentUrl(request: FastifyRequest): URL {
    const host = request.headers['x-forwarded-host'] ?? request.headers.host

    if (!host) {
      throw new BadRequestException('Missing request host')
    }

    const protocolHeader = request.headers['x-forwarded-proto']
    const protocol = Array.isArray(protocolHeader)
      ? protocolHeader[0]
      : (protocolHeader ?? request.protocol ?? 'http')

    return new URL(request.url, `${protocol}://${host}`)
  }
}
