import type { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useLinkPanel } from '@/components/tiptap-editor/overlays/shared/useLinkPanel'

interface BlockSelectionState {
  before: number
  after: number
  from: number
  to: number
  textContent: string
}

interface LinkPanelEditorStub extends Editor {
  insertContentAt: ReturnType<typeof vi.fn>
  selectionChain: {
    focus: ReturnType<typeof vi.fn>
    setTextSelection: ReturnType<typeof vi.fn>
    extendMarkRange: ReturnType<typeof vi.fn>
    run: ReturnType<typeof vi.fn>
    unsetLink: ReturnType<typeof vi.fn>
  }
  setCurrentBlock: (state: BlockSelectionState) => void
}

const LinkPanelHarness = defineComponent({
  props: {
    editor: {
      type: Object,
      required: true,
    },
  },
  setup(props, { expose }) {
    const controller = useLinkPanel(() => props.editor as Editor)

    expose(controller)
    return () => null
  },
})

function getLinkPanelController(wrapper: ReturnType<typeof mount>) {
  return ((wrapper.vm as { $: { exposed?: unknown } }).$?.exposed
    ?? wrapper.vm) as ReturnType<typeof useLinkPanel>
}

function createEditorStub(): LinkPanelEditorStub {
  const selectionState: BlockSelectionState = {
    before: 0,
    after: 2,
    from: 1,
    to: 1,
    textContent: '',
  }
  const insertContentAt = vi.fn(() => ({
    run: vi.fn(() => true),
  }))
  const selectionChain = {
    focus: vi.fn(),
    setTextSelection: vi.fn(),
    extendMarkRange: vi.fn(),
    run: vi.fn(() => true),
    unsetLink: vi.fn(),
  }
  selectionChain.focus.mockReturnValue(selectionChain)
  selectionChain.setTextSelection.mockReturnValue(selectionChain)
  selectionChain.extendMarkRange.mockReturnValue(selectionChain)
  selectionChain.unsetLink.mockReturnValue(selectionChain)
  const paragraphNode = {
    type: {
      name: 'paragraph',
    },
    attrs: {},
    get textContent() {
      return selectionState.textContent
    },
    get nodeSize() {
      return Math.max(2, selectionState.after - selectionState.before)
    },
  }
  const docNode = {
    type: {
      name: 'doc',
    },
  }

  return {
    state: {
      selection: {
        empty: true,
        get from() {
          return selectionState.from
        },
        get to() {
          return selectionState.to
        },
        $from: {
          depth: 1,
          parent: paragraphNode,
          node: (depth: number) => depth === 1 ? paragraphNode : docNode,
          index: () => 0,
          before: () => selectionState.before,
          after: () => selectionState.after,
          start: () => selectionState.from,
          end: () => selectionState.to,
        },
      },
    },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        insertContentAt,
        setTextSelection: selectionChain.setTextSelection,
        extendMarkRange: selectionChain.extendMarkRange,
        run: selectionChain.run,
        unsetLink: selectionChain.unsetLink,
      })),
    })),
    insertContentAt,
    getAttributes: vi.fn(() => ({})),
    isActive: vi.fn(() => false),
    selectionChain,
    setCurrentBlock(nextState: BlockSelectionState) {
      Object.assign(selectionState, nextState)
    },
  } as unknown as LinkPanelEditorStub
}

describe('linkPanel', () => {
  it('empty-block 模式会固定打开面板时的块范围，不受后续 selection 漂移影响', () => {
    const editor = createEditorStub()
    const wrapper = mount(LinkPanelHarness, {
      props: {
        editor,
      },
    })
    const controller = getLinkPanelController(wrapper)

    controller.openEmptyBlock()
    controller.updateLinkText('SamePage')
    controller.updateLinkUrl('https://samepage.local')

    editor.setCurrentBlock({
      before: 20,
      after: 28,
      from: 21,
      to: 21,
      textContent: '',
    })

    controller.apply()

    expect(editor.insertContentAt).toHaveBeenCalledWith(
      {
        from: 0,
        to: 2,
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'SamePage',
            marks: [
              {
                type: 'link',
                attrs: {
                  href: 'https://samepage.local',
                },
              },
            ],
          },
        ],
      },
    )
  })

  it('dismiss 只清理本地状态，不回写旧选区', () => {
    const editor = createEditorStub()
    const wrapper = mount(LinkPanelHarness, {
      props: {
        editor,
      },
    })
    const controller = getLinkPanelController(wrapper)

    controller.openSelection()
    controller.dismiss()

    expect(controller.isOpen.value).toBe(false)
    expect(editor.selectionChain.setTextSelection).not.toHaveBeenCalled()
    expect(editor.selectionChain.extendMarkRange).not.toHaveBeenCalled()
    expect(editor.selectionChain.run).not.toHaveBeenCalled()
  })
})
