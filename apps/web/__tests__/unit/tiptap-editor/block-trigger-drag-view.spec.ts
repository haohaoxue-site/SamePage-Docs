import type { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { setBlockDragViewLock } from '@/components/tiptap-editor/overlays/block-trigger/blockTriggerDragView'

function createEditorStub() {
  return {
    view: {
      dom: document.createElement('div'),
    },
  } as unknown as Editor
}

describe('blockTriggerDragView', () => {
  it('只在当前编辑器根节点和 body 上切换本地拖拽锁', () => {
    const editor = createEditorStub()
    const editorDom = editor.view.dom as HTMLElement

    setBlockDragViewLock(editor, true)

    expect(editorDom.getAttribute('data-tiptap-local-block-dragging')).toBe('true')
    expect(document.body.getAttribute('data-tiptap-local-block-dragging')).toBe('true')

    setBlockDragViewLock(editor, false)

    expect(editorDom.hasAttribute('data-tiptap-local-block-dragging')).toBe(false)
    expect(document.body.hasAttribute('data-tiptap-local-block-dragging')).toBe(false)
  })
})
