import type { JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import TiptapEditor from '@/components/tiptap-editor/core/TiptapEditor.vue'
import { createBodyExtensions } from '@/components/tiptap-editor/extensions/createExtensions'
import { waitForMountedEditor } from './testUtils'

describe('documentFile', () => {
  it('正文编辑器支持 file 节点并保留运行时资源 attrs', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: [] satisfies JSONContent[],
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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

    expect(wrapper.find('[data-type="document-file"]').exists()).toBe(true)
    expect(wrapper.find('[data-type="document-file"] [data-part="title"]').text()).toBe('spec.pdf')
    expect(wrapper.find('[data-type="document-file"] [data-part="meta"]').text()).toContain('application/pdf')
  })
})
