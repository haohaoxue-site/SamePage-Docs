import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter, loadAdminRoutes } from '@/router'
import { useAuthStore } from '@/stores/auth'

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
  listSystemAdminUsers: vi.fn(async () => ([
    {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      status: 'ACTIVE',
      isSystemAdmin: true,
      ownedDocumentCount: 4,
      sharedDocumentCount: 2,
      createdAt: '2026-03-25T10:00:00.000Z',
      lastLoginAt: '2026-03-25T12:00:00.000Z',
    },
  ])),
  updateSystemAdminUserStatus: vi.fn(async () => ({
    id: 'user-1',
    status: 'DISABLED',
    isSystemAdmin: true,
  })),
  updateSystemAdminUserRole: vi.fn(async () => ({
    id: 'user-1',
    status: 'ACTIVE',
    isSystemAdmin: false,
  })),
  getSystemAiConfig: vi.fn(async () => ({
    id: 'config-1',
    enabled: true,
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    hasApiKey: true,
    maskedApiKey: '••••••••1234',
    updatedAt: '2026-03-25T12:00:00.000Z',
    updatedByDisplayName: 'Alice',
  })),
  updateSystemAiConfig: vi.fn(async () => ({
    id: 'config-1',
    enabled: true,
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    hasApiKey: true,
    maskedApiKey: '••••••••1234',
    updatedAt: '2026-03-25T12:00:00.000Z',
    updatedByDisplayName: 'Alice',
  })),
  listSystemAdminAuditLogs: vi.fn(async () => []),
  getGovernanceSummary: vi.fn(async () => ({
    totalDocuments: 36,
    sharedDocuments: 8,
    lockedDocuments: 1,
    lockedStatus: 'LOCKED',
    note: '系统管理员默认不查看正文。',
  })),
}))

function seedAuthState() {
  const authStore = useAuthStore()
  authStore.accessToken = 'test-access-token'
  authStore.user = {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    avatarUrl: null,
    roles: ['system_admin'],
    permissions: ['system_admin:overview:read'],
  }
}

describe('admin console', () => {
  it('renders the admin overview route', async () => {
    seedAuthState()

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('系统概览')
    expect(wrapper.text()).toContain('总用户')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('系统 AI')
    expect(wrapper.text()).toContain('已启用')
  })

  it('renders the admin users route', async () => {
    seedAuthState()

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('用户管理')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('吊销权限')
  })

  it('redirects unauthenticated admin access to login', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/users')
  })

  it('redirects authenticated non-admin users away from admin routes', async () => {
    const authStore = useAuthStore()
    authStore.accessToken = 'test-access-token'
    authStore.user = {
      id: 'user-2',
      email: 'bob@example.com',
      displayName: 'Bob',
      avatarUrl: null,
      roles: [],
      permissions: [],
    }

    const router = createAppRouter(createMemoryHistory())
    loadAdminRoutes(router)

    await router.push('/admin/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
