import type { Editor, JSONContent } from '@tiptap/core'
import type { DocumentAsset } from '@/apis/document'
import { Slice } from '@tiptap/pm/model'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TiptapEditor from '@/components/tiptap-editor/core/TiptapEditor.vue'
import { createBodyExtensions } from '@/components/tiptap-editor/extensions/createExtensions'
import { waitForMountedEditor } from './testUtils'

const emptyParagraphContent = [{
  type: 'paragraph',
}] satisfies JSONContent[]

interface PastePayload {
  extraData?: Record<string, string>
  files?: File[]
  html?: string
  text?: string
}

afterEach(() => {
  vi.restoreAllMocks()
})

function getLatestContent(wrapper: ReturnType<typeof mount>) {
  return wrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined
}

async function triggerPaste(editor: Editor, payload: PastePayload) {
  editor.commands.selectAll()

  const clipboardData = {
    files: payload.files ?? [],
    getData: (type: string) => {
      if (payload.extraData?.[type]) {
        return payload.extraData[type]
      }

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
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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

  it('正文编辑器优先恢复站内结构化 clipboard 载荷，而不是退化为 HTML 或纯文本', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: emptyParagraphContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
    const handled = await triggerPaste(editor, {
      extraData: {
        'application/x-samepage-block+json': JSON.stringify([
          {
            type: 'heading',
            attrs: {
              id: 'block_samepaste01',
              level: 5,
            },
            content: [{ type: 'text', text: '结构化标题' }],
          },
          {
            type: 'paragraph',
            attrs: {
              id: 'block_samepaste01',
            },
            content: [{ type: 'text', text: '结构化正文' }],
          },
        ]),
      },
      html: '<p>HTML 回退</p>',
      text: '纯文本回退',
    })
    const latestContent = getLatestContent(wrapper)

    expect(handled).toBe(true)
    expect(latestContent).toEqual([
      {
        type: 'heading',
        attrs: {
          id: expect.any(String),
          level: 5,
        },
        content: [{ type: 'text', text: '结构化标题' }],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
        content: [{ type: 'text', text: '结构化正文' }],
      },
    ])
    expect(latestContent?.[0]?.attrs?.id).not.toBe('block_samepaste01')
    expect(latestContent?.[1]?.attrs?.id).not.toBe('block_samepaste01')
    expect(latestContent?.[0]?.attrs?.id).not.toBe(latestContent?.[1]?.attrs?.id)
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
        initialExtensions: createBodyExtensions({
          uploadImage,
        }),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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
        initialExtensions: createBodyExtensions({
          uploadFile,
        }),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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
