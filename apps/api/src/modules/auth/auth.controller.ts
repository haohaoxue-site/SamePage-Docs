import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUserContext, TokenExchangeResult } from './auth.interface'
import { normalizeAuthProviderName } from '@haohaoxue/samepage-shared'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
    const redirectUrl = await this.authService.handleOAuthCallback(normalizedProvider, request)

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

  @ApiOperation({ summary: '获取公开注册配置' })
  @ApiRequestResponse(AuthRegistrationOptionsDto)
  @Public()
  @Get('registration-options')
  async getRegistrationOptions(): Promise<AuthRegistrationOptionsDto> {
    return this.authService.getRegistrationOptions()
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

  @ApiOperation({ summary: '请求邮箱注册验证' })
  @ApiRequestResponse(RequestEmailVerificationResponseDto)
  @Public()
  @Post('verify-email/request')
  async requestEmailVerification(
    @Body() payload: RequestEmailVerificationDto,
    @Req() request: FastifyRequest,
  ): Promise<RequestEmailVerificationResponseDto> {
    await this.authService.requestEmailVerification(payload.email, request)

    return {
      requested: true,
    }
  }

  @ApiOperation({ summary: '确认邮箱注册验证令牌' })
  @ApiRequestResponse(ConfirmEmailVerificationResponseDto)
  @Public()
  @Post('verify-email/confirm')
  async confirmEmailVerification(
    @Body() payload: ConfirmEmailVerificationDto,
  ): Promise<ConfirmEmailVerificationResponseDto> {
    return this.authService.confirmEmailVerification(payload.token)
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
      payload.token,
      payload.displayName,
      payload.password,
      request,
    )
    return this.applyTokenExchange(response, result)
  }

  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.refreshTokens(request)
    return this.applyTokenExchange(response, result)
  }

  @ApiOperation({ summary: '登出并撤销当前会话' })
  @ApiRequestResponse(LogoutResponseDto)
  @Public()
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
