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
}

export class UserPermissionListDto {
  @ApiProperty({ type: [String] })
  permissions!: string[]
}
