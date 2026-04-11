import type { AUTH_METHOD_VALUES } from '@haohaoxue/samepage-contracts'
import { AUTH_METHOD_LABELS, AUTH_PROVIDER, AUTH_PROVIDER_VALUES } from '@haohaoxue/samepage-contracts'

type AuthProviderName = (typeof AUTH_PROVIDER_VALUES)[number]
type AuthMethodName = (typeof AUTH_METHOD_VALUES)[number]

const NON_ALPHANUMERIC_RE = /[^a-z0-9]+/g

const AUTH_PROVIDER_ALIAS_MAP: Record<string, AuthProviderName> = {
  github: AUTH_PROVIDER.GITHUB,
  linuxdo: AUTH_PROVIDER.LINUX_DO,
} as const

export function isAuthProviderName(value: string): value is AuthProviderName {
  return AUTH_PROVIDER_VALUES.includes(value as AuthProviderName)
}

export function normalizeAuthProviderName(value: string): AuthProviderName | null {
  const normalizedValue = value.trim().toLowerCase()

  if (isAuthProviderName(normalizedValue)) {
    return normalizedValue
  }

  const compactValue = normalizedValue.replace(NON_ALPHANUMERIC_RE, '')

  return AUTH_PROVIDER_ALIAS_MAP[compactValue] ?? null
}

export function formatAuthMethod(method: AuthMethodName): string {
  return AUTH_METHOD_LABELS[method]
}
