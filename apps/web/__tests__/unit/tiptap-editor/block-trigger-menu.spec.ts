import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import BlockTriggerMenu from '@/components/tiptap-editor/overlays/block-trigger/BlockTriggerMenu.vue'
import { useBlockTriggerMenu } from '@/components/tiptap-editor/overlays/block-trigger/useBlockTriggerMenu'

interface EditorEventHandlerMap {
  blur: Set<() => void>
  focus: Set<() => void>
  selectionUpdate: Set<() => void>
  transaction: Set<() => void>
}

interface EditorStub extends Editor {
  emitEditorEvent: (event: keyof EditorEventHandlerMap) => void
  isFocused: boolean
}

interface UnmountingEditorStub extends EditorStub {
  destroyView: () => void
}

const ElPopoverStub = defineComponent({
  name: 'ElPopover',
  setup(_, { slots }) {
    return () => h('div', { class: 'el-popover-stub' }, [
      slots.reference?.(),
      slots.default?.(),
    ])
  },
})

const BlockTriggerMenuHarness = defineComponent({
  props: {
    editor: {
      type: Object,
      required: true,
    },
  },
  setup(props, { expose }) {
    const controller = useBlockTriggerMenu({
      editor: props.editor as Editor,
      onRequestComment: vi.fn(),
    })

    expose(controller)
    return () => null
  },
})

function getBlockTriggerController(wrapper: ReturnType<typeof mount>) {
  return ((wrapper.vm as { $: { exposed?: unknown } }).$?.exposed
    ?? wrapper.vm) as ReturnType<typeof useBlockTriggerMenu>
}

function createEditorStub(textContent = '') {
  const paragraphNode = {
    type: {
      name: 'paragraph',
    },
    attrs: {},
    textContent,
    nodeSize: Math.max(2, textContent.length + 2),
  }
  const docNode = {
    type: {
      name: 'doc',
    },
  }
  const handlers: EditorEventHandlerMap = {
    blur: new Set(),
    focus: new Set(),
    selectionUpdate: new Set(),
    transaction: new Set(),
  }
  const dom = document.createElement('div')
  const blockDom = document.createElement('p')
  vi.spyOn(dom, 'getBoundingClientRect').mockReturnValue({
    bottom: 520,
    height: 400,
    left: 240,
    right: 880,
    top: 120,
    width: 640,
    x: 240,
    y: 120,
    toJSON: () => ({}),
  })

  return {
    isEditable: true,
    isFocused: false,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    state: {
      selection: {
        empty: true,
        $from: {
          depth: 1,
          parent: paragraphNode,
          node: (depth: number) => depth === 1 ? paragraphNode : docNode,
          index: () => 0,
          before: () => 0,
          after: () => paragraphNode.nodeSize,
          start: () => 1,
          end: () => Math.max(1, textContent.length + 1),
        },
      },
    },
    view: {
      dom,
      coordsAtPos: vi.fn(() => ({
        top: 120,
        bottom: 144,
        left: 320,
        right: 320,
      })),
      nodeDOM: vi.fn(() => blockDom),
    },
    can: vi.fn(() => ({
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          indentBlock: vi.fn(() => ({
            run: vi.fn(() => false),
          })),
          outdentBlock: vi.fn(() => ({
            run: vi.fn(() => false),
          })),
        })),
      })),
    })),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        turnIntoBlock: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        deleteBlock: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        setTextAlign: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        indentBlock: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        outdentBlock: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        insertContent: vi.fn(() => ({
          run: vi.fn(() => true),
        })),
        setTextSelection: vi.fn(() => ({
          unsetTextColorClass: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
          setTextColorClass: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
          unsetHighlightClass: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
          setHighlightClass: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
        })),
      })),
    })),
    on: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].add(handler)
    }),
    off: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].delete(handler)
    }),
    emitEditorEvent(event: keyof EditorEventHandlerMap) {
      handlers[event].forEach(handler => handler())
    },
  } as unknown as EditorStub
}

function createUnmountingEditorStub(textContent = '') {
  const baseEditor = createEditorStub(textContent)
  let isViewAvailable = true

  return Object.create(baseEditor, {
    view: {
      configurable: true,
      get() {
        if (!isViewAvailable) {
          throw new Error('[tiptap error]: The editor view is not available.')
        }

        return baseEditor.view
      },
    },
    destroyView: {
      value: () => {
        isViewAvailable = false
      },
    },
  }) as UnmountingEditorStub
}

describe('blockTriggerMenu', () => {
  it('块菜单按钮只在 hover / focus / 菜单展开时显现', async () => {
    const editor = createEditorStub('')
    const wrapper = mount(BlockTriggerMenu, {
      props: {
        editor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    const button = () => wrapper.get('.tiptap-block-trigger-btn')

    expect(button().classes()).not.toContain('is-peek-visible')

    editor.view.dom.dispatchEvent(new Event('mouseenter'))
    await nextTick()
    expect(button().classes()).toContain('is-peek-visible')

    editor.view.dom.dispatchEvent(new Event('mouseleave'))
    await nextTick()
    expect(button().classes()).not.toContain('is-peek-visible')

    await wrapper.get('.tiptap-block-trigger-anchor').trigger('mouseenter')
    expect(button().classes()).toContain('is-peek-visible')

    await wrapper.get('.tiptap-block-trigger-anchor').trigger('mouseleave')
    expect(button().classes()).not.toContain('is-peek-visible')

    editor.isFocused = true
    editor.emitEditorEvent('focus')
    await nextTick()
    expect(button().classes()).toContain('is-peek-visible')

    editor.isFocused = false
    editor.emitEditorEvent('blur')
    await nextTick()
    expect(button().classes()).not.toContain('is-peek-visible')

    expect((wrapper.vm as { openMenu: () => boolean }).openMenu()).toBe(true)
    await nextTick()
    expect(button().classes()).toContain('is-open')
    expect(button().classes()).toContain('is-peek-visible')
  })

  it('评论入口只上抛请求事件，不直接在编辑器层处理评论能力', async () => {
    const editor = createEditorStub('当前段落')
    const wrapper = mount(BlockTriggerMenu, {
      props: {
        editor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    expect((wrapper.vm as { openMenu: () => boolean }).openMenu()).toBe(true)
    await nextTick()

    const commentButton = wrapper.findAll('.tiptap-block-trigger-menu__list-item')
      .find(item => item.text().includes('评论'))

    expect(commentButton?.exists()).toBe(true)

    await commentButton!.trigger('click')

    expect(wrapper.emitted('requestComment')).toEqual([
      [{ source: 'block-menu' }],
    ])
  })

  it('块菜单关闭后会同步关闭链接面板状态', async () => {
    const editor = createEditorStub('当前段落')
    const wrapper = mount(BlockTriggerMenuHarness, {
      props: {
        editor,
      },
    })
    const controller = getBlockTriggerController(wrapper)

    expect(controller.openMenu()).toBe(true)
    controller.activePanel.value = 'link'
    controller.linkPanel.openEmptyBlock()
    await nextTick()

    expect(controller.linkPanel.isOpen.value).toBe(true)

    controller.closeMenu()
    await nextTick()

    expect(controller.linkPanel.isOpen.value).toBe(false)
  })

  it('空行显示 + 且不允许拖拽，非空块允许拖拽', async () => {
    const emptyEditor = createEditorStub('')
    const emptyWrapper = mount(BlockTriggerMenu, {
      props: {
        editor: emptyEditor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    expect((emptyWrapper.vm as { openMenu: () => boolean }).openMenu()).toBe(true)
    await nextTick()

    expect(emptyWrapper.get('.tiptap-block-trigger-btn').attributes('draggable')).toBe('false')
    expect(emptyWrapper.get('.tiptap-block-trigger-btn').text()).toContain('+')

    const contentEditor = createEditorStub('当前段落')
    const contentWrapper = mount(BlockTriggerMenu, {
      props: {
        editor: contentEditor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    expect((contentWrapper.vm as { openMenu: () => boolean }).openMenu()).toBe(true)
    await nextTick()

    expect(contentWrapper.get('.tiptap-block-trigger-btn').attributes('draggable')).toBe('true')
    expect(contentWrapper.get('.tiptap-block-trigger-btn').attributes('title')).toBe('正文')
  })

  it('切换文档卸载时 editor view 先销毁也不会报错', async () => {
    const editor = createUnmountingEditorStub('当前段落')
    const wrapper = mount(BlockTriggerMenu, {
      props: {
        editor,
      },
      global: {
        stubs: {
          ElPopover: ElPopoverStub,
          SvgIcon: defineComponent({
            template: '<span class="svg-icon-stub" />',
          }),
        },
      },
    })

    expect((wrapper.vm as { openMenu: () => boolean }).openMenu()).toBe(true)
    await nextTick()

    editor.destroyView()

    expect(() => wrapper.unmount()).not.toThrow()
  })
})
