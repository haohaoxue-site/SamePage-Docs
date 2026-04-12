import type {
  AppearancePreference,
  AuthMethodName,
  LanguagePreference,
} from '@haohaoxue/samepage-domain'
import {
  APPEARANCE_PREFERENCE_VALUES,
  AUTH_METHOD_VALUES,
  LANGUAGE_PREFERENCE_VALUES,
} from '@haohaoxue/samepage-contracts'
import { ApiProperty } from '@nestjs/swagger'
import { UserStatus } from '@prisma/client'
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CurrentUserDto {
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

  @ApiProperty({ type: [String] })
  roles!: string[]

  @ApiProperty({ type: [String] })
  permissions!: string[]

  @ApiProperty({ enum: AUTH_METHOD_VALUES, isArray: true })
  authMethods!: AuthMethodName[]

  @ApiProperty()
  mustChangePassword!: boolean

  @ApiProperty()
  emailVerified!: boolean
}

export class UserPermissionListDto {
  @ApiProperty({ type: [String] })
  permissions!: string[]
}

export class UserOauthBindingDto {
  @ApiProperty()
  connected!: boolean

  @ApiProperty({ nullable: true })
  username!: string | null
}

export class UserSettingsProfileDto {
  @ApiProperty()
  displayName!: string

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null
}

export class UserSettingsAccountDto {
  @ApiProperty({ nullable: true })
  email!: string | null

  @ApiProperty()
  hasPasswordAuth!: boolean

  @ApiProperty()
  emailVerified!: boolean

  @ApiProperty({ type: () => UserOauthBindingDto })
  github!: UserOauthBindingDto

  @ApiProperty({ type: () => UserOauthBindingDto })
  linuxDo!: UserOauthBindingDto
}

export class UserSettingsPreferencesDto {
  @ApiProperty({ enum: LANGUAGE_PREFERENCE_VALUES })
  language!: LanguagePreference

  @ApiProperty({ enum: APPEARANCE_PREFERENCE_VALUES })
  appearance!: AppearancePreference
}

export class UserSettingsDto {
  @ApiProperty({ type: () => UserSettingsProfileDto })
  profile!: UserSettingsProfileDto

  @ApiProperty({ type: () => UserSettingsAccountDto })
  account!: UserSettingsAccountDto

  @ApiProperty({ type: () => UserSettingsPreferencesDto })
  preferences!: UserSettingsPreferencesDto
}

export class UpdateCurrentUserProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName!: string
}

export class UpdateCurrentUserAvatarResponseDto {
  @ApiProperty()
  avatarUrl!: string
}

export class RequestBindEmailCodeDto {
  @ApiProperty()
  @IsEmail()
  email!: string
}

export class RequestBindEmailCodeResponseDto {
  @ApiProperty()
  requested!: boolean
}

export class ConfirmBindEmailDto {
  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string
}

export class UpdateUserPreferencesDto {
  @ApiProperty({ enum: LANGUAGE_PREFERENCE_VALUES, required: false })
  @IsOptional()
  @IsIn(LANGUAGE_PREFERENCE_VALUES)
  language?: LanguagePreference

  @ApiProperty({ enum: APPEARANCE_PREFERENCE_VALUES, required: false })
  @IsOptional()
  @IsIn(APPEARANCE_PREFERENCE_VALUES)
  appearance?: AppearancePreference
}

export class StartOauthBindingResponseDto {
  @ApiProperty()
  authorizeUrl!: string
}
