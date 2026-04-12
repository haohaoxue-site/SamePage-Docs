import type { UserSettingsDto } from '@haohaoxue/samepage-domain'
import { mount } from '@vue/test-utils'
import UserAccountSection from '@/views/user/components/UserAccountSection.vue'

type UserAccount = UserSettingsDto['account']

function createAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    email: 'alice@example.com',
    hasPasswordAuth: true,
    emailVerified: true,
    github: {
      connected: true,
      username: 'alice',
    },
    linuxDo: {
      connected: false,
      username: null,
    },
    ...overrides,
  }
}

function mountSection(options: {
  account?: ReturnType<typeof createAccount>
  email?: string
  code?: string
  newPassword?: string
  confirmPassword?: string
} = {}) {
  return mount(UserAccountSection, {
    props: {
      account: options.account ?? createAccount(),
      emailBindingEnabled: true,
      isSendingCode: false,
      isBindingEmail: false,
      bindingProvider: null,
      disconnectingProvider: null,
      canDisconnectGithub: true,
      canDisconnectLinuxDo: true,
      email: options.email ?? '',
      code: options.code ?? '',
      newPassword: options.newPassword ?? '',
      confirmPassword: options.confirmPassword ?? '',
    },
    global: {
      stubs: {
        SvgIcon: true,
      },
    },
  })
}

function findButtonByText(wrapper: ReturnType<typeof mountSection>, text: string) {
  const button = wrapper.findAll('button').find(item => item.text().includes(text))

  if (!button) {
    throw new Error(`Button "${text}" not found`)
  }

  return button
}

describe('user account section', () => {
  it('disables email actions until email and code are ready', async () => {
    const wrapper = mountSection()

    expect(findButtonByText(wrapper, '发送验证码').attributes('disabled')).toBeDefined()
    expect(findButtonByText(wrapper, '更新邮箱').attributes('disabled')).toBeDefined()

    await wrapper.find('input[autocomplete="email"]').setValue('alice@example.com')

    expect(findButtonByText(wrapper, '发送验证码').attributes('disabled')).toBeUndefined()
    expect(findButtonByText(wrapper, '更新邮箱').attributes('disabled')).toBeDefined()

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('12345')

    expect(findButtonByText(wrapper, '更新邮箱').attributes('disabled')).toBeDefined()

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('123456')

    expect(findButtonByText(wrapper, '更新邮箱').attributes('disabled')).toBeUndefined()
  })

  it('requires password setup before enabling first email bind', async () => {
    const wrapper = mountSection({
      account: createAccount({
        email: null,
        hasPasswordAuth: false,
        emailVerified: false,
      }),
      email: 'alice@example.com',
      code: '123456',
    })

    expect(wrapper.text()).not.toContain('当前账号还没有邮箱密码登录方式，首次绑定邮箱时需要一并设置登录密码。')
    expect(findButtonByText(wrapper, '绑定邮箱并启用密码登录').attributes('disabled')).toBeDefined()

    await wrapper.find('input[autocomplete="new-password"]').setValue('password-123')

    expect(findButtonByText(wrapper, '绑定邮箱并启用密码登录').attributes('disabled')).toBeDefined()

    await wrapper.findAll('input[autocomplete="new-password"]')[1].setValue('password-123')

    expect(findButtonByText(wrapper, '绑定邮箱并启用密码登录').attributes('disabled')).toBeUndefined()
  })
})
