import { APPEARANCE_PREFERENCE, LANGUAGE_PREFERENCE } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, shallowRef } from 'vue'
import UserSettingsView from '@/views/user/index.vue'

const {
  bindEmailMock,
  canEditDisplayNameState,
  clearEmailValidationMock,
  connectOauthMock,
  deleteAccountMock,
  disconnectOauthMock,
  saveProfileMock,
  sendEmailCodeMock,
  shouldShowDeleteAccountSectionState,
  uploadAvatarMock,
} = vi.hoisted(() => ({
  bindEmailMock: vi.fn(),
  canEditDisplayNameState: {
    value: true,
  },
  clearEmailValidationMock: vi.fn(),
  connectOauthMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  disconnectOauthMock: vi.fn(),
  saveProfileMock: vi.fn(),
  sendEmailCodeMock: vi.fn(),
  shouldShowDeleteAccountSectionState: {
    value: true,
  },
  uploadAvatarMock: vi.fn(),
}))

vi.mock('@/views/user/composables/useUserSettingsView', () => ({
  useUserSettingsView: () => ({
    account: shallowRef({
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
    }),
    avatarUrl: shallowRef(null),
    bindingProvider: shallowRef(null),
    canEditDisplayName: shallowRef(canEditDisplayNameState.value),
    canDisconnectGithub: shallowRef(true),
    canDisconnectLinuxDo: shallowRef(true),
    deleteAccount: deleteAccountMock,
    deleteAccountConfirmationMode: shallowRef('email'),
    deleteAccountConfirmationPhrase: shallowRef('删除我的账号'),
    deleteAccountConfirmationTarget: shallowRef('alice@example.com'),
    disconnectingProvider: shallowRef(null),
    emailBindingEnabled: shallowRef(true),
    emailForm: {
      email: 'next@example.com',
      code: '123456',
      newPassword: '',
      confirmPassword: '',
    },
    errorMessage: shallowRef(''),
    isBindingEmail: shallowRef(false),
    isDeletingAccount: shallowRef(false),
    isLoading: shallowRef(false),
    isSavingDisplayName: shallowRef(false),
    isSavingLanguage: shallowRef(false),
    isSavingAppearance: shallowRef(false),
    isSendingEmailCode: shallowRef(false),
    isUploadingAvatar: shallowRef(false),
    languagePreference: shallowRef(LANGUAGE_PREFERENCE.AUTO),
    appearancePreference: shallowRef(APPEARANCE_PREFERENCE.AUTO),
    profileForm: {
      displayName: 'Alice',
    },
    saveDisplayName: saveProfileMock,
    sendEmailCode: sendEmailCodeMock,
    shouldShowDeleteAccountSection: shallowRef(shouldShowDeleteAccountSectionState.value),
    bindEmail: bindEmailMock,
    connectOauth: connectOauthMock,
    disconnectOauth: disconnectOauthMock,
    uploadAvatar: uploadAvatarMock,
  }),
}))

const UserAccountSectionStub = defineComponent({
  setup(_, { emit, expose }) {
    expose({
      clearEmailValidation: clearEmailValidationMock,
    })

    function handleConfirmEmail() {
      emit('confirmEmail')
    }

    return {
      handleConfirmEmail,
    }
  },
  template: `
    <button type="button" class="confirm-email-trigger" @click="handleConfirmEmail">
      confirm email
    </button>
  `,
})

const UserProfileSectionStub = defineComponent({
  props: {
    canEditDisplayName: {
      type: Boolean,
      required: true,
    },
  },
  template: '<div class="user-profile-section-stub">{{ canEditDisplayName ? "editable" : "readonly" }}</div>',
})

const UserDeleteSectionStub = defineComponent({
  template: '<div class="user-delete-section-stub" />',
})

function mountView() {
  return mount(UserSettingsView, {
    global: {
      stubs: {
        WorkspacePage: {
          template: `
            <div>
              <slot name="context" />
              <slot />
            </div>
          `,
        },
        UserProfileSection: UserProfileSectionStub,
        UserAccountSection: UserAccountSectionStub,
        UserDeleteSection: UserDeleteSectionStub,
        UserPreferenceSection: true,
      },
    },
  })
}

describe('user settings view', () => {
  beforeEach(() => {
    bindEmailMock.mockReset()
    canEditDisplayNameState.value = true
    clearEmailValidationMock.mockReset()
    connectOauthMock.mockReset()
    deleteAccountMock.mockReset()
    disconnectOauthMock.mockReset()
    saveProfileMock.mockReset()
    sendEmailCodeMock.mockReset()
    shouldShowDeleteAccountSectionState.value = true
    uploadAvatarMock.mockReset()
  })

  it('clears email validation after a successful bind', async () => {
    bindEmailMock.mockResolvedValue(true)

    const wrapper = mountView()

    await wrapper.find('.confirm-email-trigger').trigger('click')
    await flushPromises()

    expect(bindEmailMock).toHaveBeenCalledTimes(1)
    expect(clearEmailValidationMock).toHaveBeenCalledTimes(1)
  })

  it('does not clear email validation when bind fails', async () => {
    bindEmailMock.mockResolvedValue(false)

    const wrapper = mountView()

    await wrapper.find('.confirm-email-trigger').trigger('click')
    await flushPromises()

    expect(bindEmailMock).toHaveBeenCalledTimes(1)
    expect(clearEmailValidationMock).not.toHaveBeenCalled()
  })

  it('hides delete section when account deletion should not be available', async () => {
    shouldShowDeleteAccountSectionState.value = false

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.user-delete-section-stub').exists()).toBe(false)
  })

  it('passes readonly profile state for system administrators', async () => {
    canEditDisplayNameState.value = false

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.user-profile-section-stub').text()).toContain('readonly')
  })
})
