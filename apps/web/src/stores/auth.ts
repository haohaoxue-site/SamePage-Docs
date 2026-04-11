import type { AuthUserDto } from '@/apis/auth'
import { ROLES } from '@haohaoxue/samepage-contracts'
import { useSessionStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import {
  changePassword,
  exchangeAuthCode,
  loginWithPassword,
  logoutAuthSession,
  refreshAccessToken,
  registerWithPassword,
} from '@/apis/auth'
import { DEFAULT_ADMIN_NAVIGATION_ITEM } from '@/router/navigation'

export const AUTH_PERSIST_KEY = 'samepage_auth'
export const AUTH_REDIRECT_KEY = 'samepage_auth_redirect'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = shallowRef('')
  const user = shallowRef<AuthUserDto | null>(null)
  const pendingRedirect = useSessionStorage(AUTH_REDIRECT_KEY, '')

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const isSystemAdmin = computed(() => user.value?.roles.includes(ROLES.SYSTEM_ADMIN) ?? false)
  const requiresPasswordChange = computed(() => user.value?.mustChangePassword ?? false)
  const defaultRouteName = computed(() => {
    if (requiresPasswordChange.value) {
      return 'change-password'
    }

    return isSystemAdmin.value ? DEFAULT_ADMIN_NAVIGATION_ITEM.routeName : 'home'
  })

  async function login(code: string) {
    const result = await exchangeAuthCode({ code })
    applyAuthSession(result.accessToken, result.user)
    return result
  }

  async function passwordLogin(email: string, password: string) {
    const result = await loginWithPassword({ email, password })
    applyAuthSession(result.accessToken, result.user)
    return result
  }

  async function passwordRegister(token: string, displayName: string, password: string) {
    const result = await registerWithPassword({ token, displayName, password })
    applyAuthSession(result.accessToken, result.user)
    return result
  }

  async function updatePassword(currentPassword: string, newPassword: string) {
    const result = await changePassword({ currentPassword, newPassword })
    applyAuthSession(result.accessToken, result.user)
    return result
  }

  async function refreshToken() {
    const result = await refreshAccessToken()
    applyAuthSession(result.accessToken, result.user)
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

  function applyAuthSession(nextAccessToken: string, nextUser: AuthUserDto) {
    accessToken.value = nextAccessToken
    user.value = nextUser
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
    requiresPasswordChange,
    defaultRouteName,
    login,
    passwordLogin,
    passwordRegister,
    updatePassword,
    refreshToken,
    logout,
    clearSession,
    applyAuthSession,
    savePendingRedirect,
    consumeRedirect,
  }
}, {
  persist: {
    key: AUTH_PERSIST_KEY,
    pick: ['accessToken', 'user'],
  },
})
