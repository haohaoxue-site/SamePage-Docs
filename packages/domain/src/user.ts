import type { AuthMethodName } from './auth'

export type UserStatus = 'ACTIVE' | 'DISABLED'

export interface CurrentUserDto {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  status: UserStatus
  roles: string[]
  permissions: string[]
  authMethods: AuthMethodName[]
  mustChangePassword: boolean
  emailVerified: boolean
}

export interface UserPermissionList {
  permissions: string[]
}
