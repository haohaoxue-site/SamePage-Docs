import { AUTH_CALLBACK_PATH, AUTH_METHOD } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { AUTH_REDIRECT_KEY, useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { createMockUser } from '../utils/test-helpers'

vi.mock('@/apis/auth', () => ({
  buildOAuthStartUrl: vi.fn(() => '/api/auth/oauth/github/start'),
  exchangeAuthCode: vi.fn(async () => ({
    accessToken: 'new-access-token',
    expiresIn: 900,
    user: createMockUser({
      roles: ['system_admin'],
      permissions: ['system_admin:overview:read'],
      authMethods: [AUTH_METHOD.GITHUB],
    }),
  })),
  logoutAuthSession: vi.fn(async () => ({
    loggedOut: true,
  })),
  refreshAccessToken: vi.fn(async () => ({
    accessToken: 'refreshed-access-token',
    expiresIn: 900,
    user: createMockUser({
      roles: ['system_admin'],
      permissions: ['system_admin:overview:read'],
      authMethods: [AUTH_METHOD.GITHUB],
    }),
  })),
}))

vi.mock('@/apis/system-admin', () => ({
  getSystemAdminOverview: vi.fn(async () => ({
    totalUsers: 12,
    activeUsers: 10,
    disabledUsers: 2,
    systemAdminCount: 1,
    totalDocuments: 36,
    sharedDocuments: 8,
    lockedDocuments: 1,
    aiConfigEnabled: true,
    systemAiBaseUrl: 'https://api.hw7mrx.com/v1',
    systemAiDefaultModel: 'gpt-4.1-mini',
  })),
  getSystemAdminUsers: vi.fn(async () => []),
  updateSystemAdminUserStatus: vi.fn(),
  getSystemAuthGovernance: vi.fn(async () => ({
    allowPasswordRegistration: true,
    allowGithubRegistration: true,
    allowLinuxDoRegistration: true,
    emailServiceEnabled: true,
    systemAdminEmail: 'alice@example.com',
    systemAdminDisplayName: 'Alice',
    systemAdminMustChangePassword: false,
    systemAdminLastLoginAt: '2026-03-25T12:00:00.000Z',
    systemAdminPasswordUpdatedAt: '2026-03-25T12:10:00.000Z',
  })),
  getSystemAiConfig: vi.fn(async () => ({
    id: null,
    enabled: false,
    provider: 'hw7mrx-compatible',
    baseUrl: null,
    defaultModel: null,
    hasApiKey: false,
    maskedApiKey: null,
    updatedAt: null,
    updatedBy: null,
  })),
  updateSystemAiConfig: vi.fn(),
  getSystemAdminAuditLogs: vi.fn(async () => []),
  getGovernanceSummary: vi.fn(async () => ({
    totalDocuments: 36,
    sharedDocuments: 8,
    lockedDocuments: 1,
    lockedStatus: 'LOCKED',
    note: '系统管理员默认不查看正文。',
  })),
}))

vi.mock('@/apis/user', () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 'user-1',
    email: null,
    displayName: 'Alice',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['system_admin'],
    permissions: ['system_admin:overview:read'],
    authMethods: [AUTH_METHOD.GITHUB],
    mustChangePassword: false,
    emailVerified: false,
  })),
  getCurrentUserSettings: vi.fn(async () => ({
    profile: {
      displayName: 'Alice',
      avatarUrl: null,
    },
    account: {
      email: null,
      hasPasswordAuth: false,
      emailVerified: false,
      github: {
        connected: true,
        username: 'alice',
      },
      linuxDo: {
        connected: false,
        username: null,
      },
    },
    preferences: {
      language: 'auto',
      appearance: 'auto',
    },
  })),
}))

describe('auth flow', () => {
  it('redirects callback to pending admin route and stores auth session', async () => {
    window.sessionStorage.setItem(AUTH_REDIRECT_KEY, '/admin/users')

    const router = createAppRouter(createMemoryHistory())
    await router.push(`${AUTH_CALLBACK_PATH}?code=callback-code`)
    await router.isReady()

    mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()
    await flushPromises()

    const authStore = useAuthStore()
    const userStore = useUserStore()
    expect(authStore.accessToken).toBe('new-access-token')
    expect(userStore.currentUser?.displayName).toBe('Alice')
    expect(router.currentRoute.value.fullPath).toBe('/admin/users')
  })
})
