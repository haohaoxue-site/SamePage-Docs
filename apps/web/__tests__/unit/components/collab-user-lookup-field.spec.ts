import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import CollabUserLookupField from '@/components/collab-identity/CollabUserLookupField.vue'
import { useUserStore } from '@/stores/user'

const userApiMocks = vi.hoisted(() => ({
  findUserByCode: vi.fn(),
}))

vi.mock('@/apis/user', () => ({
  findUserByCode: userApiMocks.findUserByCode,
}))

const ElInputStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['keydown', 'update:modelValue'],
  template: `
    <input
      class="collab-user-lookup-field__input"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
      @keydown="$emit('keydown', $event)"
    >
  `,
})

const ElButtonStub = defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <button class="collab-user-lookup-field__button" :disabled="disabled">
      <slot />
    </button>
  `,
})

function hydrateCurrentUser() {
  const userStore = useUserStore()

  userStore.setCurrentUser({
    id: 'user_self',
    email: 'self@example.com',
    displayName: '当前用户',
    avatarUrl: null,
    userCode: 'SP-SELF234',
    roles: [],
    permissions: [],
    authMethods: [],
    mustChangePassword: false,
    emailVerified: true,
  })
}

function mountLookupField(props: Record<string, unknown> = {}) {
  return mount(CollabUserLookupField, {
    props,
    global: {
      stubs: {
        ElButton: ElButtonStub,
        ElInput: ElInputStub,
        CollabIdentityItem: defineComponent({
          props: {
            identity: {
              type: Object,
              required: true,
            },
          },
          template: '<div class="collab-identity-item-stub">{{ identity.displayName }} · {{ identity.userCode }}</div>',
        }),
      },
    },
  })
}

describe('collabUserLookupField', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    hydrateCurrentUser()
    userApiMocks.findUserByCode.mockReset()
  })

  it('点击查找后会按完整 userCode 精确查询并抛出 resolved 事件', async () => {
    userApiMocks.findUserByCode.mockResolvedValue({
      id: 'user_target',
      email: 'member@example.com',
      displayName: '团队成员',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })

    const wrapper = mountLookupField()

    await wrapper.find('.collab-user-lookup-field__input').setValue('  sp-abc2345 ')
    await wrapper.find('.collab-user-lookup-field__button').trigger('click')

    expect(userApiMocks.findUserByCode).toHaveBeenCalledWith('SP-ABC2345')
    expect(wrapper.emitted('resolved')?.[0]).toEqual([{
      id: 'user_target',
      email: 'member@example.com',
      displayName: '团队成员',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    }])
    expect(wrapper.text()).toContain('团队成员 · SP-ABC2345')
  })

  it('命中自己时会展示调用方文案并抛出 cleared 事件', async () => {
    userApiMocks.findUserByCode.mockResolvedValue({
      id: 'user_self',
      email: 'self@example.com',
      displayName: '当前用户',
      avatarUrl: null,
      userCode: 'SP-SELF234',
    })

    const wrapper = mountLookupField({
      selfTargetMessage: '不能分享给自己',
    })

    await wrapper.find('.collab-user-lookup-field__input').setValue('SP-SELF234')
    await wrapper.find('.collab-user-lookup-field__button').trigger('click')

    expect(wrapper.text()).toContain('不能分享给自己')
    expect(wrapper.emitted('resolved')).toBeUndefined()
    expect(wrapper.emitted('cleared')).toHaveLength(1)
  })

  it('输入变更后会清空旧的匹配结果并通知父级', async () => {
    userApiMocks.findUserByCode.mockResolvedValue({
      id: 'user_target',
      email: 'member@example.com',
      displayName: '团队成员',
      avatarUrl: null,
      userCode: 'SP-ABC2345',
    })

    const wrapper = mountLookupField()

    await wrapper.find('.collab-user-lookup-field__input').setValue('SP-ABC2345')
    await wrapper.find('.collab-user-lookup-field__button').trigger('click')
    expect(wrapper.text()).toContain('团队成员 · SP-ABC2345')

    await wrapper.find('.collab-user-lookup-field__input').setValue('SP-XYZ2345')
    await nextTick()

    expect(wrapper.text()).not.toContain('团队成员 · SP-ABC2345')
    expect(wrapper.emitted('cleared')).toHaveLength(1)
  })
})
