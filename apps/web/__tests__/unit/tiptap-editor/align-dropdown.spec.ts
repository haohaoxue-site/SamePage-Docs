import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import AlignDropdown from '@/components/tiptap-editor/overlays/bubble-toolbar/AlignDropdown.vue'

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
  const chainApi = {
    focus: vi.fn(() => chainApi),
    setTextAlign: vi.fn(() => chainApi),
    indentBlock: vi.fn(() => chainApi),
    outdentBlock: vi.fn(() => chainApi),
    run: vi.fn(() => true),
  }

  return {
    editor: {
      chain: vi.fn(() => chainApi),
      can: vi.fn(() => ({
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            indentBlock: vi.fn(() => ({
              run: vi.fn(() => true),
            })),
            outdentBlock: vi.fn(() => ({
              run: vi.fn(() => false),
            })),
          })),
        })),
      })),
      isActive: vi.fn(() => false),
      state: {
        selection: {
          $from: {
            parent: {
              type: {
                name: 'paragraph',
              },
              attrs: {},
              textContent: '正文内容',
            },
          },
        },
      },
    } as unknown as Editor,
    chainApi,
  }
}

describe('alignDropdown', () => {
  it('通过下拉面板执行对齐命令', async () => {
    const { editor, chainApi } = createEditorStub()
    const wrapper = mount(AlignDropdown, {
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

    const centerAlignItem = wrapper.findAll('.tiptap-align-menu__item')
      .find(item => item.text().includes('居中对齐'))

    expect(centerAlignItem?.exists()).toBe(true)

    await centerAlignItem?.trigger('click')

    expect(chainApi.focus).toHaveBeenCalled()
    expect(chainApi.setTextAlign).toHaveBeenCalledWith('center')
    expect(chainApi.run).toHaveBeenCalled()
  })
})
