import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import UserAccountSection from '@/views/user/components/UserAccountSection.vue'

const ElCardStub = defineComponent({
  template: '<section class="el-card-stub"><slot /></section>',
})

const ElFormStub = defineComponent({
  template: '<form class="el-form-stub"><slot /></form>',
})

const ElFormItemStub = defineComponent({
  template: '<label class="el-form-item-stub"><slot /></label>',
})

const ElInputStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
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
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
})

function mountUserAccountSection() {
  return mount(UserAccountSection, {
    props: {
      account: {
        email: null,
        userCode: 'SP-THIRD77',
        hasPasswordAuth: false,
        emailVerified: false,
        github: {
          connected: true,
          username: 'octocat',
        },
        linuxDo: {
          connected: false,
          username: null,
        },
      },
      emailBindingEnabled: false,
      isSendingCode: false,
      isBindingEmail: false,
      bindingProvider: null,
      disconnectingProvider: null,
      canDisconnectGithub: true,
      canDisconnectLinuxDo: true,
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
    global: {
      stubs: {
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElInput: ElInputStub,
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
        UserSettingsSectionHeader: defineComponent({
          props: {
            title: {
              type: String,
              required: true,
            },
            description: {
              type: String,
              required: true,
            },
          },
          template: '<header><h2>{{ title }}</h2><p>{{ description }}</p></header>',
        }),
      },
    },
  })
}

describe('userAccountSection', () => {
  it('仅绑定第三方登录时也会展示协作码卡片', () => {
    const wrapper = mountUserAccountSection()

    expect(wrapper.text()).toContain('协作码')
    expect(wrapper.text()).toContain('SP-THIRD77')
    expect(wrapper.text()).not.toContain('当前邮箱')
    expect(wrapper.text()).not.toContain('密码登录')
  })
})
