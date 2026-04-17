import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import BubbleToolbar from '@/components/tiptap-editor/overlays/bubble-toolbar/BubbleToolbar.vue'
import { useBubbleToolbar } from '@/components/tiptap-editor/overlays/bubble-toolbar/useBubbleToolbar'

const { prompt } = vi.hoisted(() => ({
  prompt: vi.fn(),
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')

  return {
    ...actual,
    ElMessageBox: {
      prompt,
    },
    ElMessage: {
      error: vi.fn(),
    },
  }
})

interface EditorEventHandlerMap {
  blur: Set<() => void>
  focus: Set<() => void>
  selectionUpdate: Set<() => void>
  transaction: Set<() => void>
}

interface BubbleToolbarEditorStub extends Editor {
  emitEditorEvent: (event: keyof EditorEventHandlerMap) => void
  setSelection: (from: number, to: number) => void
}

const BubbleMenuStub = defineComponent({
  template: `
    <div class="bubble-menu-stub">
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

const BubbleToolbarHarness = defineComponent({
  props: {
    editor: {
      type: Object,
      required: true,
    },
  },
  setup(props, { expose }) {
    const controller = useBubbleToolbar(props.editor as Editor, {
      onRequestComment: vi.fn(),
    })

    expose(controller)
    return () => null
  },
})

function createEditorStub(options: {
  imageSelection?: boolean
  imageAlt?: string
  imageTextAlign?: 'left' | 'center' | 'right'
} = {}) {
  const handlers: EditorEventHandlerMap = {
    blur: new Set(),
    focus: new Set(),
    selectionUpdate: new Set(),
    transaction: new Set(),
  }
  const selectionState = {
    from: 5,
    to: options.imageSelection ? 6 : 9,
    node: options.imageSelection
      ? {
          type: {
            name: 'image',
          },
          attrs: {
            alt: options.imageAlt ?? '',
            textAlign: options.imageTextAlign ?? 'left',
          },
        }
      : undefined,
  }
  const chainApi = {
    focus: vi.fn(() => chainApi),
    setTextSelection: vi.fn(() => chainApi),
    extendMarkRange: vi.fn(() => chainApi),
    toggleBold: vi.fn(() => chainApi),
    toggleItalic: vi.fn(() => chainApi),
    toggleUnderline: vi.fn(() => chainApi),
    toggleStrike: vi.fn(() => chainApi),
    toggleCode: vi.fn(() => chainApi),
    indentBlock: vi.fn(() => chainApi),
    outdentBlock: vi.fn(() => chainApi),
    setTextAlign: vi.fn(() => chainApi),
    updateAttributes: vi.fn(() => chainApi),
    run: vi.fn(() => true),
  }

  const editor = {
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
    isActive: vi.fn((name?: string) => options.imageSelection ? name === 'image' : false),
    getAttributes: vi.fn((name?: string) => {
      if (name === 'image') {
        return {
          alt: options.imageAlt ?? '',
          textAlign: options.imageTextAlign ?? 'left',
        }
      }

      return {}
    }),
    on: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].add(handler)
    }),
    off: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].delete(handler)
    }),
    state: {
      selection: {
        get from() {
          return selectionState.from
        },
        get to() {
          return selectionState.to
        },
        get node() {
          return selectionState.node
        },
        $from: {
          parent: {
            attrs: {},
          },
        },
      },
    },
    emitEditorEvent(event: keyof EditorEventHandlerMap) {
      handlers[event].forEach(handler => handler())
    },
    setSelection(from: number, to: number) {
      selectionState.from = from
      selectionState.to = to
      selectionState.node = undefined
    },
  } as unknown as BubbleToolbarEditorStub

  return {
    editor,
    chainApi,
  }
}

describe('bubbleToolbar', () => {
  it('文本选区只展示文本态工具栏，并把缩进和对齐收口为 dropdown 入口', async () => {
    const { editor } = createEditorStub()
    const wrapper = mount(BubbleToolbar, {
      props: {
        editor,
      },
      global: {
        stubs: {
          AlignDropdown: true,
          BubbleMenu: BubbleMenuStub,
          ColorPickerDropdown: true,
          ElTooltip: ElTooltipStub,
          SvgIcon: true,
          TurnIntoDropdown: true,
        },
      },
    })

    expect(wrapper.findComponent({ name: 'AlignDropdown' }).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('文本')
    expect(wrapper.text()).not.toContain('缩进和对齐')
    expect(wrapper.text()).not.toContain('颜色')
    expect(wrapper.text()).not.toContain('编辑描述')
    expect(wrapper.find('[data-bubble-action="align-left"]').exists()).toBe(false)
  })

  it('图片选中时切换为图片专用工具栏', async () => {
    const { editor } = createEditorStub({
      imageSelection: true,
    })
    const wrapper = mount(BubbleToolbar, {
      props: {
        editor,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
          ElTooltip: ElTooltipStub,
          SvgIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('编辑描述')
    expect(wrapper.text()).toContain('左对齐')
    expect(wrapper.text()).toContain('居中对齐')
    expect(wrapper.text()).toContain('右对齐')
    expect(wrapper.text()).toContain('评论')
    expect(wrapper.text()).not.toContain('标记')
    expect(wrapper.text()).not.toContain('颜色')
    expect(wrapper.text()).not.toContain('缩进和对齐')
  })

  it('点击图片编辑描述会弹窗修改 image.alt 字段', async () => {
    prompt.mockResolvedValueOnce({
      value: '封面图',
    })

    const { editor, chainApi } = createEditorStub({
      imageSelection: true,
      imageAlt: '旧描述',
    })
    const wrapper = mount(BubbleToolbar, {
      props: {
        editor,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
          ElTooltip: ElTooltipStub,
          SvgIcon: true,
        },
      },
    })

    const editAltButton = wrapper.findAll('button')
      .find(button => button.text().includes('编辑描述'))

    expect(editAltButton?.exists()).toBe(true)

    await editAltButton?.trigger('click')
    await nextTick()

    expect(prompt).toHaveBeenCalledWith(
      '请输入图片描述，将写入图片 alt 字段。',
      '编辑描述',
      expect.objectContaining({
        inputValue: '旧描述',
      }),
    )
    expect(chainApi.focus).toHaveBeenCalled()
    expect(chainApi.updateAttributes).toHaveBeenCalledWith('image', {
      alt: '封面图',
    })
    expect(chainApi.run).toHaveBeenCalled()
  })

  it('评论按钮只上抛请求事件，不直接修改编辑器内容', async () => {
    const { editor, chainApi } = createEditorStub()
    const wrapper = mount(BubbleToolbar, {
      props: {
        editor,
      },
      global: {
        stubs: {
          AlignDropdown: true,
          BubbleMenu: BubbleMenuStub,
          ColorPickerDropdown: true,
          ElTooltip: ElTooltipStub,
          SvgIcon: true,
          TurnIntoDropdown: true,
        },
      },
    })

    const commentButton = wrapper.find('[data-bubble-action="comment"]')

    expect(commentButton.exists()).toBe(true)

    await commentButton.trigger('click')

    expect(wrapper.emitted('requestComment')).toEqual([
      [{ source: 'bubble-toolbar' }],
    ])
    expect(chainApi.focus).not.toHaveBeenCalled()
    expect(chainApi.run).not.toHaveBeenCalled()
  })

  it('光标落在已有链接内时仍然允许展示链接面板', () => {
    const { editor } = createEditorStub()
    const isActive = vi.fn((name?: string) => name === 'link')
    ;(editor as unknown as { isActive: typeof isActive }).isActive = isActive

    const wrapper = mount(BubbleToolbarHarness, {
      props: {
        editor,
      },
    })
    const controller = wrapper.vm as unknown as ReturnType<typeof useBubbleToolbar>

    controller.overlay.linkPanel.isOpen.value = true

    expect(controller.overlay.shouldShowLinkPanel({
      editor,
      from: 5,
      to: 5,
    })).toBe(true)
  })

  it('链接面板在选区失效后会同步关闭 controller 状态', async () => {
    const { editor } = createEditorStub()
    const wrapper = mount(BubbleToolbarHarness, {
      props: {
        editor,
      },
    })
    const controller = wrapper.vm as unknown as ReturnType<typeof useBubbleToolbar>

    controller.overlay.linkPanel.openSelection()

    expect(controller.overlay.linkPanel.isOpen.value).toBe(true)

    editor.setSelection(5, 5)
    editor.emitEditorEvent('selectionUpdate')
    await nextTick()

    expect(controller.overlay.linkPanel.isOpen.value).toBe(false)
  })
})
