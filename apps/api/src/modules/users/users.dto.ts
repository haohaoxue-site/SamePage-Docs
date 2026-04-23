import type {
  AppearancePreference,
  ConfirmBindEmailRequest,
  DeleteCurrentUserRequest as DeleteCurrentUserPayload,
  LanguagePreference,
  RequestBindEmailCodeRequest,
  UpdateCurrentUserProfileRequest,
  UpdateUserPreferencesRequest,
} from '@haohaoxue/samepage-domain'
import {
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  APPEARANCE_PREFERENCE_VALUES,
  LANGUAGE_PREFERENCE_VALUES,
} from '@haohaoxue/samepage-contracts'
import {
  Equals,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateCurrentUserProfileDto implements UpdateCurrentUserProfileRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName!: string
}

export class RequestBindEmailCodeDto implements RequestBindEmailCodeRequest {
  @IsEmail()
  email!: string
}

export class ConfirmBindEmailDto implements ConfirmBindEmailRequest {
  @IsEmail()
  email!: string

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string
}

export class DeleteCurrentUserDto implements DeleteCurrentUserPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  accountConfirmation!: string

  @IsString()
  @Equals(ACCOUNT_DELETION_CONFIRMATION_PHRASE)
  confirmationPhrase!: string
}

export class UpdateUserPreferencesDto implements UpdateUserPreferencesRequest {
  @IsOptional()
  @IsIn(LANGUAGE_PREFERENCE_VALUES)
  language?: LanguagePreference

  @IsOptional()
  @IsIn(APPEARANCE_PREFERENCE_VALUES)
  appearance?: AppearancePreference
}

export class FindUserByCodeQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string
}
