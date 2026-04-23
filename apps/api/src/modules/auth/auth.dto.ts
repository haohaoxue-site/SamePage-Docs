import type {
  ChangePasswordRequest,
  ExchangeCodeRequest,
  PasswordLoginRequest,
  PasswordRegisterRequest,
  RequestEmailVerificationRequest,
} from '@haohaoxue/samepage-domain'
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class ExchangeCodeDto implements ExchangeCodeRequest {
  @IsString()
  @MinLength(20)
  code!: string
}

export class PasswordLoginDto implements PasswordLoginRequest {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}

export class RequestEmailVerificationDto implements RequestEmailVerificationRequest {
  @IsEmail()
  email!: string
}

export class PasswordRegisterDto implements PasswordRegisterRequest {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string
}
