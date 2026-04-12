import type {
  AppearancePreference,
  AuthProviderName,
  LanguagePreference,
  UserSettingsDto,
} from '@haohaoxue/samepage-domain'
import type { AuthCapabilitiesDto } from '@/apis/capabilities'
import { AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import { formatAuthMethod, normalizeAuthProviderName } from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuthCapabilities } from '@/apis/capabilities'
import {
  requestBindEmailCode,
  startOauthBinding,
} from '@/apis/user'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

const DEFAULT_AUTH_CAPABILITIES: AuthCapabilitiesDto = {
  emailBindingEnabled: false,
  passwordRegistrationEnabled: false,
  providers: {
    [AUTH_PROVIDER.GITHUB]: {
      enabled: false,
      allowRegistration: false,
    },
    [AUTH_PROVIDER.LINUX_DO]: {
      enabled: false,
      allowRegistration: false,
    },
  },
}

export function useUserSettingsView() {
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const authCapabilities = shallowRef<AuthCapabilitiesDto>(DEFAULT_AUTH_CAPABILITIES)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isSavingProfile = shallowRef(false)
  const isUploadingAvatar = shallowRef(false)
  const isSendingEmailCode = shallowRef(false)
  const isBindingEmail = shallowRef(false)
  const bindingProvider = shallowRef<AuthProviderName | null>(null)
  const disconnectingProvider = shallowRef<AuthProviderName | null>(null)
  const profileForm = reactive({
    displayName: '',
  })
  const emailForm = reactive({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })
  const isSavingLanguage = computed(() => userStore.isSavingLanguage)
  const isSavingAppearance = computed(() => userStore.isSavingAppearance)
  const languagePreference = computed<LanguagePreference>({
    get: () => userStore.preferences.language,
    set: (value) => {
      void saveLanguagePreference(value)
    },
  })
  const appearancePreference = computed<AppearancePreference>({
    get: () => userStore.preferences.appearance,
    set: (value) => {
      void saveAppearancePreference(value)
    },
  })
  const settings = computed(() => userStore.settings)

  const account = computed<UserSettingsDto['account']>(() => settings.value?.account ?? {
    email: null,
    hasPasswordAuth: false,
    emailVerified: false,
    github: {
      connected: false,
      username: null,
    },
    linuxDo: {
      connected: false,
      username: null,
    },
  })

  const avatarUrl = computed(() => settings.value?.profile.avatarUrl ?? userStore.currentUser?.avatarUrl ?? null)
  const emailBindingEnabled = computed(() => authCapabilities.value.emailBindingEnabled)
  const canDisconnectGithub = computed(() =>
    account.value.github.connected && (account.value.hasPasswordAuth || account.value.linuxDo.connected),
  )
  const canDisconnectLinuxDo = computed(() =>
    account.value.linuxDo.connected && (account.value.hasPasswordAuth || account.value.github.connected),
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
      syncFormState()
      await consumeRouteFeedback()
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载用户设置失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function saveProfile() {
    isSavingProfile.value = true

    try {
      await userStore.updateProfile(profileForm.displayName.trim())
      profileForm.displayName = userStore.currentUser?.displayName ?? profileForm.displayName
      ElMessage.success('资料已更新')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存资料失败'))
    }
    finally {
      isSavingProfile.value = false
    }
  }

  async function uploadAvatar(file: File) {
    isUploadingAvatar.value = true

    try {
      await userStore.updateAvatar(file)
      ElMessage.success('头像已更新')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '上传头像失败'))
    }
    finally {
      isUploadingAvatar.value = false
    }
  }

  async function sendEmailCode() {
    isSendingEmailCode.value = true

    try {
      await requestBindEmailCode({
        email: emailForm.email.trim(),
      })
      ElMessage.success('验证码已发送，请前往邮箱查看')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '发送验证码失败'))
    }
    finally {
      isSendingEmailCode.value = false
    }
  }

  async function bindEmail() {
    isBindingEmail.value = true
    const hadEmail = Boolean(account.value.email)

    try {
      await userStore.bindEmail({
        email: emailForm.email.trim(),
        code: emailForm.code.trim(),
        newPassword: emailForm.newPassword.trim() || undefined,
      })

      syncFormState()
      ElMessage.success(hadEmail ? '邮箱已更新' : '邮箱已绑定')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '绑定邮箱失败'))
    }
    finally {
      isBindingEmail.value = false
    }
  }

  async function connectOauth(provider: AuthProviderName) {
    bindingProvider.value = provider

    try {
      const result = await startOauthBinding(provider)
      window.location.assign(result.authorizeUrl)
    }
    catch (error) {
      bindingProvider.value = null
      ElMessage.error(getRequestErrorDisplayMessage(error, '发起账号绑定失败'))
    }
  }

  async function disconnectOauth(provider: AuthProviderName) {
    disconnectingProvider.value = provider

    try {
      await userStore.disconnectOauth(provider)
      syncFormState()
      ElMessage.success(`${formatProviderLabel(provider)} 已解绑`)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '解绑失败'))
    }
    finally {
      disconnectingProvider.value = null
    }
  }

  onMounted(loadView)

  return {
    account,
    avatarUrl,
    bindingProvider,
    canDisconnectGithub,
    canDisconnectLinuxDo,
    disconnectingProvider,
    emailBindingEnabled,
    emailForm,
    errorMessage,
    isBindingEmail,
    isLoading,
    isSavingLanguage,
    isSavingAppearance,
    isSavingProfile,
    isSendingEmailCode,
    isUploadingAvatar,
    languagePreference,
    appearancePreference,
    profileForm,
    saveProfile,
    sendEmailCode,
    bindEmail,
    connectOauth,
    disconnectOauth,
    uploadAvatar,
  }

  async function saveLanguagePreference(value: LanguagePreference) {
    try {
      await userStore.updateLanguagePreference(value)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存语言偏好失败'))
    }
  }

  async function saveAppearancePreference(value: AppearancePreference) {
    try {
      await userStore.updateAppearancePreference(value)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存外观偏好失败'))
    }
  }

  function syncFormState() {
    const nextSettings = userStore.settings

    if (!nextSettings) {
      return
    }

    profileForm.displayName = nextSettings.profile.displayName
    emailForm.email = nextSettings.account.email || ''
    emailForm.code = ''
    emailForm.newPassword = ''
    emailForm.confirmPassword = ''
  }

  async function consumeRouteFeedback() {
    const bindStatus = typeof route.query.bind_status === 'string' ? route.query.bind_status : ''
    const provider = typeof route.query.provider === 'string' ? route.query.provider : ''
    const bindMessage = typeof route.query.bind_message === 'string' ? route.query.bind_message : ''

    if (!bindStatus) {
      return
    }

    const nextQuery = { ...route.query }
    delete nextQuery.bind_status
    delete nextQuery.provider
    delete nextQuery.bind_message
    await router.replace({ query: nextQuery })

    if (bindStatus === 'success') {
      ElMessage.success(`${formatProviderLabel(provider)} 账号已绑定`)
      return
    }

    ElMessage.error(bindMessage || `${formatProviderLabel(provider)} 账号绑定失败`)
  }
}

function formatProviderLabel(provider: string) {
  const normalizedProvider = normalizeAuthProviderName(provider)

  if (normalizedProvider) {
    return formatAuthMethod(normalizedProvider)
  }

  return '第三方账号'
}
