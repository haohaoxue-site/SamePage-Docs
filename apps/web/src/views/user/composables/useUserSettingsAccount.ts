import type {
  AuthProviderName,
  UserSettingsDto,
} from '@haohaoxue/samepage-domain'
import type { ShallowRef } from 'vue'
import type { AuthCapabilitiesDto } from '@/apis/capabilities'
import { AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import { formatAuthMethod, normalizeAuthProviderName } from '@haohaoxue/samepage-shared'
import { ElMessage } from 'element-plus'
import { computed, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  requestBindEmailCode,
  startOauthBinding,
} from '@/apis/user'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export const DEFAULT_AUTH_CAPABILITIES: AuthCapabilitiesDto = {
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

function createDefaultAccount(): UserSettingsDto['account'] {
  return {
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
  }
}

export function useUserSettingsAccount(options: { authCapabilities: ShallowRef<AuthCapabilitiesDto> }) {
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const isSendingEmailCode = shallowRef(false)
  const isBindingEmail = shallowRef(false)
  const bindingProvider = shallowRef<AuthProviderName | null>(null)
  const disconnectingProvider = shallowRef<AuthProviderName | null>(null)
  const emailForm = reactive({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })

  const settings = computed(() => userStore.settings)
  const account = computed<UserSettingsDto['account']>(() => settings.value?.account ?? createDefaultAccount())
  const emailBindingEnabled = computed(() => options.authCapabilities.value.emailBindingEnabled)
  const canDisconnectGithub = computed(() =>
    account.value.github.connected && (account.value.hasPasswordAuth || account.value.linuxDo.connected),
  )
  const canDisconnectLinuxDo = computed(() =>
    account.value.linuxDo.connected && (account.value.hasPasswordAuth || account.value.github.connected),
  )

  function syncEmailForm() {
    const nextSettings = userStore.settings

    if (!nextSettings) {
      return
    }

    emailForm.email = nextSettings.account.email || ''
    emailForm.code = ''
    emailForm.newPassword = ''
    emailForm.confirmPassword = ''
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

      syncEmailForm()
      ElMessage.success(hadEmail ? '邮箱已更新' : '邮箱已绑定')
      return true
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '绑定邮箱失败'))
      return false
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
      syncEmailForm()
      ElMessage.success(`${formatProviderLabel(provider)} 已解绑`)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '解绑失败'))
    }
    finally {
      disconnectingProvider.value = null
    }
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

  return {
    account,
    bindingProvider,
    canDisconnectGithub,
    canDisconnectLinuxDo,
    disconnectingProvider,
    emailBindingEnabled,
    emailForm,
    isBindingEmail,
    isSendingEmailCode,
    syncEmailForm,
    sendEmailCode,
    bindEmail,
    connectOauth,
    disconnectOauth,
    consumeRouteFeedback,
  }
}

function formatProviderLabel(provider: string) {
  const normalizedProvider = normalizeAuthProviderName(provider)

  if (normalizedProvider) {
    return formatAuthMethod(normalizedProvider)
  }

  return '第三方账号'
}
