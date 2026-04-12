import type { APPEARANCE_PREFERENCE_VALUES, LANGUAGE_PREFERENCE_VALUES } from '@haohaoxue/samepage-contracts'
import type { AuthMethodName } from './auth'

export type UserStatus = 'ACTIVE' | 'DISABLED'
export type LanguagePreference = (typeof LANGUAGE_PREFERENCE_VALUES)[number]
export type AppearancePreference = (typeof APPEARANCE_PREFERENCE_VALUES)[number]
export type ResolvedAppearancePreference = Exclude<AppearancePreference, 'auto'>

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

/**
 * 第三方账号绑定状态。
 */
export interface UserOauthBindingDto {
  connected: boolean
  username: string | null
}

/**
 * 当前用户设置。
 */
export interface UserSettingsDto {
  profile: {
    displayName: string
    avatarUrl: string | null
  }
  account: {
    email: string | null
    hasPasswordAuth: boolean
    emailVerified: boolean
    github: UserOauthBindingDto
    linuxDo: UserOauthBindingDto
  }
  preferences: {
    language: LanguagePreference
    appearance: AppearancePreference
  }
}

export interface UpdateCurrentUserProfileDto {
  displayName: string
}

export interface UpdateCurrentUserAvatarResponseDto {
  avatarUrl: string
}

export interface RequestBindEmailCodeDto {
  email: string
}

export interface RequestBindEmailCodeResponseDto {
  requested: boolean
}

export interface ConfirmBindEmailDto {
  email: string
  code: string
  newPassword?: string
}

export interface UpdateUserPreferencesDto {
  language?: LanguagePreference
  appearance?: AppearancePreference
}

export interface UserPermissionList {
  permissions: string[]
}
