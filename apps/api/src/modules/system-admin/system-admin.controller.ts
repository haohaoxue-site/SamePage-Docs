import type { UserStatus } from '@prisma/client'
import type { AuthUserContext } from '../auth/auth.interface'
import {
  PERMISSIONS,
} from '@haohaoxue/samepage-contracts'
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../../decorators/require-permissions.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import {
  GovernanceSummaryDto,
  SystemAdminAuditLogItemDto,
  SystemAdminOverviewDto,
  SystemAdminUserItemDto,
  SystemAiConfigDto,
  UpdateSystemAdminUserResponseDto,
  UpdateSystemAdminUserStatusDto,
  UpdateSystemAdminUserSystemRoleDto,
  UpdateSystemAiConfigDto,
} from './system-admin.dto'
import { SystemAdminService } from './system-admin.service'

@ApiTags('system-admin')
@ApiBearerAuth()
@Controller('system-admin')
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @ApiOperation({ summary: '获取系统后台概览' })
  @ApiRequestResponse(SystemAdminOverviewDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_OVERVIEW_READ)
  @Get('overview')
  async getOverview(): Promise<SystemAdminOverviewDto> {
    return this.systemAdminService.getOverview()
  }

  @ApiOperation({ summary: '获取系统后台用户列表' })
  @ApiRequestResponse([SystemAdminUserItemDto])
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_USER_LIST)
  @Get('users')
  async getUsers(): Promise<SystemAdminUserItemDto[]> {
    return this.systemAdminService.getUsers()
  }

  @ApiOperation({ summary: '更新用户状态' })
  @ApiRequestResponse(UpdateSystemAdminUserResponseDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_USER_UPDATE_STATUS)
  @Patch('users/:id/status')
  async updateUserStatus(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') userId: string,
    @Body() payload: UpdateSystemAdminUserStatusDto,
  ): Promise<UpdateSystemAdminUserResponseDto> {
    return this.systemAdminService.updateUserStatus(
      authUser.id,
      userId,
      payload.status as UserStatus,
    )
  }

  @ApiOperation({ summary: '授予或撤销系统管理员' })
  @ApiRequestResponse(UpdateSystemAdminUserResponseDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_USER_UPDATE_ROLE)
  @Patch('users/:id/system-role')
  async updateUserSystemRole(
    @CurrentUser() authUser: AuthUserContext,
    @Param('id') userId: string,
    @Body() payload: UpdateSystemAdminUserSystemRoleDto,
  ): Promise<UpdateSystemAdminUserResponseDto> {
    return this.systemAdminService.updateUserSystemRole(
      authUser.id,
      userId,
      payload.enabled,
    )
  }

  @ApiOperation({ summary: '获取系统 AI 配置' })
  @ApiRequestResponse(SystemAiConfigDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_READ)
  @Get('ai-config')
  async getAiConfig(): Promise<SystemAiConfigDto> {
    return this.systemAdminService.getAiConfig()
  }

  @ApiOperation({ summary: '更新系统 AI 配置' })
  @ApiRequestResponse(SystemAiConfigDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_UPDATE)
  @Put('ai-config')
  async updateAiConfig(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateSystemAiConfigDto,
  ): Promise<SystemAiConfigDto> {
    return this.systemAdminService.updateAiConfig(authUser.id, payload)
  }

  @ApiOperation({ summary: '获取系统审计日志' })
  @ApiRequestResponse([SystemAdminAuditLogItemDto])
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AUDIT_LOG_LIST)
  @Get('audit-logs')
  async getAuditLogs(): Promise<SystemAdminAuditLogItemDto[]> {
    return this.systemAdminService.getAuditLogs()
  }

  @ApiOperation({ summary: '获取平台治理摘要' })
  @ApiRequestResponse(GovernanceSummaryDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_GOVERNANCE_READ)
  @Get('governance/summary')
  async getGovernanceSummary(): Promise<GovernanceSummaryDto> {
    return this.systemAdminService.getGovernanceSummary()
  }
}
