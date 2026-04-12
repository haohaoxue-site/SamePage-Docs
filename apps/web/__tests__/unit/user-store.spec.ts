import { APPEARANCE_PREFERENCE, LANGUAGE_PREFERENCE } from '@haohaoxue/samepage-contracts'
import { describe, expect, it, vi } from 'vitest'
import { updateUserPreferences } from '@/apis/user'
import { useUserStore } from '@/stores/user'

vi.mock('@/apis/user', () => ({
  confirmBindEmail: vi.fn(),
  disconnectOauthBinding: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentUserSettings: vi.fn(),
  updateCurrentUserAvatar: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
  updateUserPreferences: vi.fn(),
}))

function createSettings() {
  return {
    profile: {
      displayName: 'Alice',
      avatarUrl: null,
    },
    account: {
      email: 'alice@example.com',
      hasPasswordAuth: true,
      emailVerified: true,
      github: {
        connected: true,
        username: 'alice',
      },
      linuxDo: {
        connected: false,
        username: null,
      },
    },
    preferences: {
      language: LANGUAGE_PREFERENCE.AUTO,
      appearance: APPEARANCE_PREFERENCE.AUTO,
    },
  }
}

describe('user store', () => {
  it('does not allow external preference mutation to affect store state', () => {
    const userStore = useUserStore()

    userStore.setSettings(createSettings())

    const exposedPreferences = userStore.preferences as any

    expect(() => {
      exposedPreferences.appearance = APPEARANCE_PREFERENCE.DARK
    }).toThrow()

    expect(userStore.preferences.appearance).toBe(APPEARANCE_PREFERENCE.AUTO)
    expect(userStore._preferences.appearance).toBe(APPEARANCE_PREFERENCE.AUTO)
  })

  it('does not allow external settings mutation to affect store state', () => {
    const userStore = useUserStore()

    userStore.setSettings(createSettings())

    const exposedSettings = userStore.settings as any

    expect(() => {
      exposedSettings.profile.displayName = 'Bob'
    }).toThrow()
    expect(() => {
      exposedSettings.preferences.appearance = APPEARANCE_PREFERENCE.DARK
    }).toThrow()

    expect(userStore.settings?.profile.displayName).toBe('Alice')
    expect(userStore.settings?.preferences.appearance).toBe(APPEARANCE_PREFERENCE.AUTO)
  })

  it('persists language preference immediately after selection', async () => {
    const userStore = useUserStore()
    const updateUserPreferencesMock = vi.mocked(updateUserPreferences)

    updateUserPreferencesMock.mockResolvedValue({
      language: LANGUAGE_PREFERENCE.ZH_CN,
      appearance: APPEARANCE_PREFERENCE.AUTO,
    })

    userStore.setSettings(createSettings())

    const savingTask = userStore.updateLanguagePreference(LANGUAGE_PREFERENCE.ZH_CN)

    expect(userStore.isSavingLanguage).toBe(true)
    expect(userStore.preferences.language).toBe(LANGUAGE_PREFERENCE.ZH_CN)
    expect(userStore.settings?.preferences.language).toBe(LANGUAGE_PREFERENCE.ZH_CN)

    await savingTask

    expect(updateUserPreferencesMock).toHaveBeenCalledWith({
      language: LANGUAGE_PREFERENCE.ZH_CN,
    })
    expect(userStore.isSavingLanguage).toBe(false)
    expect(userStore.preferences.language).toBe(LANGUAGE_PREFERENCE.ZH_CN)
  })

  it('rolls back language preference when persistence fails', async () => {
    const userStore = useUserStore()
    const updateUserPreferencesMock = vi.mocked(updateUserPreferences)

    updateUserPreferencesMock.mockRejectedValue(new Error('save failed'))

    userStore.setSettings(createSettings())

    await expect(userStore.updateLanguagePreference(LANGUAGE_PREFERENCE.EN_US)).rejects.toThrow('save failed')

    expect(userStore.isSavingLanguage).toBe(false)
    expect(userStore.preferences.language).toBe(LANGUAGE_PREFERENCE.AUTO)
    expect(userStore.settings?.preferences.language).toBe(LANGUAGE_PREFERENCE.AUTO)
  })
})
