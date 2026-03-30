import type { AuthProviderName } from '@haohaoxue/samepage-contracts'
import { AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import { buildOAuthStartUrl } from '@/apis/auth'

const providerLabels: Record<AuthProviderName, { title: string, description: string }> = {
  'github': {
    title: 'GitHub 登录',
    description: '使用 GitHub 账号登录',
  },
  'linux-do': {
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
