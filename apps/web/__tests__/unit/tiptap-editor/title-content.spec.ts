import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { describe, expect, it } from 'vitest'
import { fromTitleEditorContent, toTitleEditorContent } from '@/components/tiptap-editor/core/utils'

describe('titleContent', () => {
  it('在轻量标题内容和 Tiptap 标题内容之间转换', () => {
    const titleContent = createDocumentTitleContent('第一行\n第二行')

    expect(titleContent).toEqual([
      {
        type: 'text',
        text: '第一行 第二行',
      },
    ])

    expect(toTitleEditorContent(titleContent)).toEqual([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '第一行 第二行',
          },
        ],
      },
    ])

    expect(fromTitleEditorContent([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '标题内容' }],
      },
    ])).toEqual(createDocumentTitleContent('标题内容'))
  })
})
