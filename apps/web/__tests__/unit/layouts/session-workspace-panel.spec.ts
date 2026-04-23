import { WORKSPACE_TYPE } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import SessionWorkspacePanel from '@/layouts/components/session-user-menu/SessionWorkspacePanel.vue'

function mountSessionWorkspacePanel() {
  return mount(SessionWorkspacePanel, {
    props: {
      currentUser: {
        displayName: '当前用户',
        email: 'self@example.com',
        avatarUrl: null,
      },
      currentWorkspaceId: 'workspace-team-1',
      isCreatingWorkspace: false,
      workspaces: [
        {
          id: 'workspace-personal-1',
          type: WORKSPACE_TYPE.PERSONAL,
          label: '我的空间',
          iconUrl: null,
        },
        {
          id: 'workspace-team-1',
          type: WORKSPACE_TYPE.TEAM,
          label: '产品团队',
          description: '协作空间',
          iconUrl: null,
        },
      ],
    },
    global: {
      stubs: {
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
        EntityAvatar: defineComponent({
          template: '<span class="entity-avatar-stub" />',
        }),
      },
    },
  })
}

describe('sessionWorkspacePanel', () => {
  it('使用列表项包裹真实按钮，并透传创建与切换事件', async () => {
    const wrapper = mountSessionWorkspacePanel()

    expect(wrapper.find('ul.session-workspace-list').exists()).toBe(true)
    expect(wrapper.findAll('li.session-workspace-option')).toHaveLength(2)
    expect(wrapper.findAll('.session-workspace-option__button')).toHaveLength(2)
    expect(wrapper.find('.session-workspace-option.is-active').text()).toContain('产品团队')

    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('create')).toEqual([[]])
    expect(wrapper.emitted('select')).toEqual([
      ['workspace-personal-1'],
      ['workspace-team-1'],
    ])
  })
})
