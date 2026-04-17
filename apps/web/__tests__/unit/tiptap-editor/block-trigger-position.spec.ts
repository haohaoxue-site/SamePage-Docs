import type { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { resolveBlockTriggerAnchorRect } from '@/components/tiptap-editor/overlays/block-trigger/blockTriggerPosition'

function createEditorStub(options: {
  cursorTop?: number
  cursorBottom?: number
  blockLeft?: number
  selectionDepth?: number
  currentBlockNode?: {
    type: { name: string }
    attrs?: Record<string, unknown>
    textContent?: string
    nodeSize: number
  }
  currentBlockParent?: {
    type: { name: string }
  }
} = {}) {
  const paragraphNode = options.currentBlockNode ?? {
    type: {
      name: 'paragraph',
    },
    attrs: {
      id: 'block_paragraph',
    },
    textContent: '当前段落',
    nodeSize: 6,
  }
  const parentNode = options.currentBlockParent ?? {
    type: {
      name: 'doc',
    },
  }
  const docNode = {
    type: {
      name: 'doc',
    },
  }
  const cursorTop = options.cursorTop ?? 120
  const cursorBottom = options.cursorBottom ?? 144
  const blockLeft = options.blockLeft ?? 320
  const selectionDepth = options.selectionDepth ?? 1
  const root = document.createElement('div')
  const block = document.createElement('div')

  block.dataset.blockId = typeof paragraphNode.attrs?.id === 'string' ? paragraphNode.attrs.id : 'block_current'

  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
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
  vi.spyOn(block, 'getBoundingClientRect').mockReturnValue({
    bottom: 164,
    height: 44,
    left: blockLeft,
    right: blockLeft + 420,
    top: 120,
    width: 420,
    x: blockLeft,
    y: 120,
    toJSON: () => ({}),
  })

  return {
    state: {
      selection: {
        from: 4,
        to: 4,
        $from: {
          depth: selectionDepth,
          parent: selectionDepth === 1 ? paragraphNode : parentNode,
          node: (depth: number) => {
            if (depth === selectionDepth) {
              return paragraphNode
            }

            if (depth === selectionDepth - 1) {
              return parentNode
            }

            return docNode
          },
          index: () => 0,
          before: () => 1,
          after: () => paragraphNode.nodeSize + 1,
        },
      },
    },
    view: {
      dom: root,
      coordsAtPos: vi.fn(() => ({
        top: cursorTop,
        bottom: cursorBottom,
        left: blockLeft + 24,
        right: blockLeft + 24,
      })),
      nodeDOM: vi.fn(() => block),
    },
  } as unknown as Editor
}

describe('blockTriggerPosition', () => {
  it('使用当前光标所在行的纵向位置，并锚定到当前块左侧生成锚点', () => {
    const editor = createEditorStub({
      blockLeft: 336,
      selectionDepth: 2,
      currentBlockNode: {
        type: {
          name: 'listItem',
        },
        attrs: {
          id: 'block_list_item',
        },
        textContent: '二级列表 1',
        nodeSize: 10,
      },
      currentBlockParent: {
        type: {
          name: 'bulletList',
        },
      },
    })

    const rect = resolveBlockTriggerAnchorRect(editor)

    expect(rect).toMatchObject({
      top: 120,
      bottom: 144,
      left: 336,
      right: 336,
      width: 0,
      height: 24,
    })
  })
})
