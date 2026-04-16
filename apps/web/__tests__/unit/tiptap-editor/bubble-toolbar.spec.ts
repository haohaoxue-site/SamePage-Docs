import type { Editor } from '@tiptap/core'
import type { TiptapEditorUploadedImage } from '@/components/tiptap-editor/typing'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import BubbleToolbar from '@/components/tiptap-editor/bubble-menu/BubbleToolbar.vue'

const BubbleMenuStub = defineComponent({
  template: `
    <div class="bubble-menu-stub">
      <slot />
    </div>
  `,
})

function createEditorStub() {
  const chainApi = {
    focus: vi.fn(() => chainApi),
    insertContent: vi.fn(() => chainApi),
    toggleBold: vi.fn(() => chainApi),
    toggleItalic: vi.fn(() => chainApi),
    toggleUnderline: vi.fn(() => chainApi),
    toggleStrike: vi.fn(() => chainApi),
    toggleCode: vi.fn(() => chainApi),
    run: vi.fn(() => true),
  }

  const editor = {
    chain: vi.fn(() => chainApi),
    isActive: vi.fn(() => false),
  } as unknown as Editor

  return {
    editor,
    chainApi,
  }
}

describe('bubbleToolbar', () => {
  it('上传图片后插入带 assetId 的图片节点，并追加空 paragraph', async () => {
    const { editor, chainApi } = createEditorStub()
    const uploadImage = vi.fn(async (): Promise<TiptapEditorUploadedImage> => ({
      id: 'asset_1',
      documentId: 'doc_1',
      kind: 'image',
      status: 'ready',
      mimeType: 'image/png',
      size: 1024,
      fileName: 'cover.png',
      width: 640,
      height: 480,
      contentUrl: '/api/documents/doc_1/assets/asset_1/content?token=token',
      createdAt: '2026-04-15T00:00:00.000Z',
    }))
    const wrapper = mount(BubbleToolbar, {
      props: {
        editor,
        uploadImage,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
          ColorPickerDropdown: true,
          SvgIcon: true,
          TurnIntoDropdown: true,
        },
      },
    })

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['fake-image'], 'cover.png', {
      type: 'image/png',
    })

    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file],
    })

    await fileInput.trigger('change')

    expect(uploadImage).toHaveBeenCalledWith(file)
    expect(chainApi.focus).toHaveBeenCalled()
    expect(chainApi.insertContent).toHaveBeenCalledWith([
      {
        type: 'image',
        attrs: {
          assetId: 'asset_1',
          alt: 'cover.png',
          src: '/api/documents/doc_1/assets/asset_1/content?token=token',
          width: 640,
          height: 480,
        },
      },
      {
        type: 'paragraph',
      },
    ])
    expect(chainApi.run).toHaveBeenCalled()
  })
})
