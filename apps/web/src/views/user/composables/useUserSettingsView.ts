import type { AuthCapabilitiesDto } from '@/apis/capabilities'
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE, PERMISSIONS } from '@haohaoxue/samepage-contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { getAuthCapabilities } from '@/apis/capabilities'
import { deleteCurrentUser } from '@/apis/user'
import { resetAdminRoutes } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { DEFAULT_AUTH_CAPABILITIES, useUserSettingsAccount } from './useUserSettingsAccount'
import { useUserSettingsPreference } from './useUserSettingsPreference'
import { useUserSettingsProfile } from './useUserSettingsProfile'

export function useUserSettingsView() {
  const router = useRouter()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const authCapabilities = shallowRef<AuthCapabilitiesDto>(DEFAULT_AUTH_CAPABILITIES)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isDeletingAccount = shallowRef(false)
  const profileSettings = useUserSettingsProfile()
  const accountSettings = useUserSettingsAccount({
    authCapabilities,
  })
  const preferenceSettings = useUserSettingsPreference()
  const currentUser = computed(() => userStore.currentUser)
  const deleteAccountConfirmationMode = computed<'email' | 'displayName'>(() =>
    accountSettings.account.value.email ? 'email' : 'displayName',
  )
  const deleteAccountConfirmationTarget = computed(() =>
    accountSettings.account.value.email ?? currentUser.value?.displayName ?? '',
  )
  const canDeleteAccount = computed(() =>
    currentUser.value?.permissions.includes(PERMISSIONS.USER_DELETE_SELF) ?? false,
  )
  const shouldShowDeleteAccountSection = computed(() =>
    canDeleteAccount.value && !userStore.isSystemAdmin,
  )

  async function loadView() {
    isLoading.value = true
    errorMessage.value = ''
    authCapabilities.value = DEFAULT_AUTH_CAPABILITIES

    try {
      const [, nextAuthCapabilities] = await Promise.all([
        userStore.refreshContext(),
        getAuthCapabilities().catch(() => null),
      ])

      authCapabilities.value = nextAuthCapabilities ?? DEFAULT_AUTH_CAPABILITIES
      profileSettings.syncProfileForm()
      accountSettings.syncEmailForm()
      await accountSettings.consumeRouteFeedback()
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载用户设置失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function removeAccount(payload: { accountConfirmation: string, confirmationPhrase: string }) {
    if (!shouldShowDeleteAccountSection.value) {
      return false
    }

    isDeletingAccount.value = true

    try {
      await deleteCurrentUser(payload)
      authStore.clearSession()
      ElMessage.success('账号已删除')

      try {
        await router.replace({ name: 'login' })
      }
      finally {
        resetAdminRoutes(router)
      }

      return true
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '删除账号失败'))
      return false
    }
    finally {
      isDeletingAccount.value = false
    }
  }

  onMounted(loadView)

  return {
    deleteAccount: removeAccount,
    deleteAccountConfirmationMode,
    deleteAccountConfirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    deleteAccountConfirmationTarget,
    errorMessage,
    isDeletingAccount,
    isLoading,
    shouldShowDeleteAccountSection,
    ...profileSettings,
    ...accountSettings,
    ...preferenceSettings,
  }
}
