import { AUTH_CALLBACK_PATH } from '@haohaoxue/samepage-contracts'
import { flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMockTokenExchangeResponse, mountAt, seedAuthState } from '../utils/test-helpers'

const {
  changePasswordMock,
  confirmEmailVerificationMock,
  getAuthRegistrationOptionsMock,
  loginWithPasswordMock,
  registerWithPasswordMock,
  requestEmailVerificationMock,
} = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  confirmEmailVerificationMock: vi.fn(),
  getAuthRegistrationOptionsMock: vi.fn(),
  loginWithPasswordMock: vi.fn(),
  registerWithPasswordMock: vi.fn(),
  requestEmailVerificationMock: vi.fn(),
}))

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

vi.mock('@/apis/auth', () => ({
  buildOAuthStartUrl: vi.fn(() => '/api/auth/oauth/github/start'),
  getAuthRegistrationOptions: getAuthRegistrationOptionsMock,
  loginWithPassword: loginWithPasswordMock,
  requestEmailVerification: requestEmailVerificationMock,
  confirmEmailVerification: confirmEmailVerificationMock,
  registerWithPassword: registerWithPasswordMock,
  changePassword: changePasswordMock,
  exchangeAuthCode: vi.fn(),
  logoutAuthSession: vi.fn(async () => ({
    loggedOut: true,
  })),
  refreshAccessToken: vi.fn(),
}))

beforeEach(() => {
  getAuthRegistrationOptionsMock.mockResolvedValue({
    allowPasswordRegistration: true,
    allowGithubRegistration: true,
    allowLinuxDoRegistration: true,
  })
  loginWithPasswordMock.mockResolvedValue(createMockTokenExchangeResponse())
  requestEmailVerificationMock.mockResolvedValue({ requested: true })
  confirmEmailVerificationMock.mockResolvedValue({ email: 'alice@example.com' })
  registerWithPasswordMock.mockResolvedValue(createMockTokenExchangeResponse())
  changePasswordMock.mockResolvedValue(createMockTokenExchangeResponse())
})

afterAll(() => {
  consoleErrorSpy.mockRestore()
  consoleWarnSpy.mockRestore()
})

describe('auth pages', () => {
  it('renders simplified login entry without developer-facing copy', async () => {
    const { wrapper } = await mountAt('/login')
    const registerEntryCount = wrapper.text().match(/创建邮箱账号/g)?.length ?? 0

    expect(wrapper.text()).toContain('欢迎回来')
    expect(registerEntryCount).toBe(1)
    expect(wrapper.text()).not.toContain('开发环境请查看 API 控制台')
    expect(wrapper.text()).not.toContain('统一身份入口')
    expect(wrapper.text()).not.toContain('统一登录')
    expect(wrapper.text()).not.toContain('邮箱注册')
    expect(wrapper.text()).not.toContain('去注册')
    expect(wrapper.text()).not.toContain('AI Copilot')
  })

  it('prevents empty password login submission with Element Plus validation', async () => {
    const { wrapper } = await mountAt('/login')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(loginWithPasswordMock).not.toHaveBeenCalled()
  })

  it('renders register page as closed state when password registration is disabled', async () => {
    getAuthRegistrationOptionsMock.mockResolvedValueOnce({
      allowPasswordRegistration: false,
      allowGithubRegistration: true,
      allowLinuxDoRegistration: true,
    })

    const { wrapper } = await mountAt('/register')

    expect(wrapper.text()).toContain('当前未开放邮箱注册')
    expect(wrapper.text()).toContain('返回登录')
    expect(wrapper.text()).toContain('邮箱注册暂未开放')
    expect(wrapper.text()).not.toContain('发送验证链接')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('renders register page without onboarding copy', async () => {
    const { wrapper } = await mountAt('/register')

    expect(wrapper.text()).toContain('创建账号')
    expect(wrapper.text()).toContain('发送验证链接')
    expect(wrapper.text()).not.toContain('Onboarding')
    expect(wrapper.text()).not.toContain('统一身份')
    expect(wrapper.text()).not.toContain('工作区入口')
  })

  it('prevents invalid register email submission with Element Plus validation', async () => {
    const { wrapper } = await mountAt('/register')

    await wrapper.find('input[autocomplete="email"]').setValue('invalid-email')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(requestEmailVerificationMock).not.toHaveBeenCalled()
  })

  it('prevents mismatched register confirmation submission on verify page', async () => {
    const { wrapper } = await mountAt('/register/verify?token=register-token')

    await wrapper.find('input[autocomplete="nickname"]').setValue('Alice')
    await wrapper.find('input[placeholder="设置密码"]').setValue('password-123')
    await wrapper.find('input[placeholder="再次输入密码"]').setValue('password-456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(confirmEmailVerificationMock).toHaveBeenCalledWith({ token: 'register-token' })
    expect(registerWithPasswordMock).not.toHaveBeenCalled()
  })

  it('renders register verify page without developer-facing onboarding copy', async () => {
    const { wrapper } = await mountAt('/register/verify?token=register-token')

    expect(wrapper.text()).toContain('邮箱验证通过')
    expect(wrapper.text()).toContain('设置显示名称和密码后即可完成注册。')
    expect(wrapper.text()).not.toContain('工作区')
    expect(wrapper.text()).not.toContain('会话')
    expect(wrapper.text()).not.toContain('AI 能力体系')
  })

  it('prevents empty change-password submission with Element Plus validation', async () => {
    seedAuthState({ mustChangePassword: true })

    const { wrapper } = await mountAt('/auth/change-password')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('renders change-password page without technical status copy', async () => {
    seedAuthState({ mustChangePassword: true })

    const { wrapper } = await mountAt('/auth/change-password')

    expect(wrapper.text()).toContain('首次登录需要先设置新密码。')
    expect(wrapper.text()).toContain('当前正在使用临时密码，请先修改后继续。')
    expect(wrapper.text()).not.toContain('Security Check')
    expect(wrapper.text()).not.toContain('工作区')
    expect(wrapper.text()).not.toContain('启动期生成')
  })

  it('renders callback failure with user-facing copy when code is missing', async () => {
    const { wrapper } = await mountAt(AUTH_CALLBACK_PATH)

    expect(wrapper.text()).toContain('登录信息无效')
    expect(wrapper.text()).toContain('缺少登录凭证，请重新发起登录。')
    expect(wrapper.text()).toContain('返回登录')
    expect(wrapper.text()).not.toContain('Authentication')
    expect(wrapper.text()).not.toContain('身份交换')
  })
})
