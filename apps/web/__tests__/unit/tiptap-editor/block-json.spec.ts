import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createBodyExtensions, createTitleExtensions } from '@/components/tiptap-editor/helpers/createExtensions'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

interface TiptapEditorExposed {
  editor: Editor | null
}

const initialContent = [
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '旧内容' }],
  },
] satisfies JSONContent[]

const nextContent = [
  {
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: '新标题' }],
  },
] satisfies JSONContent[]

const titleEditorInvalidContent = [
  {
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: '不应进入标题编辑器' }],
  },
] satisfies JSONContent[]

const invalidContent = [
  {
    type: 'unknown-block',
  },
] satisfies JSONContent[]

describe('tiptapEditor', () => {
  it('清空正文后对外仍发出空 content 数组', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: nextContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed
    editor?.commands.clearContent()
    await nextTick()

    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([])
  })

  it('在内容更新后发出 content 数组', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed
    editor?.commands.setContent(nextContent)

    await nextTick()

    const emittedContent = wrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined

    expect(emittedContent).not.toBeTypeOf('string')
    expect(emittedContent?.[0]).toMatchObject({
      type: 'heading',
      attrs: expect.objectContaining({
        level: 2,
        id: expect.any(String),
      }),
      content: [{ type: 'text', text: '新标题' }],
    })
  })

  it('在传入非法内容时发出 contentError', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: invalidContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.emitted('contentError')?.length).toBe(1)
    })

    const emittedError = wrapper.emitted('contentError')?.[0]?.[0]

    expect(emittedError).toBeInstanceOf(Error)
  })

  it('在标题编辑器配置中拦截正文节点', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: titleEditorInvalidContent,
        extensions: createTitleExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.emitted('contentError')?.length).toBe(1)
    })

    expect(wrapper.emitted('update:content')).toBeFalsy()
  })

  it('正文编辑器支持 orderedList 与 divider 命令并输出结构化 block', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed

    const orderedListHandled = editor?.chain().focus().toggleOrderedList().run()
    const dividerHandled = editor?.chain().focus('end').setHorizontalRule().run()

    await nextTick()

    expect(orderedListHandled).toBe(true)
    expect(dividerHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'orderedList',
        attrs: {
          id: expect.any(String),
          start: 1,
          type: null,
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
                content: [{ type: 'text', text: '旧内容' }],
              },
            ],
          },
        ],
      },
      {
        type: 'horizontalRule',
        attrs: {
          id: expect.any(String),
        },
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })

  it('正文编辑器支持 underline、link、highlight marks 并保留结构化 attrs', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed

    const underlineHandled = editor?.chain().focus().selectAll().toggleUnderline().run()
    const linkHandled = editor?.chain().focus().selectAll().setLink({ href: 'https://samepage.dev' }).run()
    const highlightHandled = editor?.chain().focus().selectAll().setHighlight({ color: '#fbf3db' }).run()

    await nextTick()

    expect(underlineHandled).toBe(true)
    expect(linkHandled).toBe(true)
    expect(highlightHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
        content: [
          {
            type: 'text',
            text: '旧内容',
            marks: expect.arrayContaining([
              { type: 'underline' },
              {
                type: 'link',
                attrs: expect.objectContaining({
                  href: 'https://samepage.dev',
                }),
              },
              {
                type: 'highlight',
                attrs: expect.objectContaining({
                  color: '#fbf3db',
                }),
              },
            ]),
          },
        ],
      },
    ])
  })

  it('正文编辑器支持 image 节点保留 assetId，并允许运行时 src 存在于编辑态', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        extensions: createBodyExtensions(),
      },
    })

    await vi.waitFor(() => {
      expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
    })

    const { editor } = wrapper.vm as unknown as TiptapEditorExposed
    editor?.commands.setContent([
      {
        type: 'image',
        attrs: {
          assetId: 'asset_1',
          alt: '封面图',
          src: '/runtime/1',
        },
      },
    ])

    await nextTick()

    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'image',
        attrs: expect.objectContaining({
          id: expect.any(String),
          assetId: 'asset_1',
          alt: '封面图',
          src: '/runtime/1',
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
