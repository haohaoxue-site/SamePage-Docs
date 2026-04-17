import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import TurnIntoDropdown from '@/components/tiptap-editor/overlays/bubble-toolbar/TurnIntoDropdown.vue'

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
      <slot name="reference" />
      <slot />
    </div>
  `,
})

const ElTooltipStub = defineComponent({
  template: `
    <div class="el-tooltip-stub">
      <slot />
    </div>
  `,
})

function createEditorStub() {
  const run = vi.fn(() => true)
  const chainApi = {
    focus: vi.fn(() => chainApi),
    turnIntoBlock: vi.fn(() => chainApi),
    run,
  }

  const editor = {
    isActive: vi.fn(() => false),
    chain: vi.fn(() => chainApi),
  } as unknown as Editor

  return {
    editor,
    chainApi,
  }
}

describe('turnIntoDropdown', () => {
  it('按正文、标题、列表、引用顺序渲染转换菜单，并通过 turnIntoBlock 执行转换', async () => {
    const { editor, chainApi } = createEditorStub()
    const wrapper = mount(TurnIntoDropdown, {
      props: {
        editor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          ElTooltip: ElTooltipStub,
          SvgIcon: true,
        },
      },
    })

    const rootLabels = wrapper.findAll('.tiptap-turn-into-menu__label').map(item => item.text().trim())

    expect(rootLabels).toEqual([
      '正文',
      '一级标题',
      '二级标题',
      '三级标题',
      '无序列表',
      '有序列表',
      '任务列表',
      '引用',
    ])
    expect(wrapper.findAll('.tiptap-turn-into-menu__divider')).toHaveLength(2)
    expect(rootLabels).not.toContain('四级标题')
    expect(rootLabels).not.toContain('五级标题')
    expect(rootLabels).not.toContain('其他标题')
    expect(rootLabels).not.toContain('代码块')
    expect(rootLabels).not.toContain('分割线')

    const blockquoteItem = wrapper.findAll('.tiptap-turn-into-menu__item')
      .find(item => item.find('.tiptap-turn-into-menu__label').text().includes('引用'))

    expect(blockquoteItem?.exists()).toBe(true)

    await blockquoteItem?.trigger('click')

    expect(chainApi.focus).toHaveBeenCalled()
    expect(chainApi.turnIntoBlock).toHaveBeenCalledWith('blockquote')
    expect(chainApi.run).toHaveBeenCalled()
  })
})
