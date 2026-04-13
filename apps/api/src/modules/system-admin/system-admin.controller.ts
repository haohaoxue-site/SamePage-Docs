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
  Post,
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
  SystemAiServiceStatusDto,
  SystemAuthGovernanceDto,
  SystemEmailConfigDto,
  SystemEmailServiceStatusDto,
  TestSystemEmailConfigDto,
  TestSystemEmailConfigResponseDto,
  UpdateSystemAdminUserResponseDto,
  UpdateSystemAdminUserStatusDto,
  UpdateSystemAiConfigDto,
  UpdateSystemAiServiceStatusDto,
  UpdateSystemAuthGovernanceDto,
  UpdateSystemEmailConfigDto,
  UpdateSystemEmailServiceStatusDto,
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

  @ApiOperation({ summary: '获取认证治理配置' })
  @ApiRequestResponse(SystemAuthGovernanceDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_READ)
  @Get('auth-governance')
  async getAuthGovernance(): Promise<SystemAuthGovernanceDto> {
    return this.systemAdminService.getAuthGovernance()
  }

  @ApiOperation({ summary: '更新认证治理配置' })
  @ApiRequestResponse(SystemAuthGovernanceDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AUTH_GOVERNANCE_UPDATE)
  @Put('auth-governance')
  async updateAuthGovernance(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateSystemAuthGovernanceDto,
  ): Promise<SystemAuthGovernanceDto> {
    return this.systemAdminService.updateAuthGovernance(authUser.id, payload)
  }

  @ApiOperation({ summary: '获取系统发件配置' })
  @ApiRequestResponse(SystemEmailConfigDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_READ)
  @Get('email-config')
  async getEmailConfig(): Promise<SystemEmailConfigDto> {
    return this.systemAdminService.getEmailConfig()
  }

  @ApiOperation({ summary: '获取发件服务状态' })
  @ApiRequestResponse(SystemEmailServiceStatusDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_READ)
  @Get('email-service')
  async getEmailServiceStatus(): Promise<SystemEmailServiceStatusDto> {
    return this.systemAdminService.getEmailServiceStatus()
  }

  @ApiOperation({ summary: '更新系统发件配置' })
  @ApiRequestResponse(SystemEmailConfigDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE)
  @Put('email-config')
  async updateEmailConfig(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateSystemEmailConfigDto,
  ): Promise<SystemEmailConfigDto> {
    return this.systemAdminService.updateEmailConfig(authUser.id, payload)
  }

  @ApiOperation({ summary: '更新发件服务状态' })
  @ApiRequestResponse(SystemEmailServiceStatusDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE)
  @Patch('email-service')
  async updateEmailServiceStatus(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateSystemEmailServiceStatusDto,
  ): Promise<SystemEmailServiceStatusDto> {
    return this.systemAdminService.updateEmailServiceStatus(authUser.id, payload)
  }

  @ApiOperation({ summary: '发送发件配置测试邮件' })
  @ApiRequestResponse(TestSystemEmailConfigResponseDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_EMAIL_CONFIG_UPDATE)
  @Post('email-config/test')
  async testEmailConfig(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: TestSystemEmailConfigDto,
  ): Promise<TestSystemEmailConfigResponseDto> {
    return this.systemAdminService.testEmailConfig(authUser.id, payload)
  }

  @ApiOperation({ summary: '获取系统 AI 配置' })
  @ApiRequestResponse(SystemAiConfigDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_READ)
  @Get('ai-config')
  async getAiConfig(): Promise<SystemAiConfigDto> {
    return this.systemAdminService.getAiConfig()
  }

  @ApiOperation({ summary: '获取 AI 服务状态' })
  @ApiRequestResponse(SystemAiServiceStatusDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_READ)
  @Get('ai-service')
  async getAiServiceStatus(): Promise<SystemAiServiceStatusDto> {
    return this.systemAdminService.getAiServiceStatus()
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

  @ApiOperation({ summary: '更新 AI 服务状态' })
  @ApiRequestResponse(SystemAiServiceStatusDto)
  @RequirePermissions(PERMISSIONS.SYSTEM_ADMIN_AI_CONFIG_UPDATE)
  @Patch('ai-service')
  async updateAiServiceStatus(
    @CurrentUser() authUser: AuthUserContext,
    @Body() payload: UpdateSystemAiServiceStatusDto,
  ): Promise<SystemAiServiceStatusDto> {
    return this.systemAdminService.updateAiServiceStatus(authUser.id, payload)
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
