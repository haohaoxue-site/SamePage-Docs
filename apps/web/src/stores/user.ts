import type {
  AppearancePreference,
  AuthProviderName,
  ConfirmBindEmailDto,
  CurrentUserDto,
  LanguagePreference,
  UserSettingsDto,
} from '@haohaoxue/samepage-domain'
import type { DeepReadonly } from 'vue'
import type { AuthUserDto } from '@/apis/auth'
import { APPEARANCE_PREFERENCE, LANGUAGE_PREFERENCE, ROLES } from '@haohaoxue/samepage-contracts'
import { resolveAppearancePreference } from '@haohaoxue/samepage-shared'
import { usePreferredDark } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, shallowRef, watch } from 'vue'
import {
  confirmBindEmail,
  disconnectOauthBinding,
  getCurrentUser,
  getCurrentUserSettings,
  updateCurrentUserAvatar,
  updateCurrentUserProfile,
  updateUserPreferences,
} from '@/apis/user'
import { DEFAULT_ADMIN_NAVIGATION_ITEM } from '@/router/navigation'

export const USER_PERSIST_KEY = 'samepage_user'

type SessionUserSource = AuthUserDto | CurrentUserDto

function createDefaultPreferences(): UserSettingsDto['preferences'] {
  return {
    language: LANGUAGE_PREFERENCE.AUTO,
    appearance: APPEARANCE_PREFERENCE.AUTO,
  }
}

function cloneCurrentUser(user: SessionUserSource): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    roles: [...user.roles],
    permissions: [...user.permissions],
    authMethods: [...user.authMethods],
    mustChangePassword: user.mustChangePassword,
    emailVerified: user.emailVerified,
  }
}

function clonePreferences(preferences: UserSettingsDto['preferences']): UserSettingsDto['preferences'] {
  return {
    language: preferences.language,
    appearance: preferences.appearance,
  }
}

function cloneUserSettings(settings: UserSettingsDto): UserSettingsDto {
  return {
    profile: {
      displayName: settings.profile.displayName,
      avatarUrl: settings.profile.avatarUrl,
    },
    account: {
      email: settings.account.email,
      hasPasswordAuth: settings.account.hasPasswordAuth,
      emailVerified: settings.account.emailVerified,
      github: {
        connected: settings.account.github.connected,
        username: settings.account.github.username,
      },
      linuxDo: {
        connected: settings.account.linuxDo.connected,
        username: settings.account.linuxDo.username,
      },
    },
    preferences: clonePreferences(settings.preferences),
  }
}

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const entry of Object.values(value)) {
    if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
      deepFreeze(entry)
    }
  }

  return Object.freeze(value) as DeepReadonly<T>
}

export const useUserStore = defineStore('user', () => {
  const _currentUser = shallowRef<AuthUserDto | null>(null)
  const _settings = shallowRef<UserSettingsDto | null>(null)
  const _preferences = reactive<UserSettingsDto['preferences']>(createDefaultPreferences())
  const preferredDark = usePreferredDark()
  const isSavingLanguage = shallowRef(false)
  const isSavingAppearance = shallowRef(false)
  const currentUser = computed<DeepReadonly<AuthUserDto> | null>(() =>
    _currentUser.value ? deepFreeze(cloneCurrentUser(_currentUser.value)) : null,
  )
  const settings = computed<DeepReadonly<UserSettingsDto> | null>(() =>
    _settings.value ? deepFreeze(cloneUserSettings(_settings.value)) : null,
  )
  const preferences = computed<DeepReadonly<UserSettingsDto['preferences']>>(() =>
    deepFreeze(clonePreferences(_preferences)),
  )

  const systemMode = computed(() =>
    preferredDark.value ? APPEARANCE_PREFERENCE.DARK : APPEARANCE_PREFERENCE.LIGHT,
  )
  const resolvedAppearance = computed(() =>
    resolveAppearancePreference(_preferences.appearance, systemMode.value),
  )
  const isDark = computed(() => resolvedAppearance.value === APPEARANCE_PREFERENCE.DARK)
  const isSystemAdmin = computed(() => _currentUser.value?.roles.includes(ROLES.SYSTEM_ADMIN) ?? false)
  const requiresPasswordChange = computed(() => _currentUser.value?.mustChangePassword ?? false)
  const defaultRouteName = computed(() => {
    if (requiresPasswordChange.value) {
      return 'change-password'
    }

    return isSystemAdmin.value ? DEFAULT_ADMIN_NAVIGATION_ITEM.routeName : 'home'
  })

  watch(resolvedAppearance, (value) => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.classList.toggle('dark', value === APPEARANCE_PREFERENCE.DARK)
  }, {
    immediate: true,
  })

  function clear() {
    _currentUser.value = null
    _settings.value = null
    resetPreferences()
  }

  function setCurrentUser(nextUser: SessionUserSource) {
    _currentUser.value = cloneCurrentUser(nextUser)
  }

  function patchCurrentUserState(partial: Partial<AuthUserDto>) {
    if (!_currentUser.value) {
      return
    }

    _currentUser.value = cloneCurrentUser({
      ..._currentUser.value,
      ...partial,
    })
  }

  async function refreshContext() {
    const [nextUser, nextSettings] = await Promise.all([
      getCurrentUser(),
      getCurrentUserSettings(),
    ])

    setCurrentUser(nextUser)
    setSettings(nextSettings)
  }

  function hydratePreferences(nextPreferences: UserSettingsDto['preferences']) {
    _preferences.language = nextPreferences.language
    _preferences.appearance = nextPreferences.appearance

    if (!_settings.value) {
      return
    }

    _settings.value = {
      ..._settings.value,
      preferences: clonePreferences(nextPreferences),
    }
  }

  function setSettings(nextSettings: UserSettingsDto) {
    _settings.value = cloneUserSettings(nextSettings)
    _preferences.language = nextSettings.preferences.language
    _preferences.appearance = nextSettings.preferences.appearance
  }

  function patchSettings(mutator: (current: UserSettingsDto) => UserSettingsDto) {
    if (!_settings.value) {
      return
    }

    _settings.value = cloneUserSettings(mutator(cloneUserSettings(_settings.value)))
  }

  function resetPreferences() {
    hydratePreferences(createDefaultPreferences())
  }

  async function refreshSettings() {
    const nextSettings = await getCurrentUserSettings()
    setSettings(nextSettings)
  }

  async function updateProfile(displayName: string) {
    const nextUser = await updateCurrentUserProfile({
      displayName,
    })

    setCurrentUser(nextUser)
    patchSettings(currentSettings => ({
      ...currentSettings,
      profile: {
        ...currentSettings.profile,
        displayName: nextUser.displayName,
      },
    }))
  }

  async function updateAvatar(file: File) {
    const result = await updateCurrentUserAvatar(file)

    patchCurrentUserState({
      avatarUrl: result.avatarUrl,
    })
    patchSettings(currentSettings => ({
      ...currentSettings,
      profile: {
        ...currentSettings.profile,
        avatarUrl: result.avatarUrl,
      },
    }))
  }

  async function updateLanguagePreference(nextLanguage: LanguagePreference) {
    if (isSavingLanguage.value || _preferences.language === nextLanguage) {
      return
    }

    isSavingLanguage.value = true
    const previousLanguage = _preferences.language
    _preferences.language = nextLanguage
    patchSettings(currentSettings => ({
      ...currentSettings,
      preferences: {
        ...currentSettings.preferences,
        language: nextLanguage,
      },
    }))

    try {
      const nextPreferences = await updateUserPreferences({
        language: nextLanguage,
      })

      hydratePreferences(nextPreferences)
    }
    catch (error) {
      _preferences.language = previousLanguage
      patchSettings(currentSettings => ({
        ...currentSettings,
        preferences: {
          ...currentSettings.preferences,
          language: previousLanguage,
        },
      }))
      throw error
    }
    finally {
      isSavingLanguage.value = false
    }
  }

  async function updateAppearancePreference(nextAppearance: AppearancePreference) {
    if (isSavingAppearance.value || _preferences.appearance === nextAppearance) {
      return
    }

    isSavingAppearance.value = true
    const previousAppearance = _preferences.appearance
    _preferences.appearance = nextAppearance
    patchSettings(currentSettings => ({
      ...currentSettings,
      preferences: {
        ...currentSettings.preferences,
        appearance: nextAppearance,
      },
    }))

    try {
      const nextPreferences = await updateUserPreferences({
        appearance: nextAppearance,
      })

      hydratePreferences(nextPreferences)
    }
    catch (error) {
      _preferences.appearance = previousAppearance
      patchSettings(currentSettings => ({
        ...currentSettings,
        preferences: {
          ...currentSettings.preferences,
          appearance: previousAppearance,
        },
      }))
      throw error
    }
    finally {
      isSavingAppearance.value = false
    }
  }

  async function bindEmail(payload: ConfirmBindEmailDto) {
    const nextUser = await confirmBindEmail(payload)
    setCurrentUser(nextUser)
    await refreshSettings()
  }

  async function disconnectOauth(provider: AuthProviderName) {
    const nextUser = await disconnectOauthBinding(provider)
    setCurrentUser(nextUser)
    await refreshSettings()
  }

  return {
    _currentUser,
    _preferences,
    currentUser,
    settings,
    preferences,
    systemMode,
    resolvedAppearance,
    isDark,
    isSystemAdmin,
    requiresPasswordChange,
    defaultRouteName,
    isSavingLanguage,
    isSavingAppearance,
    clear,
    setCurrentUser,
    setSettings,
    refreshContext,
    refreshSettings,
    resetPreferences,
    updateProfile,
    updateAvatar,
    updateLanguagePreference,
    updateAppearancePreference,
    bindEmail,
    disconnectOauth,
  }
}, {
  persist: {
    key: USER_PERSIST_KEY,
    pick: ['_currentUser', '_preferences'],
  },
})
