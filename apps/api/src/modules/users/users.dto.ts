import type { AuthMethodName } from '@haohaoxue/samepage-domain'
import { AUTH_METHOD_VALUES } from '@haohaoxue/samepage-contracts'
import { ApiProperty } from '@nestjs/swagger'
import { UserStatus } from '@prisma/client'

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
