import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import TurnIntoDropdown from '@/components/tiptap-editor/bubble-menu/TurnIntoDropdown.vue'

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
  it('提供分割线入口并通过 turnIntoBlock 抽象触发转换命令', async () => {
    const { editor, chainApi } = createEditorStub()
    const wrapper = mount(TurnIntoDropdown, {
      props: {
        editor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: true,
        },
      },
    })

    const dividerItem = wrapper.findAll('.turn-into-menu__item')
      .find(item => item.text().includes('分割线'))

    expect(dividerItem?.exists()).toBe(true)

    await dividerItem?.trigger('click')

    expect(chainApi.focus).toHaveBeenCalled()
    expect(chainApi.turnIntoBlock).toHaveBeenCalledWith('divider')
    expect(chainApi.run).toHaveBeenCalled()
  })
})
