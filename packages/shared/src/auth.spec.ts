import { AUTH_PROVIDER } from '@haohaoxue/samepage-contracts'
import { describe, expect, it } from 'vitest'
import { isAuthProviderName, normalizeAuthProviderName } from './auth'

describe('auth utils', () => {
  it('normalizes provider aliases to canonical values', () => {
    expect(normalizeAuthProviderName('github')).toBe(AUTH_PROVIDER.GITHUB)
    expect(normalizeAuthProviderName('GitHub')).toBe(AUTH_PROVIDER.GITHUB)
    expect(normalizeAuthProviderName('linux-do')).toBe(AUTH_PROVIDER.LINUX_DO)
    expect(normalizeAuthProviderName('linuxDo')).toBe(AUTH_PROVIDER.LINUX_DO)
    expect(normalizeAuthProviderName('linux_do')).toBe(AUTH_PROVIDER.LINUX_DO)
  })

  it('accepts canonical provider names only', () => {
    expect(isAuthProviderName(AUTH_PROVIDER.GITHUB)).toBe(true)
    expect(isAuthProviderName(AUTH_PROVIDER.LINUX_DO)).toBe(true)
    expect(isAuthProviderName('linuxDo')).toBe(false)
    expect(isAuthProviderName('gitlab')).toBe(false)
  })
})
