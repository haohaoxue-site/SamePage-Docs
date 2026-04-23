import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import SessionNotificationBell from '@/layouts/components/session-notification-bell/SessionNotificationBell.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const notificationApiMocks = vi.hoisted(() => ({
  getNotificationSummary: vi.fn(),
}))

const workspaceApiMocks = vi.hoisted(() => ({
  acceptWorkspaceInvite: vi.fn(),
  declineWorkspaceInvite: vi.fn(),
}))

vi.mock('@/apis/notification', () => ({
  getNotificationSummary: notificationApiMocks.getNotificationSummary,
}))

vi.mock('@/apis/workspace', async () => {
  const actual = await vi.importActual<typeof import('@/apis/workspace')>('@/apis/workspace')

  return {
    ...actual,
    acceptWorkspaceInvite: workspaceApiMocks.acceptWorkspaceInvite,
    declineWorkspaceInvite: workspaceApiMocks.declineWorkspaceInvite,
  }
})

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')

  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  }
})

const ElPopoverStub = defineComponent({
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
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

const ElBadgeStub = defineComponent({
  props: {
    value: {
      type: Number,
      default: 0,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="el-badge-stub" :data-value="value" :data-hidden="String(hidden)">
      <slot />
    </div>
  `,
})

const ElTagStub = defineComponent({
  template: '<span class="el-tag-stub"><slot /></span>',
})

function createNotificationSummary() {
  return {
    pendingTeamInviteCount: 1,
    pendingTeamInvites: [
      {
        id: 'invite_1',
        workspaceId: 'workspace_team_1',
        workspaceName: '产品团队',
        invitee: {
          id: 'user_self',
          email: 'self@example.com',
          displayName: '当前用户',
          avatarUrl: null,
          userCode: 'SP-SELF234',
        },
        status: 'PENDING' as const,
        createdAt: '2026-04-21T08:00:00.000Z',
        updatedAt: '2026-04-21T08:00:00.000Z',
      },
    ],
  }
}

function mountSessionNotificationBell() {
  return mount(SessionNotificationBell, {
    global: {
      stubs: {
        ElBadge: ElBadgeStub,
        ElButton: ElButtonStub,
        ElPopover: ElPopoverStub,
        ElTag: ElTagStub,
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
      },
    },
  })
}

describe('sessionNotificationBell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    notificationApiMocks.getNotificationSummary.mockReset()
    workspaceApiMocks.acceptWorkspaceInvite.mockReset()
    workspaceApiMocks.declineWorkspaceInvite.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('会加载并展示待处理团队邀请', async () => {
    notificationApiMocks.getNotificationSummary.mockResolvedValue(createNotificationSummary())

    const wrapper = mountSessionNotificationBell()

    await flushPromises()

    expect(notificationApiMocks.getNotificationSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('消息提醒')
    expect(wrapper.text()).toContain('邀请你加入 产品团队')
    expect(wrapper.find('.el-badge-stub').attributes('data-value')).toBe('1')
  })

  it('接受邀请后会刷新空间列表与提醒聚合', async () => {
    notificationApiMocks.getNotificationSummary
      .mockResolvedValueOnce(createNotificationSummary())
      .mockResolvedValueOnce({
        pendingTeamInviteCount: 0,
        pendingTeamInvites: [],
      })
    workspaceApiMocks.acceptWorkspaceInvite.mockResolvedValue({
      id: 'invite_1',
      workspaceId: 'workspace_team_1',
      workspaceName: '产品团队',
      invitee: {
        id: 'user_self',
        email: 'self@example.com',
        displayName: '当前用户',
        avatarUrl: null,
        userCode: 'SP-SELF234',
      },
      status: 'ACCEPTED' as const,
      createdAt: '2026-04-21T08:00:00.000Z',
      updatedAt: '2026-04-21T08:05:00.000Z',
    })

    const workspaceStore = useWorkspaceStore()
    const refreshVisibleWorkspaces = vi.fn().mockResolvedValue(undefined)

    workspaceStore.refreshVisibleWorkspaces = refreshVisibleWorkspaces

    const wrapper = mountSessionNotificationBell()

    await flushPromises()

    const acceptButton = wrapper.findAll('button')
      .find(button => button.text().includes('接受'))

    expect(acceptButton).toBeDefined()

    await acceptButton!.trigger('click')
    await flushPromises()

    expect(workspaceApiMocks.acceptWorkspaceInvite).toHaveBeenCalledWith('invite_1')
    expect(refreshVisibleWorkspaces).toHaveBeenCalledTimes(1)
    expect(notificationApiMocks.getNotificationSummary).toHaveBeenCalledTimes(2)
    expect(ElMessage.success).toHaveBeenCalledWith('已加入 产品团队')
  })
})
