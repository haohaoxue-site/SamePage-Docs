import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUserContext, TokenExchangeResult } from './auth.interface'
import { normalizeAuthProviderName } from '@haohaoxue/samepage-shared'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { Public } from '../../decorators/public.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import {
  ChangePasswordDto,
  ExchangeCodeDto,
  LogoutResponseDto,
  PasswordLoginDto,
  PasswordRegisterDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  TokenExchangeResponseDto,
} from './auth.dto'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '发起 OAuth 登录' })
  @Public()
  @Get('oauth/:provider/start')
  async startOAuth(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const normalizedProvider = this.parseProvider(provider)
    const authorizeUrl = await this.authService.buildOAuthAuthorizationUrl(normalizedProvider, request)

    return response.redirect(authorizeUrl, 302)
  }

  @ApiOperation({ summary: 'OAuth 回调' })
  @Public()
  @Get('oauth/:provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const normalizedProvider = this.parseProvider(provider)
    let redirectUrl: string

    try {
      redirectUrl = await this.authService.handleOAuthCallback(normalizedProvider, request)
    }
    catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : '第三方登录失败，请稍后重试'
      redirectUrl = this.authService.buildOAuthFailureRedirect(normalizedProvider, request, message)
    }

    return response.redirect(redirectUrl, 302)
  }

  @ApiOperation({ summary: '一次性 code 换取访问令牌' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Public()
  @Post('exchange-code')
  async exchangeCode(
    @Body() payload: ExchangeCodeDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.exchangeCodeForTokens(payload.code, request)
    return this.applyTokenExchange(response, result)
  }

  @ApiOperation({ summary: '邮箱密码登录' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Public()
  @Post('login/password')
  async loginWithPassword(
    @Body() payload: PasswordLoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.loginWithPassword(payload.email, payload.password, request)
    return this.applyTokenExchange(response, result)
  }

  @ApiOperation({ summary: '请求邮箱注册验证码' })
  @ApiRequestResponse(RequestEmailVerificationResponseDto)
  @Public()
  @Post('verify-email/request')
  async requestEmailVerification(
    @Body() payload: RequestEmailVerificationDto,
  ): Promise<RequestEmailVerificationResponseDto> {
    await this.authService.requestEmailVerification(payload.email)

    return {
      requested: true,
    }
  }

  @ApiOperation({ summary: '完成邮箱密码注册' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Public()
  @Post('register/password')
  async registerWithPassword(
    @Body() payload: PasswordRegisterDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.registerWithPassword(
      payload.email,
      payload.code,
      payload.displayName,
      payload.password,
      request,
    )
    return this.applyTokenExchange(response, result)
  }

  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    try {
      const result = await this.authService.refreshTokens(request)
      return this.applyTokenExchange(response, result)
    }
    catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.UNAUTHORIZED) {
        response.header('set-cookie', this.authService.buildLogoutCookieHeader())
      }
      throw error
    }
  }

  @ApiOperation({ summary: '登出并撤销当前会话' })
  @ApiRequestResponse(LogoutResponseDto)
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<LogoutResponseDto> {
    const result = await this.authService.logout(request)

    response.header('set-cookie', result.clearCookie)

    return { loggedOut: true }
  }

  @ApiOperation({ summary: '修改当前用户密码' })
  @ApiBearerAuth()
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Post('password/change')
  async changePassword(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: ChangePasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.changePassword(
      authUser.id,
      payload.currentPassword,
      payload.newPassword,
      request,
    )
    return this.applyTokenExchange(response, result)
  }

  private applyTokenExchange(
    response: FastifyReply,
    result: TokenExchangeResult,
  ): TokenExchangeResponseDto {
    response.header('set-cookie', result.refreshTokenCookie)
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    }
  }

  private parseProvider(provider: string): AuthProviderName {
    const normalizedProvider = normalizeAuthProviderName(provider)

    if (normalizedProvider) {
      return normalizedProvider
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`)
  }
}
