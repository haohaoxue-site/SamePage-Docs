import { AUTH_CALLBACK_PATH } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { AUTH_REDIRECT_KEY, useAuthStore } from '@/stores/auth'

vi.mock('@/apis/auth', () => ({
  buildOAuthStartUrl: vi.fn(() => '/api/auth/oauth/github/start'),
  exchangeAuthCode: vi.fn(async () => ({
    accessToken: 'new-access-token',
    expiresIn: 900,
    user: {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      roles: ['system_admin'],
      permissions: ['system_admin:overview:read'],
    },
  })),
  logoutAuthSession: vi.fn(async () => ({
    loggedOut: true,
  })),
  refreshAccessToken: vi.fn(async () => ({
    accessToken: 'refreshed-access-token',
    expiresIn: 900,
    user: {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      roles: ['system_admin'],
      permissions: ['system_admin:overview:read'],
    },
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
    systemAiBaseUrl: 'https://api.openai.com/v1',
    systemAiDefaultModel: 'gpt-4.1-mini',
  })),
  getSystemAdminUsers: vi.fn(async () => []),
  updateSystemAdminUserStatus: vi.fn(),
  updateSystemAdminUserRole: vi.fn(),
  getSystemAiConfig: vi.fn(async () => ({
    id: null,
    enabled: false,
    provider: 'openai-compatible',
    baseUrl: null,
    defaultModel: null,
    hasApiKey: false,
    maskedApiKey: null,
    updatedAt: null,
    updatedByDisplayName: null,
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
    expect(authStore.accessToken).toBe('new-access-token')
    expect(authStore.user?.displayName).toBe('Alice')
    expect(router.currentRoute.value.fullPath).toBe('/admin/users')
  })
})
