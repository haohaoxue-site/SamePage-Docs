import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import ChatSessionSidebar from '@/views/chat/components/ChatSessionSidebar.vue'

const composableMocks = vi.hoisted(() => ({
  confirmDelete: vi.fn(),
  getSessionItemStateClass: vi.fn((sessionId: string) => sessionId === 'session-1' ? 'active' : 'idle'),
}))

vi.mock('@/views/chat/composables/useChatSessionSidebar', () => ({
  useChatSessionSidebar: () => composableMocks,
}))

function mountChatSessionSidebar() {
  return mount(ChatSessionSidebar, {
    props: {
      activeSessionId: 'session-1',
      sessions: [
        {
          id: 'session-1',
          title: '第一轮讨论',
          createdAt: '2026-04-22T00:00:00.000Z',
          updatedAt: '2026-04-22T00:00:00.000Z',
        },
        {
          id: 'session-2',
          title: '第二轮讨论',
          createdAt: '2026-04-22T00:00:00.000Z',
          updatedAt: '2026-04-22T00:00:00.000Z',
        },
      ],
    },
    global: {
      stubs: {
        ElButton: defineComponent({
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        }),
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
      },
    },
  })
}

describe('chatSessionSidebar', () => {
  beforeEach(() => {
    composableMocks.confirmDelete.mockReset()
    composableMocks.getSessionItemStateClass.mockClear()
  })

  it('使用列表语义渲染会话项，并区分主操作与删除操作', async () => {
    const wrapper = mountChatSessionSidebar()

    expect(wrapper.find('ul.chat-session-sidebar__list').exists()).toBe(true)
    expect(wrapper.findAll('li.chat-session-sidebar__item')).toHaveLength(2)
    expect(wrapper.findAll('.chat-session-sidebar__item-main')).toHaveLength(2)

    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('create')).toEqual([[]])
    expect(wrapper.emitted('select')).toEqual([['session-1']])
    expect(composableMocks.confirmDelete).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-1',
      title: '第一轮讨论',
    }))
  })

  it('没有会话时显示空态而不是空列表', () => {
    const wrapper = mount(ChatSessionSidebar, {
      props: {
        activeSessionId: null,
        sessions: [],
      },
      global: {
        stubs: {
          ElButton: defineComponent({
            template: '<button><slot /></button>',
          }),
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    expect(wrapper.find('.chat-session-sidebar__empty').text()).toContain('暂无对话')
    expect(wrapper.find('ul.chat-session-sidebar__list').exists()).toBe(false)
  })
})
