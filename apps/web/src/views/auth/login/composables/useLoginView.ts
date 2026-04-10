import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import { AUTH_PROVIDER, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'
import { buildOAuthStartUrl } from '@/apis/auth'

interface LoginProviderMeta {
  /** 登录按钮标题 */
  title: string
  /** 登录按钮描述 */
  description: string
  /** 对应 SvgIcon 的 symbol 名称 */
  icon: string
}

const providerLabels: Record<AuthProviderName, LoginProviderMeta> = {
  [AUTH_PROVIDER.GITHUB]: {
    title: 'GitHub 登录',
    description: '使用 GitHub 账号登录',
    icon: 'brand-github',
  },
  [AUTH_PROVIDER.LINUX_DO]: {
    title: 'LinuxDo 登录',
    description: '使用 LinuxDo 账号登录',
    icon: 'brand-linux-do',
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
