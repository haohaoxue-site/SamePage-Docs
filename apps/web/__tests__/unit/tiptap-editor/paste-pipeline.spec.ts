import type { Editor, JSONContent } from '@tiptap/core'
import type { DocumentAsset } from '@/apis/document'
import type { TiptapEditorExposed } from '@/components/tiptap-editor/typing'
import { Slice } from '@tiptap/pm/model'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createBodyExtensions } from '@/components/tiptap-editor/helpers/createExtensions'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

const emptyParagraphContent = [{
  type: 'paragraph',
}] satisfies JSONContent[]

interface PastePayload {
  files?: File[]
  html?: string
  text?: string
}

afterEach(() => {
  vi.restoreAllMocks()
})

async function getEditor(wrapper: ReturnType<typeof mount>) {
  await vi.waitFor(() => {
    expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
  })

  return (wrapper.vm as unknown as TiptapEditorExposed).editor!
}

function getLatestContent(wrapper: ReturnType<typeof mount>) {
  return wrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined
}

async function triggerPaste(editor: Editor, payload: PastePayload) {
  editor.commands.selectAll()

  const clipboardData = {
    files: payload.files ?? [],
    getData: (type: string) => {
      if (type === 'text/html') {
        return payload.html ?? ''
      }

      if (type === 'text/plain') {
        return payload.text ?? ''
      }

      return ''
    },
  }

  const event = new Event('paste', {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent

  Object.defineProperty(event, 'clipboardData', {
    configurable: true,
    value: clipboardData,
  })

  const handled = Boolean(editor.view.someProp('handlePaste', handler =>
    handler(editor.view, event, Slice.empty)
      ? true
      : undefined))

  await nextTick()

  return handled
}

describe('pastePipeline', () => {
  it('正文编辑器将纯文本 paste 收口为结构化段落，并支持单次 undo 回滚', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: emptyParagraphContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    const handled = await triggerPaste(editor, {
      text: '第一行\n第二行',
    })

    expect(handled).toBe(true)
    expect(getLatestContent(wrapper)).toEqual([
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
        content: [{ type: 'text', text: '第一行' }],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
        content: [{ type: 'text', text: '第二行' }],
      },
    ])

    editor.commands.undo()
    await nextTick()

    expect(editor.getJSON().content).toEqual([
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })

  it('正文编辑器优先走 HTML paste，并保留结构化 block', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: emptyParagraphContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    const handled = await triggerPaste(editor, {
      html: '<h2>标题</h2><p><strong>正文</strong></p>',
      text: '标题\n正文',
    })

    expect(handled).toBe(true)
    expect(getLatestContent(wrapper)).toEqual([
      {
        type: 'heading',
        attrs: {
          id: expect.any(String),
          level: 2,
        },
        content: [{ type: 'text', text: '标题' }],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
        content: [
          {
            type: 'text',
            text: '正文',
            marks: [{ type: 'bold' }],
          },
        ],
      },
    ])
  })

  it('正文编辑器将文件 paste 收口为单次事务，插入新 block 并在 undo 后整体回滚', async () => {
    const uploadImage = vi.fn(async (): Promise<DocumentAsset> => ({
      id: 'asset_1',
      documentId: 'doc_1',
      kind: 'image',
      status: 'ready',
      mimeType: 'image/png',
      size: 1024,
      fileName: 'cover.png',
      width: null,
      height: null,
      contentUrl: '/api/documents/doc_1/assets/asset_1/content?token=token',
      createdAt: '2026-04-15T00:00:00.000Z',
    }))

    const wrapper = mount(TiptapEditor, {
      props: {
        content: emptyParagraphContent,
        extensions: createBodyExtensions({
          uploadImage,
        }),
      },
    })

    const editor = await getEditor(wrapper)
    const handled = await triggerPaste(editor, {
      files: [
        new File(['fake-image'], 'cover.png', {
          type: 'image/png',
        }),
      ],
    })

    expect(handled).toBe(true)
    await vi.waitFor(() => {
      expect(getLatestContent(wrapper)).toEqual([
        {
          type: 'image',
          attrs: expect.objectContaining({
            id: expect.any(String),
            assetId: 'asset_1',
            alt: 'cover.png',
            src: '/api/documents/doc_1/assets/asset_1/content?token=token',
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
    expect(uploadImage).toHaveBeenCalledTimes(1)

    editor.commands.undo()
    await nextTick()

    expect(editor.getJSON().content).toEqual([
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })

  it('正文编辑器会把非图片文件 paste 成 document file 节点，并在 undo 后整体回滚', async () => {
    const uploadFile = vi.fn(async (): Promise<DocumentAsset> => ({
      id: 'asset_file_1',
      documentId: 'doc_1',
      kind: 'file',
      status: 'ready',
      mimeType: 'application/pdf',
      size: 2048,
      fileName: 'spec.pdf',
      width: null,
      height: null,
      contentUrl: '/api/documents/doc_1/assets/asset_file_1/content?token=token',
      createdAt: '2026-04-15T00:00:00.000Z',
    }))

    const wrapper = mount(TiptapEditor, {
      props: {
        content: emptyParagraphContent,
        extensions: createBodyExtensions({
          uploadFile,
        }),
      },
    })

    const editor = await getEditor(wrapper)
    const handled = await triggerPaste(editor, {
      files: [
        new File(['fake-pdf'], 'spec.pdf', {
          type: 'application/pdf',
        }),
      ],
    })

    expect(handled).toBe(true)
    await vi.waitFor(() => {
      expect(getLatestContent(wrapper)).toEqual([
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
    expect(uploadFile).toHaveBeenCalledTimes(1)

    editor.commands.undo()
    await nextTick()

    expect(editor.getJSON().content).toEqual([
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })
})
