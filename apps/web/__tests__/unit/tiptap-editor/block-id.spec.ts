import type { Editor, JSONContent } from '@tiptap/core'
import { TIPTAP_BLOCK_ID_PREFIX } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { normalizeBlockIds } from '@/components/tiptap-editor/helpers/blockId'
import { createBodyExtensions, createTitleExtensions } from '@/components/tiptap-editor/helpers/createExtensions'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

interface TiptapEditorExposed {
  editor: Editor | null
}

const complexBodyContent = [
  {
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: '标题' }],
  },
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '段落' }],
  },
  {
    type: 'bulletList',
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '列表项' }],
          },
        ],
      },
    ],
  },
  {
    type: 'taskList',
    content: [
      {
        type: 'taskItem',
        attrs: { checked: false },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '任务项' }],
          },
        ],
      },
    ],
  },
  {
    type: 'blockquote',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '引用' }],
      },
    ],
  },
  {
    type: 'codeBlock',
    attrs: { language: 'ts' },
    content: [{ type: 'text', text: 'const value = 1' }],
  },
] satisfies JSONContent[]

const emptyContent = [] satisfies JSONContent[]
const seededParagraphContent = normalizeBlockIds([{ type: 'paragraph' }] satisfies JSONContent[])

async function getEditor(wrapper: ReturnType<typeof mount>) {
  await vi.waitFor(() => {
    expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
  })

  return (wrapper.vm as unknown as TiptapEditorExposed).editor!
}

function collectBlockNodes(editor: Editor) {
  const nodes: Array<{ type: string, id?: string | null }> = []

  editor.state.doc.descendants((node) => {
    if (node.type.name === 'doc' || !node.isBlock) {
      return
    }

    nodes.push({
      type: node.type.name,
      id: typeof node.attrs.id === 'string' ? node.attrs.id : null,
    })
  })

  return nodes
}

function collectContentBlockNodes(content: JSONContent[]) {
  const nodes: Array<{ type: string, id?: string | null }> = []

  for (const node of content) {
    walkContentNodes(node, nodes)
  }

  return nodes
}

function walkContentNodes(
  content: JSONContent | undefined,
  nodes: Array<{ type: string, id?: string | null }>,
) {
  if (!content) {
    return
  }

  if (content.type && content.type !== 'doc' && Array.isArray(content.content)) {
    nodes.push({
      type: content.type,
      id: typeof content.attrs?.id === 'string' ? content.attrs.id : null,
    })
  }

  if (!Array.isArray(content.content)) {
    return
  }

  for (const child of content.content) {
    walkContentNodes(child, nodes)
  }
}

async function waitForPrefixedBodyBlockIds(editor: Editor) {
  await vi.waitFor(() => {
    const blockNodes = collectBlockNodes(editor)

    expect(blockNodes.length).toBeGreaterThan(0)
    expect(
      blockNodes.every(node =>
        typeof node.id === 'string' && node.id.startsWith(TIPTAP_BLOCK_ID_PREFIX),
      ),
    ).toBe(true)
  })
}

describe('blockId', () => {
  it('正文归一化后仅 block-level 节点携带带前缀的唯一 id，且 title schema 不注入该 attrs', async () => {
    const normalizedBodyContent = normalizeBlockIds(complexBodyContent)
    const titleWrapper = mount(TiptapEditor, {
      props: {
        content: emptyContent,
        extensions: createTitleExtensions(),
      },
    })

    const titleEditor = await getEditor(titleWrapper)
    const bodyBlocks = collectContentBlockNodes(normalizedBodyContent)
    const bodyIds = bodyBlocks.map(node => node.id)

    expect(bodyBlocks.map(node => node.type)).toEqual([
      'heading',
      'paragraph',
      'bulletList',
      'listItem',
      'paragraph',
      'taskList',
      'taskItem',
      'paragraph',
      'blockquote',
      'paragraph',
      'codeBlock',
    ])
    expect(bodyIds.every(id => typeof id === 'string' && id.startsWith(TIPTAP_BLOCK_ID_PREFIX))).toBe(true)
    expect(new Set(bodyIds).size).toBe(bodyIds.length)
    expect(titleEditor.getJSON()).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('split 后保持原 blockId，undo / redo 后维持稳定', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: seededParagraphContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    await waitForPrefixedBodyBlockIds(editor)
    const initialId = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .at(0)
      ?.id

    editor.chain().focus().insertContent('第一段').run()
    await nextTick()
    editor.commands.splitBlock()
    await nextTick()
    await waitForPrefixedBodyBlockIds(editor)

    const afterSplitIds = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .map(node => node.id)

    expect(afterSplitIds).toHaveLength(2)
    expect(afterSplitIds[0]).toBe(initialId)
    expect(afterSplitIds[1]).not.toBe(initialId)
    expect(new Set(afterSplitIds).size).toBe(2)

    editor.commands.undo()
    await nextTick()
    await waitForPrefixedBodyBlockIds(editor)

    const afterUndoIds = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .map(node => node.id)

    expect(afterUndoIds).toEqual([initialId])

    editor.commands.redo()
    await nextTick()
    await waitForPrefixedBodyBlockIds(editor)

    const afterRedoIds = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .map(node => node.id)

    expect(afterRedoIds).toEqual(afterSplitIds)
  })

  it('插入带重复 id 的 block 时自动重新分配新的 blockId', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: seededParagraphContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    await waitForPrefixedBodyBlockIds(editor)
    const initialId = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .at(0)
      ?.id

    editor.chain().focus().insertContent('现有内容').run()
    await nextTick()
    editor.chain().focus('end').insertContent([
      {
        type: 'paragraph',
        attrs: { id: initialId },
        content: [{ type: 'text', text: '粘贴内容' }],
      },
    ]).run()
    await nextTick()
    await waitForPrefixedBodyBlockIds(editor)

    const paragraphIds = collectBlockNodes(editor)
      .filter(node => node.type === 'paragraph')
      .map(node => node.id)

    expect(paragraphIds).toHaveLength(2)
    expect(paragraphIds[0]).toBe(initialId)
    expect(paragraphIds[1]).not.toBe(initialId)
    expect(new Set(paragraphIds).size).toBe(2)
  })
})
