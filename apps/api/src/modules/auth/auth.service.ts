import type { AuthProviderName, AuthUser } from '@haohaoxue/samepage-domain'
import type { Prisma, User } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { JwtConfig } from '../../config/auth.config'
import type {
  AccessTokenPayload,
  AuthUserContext,
  BuildOAuthAuthorizationUrlOptions,
  OAuthProfile,
  OAuthStatePayload,
  TokenExchangeResult,
} from './auth.interface'
import { Buffer } from 'node:buffer'
import { createSecretKey, randomBytes, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { AUTH_ERROR_CODE, AUTH_METHOD, AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import { formatAuthMethod } from '@haohaoxue/samepage-shared'
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
import { resolveAuthMethod, resolveAuthMethods } from '../../utils/auth-methods'
import { normalizeEmail } from '../../utils/email'
import { sha256Hex } from '../../utils/hash'
import { hashPassword, verifyPassword } from '../../utils/password'
import { RbacService } from '../rbac/rbac.service'
import {
  LOGIN_CODE_TTL_SECONDS,
  OAUTH_FETCH_RETRY_DELAYS_MS,
  OAUTH_LOGIN_REDIRECT_PATH,
  OAUTH_STATE_TTL_SECONDS,
  OAUTH_STATE_VERSION,
  REFRESH_TOKEN_COOKIE_NAME,
  RETRYABLE_OAUTH_FETCH_ERROR_RE,
} from './auth.constants'
import { authUnauthorized, buildOauthAccountData } from './auth.utils'
import { OAuthProviderService } from './providers/oauth-provider.service'
import { SystemAuthService } from './system-auth.service'

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
    private readonly systemAuthService: SystemAuthService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt')
    this.accessSecretKey = createSecretKey(Buffer.from(this.jwtConfig.accessSecret, 'utf8'))
    this.isProduction = this.configService.getOrThrow<boolean>('server.isProduction')
  }

  async requestEmailVerification(email: string): Promise<void> {
    await this.systemAuthService.issueRegistrationVerification(email)
  }

  async registerWithPassword(
    email: string,
    code: string,
    displayName: string,
    password: string,
    request: FastifyRequest,
  ): Promise<TokenExchangeResult> {
    const normalizedDisplayName = displayName.trim()

    if (!normalizedDisplayName.length) {
      throw new BadRequestException('显示名称不能为空')
    }

    await this.systemAuthService.assertRegistrationAllowed(AUTH_METHOD.PASSWORD)
    const passwordHash = await hashPassword(password)

    const user = await this.prisma.$transaction(async (tx) => {
      const { email: verifiedEmail } = await this.systemAuthService.consumeRegistrationVerificationCode(
        email,
        code,
        tx,
      )
      const existingUser = await tx.user.findUnique({
        where: { email: verifiedEmail },
        select: { id: true },
      })

      if (existingUser) {
        throw new BadRequestException('该邮箱已存在账号，请直接登录')
      }

      const createdUser = await tx.user.create({
        data: {
          email: verifiedEmail,
          displayName: normalizedDisplayName,
        },
      })

      await tx.localCredential.create({
        data: {
          userId: createdUser.id,
          passwordHash,
          emailVerifiedAt: new Date(),
          passwordUpdatedAt: new Date(),
        },
      })

      return createdUser
    })

    return this.issueAuthSession(user.id, request)
  }

  async loginWithPassword(
    email: string,
    password: string,
    request: FastifyRequest,
  ): Promise<TokenExchangeResult> {
    const normalizedEmail = normalizeEmail(email)
    const credential = await this.prisma.localCredential.findFirst({
      where: {
        user: {
          email: normalizedEmail,
        },
      },
      select: {
        passwordHash: true,
        emailVerifiedAt: true,
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!credential) {
      throw new UnauthorizedException('邮箱或密码错误')
    }

    if (credential.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive')
    }

    if (!credential.emailVerifiedAt) {
      throw new UnauthorizedException('邮箱尚未完成验证')
    }

    const isPasswordValid = await verifyPassword(password, credential.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误')
    }

    return this.issueAuthSession(credential.user.id, request)
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    request: FastifyRequest,
  ): Promise<TokenExchangeResult> {
    if (currentPassword === newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同')
    }

    const credential = await this.prisma.localCredential.findUnique({
      where: { userId },
      select: {
        passwordHash: true,
      },
    })

    if (!credential) {
      throw new BadRequestException('当前账号未启用邮箱密码登录')
    }

    const isPasswordValid = await verifyPassword(currentPassword, credential.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码错误')
    }

    const passwordHash = await hashPassword(newPassword)

    await this.prisma.$transaction(async (tx) => {
      await tx.localCredential.update({
        where: { userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
          passwordUpdatedAt: new Date(),
        },
      })

      await tx.authRefreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      })
    })

    return this.issueAuthSession(userId, request)
  }

  async buildOAuthAuthorizationUrl(
    provider: AuthProviderName,
    request: FastifyRequest,
    options: BuildOAuthAuthorizationUrlOptions = {},
  ): Promise<string> {
    const runtimeProvider = await this.oauthProviderService.getProvider(provider)
    const webOrigin = this.resolveCurrentUrl(request).origin
    const callbackUrl = this.oauthProviderService.resolveApiCallbackUrl(provider, webOrigin)
    const purpose = options.purpose ?? 'login'
    const redirectPath = options.redirectPath ?? OAUTH_LOGIN_REDIRECT_PATH

    const state = this.createOAuthState({
      webOrigin,
      purpose,
      redirectPath,
    })
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)

    await this.prisma.authOauthState.create({
      data: {
        provider: runtimeProvider.dbProvider,
        purpose: purpose === 'bind' ? 'BIND' : 'LOGIN',
        initiatorUserId: purpose === 'bind' ? options.initiatorUserId ?? null : null,
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

    const statePayload = this.extractOAuthStatePayload(oauthState.state)
    const profile = await this.fetchOAuthProfile(provider, accessToken, runtimeProvider.userinfoEndpoint)

    await this.prisma.authOauthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    })

    if (oauthState.purpose === 'BIND') {
      if (!oauthState.initiatorUserId) {
        throw new UnauthorizedException('OAuth bind state is invalid')
      }

      await this.bindOAuthToUser(runtimeProvider.dbProvider, profile, oauthState.initiatorUserId)

      const redirectUrl = new URL(statePayload.redirectPath, statePayload.webOrigin)
      redirectUrl.searchParams.set('bind_status', 'success')
      redirectUrl.searchParams.set('provider', provider)
      return redirectUrl.toString()
    }

    const user = await this.upsertUserByOAuth(
      runtimeProvider.dbProvider,
      profile,
    )

    const webCallbackUrl = new URL(statePayload.redirectPath, statePayload.webOrigin).toString()
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

    return this.issueAuthSession(loginCode.user.id, request)
  }

  async refreshTokens(request: FastifyRequest): Promise<TokenExchangeResult> {
    const refreshToken = this.extractRefreshTokenFromCookie(request)

    if (!refreshToken) {
      throw authUnauthorized(AUTH_ERROR_CODE.REFRESH_TOKEN_MISSING, '刷新凭证不存在')
    }

    const refreshTokenHash = this.hash(refreshToken)

    const tokenRecord = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        user: true,
      },
    })

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw authUnauthorized(AUTH_ERROR_CODE.REFRESH_TOKEN_INVALID, '登录状态已失效')
    }

    const rotatedSession = await this.rotateRefreshSession(tokenRecord, request)
    await this.rbacService.syncBootstrapRolesForUser(tokenRecord.user.id)
    const authUser = await this.buildAuthUserContext(tokenRecord.user.id)
    await this.touchUserLastLogin(tokenRecord.user.id)
    const accessToken = await this.signAccessToken(authUser)

    return this.buildTokenExchangeResult(tokenRecord.user.id, authUser, accessToken, rotatedSession.rawToken)
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

  buildLogoutCookieHeader(): string {
    return this.clearRefreshCookie()
  }

  private async issueAuthSession(userId: string, request: FastifyRequest): Promise<TokenExchangeResult> {
    await this.rbacService.syncBootstrapRolesForUser(userId)
    const authUser = await this.buildAuthUserContext(userId)
    await this.touchUserLastLogin(userId)
    const accessToken = await this.signAccessToken(authUser)
    const session = await this.createRefreshSession(userId, request)

    return this.buildTokenExchangeResult(userId, authUser, accessToken, session.rawToken)
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

  buildOAuthFailureRedirect(provider: AuthProviderName, request: FastifyRequest, errorMessage: string): string {
    const state = this.resolveCurrentUrl(request).searchParams.get('state')

    if (!state) {
      return `${OAUTH_LOGIN_REDIRECT_PATH}?error=${encodeURIComponent(errorMessage)}`
    }

    try {
      const payload = this.extractOAuthStatePayload(state)
      const redirectUrl = new URL(payload.redirectPath, payload.webOrigin)

      if (payload.purpose === 'bind') {
        redirectUrl.searchParams.set('bind_status', 'error')
        redirectUrl.searchParams.set('provider', provider)
        redirectUrl.searchParams.set('bind_message', errorMessage)
        return redirectUrl.toString()
      }

      redirectUrl.searchParams.set('error', errorMessage)
      return redirectUrl.toString()
    }
    catch {
      return `${OAUTH_LOGIN_REDIRECT_PATH}?error=${encodeURIComponent(errorMessage)}`
    }
  }

  private createOAuthState(input: {
    webOrigin: string
    purpose: 'login' | 'bind'
    redirectPath: string
  }): string {
    return Buffer.from(JSON.stringify({
      v: OAUTH_STATE_VERSION,
      nonce: client.randomState(),
      webOrigin: input.webOrigin,
      purpose: input.purpose,
      redirectPath: input.redirectPath,
    }), 'utf8').toString('base64url')
  }

  private extractOAuthStatePayload(state: string): OAuthStatePayload {
    try {
      const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Partial<OAuthStatePayload>

      if (
        payload.v !== OAUTH_STATE_VERSION
        || typeof payload.webOrigin !== 'string'
        || (payload.purpose !== 'login' && payload.purpose !== 'bind')
        || typeof payload.redirectPath !== 'string'
      ) {
        throw new Error('Invalid OAuth state payload')
      }

      return payload as OAuthStatePayload
    }
    catch {
      throw new UnauthorizedException('OAuth state is invalid')
    }
  }

  private async upsertUserByOAuth(provider: AuthProvider, profile: OAuthProfile): Promise<User> {
    const existingAccount = await this.prisma.$bypass.oauthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    })

    if (existingAccount) {
      await this.prisma.$bypass.oauthAccount.update({
        where: { id: existingAccount.id },
        data: {
          ...buildOauthAccountData(profile),
          deletedAt: null,
        },
      })

      if (!existingAccount.user.avatarUrl && profile.avatarUrl) {
        return this.prisma.user.update({
          where: { id: existingAccount.user.id },
          data: {
            avatarUrl: profile.avatarUrl,
          },
        })
      }

      return existingAccount.user
    }

    await this.systemAuthService.assertRegistrationAllowed(resolveAuthMethod(provider))

    return this.prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.create({
        data: {
          displayName: profile.displayName ?? profile.username ?? `user-${randomUUID().slice(0, 8)}`,
          avatarUrl: profile.avatarUrl,
        },
      })

      await tx.oauthAccount.create({
        data: {
          userId: targetUser.id,
          provider,
          providerUserId: profile.providerUserId,
          providerUsername: profile.username,
          providerEmail: null,
          providerEmailVerified: false,
          rawProfile: profile.rawProfile as Prisma.InputJsonValue,
        },
      })

      return targetUser
    })
  }

  private async bindOAuthToUser(
    provider: AuthProvider,
    profile: OAuthProfile,
    userId: string,
  ): Promise<void> {
    const [targetUser, existingProviderBinding, existingCurrentProviderAccount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          avatarUrl: true,
        },
      }),
      this.prisma.$bypass.oauthAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider,
            providerUserId: profile.providerUserId,
          },
        },
      }),
      this.prisma.oauthAccount.findFirst({
        where: {
          userId,
          provider,
        },
      }),
    ])

    if (!targetUser) {
      throw new BadRequestException('当前账号不存在或已失效')
    }

    if (existingProviderBinding && !existingProviderBinding.deletedAt && existingProviderBinding.userId !== userId) {
      throw new BadRequestException(`该${formatAuthMethod(resolveAuthMethod(provider))}账号已绑定到其他账号`)
    }

    if (
      existingCurrentProviderAccount
      && existingCurrentProviderAccount.providerUserId !== profile.providerUserId
    ) {
      throw new BadRequestException(`当前账号已绑定其他${formatAuthMethod(resolveAuthMethod(provider))}账号`)
    }

    if (existingProviderBinding) {
      await this.prisma.$bypass.oauthAccount.update({
        where: { id: existingProviderBinding.id },
        data: {
          userId,
          ...buildOauthAccountData(profile),
          deletedAt: null,
        },
      })

      if (!targetUser.avatarUrl && profile.avatarUrl) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            avatarUrl: profile.avatarUrl,
          },
        })
      }

      return
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.oauthAccount.create({
        data: {
          userId,
          provider,
          providerUserId: profile.providerUserId,
          ...buildOauthAccountData(profile),
        },
      })

      if (!targetUser.avatarUrl && profile.avatarUrl) {
        await tx.user.update({
          where: { id: userId },
          data: {
            avatarUrl: profile.avatarUrl,
          },
        })
      }
    })
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

    return {
      providerUserId: String(id),
      username: typeof profile.login === 'string' ? profile.login : undefined,
      displayName: typeof profile.name === 'string' ? profile.name : undefined,
      email: undefined,
      emailVerified: false,
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
      email: undefined,
      emailVerified: false,
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
      throw authUnauthorized(AUTH_ERROR_CODE.SESSION_USER_INACTIVE, '当前账号不可用')
    }

    const roleAndPermissions = await this.rbacService.getUserRoleAndPermissions(userId)

    return {
      id: userId,
      roles: roleAndPermissions.roles,
      permissions: roleAndPermissions.permissions,
    }
  }

  private async buildAuthUser(userId: string, authUser: AuthUserContext): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        localCredential: {
          select: {
            mustChangePassword: true,
            emailVerifiedAt: true,
          },
        },
        oauthAccounts: {
          where: {
            deletedAt: null,
          },
          select: {
            provider: true,
            providerEmailVerified: true,
          },
        },
      },
    })

    if (!user) {
      throw authUnauthorized(AUTH_ERROR_CODE.SESSION_USER_INACTIVE, '当前账号不可用')
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      roles: authUser.roles,
      permissions: authUser.permissions,
      authMethods: resolveAuthMethods(Boolean(user.localCredential), user.oauthAccounts),
      mustChangePassword: user.localCredential?.mustChangePassword ?? false,
      emailVerified: Boolean(user.localCredential?.emailVerifiedAt) || user.oauthAccounts.some(item => item.providerEmailVerified === true),
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

  private async buildTokenExchangeResult(
    userId: string,
    authUser: AuthUserContext,
    accessToken: string,
    rawRefreshToken: string,
  ): Promise<TokenExchangeResult> {
    return {
      accessToken,
      expiresIn: this.jwtConfig.accessTtlSeconds,
      user: await this.buildAuthUser(userId, authUser),
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
    return sha256Hex(value)
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
