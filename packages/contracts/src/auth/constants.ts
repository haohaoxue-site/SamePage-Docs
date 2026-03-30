export const AUTH_PROVIDER_VALUES = ['github', 'linux-do'] as const

export type AuthProviderName = (typeof AUTH_PROVIDER_VALUES)[number]
