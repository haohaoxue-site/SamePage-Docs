import type { UserDeleteSectionProps } from '@/views/user/typing'
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import UserDeleteSection from '@/views/user/components/UserDeleteSection.vue'

const ElDialogStub = defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'closed'],
  template: `
    <div v-if="modelValue" class="el-dialog-stub">
      <slot />
      <slot name="footer" />
    </div>
  `,
})

function mountSection(overrides: Partial<UserDeleteSectionProps> = {}) {
  return mount(UserDeleteSection, {
    props: {
      isDeleting: false,
      confirmationTarget: 'alice@example.com',
      confirmationMode: 'email',
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      ...overrides,
    },
    global: {
      stubs: {
        ElDialog: ElDialogStub,
        transition: false,
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

function findInputByPlaceholder(wrapper: ReturnType<typeof mountSection>, placeholder: string) {
  const input = wrapper.find(`input[placeholder="${placeholder}"]`)

  if (!input.exists()) {
    throw new Error(`Input "${placeholder}" not found`)
  }

  return input
}

describe('user delete section', () => {
  it('requires both account confirmation and phrase before enabling deletion', async () => {
    const wrapper = mountSection()

    await findButtonByText(wrapper, '删除账号').trigger('click')
    await flushPromises()

    const submitButton = findButtonByText(wrapper, '永久删除')

    expect(submitButton.attributes('disabled')).toBeDefined()

    await findInputByPlaceholder(wrapper, '请输入当前邮箱').setValue('alice@example.com')
    await flushPromises()

    expect(submitButton.attributes('disabled')).toBeDefined()

    await findInputByPlaceholder(wrapper, `请输入“${ACCOUNT_DELETION_CONFIRMATION_PHRASE}”`).setValue(ACCOUNT_DELETION_CONFIRMATION_PHRASE)
    await flushPromises()

    expect(submitButton.attributes('disabled')).toBeUndefined()

    await submitButton.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('deleteAccount')).toEqual([
      [{
        accountConfirmation: 'alice@example.com',
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      }],
    ])
  })

  it('keeps the delete button enabled before confirmation starts', () => {
    const wrapper = mountSection()

    expect(findButtonByText(wrapper, '删除账号').attributes('disabled')).toBeUndefined()
  })
})
