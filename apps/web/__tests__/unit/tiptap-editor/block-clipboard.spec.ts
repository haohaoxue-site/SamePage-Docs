import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  copyCurrentBlockToClipboard,
  cutCurrentBlockToClipboard,
  SAMEPAGE_BLOCK_CLIPBOARD_TYPE,
} from '@/components/tiptap-editor/content/blockClipboard'
import TiptapEditor from '@/components/tiptap-editor/core/TiptapEditor.vue'
import { createBodyExtensions } from '@/components/tiptap-editor/extensions/createExtensions'
import { waitForMountedEditor } from './testUtils'

const listContent = [
  {
    type: 'bulletList',
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '第一项' }],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '第二项' }],
          },
        ],
      },
    ],
  },
] satisfies JSONContent[]

function focusText(editor: Editor, text: string) {
  let selectionPosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || typeof node.text !== 'string') {
      return
    }

    const offset = node.text.indexOf(text)

    if (offset < 0) {
      return
    }

    selectionPosition = pos + offset + 1
  })

  expect(selectionPosition).not.toBeNull()
  editor.commands.setTextSelection(selectionPosition!)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('blockClipboard', () => {
  it('复制和剪切当前块时同时写入结构化载荷、HTML 和纯文本', async () => {
    const clipboardWrites: Array<Array<{ data: Record<string, Blob> }>> = []

    Object.defineProperty(globalThis, 'ClipboardItem', {
      configurable: true,
      value: class ClipboardItemMock {
        data: Record<string, Blob>

        constructor(data: Record<string, Blob>) {
          this.data = data
        }
      },
    })

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        write: vi.fn(async (items: Array<{ data: Record<string, Blob> }>) => {
          clipboardWrites.push(items)
        }),
      },
    })

    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

    focusText(editor, '第一项')
    const copied = await copyCurrentBlockToClipboard(editor)

    expect(copied).toBe(true)
    expect(clipboardWrites).toHaveLength(1)
    expect(Object.keys(clipboardWrites[0][0].data)).toEqual([
      SAMEPAGE_BLOCK_CLIPBOARD_TYPE,
      'text/html',
      'text/plain',
    ])
    expect(await clipboardWrites[0][0].data[SAMEPAGE_BLOCK_CLIPBOARD_TYPE].text()).toContain('第一项')
    expect(await clipboardWrites[0][0].data['text/html'].text()).toContain('第一项')
    expect(await clipboardWrites[0][0].data['text/plain'].text()).toBe('第一项')

    focusText(editor, '第二项')
    const cutHandled = await cutCurrentBlockToClipboard(editor)

    await nextTick()

    expect(cutHandled).toBe(true)
    expect(clipboardWrites).toHaveLength(2)
    expect(editor.getJSON().content).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
        },
        content: [
          {
            type: 'listItem',
            attrs: {
              id: expect.any(String),
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  id: expect.any(String),
                },
                content: [{ type: 'text', text: '第一项' }],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })
})
