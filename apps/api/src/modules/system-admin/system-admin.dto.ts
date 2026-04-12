import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import {
  AUTH_METHOD_VALUES,
  SYSTEM_EMAIL_PROVIDER_VALUES,
} from '@haohaoxue/samepage-contracts'
import { ApiProperty } from '@nestjs/swagger'
import { DocumentStatus, UserStatus } from '@prisma/client'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator'

export class SystemAdminOverviewDto {
  @ApiProperty()
  totalUsers!: number

  @ApiProperty()
  activeUsers!: number

  @ApiProperty()
  disabledUsers!: number

  @ApiProperty()
  systemAdminCount!: number

  @ApiProperty()
  totalDocuments!: number

  @ApiProperty()
  sharedDocuments!: number

  @ApiProperty()
  lockedDocuments!: number

  @ApiProperty()
  aiConfigEnabled!: boolean

  @ApiProperty({ nullable: true })
  systemAiBaseUrl!: string | null

  @ApiProperty({ nullable: true })
  systemAiDefaultModel!: string | null
}

export class SystemAdminUserItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ nullable: true })
  email!: string | null

  @ApiProperty()
  displayName!: string

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus

  @ApiProperty()
  isSystemAdmin!: boolean

  @ApiProperty({ enum: AUTH_METHOD_VALUES, isArray: true })
  authMethods!: AuthMethodName[]

  @ApiProperty()
  ownedDocumentCount!: number

  @ApiProperty()
  sharedDocumentCount!: number

  @ApiProperty()
  createdAt!: Date

  @ApiProperty({ nullable: true })
  lastLoginAt!: Date | null
}

export class UpdateSystemAdminUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus
}

export class UpdateSystemAdminUserResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus

  @ApiProperty()
  isSystemAdmin!: boolean
}

export class SystemAuthGovernanceDto {
  @ApiProperty()
  allowPasswordRegistration!: boolean

  @ApiProperty()
  allowGithubRegistration!: boolean

  @ApiProperty()
  allowLinuxDoRegistration!: boolean

  @ApiProperty()
  systemAdminEmail!: string

  @ApiProperty({ nullable: true })
  systemAdminDisplayName!: string | null

  @ApiProperty()
  systemAdminMustChangePassword!: boolean

  @ApiProperty({ nullable: true })
  systemAdminLastLoginAt!: Date | null

  @ApiProperty({ nullable: true })
  systemAdminPasswordUpdatedAt!: Date | null
}

export class UpdateSystemAuthGovernanceDto {
  @ApiProperty()
  @IsBoolean()
  allowPasswordRegistration!: boolean

  @ApiProperty()
  @IsBoolean()
  allowGithubRegistration!: boolean

  @ApiProperty()
  @IsBoolean()
  allowLinuxDoRegistration!: boolean
}

export class SystemEmailConfigDto {
  @ApiProperty({ enum: SYSTEM_EMAIL_PROVIDER_VALUES })
  provider!: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

  @ApiProperty()
  enabled!: boolean

  @ApiProperty()
  smtpHost!: string

  @ApiProperty()
  smtpPort!: number

  @ApiProperty()
  smtpSecure!: boolean

  @ApiProperty()
  smtpUsername!: string

  @ApiProperty()
  fromName!: string

  @ApiProperty()
  fromEmail!: string

  @ApiProperty()
  hasPassword!: boolean

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null

  @ApiProperty({ nullable: true })
  updatedByDisplayName!: string | null
}

export class UpdateSystemEmailConfigDto {
  @ApiProperty({ enum: SYSTEM_EMAIL_PROVIDER_VALUES })
  @IsIn(SYSTEM_EMAIL_PROVIDER_VALUES)
  provider!: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smtpHost!: string

  @ApiProperty()
  @Min(1)
  smtpPort!: number

  @ApiProperty()
  @IsBoolean()
  smtpSecure!: boolean

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smtpUsername!: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smtpPassword?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  clearPassword?: boolean

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  fromName!: string

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  fromEmail!: string
}

export class TestSystemEmailConfigResponseDto {
  @ApiProperty()
  sent!: boolean
}

export class SystemAiConfigDto {
  @ApiProperty({ nullable: true })
  id!: string | null

  @ApiProperty()
  enabled!: boolean

  @ApiProperty()
  provider!: string

  @ApiProperty({ nullable: true })
  baseUrl!: string | null

  @ApiProperty({ nullable: true })
  defaultModel!: string | null

  @ApiProperty()
  hasApiKey!: boolean

  @ApiProperty({ nullable: true })
  maskedApiKey!: string | null

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null

  @ApiProperty({ nullable: true })
  updatedByDisplayName!: string | null
}

export class UpdateSystemAiConfigDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'baseUrl 必须是合法 URL' })
  baseUrl?: string

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  defaultModel?: string

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  apiKey?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean
}

export class SystemAdminAuditLogItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  action!: string

  @ApiProperty()
  targetType!: string

  @ApiProperty({ nullable: true })
  targetId!: string | null

  @ApiProperty()
  actorUserId!: string

  @ApiProperty()
  actorDisplayName!: string

  @ApiProperty({ nullable: true })
  actorAvatarUrl!: string | null

  @ApiProperty({ nullable: true })
  metadata!: Record<string, unknown> | null

  @ApiProperty()
  createdAt!: Date
}

export class GovernanceSummaryDto {
  @ApiProperty()
  totalDocuments!: number

  @ApiProperty()
  sharedDocuments!: number

  @ApiProperty()
  lockedDocuments!: number

  @ApiProperty({ enum: DocumentStatus })
  lockedStatus!: DocumentStatus

  @ApiProperty()
  note!: string
}
