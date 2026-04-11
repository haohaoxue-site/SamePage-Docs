import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type { FormRules } from 'element-plus'
import type { AuthRegistrationOptionsDto } from '@/apis/auth'
import { AUTH_PROVIDER, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import { computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildOAuthStartUrl } from '@/apis/auth'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useAuthStore } from '@/stores/auth'
import { useAuthRegistrationOptions } from '../../composables/useAuthRegistrationOptions'
import { completeAuthNavigation, syncPendingRedirect } from '../../utils/navigation'
import { createEmailRules, createPasswordRules, isValidEmail, isValidPassword } from '../../utils/rules'

interface LoginProviderMeta {
  title: string
  icon: string
}

const providerLabels: Record<AuthProviderName, LoginProviderMeta> = {
  [AUTH_PROVIDER.GITHUB]: {
    title: 'GitHub',
    icon: 'brand-github',
  },
  [AUTH_PROVIDER.LINUX_DO]: {
    title: 'LinuxDo',
    icon: 'brand-linux-do',
  },
}

export function useLoginView() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const passwordForm = reactive({
    email: '',
    password: '',
  })
  const passwordFormRules: FormRules<typeof passwordForm> = {
    email: createEmailRules(),
    password: createPasswordRules(),
  }
  const {
    allowPasswordRegistration,
    isLoadingOptions,
    loadErrorMessage,
    loadRegistrationOptions,
    registrationOptions,
  } = useAuthRegistrationOptions()

  const providers = computed(() => AUTH_PROVIDER_VALUES.map(provider => ({
    provider,
    acceptingNewUsers: isProviderRegistrationEnabled(provider, registrationOptions.value),
    ...providerLabels[provider],
  })))

  const { isSubmitting: isPasswordSubmitting, submit: submitPasswordLogin } = useFormSubmit({
    validate: () => isValidEmail(passwordForm.email) && isValidPassword(passwordForm.password),
    action: async () => {
      syncPendingRedirect(route.query.redirect, authStore)
      passwordForm.email = passwordForm.email.trim()
      await authStore.passwordLogin(passwordForm.email, passwordForm.password)
    },
    fallbackError: '登录失败',
    onSuccess: () => completeAuthNavigation(router, authStore),
  })

  function startLogin(provider: AuthProviderName) {
    syncPendingRedirect(route.query.redirect, authStore)
    window.location.assign(buildOAuthStartUrl(provider))
  }

  onMounted(() => {
    syncPendingRedirect(route.query.redirect, authStore)
    void loadRegistrationOptions()
  })

  return {
    allowPasswordRegistration,
    isLoadingOptions,
    isPasswordSubmitting,
    loadErrorMessage,
    passwordForm,
    passwordFormRules,
    providers,
    startLogin,
    submitPasswordLogin,
  }
}

function isProviderRegistrationEnabled(
  provider: AuthProviderName,
  options: AuthRegistrationOptionsDto | null,
) {
  if (!options) {
    return true
  }

  if (provider === AUTH_PROVIDER.GITHUB) {
    return options.allowGithubRegistration
  }

  return options.allowLinuxDoRegistration
}
