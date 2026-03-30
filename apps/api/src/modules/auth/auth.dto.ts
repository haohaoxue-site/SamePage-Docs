import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

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
