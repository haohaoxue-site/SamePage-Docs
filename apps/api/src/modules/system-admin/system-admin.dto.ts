import { ApiProperty } from '@nestjs/swagger'
import { DocumentStatus, UserStatus } from '@prisma/client'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
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

export class UpdateSystemAdminUserSystemRoleDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean
}

export class UpdateSystemAdminUserResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus

  @ApiProperty()
  isSystemAdmin!: boolean
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
