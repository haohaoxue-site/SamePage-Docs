import type {
  AuthProviderName,
  DeleteCurrentUserDto,
  UserSettingsDto,
} from '@haohaoxue/samepage-domain'

/**
 * 资料设置区属性。
 */
export interface UserProfileSectionProps {
  avatarUrl: string | null
  isSaving: boolean
  isUploading: boolean
}

/**
 * 资料设置区事件。
 */
export interface UserProfileSectionEmits {
  submit: []
  upload: [file: File]
}

/**
 * 账户绑定区属性。
 */
export interface UserAccountSectionProps {
  account: UserSettingsDto['account']
  emailBindingEnabled: boolean
  isSendingCode: boolean
  isBindingEmail: boolean
  bindingProvider: AuthProviderName | null
  disconnectingProvider: AuthProviderName | null
  canDisconnectGithub: boolean
  canDisconnectLinuxDo: boolean
}

/**
 * 账户绑定区事件。
 */
export interface UserAccountSectionEmits {
  sendCode: []
  confirmEmail: []
  startOauthBinding: [provider: AuthProviderName]
  disconnectOauthBinding: [provider: AuthProviderName]
}

/**
 * 偏好设置区属性。
 */
export interface UserPreferenceSectionProps {
  isSavingLanguage: boolean
  isSavingAppearance: boolean
}

/**
 * 删除账号区属性。
 */
export interface UserDeleteSectionProps {
  isDeleting: boolean
  confirmationTarget: string
  confirmationMode: 'email' | 'displayName'
  confirmationPhrase: string
}

/**
 * 删除账号区事件。
 */
export interface UserDeleteSectionEmits {
  deleteAccount: [payload: DeleteCurrentUserDto]
}
