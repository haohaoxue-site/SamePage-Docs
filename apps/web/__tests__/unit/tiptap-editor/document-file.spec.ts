import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createBodyExtensions } from '@/components/tiptap-editor/helpers/createExtensions'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

interface TiptapEditorExposed {
  editor: Editor | null
}

describe('documentFile', () => {
  it('正文编辑器支持 file 节点并保留运行时资源 attrs', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: [] satisfies JSONContent[],
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed
    editor?.commands.setContent([
      {
        type: 'file',
        attrs: {
          assetId: 'asset_file_1',
          fileName: 'spec.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          contentUrl: '/api/documents/doc_1/assets/asset_file_1/content?token=token',
        },
      },
    ])

    await nextTick()

    expect(wrapper.emitted('contentError')).toBeFalsy()
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'file',
        attrs: expect.objectContaining({
          id: expect.any(String),
          assetId: 'asset_file_1',
          fileName: 'spec.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          contentUrl: '/api/documents/doc_1/assets/asset_file_1/content?token=token',
        }),
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
