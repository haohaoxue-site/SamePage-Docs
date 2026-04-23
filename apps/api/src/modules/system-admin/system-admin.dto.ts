import type {
  SystemAdminUserStatus,
  UpdateSystemAdminUserStatusRequest,
  UpdateSystemAiConfigRequest,
  UpdateSystemAiServiceStatusRequest,
  UpdateSystemAuthGovernanceRequest,
} from '@haohaoxue/samepage-domain'
import { UserStatus } from '@prisma/client'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator'

export class UpdateSystemAdminUserStatusDto implements UpdateSystemAdminUserStatusRequest {
  @IsEnum(UserStatus)
  status!: SystemAdminUserStatus
}

export class UpdateSystemAuthGovernanceDto implements UpdateSystemAuthGovernanceRequest {
  @IsOptional()
  @IsBoolean()
  allowPasswordRegistration?: boolean

  @IsOptional()
  @IsBoolean()
  allowGithubRegistration?: boolean

  @IsOptional()
  @IsBoolean()
  allowLinuxDoRegistration?: boolean
}

export class UpdateSystemAiConfigDto implements UpdateSystemAiConfigRequest {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'baseUrl 必须是合法 URL' })
  baseUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  apiKey?: string

  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean
}

export class UpdateSystemAiServiceStatusDto implements UpdateSystemAiServiceStatusRequest {
  @IsBoolean()
  enabled!: boolean
}
