import type { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { projectBlockDropTarget } from '@/components/tiptap-editor/overlays/block-trigger/blockTriggerDragProjector'

interface MockRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

function createSiblingBlockElement(blockId: string, rect: MockRect) {
  const element = document.createElement('div')

  element.dataset.blockId = blockId
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  })

  return element
}

function createEditorStub() {
  const listParent = {
    type: { name: 'bulletList' },
  }
  const otherParent = {
    type: { name: 'orderedList' },
  }
  const sourceNode = {
    type: { name: 'listItem' },
    attrs: { id: 'block_source' },
    textContent: '源块',
    nodeSize: 8,
  }
  const previousNode = {
    type: { name: 'listItem' },
    attrs: { id: 'block_previous' },
    textContent: '前一个块',
    nodeSize: 8,
  }
  const targetNode = {
    type: { name: 'listItem' },
    attrs: { id: 'block_target' },
    textContent: '目标块',
    nodeSize: 8,
  }
  const crossParentNode = {
    type: { name: 'listItem' },
    attrs: { id: 'block_cross_parent' },
    textContent: '其他父级',
    nodeSize: 8,
  }
  const root = document.createElement('div')
  const previousElement = createSiblingBlockElement('block_previous', {
    top: 120,
    bottom: 152,
    left: 280,
    right: 660,
    width: 380,
    height: 32,
  })
  const sourceElement = createSiblingBlockElement('block_source', {
    top: 176,
    bottom: 208,
    left: 280,
    right: 660,
    width: 380,
    height: 32,
  })
  const targetElement = createSiblingBlockElement('block_target', {
    top: 232,
    bottom: 264,
    left: 280,
    right: 660,
    width: 380,
    height: 32,
  })
  const crossParentElement = createSiblingBlockElement('block_cross_parent', {
    top: 288,
    bottom: 320,
    left: 320,
    right: 640,
    width: 320,
    height: 32,
  })

  root.append(previousElement, sourceElement, targetElement, crossParentElement)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    bottom: 400,
    left: 240,
    right: 720,
    width: 480,
    height: 300,
    x: 240,
    y: 100,
    toJSON: () => ({}),
  })

  return {
    state: {
      selection: {
        from: 4,
        $from: {
          depth: 2,
          node: (depth: number) => {
            if (depth === 2) {
              return sourceNode
            }

            if (depth === 1) {
              return listParent
            }

            return { type: { name: 'doc' } }
          },
          index: () => 0,
          before: () => 1,
          after: () => 9,
        },
      },
      doc: {
        descendants(callback: (node: unknown, pos: number, parent: unknown, index: number) => void) {
          callback(previousNode, 1, listParent, 0)
          callback(sourceNode, 9, listParent, 1)
          callback(targetNode, 17, listParent, 2)
          callback(crossParentNode, 25, otherParent, 0)
        },
      },
    },
    view: {
      dom: root,
    },
  } as unknown as Editor
}

describe('blockTriggerDragProjector', () => {
  it('同级拖拽辅助线落在块与块之间，不贴在目标块边缘', () => {
    const editor = createEditorStub()

    const dropTarget = projectBlockDropTarget(editor, 'block_source', 320, 240)

    expect(dropTarget).toMatchObject({
      blockId: 'block_target',
      placement: 'before',
      left: 280,
      width: 380,
      top: 220,
    })
  })
})
