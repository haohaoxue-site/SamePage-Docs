import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import { AUTH_PROVIDER, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-domain'
import { buildOAuthStartUrl } from '@/apis/auth'

const providerLabels: Record<AuthProviderName, { title: string, description: string }> = {
  [AUTH_PROVIDER.GITHUB]: {
    title: 'GitHub 登录',
    description: '使用 GitHub 账号登录',
  },
  [AUTH_PROVIDER.LINUX_DO]: {
    title: 'Linux.do 登录',
    description: '使用 Linux.do 账号登录',
  },
}

export function useLoginView() {
  const providers = AUTH_PROVIDER_VALUES.map(provider => ({
    provider,
    ...providerLabels[provider],
  }))

  function startLogin(provider: AuthProviderName) {
    window.location.assign(buildOAuthStartUrl(provider))
  }

  return {
    providers,
    startLogin,
  }
}
