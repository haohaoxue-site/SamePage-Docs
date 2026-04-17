import type { Editor } from '@tiptap/core'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { DocumentBodyEditor, DocumentTitleEditor } from '@/components/tiptap-editor'
import { isTriggerMenuSelection } from '@/components/tiptap-editor/presets/body/triggerSelection'
import { waitForNestedEditor } from './testUtils'

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

async function triggerKeyDown(
  editor: Editor,
  key: string,
  options?: {
    shiftKey?: boolean
  },
) {
  editor.commands.focus('end')

  const handled = Boolean(editor.view.someProp('handleKeyDown', handler =>
    handler(
      editor.view,
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        shiftKey: options?.shiftKey,
      }),
    )
      ? true
      : undefined))

  await nextTick()

  return handled
}

function createBlockTriggerMenuStub(openMenuSpy: ReturnType<typeof vi.fn>) {
  return defineComponent({
    name: 'BlockTriggerMenu',
    setup(_, { expose }) {
      expose({
        openMenu: openMenuSpy,
      })

      return () => h('div', { class: 'block-trigger-menu-stub' })
    },
  })
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

    const titleEditor = await waitForNestedEditor(titleWrapper)
    const bodyEditor = await waitForNestedEditor(bodyWrapper)

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

  it('正文编辑器保留列表、引用、代码块 markdown input rules，标题编辑器不承接这些 block transform', async () => {
    const titleWrapper = mount(DocumentTitleEditor, {
      props: {
        title: createDocumentTitleContent(''),
      },
    })
    const bulletWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })
    const orderedWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })
    const quoteWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })
    const codeWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })

    const titleEditor = await waitForNestedEditor(titleWrapper)
    const bulletEditor = await waitForNestedEditor(bulletWrapper)
    const orderedEditor = await waitForNestedEditor(orderedWrapper)
    const quoteEditor = await waitForNestedEditor(quoteWrapper)
    const codeEditor = await waitForNestedEditor(codeWrapper)

    await applyTextInput(titleEditor, '- ')
    await applyTextInput(bulletEditor, '- ')
    await applyTextInput(orderedEditor, '1. ')
    await applyTextInput(quoteEditor, '> ')
    await applyTextInput(codeEditor, '``` ')

    expect(titleEditor.getJSON().content?.[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: '- ' }],
    })
    expect(bulletEditor.getJSON().content?.[0]).toMatchObject({
      type: 'bulletList',
      content: [{ type: 'listItem' }],
    })
    expect(orderedEditor.getJSON().content?.[0]).toMatchObject({
      type: 'orderedList',
      content: [{ type: 'listItem' }],
    })
    expect(quoteEditor.getJSON().content?.[0]).toMatchObject({
      type: 'blockquote',
      content: [{ type: 'paragraph' }],
    })
    expect(codeEditor.getJSON().content?.[0]).toMatchObject({
      type: 'codeBlock',
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

    const titleEditor = await waitForNestedEditor(titleWrapper)
    const bodyEditor = await waitForNestedEditor(bodyWrapper)

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

    const bodyEditor = await waitForNestedEditor(bodyWrapper)

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

  it('正文编辑器只在本地 / 命中空段落时触发块 suggestion UI', async () => {
    const openMenuSpy = vi.fn(() => true)
    const bodyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(openMenuSpy),
        },
      },
    })

    const bodyEditor = await waitForNestedEditor(bodyWrapper)
    const slashHandled = await triggerKeyDown(bodyEditor, '/')

    expect(isTriggerMenuSelection(bodyEditor)).toBe(true)
    expect(slashHandled).toBe(true)
    expect(openMenuSpy).toHaveBeenCalledTimes(1)
  })

  it('远端内容同步不会触发本地块 suggestion UI', async () => {
    const openMenuSpy = vi.fn(() => true)
    const bodyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(openMenuSpy),
        },
      },
    })

    const bodyEditor = await waitForNestedEditor(bodyWrapper)

    await bodyWrapper.setProps({
      content: [
        {
          type: 'paragraph',
        },
      ],
    })
    await nextTick()

    expect(isTriggerMenuSelection(bodyEditor)).toBe(true)
    expect(openMenuSpy).not.toHaveBeenCalled()
  })

  it('正文编辑器只在可编辑空文档展示 placeholder 和块级交互，只读态裁掉交互装饰', async () => {
    const editableWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })
    const readonlyWrapper = mount(DocumentBodyEditor, {
      props: {
        content: [],
        editable: false,
      },
      global: {
        stubs: {
          BubbleToolbar: defineComponent({
            template: '<div class="bubble-toolbar-stub" />',
          }),
          BlockTriggerMenu: createBlockTriggerMenuStub(vi.fn(() => true)),
        },
      },
    })

    const editableEditor = await waitForNestedEditor(editableWrapper)
    const readonlyEditor = await waitForNestedEditor(readonlyWrapper)

    await vi.waitFor(() => {
      expect(editableWrapper.find('.tiptap-editor__prosemirror p').attributes('data-placeholder')).toBe('输入 / 唤起命令，或者直接开始写作。')
    })

    expect(editableEditor.isEditable).toBe(true)
    expect(readonlyEditor.isEditable).toBe(false)
    expect(editableWrapper.find('.bubble-toolbar-stub').exists()).toBe(true)
    expect(editableWrapper.find('.block-trigger-menu-stub').exists()).toBe(true)
    expect(readonlyWrapper.find('.bubble-toolbar-stub').exists()).toBe(false)
    expect(readonlyWrapper.find('.block-trigger-menu-stub').exists()).toBe(false)
    expect(editableWrapper.find('.tiptap-editor__prosemirror p').classes()).toContain('is-editor-empty')
    expect(readonlyWrapper.find('.tiptap-editor__prosemirror p').attributes('data-placeholder')).toBeUndefined()
    expect(readonlyWrapper.find('.tiptap-editor__prosemirror p').classes()).not.toContain('is-editor-empty')
  })
})
