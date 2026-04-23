import { APPEARANCE_PREFERENCE, LANGUAGE_PREFERENCE } from '@haohaoxue/samepage-contracts'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { useUserStore } from '@/stores/user'

describe('user store', () => {
  beforeEach(() => {
    localStorage.clear()
    setupPinia()
  })

  it('currentUser 和 settings 不会被 runtime deep freeze 包成快照', () => {
    const store = useUserStore()

    store.setCurrentUser({
      id: 'user_self',
      email: 'self@example.com',
      displayName: '当前用户',
      avatarUrl: null,
      userCode: 'SP-SELF234',
      roles: [],
      permissions: [],
      authMethods: [],
      mustChangePassword: false,
      emailVerified: true,
    })
    store.setSettings({
      profile: {
        displayName: '当前用户',
        avatarUrl: null,
      },
      account: {
        email: 'self@example.com',
        userCode: 'SP-SELF234',
        hasPasswordAuth: true,
        emailVerified: true,
        github: {
          connected: false,
          username: null,
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
    })

    expect(Object.isFrozen(store.currentUser!)).toBe(false)
    expect(Object.isFrozen(store.settings!)).toBe(false)
    expect(Object.isFrozen(store.preferences)).toBe(false)
  })
})

function setupPinia() {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
}
