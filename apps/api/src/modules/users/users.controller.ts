import type { AuthUserContext } from '../auth/auth.interface'
import { PERMISSIONS } from '@haohaoxue/samepage-contracts'
import { Controller, Get } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../../decorators/require-permissions.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import {
  CurrentUserDto,
  UserPermissionListDto,
} from './users.dto'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: '获取当前用户' })
  @ApiRequestResponse(CurrentUserDto)
  @RequirePermissions(PERMISSIONS.USER_READ_SELF)
  @Get('me')
  async getCurrentUser(
    @CurrentUser() authUser: AuthUserContext,
  ): Promise<CurrentUserDto> {
    return this.usersService.getCurrentUser(authUser.id)
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
}
