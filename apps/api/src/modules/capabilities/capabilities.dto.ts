import { ApiProperty } from '@nestjs/swagger'

export class AuthProviderCapabilityDto {
  @ApiProperty()
  enabled!: boolean

  @ApiProperty()
  allowRegistration!: boolean
}

export class AuthCapabilitiesProvidersDto {
  @ApiProperty({ type: () => AuthProviderCapabilityDto })
  github!: AuthProviderCapabilityDto

  @ApiProperty({ type: () => AuthProviderCapabilityDto })
  'linux-do'!: AuthProviderCapabilityDto
}

export class AuthCapabilitiesDto {
  @ApiProperty()
  emailBindingEnabled!: boolean

  @ApiProperty()
  passwordRegistrationEnabled!: boolean

  @ApiProperty({ type: () => AuthCapabilitiesProvidersDto })
  providers!: AuthCapabilitiesProvidersDto
}
