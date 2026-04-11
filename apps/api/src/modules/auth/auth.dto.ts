import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import { AUTH_METHOD_VALUES } from '@haohaoxue/samepage-contracts'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class ExchangeCodeDto {
  @ApiProperty({ description: 'OAuth 回调后的一次性交换码' })
  @IsString()
  @MinLength(20)
  code!: string
}

export class AuthUserDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ nullable: true })
  email!: string | null

  @ApiProperty()
  displayName!: string

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null

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

export class TokenExchangeResponseDto {
  @ApiProperty()
  accessToken!: string

  @ApiProperty()
  expiresIn!: number

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto
}

export class LogoutResponseDto {
  @ApiProperty()
  loggedOut!: boolean
}

export class PasswordLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}

export class RequestEmailVerificationDto {
  @ApiProperty()
  @IsEmail()
  email!: string
}

export class RequestEmailVerificationResponseDto {
  @ApiProperty()
  requested!: boolean
}

export class ConfirmEmailVerificationDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  token!: string
}

export class ConfirmEmailVerificationResponseDto {
  @ApiProperty()
  email!: string
}

export class PasswordRegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  token!: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName!: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string
}

export class AuthRegistrationOptionsDto {
  @ApiProperty()
  allowPasswordRegistration!: boolean

  @ApiProperty()
  allowGithubRegistration!: boolean

  @ApiProperty()
  allowLinuxDoRegistration!: boolean
}
