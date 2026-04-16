import type {
  APPEARANCE_PREFERENCE_VALUES,
  AuditUserSummarySchema,
  LANGUAGE_PREFERENCE_VALUES,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'
import type { AuthMethodName } from './auth'

export type UserStatus = 'ACTIVE' | 'DISABLED'
export type LanguagePreference = (typeof LANGUAGE_PREFERENCE_VALUES)[number]
export type AppearancePreference = (typeof APPEARANCE_PREFERENCE_VALUES)[number]
export type ResolvedAppearancePreference = Exclude<AppearancePreference, 'auto'>
export type AuditUserSummary = z.infer<typeof AuditUserSummarySchema>

export interface CurrentUser {
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
export interface UserOauthBinding {
  connected: boolean
  username: string | null
}

/**
 * 当前用户设置。
 */
export interface UserSettings {
  profile: {
    displayName: string
    avatarUrl: string | null
  }
  account: {
    email: string | null
    hasPasswordAuth: boolean
    emailVerified: boolean
    github: UserOauthBinding
    linuxDo: UserOauthBinding
  }
  preferences: {
    language: LanguagePreference
    appearance: AppearancePreference
  }
}

export interface UpdateCurrentUserProfileRequest {
  displayName: string
}

export interface UpdateCurrentUserAvatarResponse {
  avatarUrl: string
}

export interface RequestBindEmailCodeRequest {
  email: string
}

export interface RequestBindEmailCodeResponse {
  requested: boolean
}

export interface ConfirmBindEmailRequest {
  email: string
  code: string
  newPassword?: string
}

export interface DeleteCurrentUserRequest {
  accountConfirmation: string
  confirmationPhrase: string
}

export interface DeleteCurrentUserResponse {
  deleted: boolean
}

export interface UpdateUserPreferencesRequest {
  language?: LanguagePreference
  appearance?: AppearancePreference
}

export interface UserPermissionList {
  permissions: string[]
}
