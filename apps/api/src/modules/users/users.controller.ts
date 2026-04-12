import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUserContext } from '../auth/auth.interface'
import { PERMISSIONS } from '@haohaoxue/samepage-contracts'
import { normalizeAuthProviderName } from '@haohaoxue/samepage-shared'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { Public } from '../../decorators/public.decorator'
import { RequirePermissions } from '../../decorators/require-permissions.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import { AuthService } from '../auth/auth.service'
import {
  ConfirmBindEmailDto,
  CurrentUserDto,
  DeleteCurrentUserDto,
  DeleteCurrentUserResponseDto,
  RequestBindEmailCodeDto,
  RequestBindEmailCodeResponseDto,
  StartOauthBindingResponseDto,
  UpdateCurrentUserAvatarResponseDto,
  UpdateCurrentUserProfileDto,
  UpdateUserPreferencesDto,
  UserPermissionListDto,
  UserSettingsDto,
  UserSettingsPreferencesDto,
} from './users.dto'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({ summary: '获取当前用户' })
  @ApiRequestResponse(CurrentUserDto)
  @RequirePermissions(PERMISSIONS.USER_READ_SELF)
  @Get('me')
  async getCurrentUser(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<CurrentUserDto> {
    return this.usersService.getCurrentUser(authUser.id)
  }

  @ApiOperation({ summary: '获取当前用户设置' })
  @ApiRequestResponse(UserSettingsDto)
  @RequirePermissions(PERMISSIONS.USER_READ_SELF)
  @Get('me/settings')
  async getCurrentUserSettings(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<UserSettingsDto> {
    return this.usersService.getCurrentUserSettings(authUser.id)
  }

  @ApiOperation({ summary: '获取当前用户权限点' })
  @ApiRequestResponse(UserPermissionListDto)
  @RequirePermissions(PERMISSIONS.USER_READ_SELF)
  @Get('me/permissions')
  async getCurrentUserPermissions(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<UserPermissionListDto> {
    return {
      permissions: await this.usersService.getCurrentUserPermissions(authUser.id),
    }
  }

  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiRequestResponse(CurrentUserDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Patch('me/profile')
  async updateCurrentUserProfile(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateCurrentUserProfileDto,
  ): Promise<CurrentUserDto> {
    return this.usersService.updateCurrentUserProfile(authUser, payload.displayName)
  }

  @ApiOperation({ summary: '更新当前用户头像' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiRequestResponse(UpdateCurrentUserAvatarResponseDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Put('me/avatar')
  async updateCurrentUserAvatar(
    @CurrentUser() authUser: AuthUserContext,
    @Req() request: FastifyRequest,
  ): Promise<UpdateCurrentUserAvatarResponseDto> {
    const file = await request.file()

    if (!file) {
      throw new BadRequestException('请选择头像文件')
    }

    return this.usersService.updateCurrentUserAvatar(authUser.id, {
      fileName: file.filename,
      mimeType: file.mimetype,
      buffer: await file.toBuffer(),
    })
  }

  @ApiOperation({ summary: '请求绑定邮箱验证码' })
  @ApiRequestResponse(RequestBindEmailCodeResponseDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Post('me/email/request-bind-code')
  async requestBindEmailCode(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: RequestBindEmailCodeDto,
  ): Promise<RequestBindEmailCodeResponseDto> {
    return this.usersService.requestBindEmailCode(authUser.id, payload.email)
  }

  @ApiOperation({ summary: '确认绑定邮箱' })
  @ApiRequestResponse(CurrentUserDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Post('me/email/confirm-bind')
  async confirmBindEmail(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: ConfirmBindEmailDto,
  ): Promise<CurrentUserDto> {
    return this.usersService.confirmBindEmail(authUser.id, payload)
  }

  @ApiOperation({ summary: '发起第三方账号绑定' })
  @ApiRequestResponse(StartOauthBindingResponseDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Post('me/oauth/:provider/start-bind')
  async startOauthBinding(
    @CurrentUser() authUser: AuthUserContext,
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
  ): Promise<StartOauthBindingResponseDto> {
    return {
      authorizeUrl: await this.usersService.startOauthBinding(
        authUser.id,
        this.parseProvider(provider),
        request,
      ),
    }
  }

  @ApiOperation({ summary: '解绑第三方账号' })
  @ApiRequestResponse(CurrentUserDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Delete('me/oauth/:provider')
  async disconnectOauthBinding(
    @CurrentUser() authUser: AuthUserContext,
    @Param('provider') provider: string,
  ): Promise<CurrentUserDto> {
    return this.usersService.disconnectOauthBinding(authUser.id, this.parseProvider(provider))
  }

  @ApiOperation({ summary: '删除当前账号' })
  @ApiRequestResponse(DeleteCurrentUserResponseDto)
  @RequirePermissions(PERMISSIONS.USER_DELETE_SELF)
  @Post('me/delete')
  async deleteCurrentUser(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: DeleteCurrentUserDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<DeleteCurrentUserResponseDto> {
    await this.usersService.deleteCurrentUser(authUser, payload)
    response.header('set-cookie', this.authService.buildLogoutCookieHeader())
    return { deleted: true }
  }

  @ApiOperation({ summary: '更新偏好设置' })
  @ApiRequestResponse(UserSettingsPreferencesDto)
  @RequirePermissions(PERMISSIONS.USER_UPDATE_SELF)
  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateUserPreferencesDto,
  ): Promise<UserSettingsPreferencesDto> {
    return this.usersService.updatePreferences(authUser.id, payload)
  }

  @ApiOperation({ summary: '读取用户头像' })
  @ApiRequestResponse(UpdateCurrentUserAvatarResponseDto)
  @Public()
  @Get('avatar/:id')
  async getUserAvatar(
    @Param('id') userId: string,
    @Res() response: FastifyReply,
  ): Promise<FastifyReply> {
    const avatar = await this.usersService.getUserAvatar(userId)

    response.header('cache-control', 'public, max-age=300')
    response.header('content-type', avatar.contentType)

    if (avatar.contentLength !== null) {
      response.header('content-length', String(avatar.contentLength))
    }

    return response.send(avatar.body)
  }

  private parseProvider(provider: string): AuthProviderName {
    const normalizedProvider = normalizeAuthProviderName(provider)

    if (normalizedProvider) {
      return normalizedProvider
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`)
  }
}
