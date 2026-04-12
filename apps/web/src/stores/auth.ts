import type { TokenExchangeResponseDto } from '@/apis/auth'
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
import { useUserStore } from './user'

export const AUTH_PERSIST_KEY = 'samepage_auth'
export const AUTH_REDIRECT_KEY = 'samepage_auth_redirect'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = shallowRef('')
  const pendingRedirect = useSessionStorage(AUTH_REDIRECT_KEY, '')
  const userStore = useUserStore()

  const isAuthenticated = computed(() => Boolean(accessToken.value))

  async function login(code: string) {
    const result = await exchangeAuthCode({ code })
    await applyAuthSession(result)
    return result
  }

  async function passwordLogin(email: string, password: string) {
    const result = await loginWithPassword({ email, password })
    await applyAuthSession(result)
    return result
  }

  async function passwordRegister(email: string, code: string, displayName: string, password: string) {
    const result = await registerWithPassword({ email, code, displayName, password })
    await applyAuthSession(result)
    return result
  }

  async function updatePassword(currentPassword: string, newPassword: string) {
    const result = await changePassword({ currentPassword, newPassword })
    await applyAuthSession(result)
    return result
  }

  async function refreshToken() {
    const result = await refreshAccessToken()
    await applyAuthSession(result)
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
    userStore.clear()
  }

  async function applyAuthSession(result: TokenExchangeResponseDto) {
    accessToken.value = result.accessToken
    userStore.setCurrentUser(result.user)
    await userStore.refreshSettings().catch(() => null)
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
    isAuthenticated,
    login,
    passwordLogin,
    passwordRegister,
    updatePassword,
    refreshToken,
    logout,
    clearSession,
    savePendingRedirect,
    consumeRedirect,
  }
}, {
  persist: {
    key: AUTH_PERSIST_KEY,
    pick: ['accessToken'],
  },
})
