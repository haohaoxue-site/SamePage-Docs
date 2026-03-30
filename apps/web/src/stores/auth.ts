import type { AuthUserDto } from '@/apis/auth'
import { ROLES } from '@haohaoxue/samepage-contracts'
import { useSessionStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { exchangeAuthCode, logoutAuthSession, refreshAccessToken } from '@/apis/auth'

export const AUTH_PERSIST_KEY = 'samepage_auth'
export const AUTH_REDIRECT_KEY = 'samepage_auth_redirect'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = shallowRef('')
  const user = shallowRef<AuthUserDto | null>(null)
  const pendingRedirect = useSessionStorage(AUTH_REDIRECT_KEY, '')

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const isSystemAdmin = computed(() => user.value?.roles.includes(ROLES.SYSTEM_ADMIN) ?? false)
  const defaultRouteName = computed(() => isSystemAdmin.value ? 'admin-overview' : 'home')

  async function login(code: string) {
    const result = await exchangeAuthCode({ code })
    accessToken.value = result.accessToken
    user.value = result.user
    return result
  }

  async function refreshToken() {
    const result = await refreshAccessToken()
    accessToken.value = result.accessToken
    user.value = result.user
    return result
  }

  async function logout() {
    try {
      await logoutAuthSession()
    }
    catch {
    }
    finally {
      clearSession()
    }
  }

  function clearSession() {
    accessToken.value = ''
    user.value = null
  }

  function savePendingRedirect(path: string) {
    pendingRedirect.value = path
  }

  function consumeRedirect() {
    const path = pendingRedirect.value || ''
    pendingRedirect.value = null
    return path
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    isSystemAdmin,
    defaultRouteName,
    login,
    refreshToken,
    logout,
    clearSession,
    savePendingRedirect,
    consumeRedirect,
  }
}, {
  persist: {
    key: AUTH_PERSIST_KEY,
    pick: ['accessToken', 'user'],
  },
})
