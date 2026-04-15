import type { Editor } from '@tiptap/core'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { DocumentBodyEditor, DocumentTitleEditor } from '@/components/tiptap-editor'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

interface TiptapEditorExposed {
  editor: Editor | null
}

async function getEditor(component: ReturnType<typeof mount>) {
  await vi.waitFor(() => {
    expect((component.findComponent(TiptapEditor).vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
  })

  return (component.findComponent(TiptapEditor).vm as unknown as TiptapEditorExposed).editor!
}

async function applyTextInput(editor: Editor, text: string) {
  for (const char of text) {
    editor.commands.focus('end')
    const { from, to } = editor.state.selection
    const handled = Boolean(editor.view.someProp('handleTextInput', handler =>
      handler(
        editor.view,
        from,
        to,
        char,
        () => editor.state.tr.insertText(char, from, to),
      )
        ? true
        : undefined))

    if (!handled) {
      editor.chain().focus().insertContent(char).run()
    }
  }

  await nextTick()
}

async function triggerEnter(editor: Editor) {
  editor.commands.focus('end')

  const handled = Boolean(editor.view.someProp('handleKeyDown', handler =>
    handler(
      editor.view,
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    )
      ? true
      : undefined))

  await nextTick()

  return handled
}

describe('editorBoundary', () => {
  it('标题编辑器不应用正文 markdown input rule，正文编辑器保留 heading 输入规则', async () => {
    const titleWrapper = mount(DocumentTitleEditor, {
      props: {
        title: createDocumentTitleContent(''),
      },
    })
    const bodyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
        },
      },
    })

    const titleEditor = await getEditor(titleWrapper)
    const bodyEditor = await getEditor(bodyWrapper)

    await applyTextInput(titleEditor, '# ')
    await applyTextInput(bodyEditor, '# ')

    const titleJson = titleEditor.getJSON()
    const bodyJson = bodyEditor.getJSON()

    expect(titleJson.content?.[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: '# ' }],
    })

    expect(bodyJson.content?.[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 1 },
    })
    expect(bodyJson.content?.[1]).toMatchObject({
      type: 'paragraph',
    })
  })

  it('标题编辑器拦截 Enter，正文编辑器保留 plain Enter 的分段与清 marks 行为', async () => {
    const titleWrapper = mount(DocumentTitleEditor, {
      props: {
        title: createDocumentTitleContent('标题'),
      },
    })
    const bodyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
        },
      },
    })

    const titleEditor = await getEditor(titleWrapper)
    const bodyEditor = await getEditor(bodyWrapper)

    const titleEnterHandled = await triggerEnter(titleEditor)

    bodyEditor.chain().focus().toggleBold().insertContent('加粗').run()
    const bodyEnterHandled = await triggerEnter(bodyEditor)
    bodyEditor.chain().focus().insertContent('后续').run()
    await nextTick()

    expect(titleEnterHandled).toBe(true)
    expect(titleEditor.getJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '标题' }],
        },
      ],
    })

    expect(bodyEnterHandled).toBe(true)
    expect(bodyEditor.getJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '加粗',
              marks: [{ type: 'bold' }],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '后续' }],
        },
      ],
    })
  })

  it('正文标题尾部 Enter 后回落为 paragraph，而不是继续拆出 heading', async () => {
    const bodyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [{ type: 'text', text: '章节标题' }],
          },
        ],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
        },
      },
    })

    const bodyEditor = await getEditor(bodyWrapper)

    const bodyEnterHandled = await triggerEnter(bodyEditor)
    await nextTick()
    const bodyJson = bodyEditor.getJSON()

    expect(bodyEnterHandled).toBe(true)
    expect(bodyJson).toMatchObject({
      type: 'doc',
    })
    expect(bodyJson.content?.[0]).toMatchObject({
      type: 'heading',
      attrs: {
        level: 2,
      },
      content: [{ type: 'text', text: '章节标题' }],
    })
    expect(bodyJson.content?.[1]).toMatchObject({
      type: 'paragraph',
    })
    expect(bodyJson.content?.slice(1).some(node => node?.type === 'heading')).toBe(false)
  })
})
