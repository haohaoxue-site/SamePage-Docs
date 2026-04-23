import type {
  APPEARANCE_PREFERENCE_VALUES,
  AuditUserSummarySchema,
  LANGUAGE_PREFERENCE_VALUES,
  UserCollabIdentitySchema,
  UserStatusSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'
import type { AuthMethodName } from './auth'

export type UserStatus = z.infer<typeof UserStatusSchema>
export type LanguagePreference = (typeof LANGUAGE_PREFERENCE_VALUES)[number]
export type AppearancePreference = (typeof APPEARANCE_PREFERENCE_VALUES)[number]
export type ResolvedAppearancePreference = Exclude<AppearancePreference, 'auto'>
export type AuditUserSummary = z.infer<typeof AuditUserSummarySchema>

export interface CurrentUser {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  userCode: string
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

export interface UserSettingsProfile {
  displayName: string
  avatarUrl: string | null
}

export interface UserSettingsAccount {
  email: string | null
  userCode: string
  hasPasswordAuth: boolean
  emailVerified: boolean
  github: UserOauthBinding
  linuxDo: UserOauthBinding
}

export interface UserSettingsPreferences {
  language: LanguagePreference
  appearance: AppearancePreference
}

/**
 * 当前用户设置。
 */
export interface UserSettings {
  profile: UserSettingsProfile
  account: UserSettingsAccount
  preferences: UserSettingsPreferences
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

export interface StartOauthBindingResponse {
  authorizeUrl: string
}

export interface UserPermissionList {
  permissions: string[]
}

/**
 * 协作用户身份摘要。
 */
export type UserCollabIdentity = z.infer<typeof UserCollabIdentitySchema>
