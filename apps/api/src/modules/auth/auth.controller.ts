import type { AuthProviderName } from '@haohaoxue/samepage-contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../decorators/public.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import { ExchangeCodeDto, LogoutResponseDto, TokenExchangeResponseDto } from './auth.dto'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Public()
@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '发起 OAuth 登录' })
  @Get('oauth/:provider/start')
  async startOAuth(
    @Param('provider') provider: string,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const normalizedProvider = this.parseProvider(provider)
    const authorizeUrl = await this.authService.buildOAuthAuthorizationUrl(normalizedProvider)

    return response.redirect(authorizeUrl, 302)
  }

  @ApiOperation({ summary: 'OAuth 回调' })
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
  @Post('exchange-code')
  async exchangeCode(
    @Body() payload: ExchangeCodeDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.exchangeCodeForTokens(payload.code, request)

    response.header('set-cookie', result.refreshTokenCookie)

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    }
  }

  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiRequestResponse(TokenExchangeResponseDto)
  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<TokenExchangeResponseDto> {
    const result = await this.authService.refreshTokens(request)

    response.header('set-cookie', result.refreshTokenCookie)

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    }
  }

  @ApiOperation({ summary: '登出并撤销当前会话' })
  @ApiRequestResponse(LogoutResponseDto)
  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<LogoutResponseDto> {
    const result = await this.authService.logout(request)

    response.header('set-cookie', result.clearCookie)

    return { loggedOut: true }
  }

  private parseProvider(provider: string): AuthProviderName {
    const normalized = provider.trim().toLowerCase()

    if (AUTH_PROVIDER_VALUES.includes(normalized as AuthProviderName)) {
      return normalized as AuthProviderName
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`)
  }
}
