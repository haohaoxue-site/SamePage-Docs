import type {
  SystemEmailConfig,
  SystemEmailServiceStatus,
  TestSystemEmailConfigInput,
  TestSystemEmailConfigResponse,
  UpdateSystemEmailConfigInput,
  UpdateSystemEmailServiceStatusInput,
} from './system-email.interface'
import { SYSTEM_EMAIL_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export class SystemEmailUpdatedByUserDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  displayName!: string

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null
}

export class SystemEmailConfigDto implements SystemEmailConfig {
  @ApiProperty({ enum: SYSTEM_EMAIL_PROVIDER_VALUES })
  provider!: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

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
  updatedBy!: string | null

  @ApiProperty({ type: () => SystemEmailUpdatedByUserDto, nullable: true })
  updatedByUser!: SystemEmailUpdatedByUserDto | null
}

export class SystemEmailServiceStatusDto implements SystemEmailServiceStatus {
  @ApiProperty()
  enabled!: boolean

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null

  @ApiProperty({ nullable: true })
  updatedBy!: string | null

  @ApiProperty({ type: () => SystemEmailUpdatedByUserDto, nullable: true })
  updatedByUser!: SystemEmailUpdatedByUserDto | null
}

export class UpdateSystemEmailConfigDto implements UpdateSystemEmailConfigInput {
  @ApiProperty({ enum: SYSTEM_EMAIL_PROVIDER_VALUES })
  @IsIn(SYSTEM_EMAIL_PROVIDER_VALUES)
  provider!: (typeof SYSTEM_EMAIL_PROVIDER_VALUES)[number]

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
  @IsEmail({}, { message: '请输入有效的发件邮箱' })
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  fromEmail!: string
}

export class UpdateSystemEmailServiceStatusDto implements UpdateSystemEmailServiceStatusInput {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean
}

export class TestSystemEmailConfigDto implements TestSystemEmailConfigInput {
  @ApiProperty()
  @IsEmail({}, { message: '请输入有效的收件邮箱' })
  @MaxLength(120)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email!: string
}

export class TestSystemEmailConfigResponseDto implements TestSystemEmailConfigResponse {
  @ApiProperty()
  sent!: boolean
}
