import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, shallowRef } from 'vue'
import SessionUserMenu from '@/layouts/components/SessionUserMenu.vue'
import { useUserStore } from '@/stores/user'
import { useWorkspaceStore } from '@/stores/workspace'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

const authSessionMocks = vi.hoisted(() => ({
  logout: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/docs',
  }),
  useRouter: () => ({
    push: routerMocks.push,
  }),
}))

vi.mock('@/layouts/composables/useAuthSession', () => ({
  useAuthSession: () => ({
    currentUser: shallowRef({
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
    }),
    isLoggingOut: shallowRef(false),
    logout: authSessionMocks.logout,
  }),
}))

const ElButtonStub = defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  template: `
    <button
      class="el-button-stub"
      :disabled="disabled"
      @click="$emit('click', $event)"
    >
      <slot />
    </button>
  `,
})

const ElPopoverStub = defineComponent({
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  template: `
    <div class="el-popover-stub">
      <div class="el-popover-stub__reference">
        <slot name="reference" />
      </div>
      <div class="el-popover-stub__content">
        <slot />
      </div>
    </div>
  `,
})

const TeamSettingsDialogStub = defineComponent({
  name: 'TeamSettingsDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    workspace: {
      type: Object,
      default: null,
    },
  },
  template: `
    <div
      class="team-settings-dialog-stub"
      :data-visible="String(modelValue)"
      :data-workspace-id="workspace?.id ?? ''"
    />
  `,
})

function seedUserStore() {
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

function seedWorkspaceStore(workspaceType: 'PERSONAL' | 'TEAM') {
  const workspaceStore = useWorkspaceStore()

  workspaceStore.setPersonalWorkspace({
    id: 'workspace_personal_1',
    type: 'PERSONAL',
    name: 'Personal SP-SELF234',
    description: null,
    iconUrl: null,
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt: '2026-04-21T00:00:00.000Z',
  })
  workspaceStore.setTeamWorkspaces([
    {
      id: 'workspace_team_1',
      type: 'TEAM',
      name: '产品团队',
      description: '协作空间',
      iconUrl: null,
      slug: 'product-team',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: '2026-04-21T00:00:00.000Z',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    },
  ])

  if (workspaceType === 'TEAM') {
    workspaceStore.selectWorkspace('workspace_team_1')
    return
  }

  workspaceStore.selectPersonalWorkspace()
}

function mountSessionUserMenu() {
  return mount(SessionUserMenu, {
    global: {
      stubs: {
        ElButton: ElButtonStub,
        ElPopover: ElPopoverStub,
        EntityAvatar: defineComponent({
          template: '<div class="entity-avatar-stub"><slot /></div>',
        }),
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
        WorkspaceCreateDialog: defineComponent({
          template: '<div class="workspace-create-dialog-stub" />',
        }),
        TeamSettingsDialog: TeamSettingsDialogStub,
      },
    },
  })
}

describe('sessionUserMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerMocks.push.mockReset()
    authSessionMocks.logout.mockReset()
    seedUserStore()
  })

  it('个人空间下不显示团队设置入口', () => {
    seedWorkspaceStore('PERSONAL')

    const wrapper = mountSessionUserMenu()

    expect(wrapper.text()).not.toContain('团队设置')
  })

  it('团队空间下显示团队设置入口并传入当前团队', async () => {
    seedWorkspaceStore('TEAM')

    const wrapper = mountSessionUserMenu()
    const teamSettingsButton = wrapper.findAll('button')
      .find(button => button.text().includes('团队设置'))

    expect(teamSettingsButton).toBeDefined()

    await teamSettingsButton!.trigger('click')

    const dialog = wrapper.findComponent(TeamSettingsDialogStub)

    expect(dialog.exists()).toBe(true)
    expect(dialog.props('workspace')).toMatchObject({
      id: 'workspace_team_1',
      name: '产品团队',
      type: 'TEAM',
    })
    expect(dialog.props('modelValue')).toBe(true)
  })
})
