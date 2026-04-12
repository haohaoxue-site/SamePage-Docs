import { AUTH_METHOD } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter, loadAdminRoutes } from '@/router'
import { seedAuthState } from '../utils/test-helpers'

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
  getSystemAdminUsers: vi.fn(async () => [{
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    avatarUrl: null,
    status: 'ACTIVE',
    isSystemAdmin: true,
    authMethods: [AUTH_METHOD.PASSWORD, AUTH_METHOD.GITHUB],
    ownedDocumentCount: 4,
    sharedDocumentCount: 2,
    createdAt: '2026-03-25T10:00:00.000Z',
    createdBy: null,
    lastLoginAt: '2026-03-25T12:00:00.000Z',
  }]),
  updateSystemAdminUserStatus: vi.fn(async () => ({
    id: 'user-1',
    status: 'DISABLED',
    isSystemAdmin: true,
  })),
  getSystemAuthGovernance: vi.fn(async () => ({
    allowPasswordRegistration: true,
    allowGithubRegistration: true,
    allowLinuxDoRegistration: false,
    emailServiceEnabled: true,
    systemAdminEmail: 'alice@example.com',
    systemAdminDisplayName: 'Alice',
    systemAdminMustChangePassword: false,
    systemAdminLastLoginAt: '2026-03-25T12:00:00.000Z',
    systemAdminPasswordUpdatedAt: '2026-03-25T12:10:00.000Z',
  })),
  getSystemAiConfig: vi.fn(async () => ({
    id: 'config-1',
    enabled: true,
    provider: 'hw7mrx-compatible',
    baseUrl: 'https://api.hw7mrx.com/v1',
    defaultModel: 'gpt-4.1-mini',
    hasApiKey: true,
    maskedApiKey: '••••••••1234',
    updatedAt: '2026-03-25T12:00:00.000Z',
    updatedBy: null,
  })),
  updateSystemAiConfig: vi.fn(async () => ({
    id: 'config-1',
    enabled: true,
    provider: 'hw7mrx-compatible',
    baseUrl: 'https://api.hw7mrx.com/v1',
    defaultModel: 'gpt-4.1-mini',
    hasApiKey: true,
    maskedApiKey: '••••••••1234',
    updatedAt: '2026-03-25T12:00:00.000Z',
    updatedBy: null,
  })),
  getSystemAdminAuditLogs: vi.fn(async () => []),
  getGovernanceSummary: vi.fn(async () => ({
    totalDocuments: 36,
    sharedDocuments: 8,
    lockedDocuments: 1,
    lockedStatus: 'LOCKED',
    note: '系统管理员默认不查看正文。',
  })),
}))

describe('admin console', () => {
  it('renders the admin overview route', async () => {
    seedAuthState({ roles: ['system_admin'], permissions: ['system_admin:overview:read'] })

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
    seedAuthState({ roles: ['system_admin'], permissions: ['system_admin:overview:read'] })

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
    expect(wrapper.text()).toContain('邮箱密码注册')
    expect(wrapper.text()).toContain('系统管理员')
  })

  it('redirects unauthenticated admin access to login', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/users')
  })

  it('redirects authenticated non-admin users away from admin routes', async () => {
    seedAuthState({ id: 'user-2', email: 'bob@example.com', displayName: 'Bob', authMethods: [AUTH_METHOD.GITHUB] })

    const router = createAppRouter(createMemoryHistory())
    loadAdminRoutes(router)

    await router.push('/admin/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
