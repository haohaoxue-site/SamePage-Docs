export type UserStatus = 'ACTIVE' | 'DISABLED'

export interface CurrentUserDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  status: UserStatus
  roles: string[]
  permissions: string[]
}

export interface UserPermissionList {
  permissions: string[]
}
