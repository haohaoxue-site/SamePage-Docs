import type { DocumentBlockIndexEntry } from '@haohaoxue/samepage-domain'
import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import EditorOutline from '@/components/tiptap-editor/overlays/outline/EditorOutline.vue'
import {
  resolveActiveOutlineBlockId,
  resolveOutlineIndent,
  resolveOutlineIndicatorWidth,
  resolveOutlineSelectionPosition,
} from '@/components/tiptap-editor/overlays/outline/outline'

const blockIndex: DocumentBlockIndexEntry[] = [
  {
    blockId: 'block_intro',
    parentBlockId: null,
    depth: 0,
    nodeType: 'paragraph',
    plainText: '导语',
    headingLevel: null,
  },
  {
    blockId: 'block_h1',
    parentBlockId: null,
    depth: 0,
    nodeType: 'heading',
    plainText: '第一章',
    headingLevel: 1,
  },
  {
    blockId: 'block_h1_paragraph',
    parentBlockId: null,
    depth: 0,
    nodeType: 'paragraph',
    plainText: '第一章正文',
    headingLevel: null,
  },
  {
    blockId: 'block_h2',
    parentBlockId: null,
    depth: 0,
    nodeType: 'heading',
    plainText: '第二节',
    headingLevel: 2,
  },
  {
    blockId: 'block_h2_paragraph',
    parentBlockId: null,
    depth: 0,
    nodeType: 'paragraph',
    plainText: '第二节正文',
    headingLevel: null,
  },
]

describe('editorOutline helpers', () => {
  it('会把标题下方正文归到最近的前置标题 section，并高亮对应 heading', () => {
    expect(resolveActiveOutlineBlockId(blockIndex, 'block_intro')).toBeNull()
    expect(resolveActiveOutlineBlockId(blockIndex, 'block_h1')).toBe('block_h1')
    expect(resolveActiveOutlineBlockId(blockIndex, 'block_h1_paragraph')).toBe('block_h1')
    expect(resolveActiveOutlineBlockId(blockIndex, 'block_h2')).toBe('block_h2')
    expect(resolveActiveOutlineBlockId(blockIndex, 'block_h2_paragraph')).toBe('block_h2')
  })

  it('折叠态会按 heading 层级生成不同长度的右侧指示条', () => {
    expect(resolveOutlineIndicatorWidth(1)).toBe('18px')
    expect(resolveOutlineIndicatorWidth(2)).toBe('14px')
    expect(resolveOutlineIndicatorWidth(3)).toBe('10px')
    expect(resolveOutlineIndicatorWidth(5)).toBe('8px')
  })

  it('展开态大纲会按 heading 层级生成递进缩进', () => {
    expect(resolveOutlineIndent(1)).toBe('0rem')
    expect(resolveOutlineIndent(2)).toBe('1rem')
    expect(resolveOutlineIndent(3)).toBe('2rem')
  })

  it('点击大纲时把光标定位到标题最后一个字符后面', () => {
    expect(resolveOutlineSelectionPosition({
      from: 1,
      to: 9,
    })).toBe(8)
  })
})

interface EditorEventHandlerMap {
  blur: Set<() => void>
  focus: Set<() => void>
  selectionUpdate: Set<() => void>
  transaction: Set<() => void>
}

const ElInputStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      required: false,
      default: '',
    },
    placeholder: {
      type: String,
      required: false,
      default: '',
    },
  },
  emits: ['keydown', 'update:modelValue'],
  template: `
    <div class="el-input-stub">
      <input
        class="editor-outline__search-input"
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="$emit('keydown', $event)"
      >
    </div>
  `,
})

function createEditorOutlineStub(options: {
  blockId?: string
  content?: JSONContent[]
}) {
  const handlers: EditorEventHandlerMap = {
    blur: new Set(),
    focus: new Set(),
    selectionUpdate: new Set(),
    transaction: new Set(),
  }
  const chainApi = {
    focus: vi.fn(() => chainApi),
    run: vi.fn(() => true),
  }
  const editorRoot = document.createElement('div')
  const outlineBlockId = options.blockId ?? 'block_h1'
  const targetElement = document.createElement('h1')
  targetElement.dataset.blockId = outlineBlockId
  targetElement.id = outlineBlockId
  targetElement.scrollIntoView = vi.fn()
  editorRoot.appendChild(targetElement)
  let jsonContent = options.content ?? []

  const editor = {
    chain: vi.fn(() => chainApi),
    getJSON: vi.fn(() => ({
      type: 'doc',
      content: jsonContent,
    })),
    on: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].add(handler)
    }),
    off: vi.fn((event: keyof EditorEventHandlerMap, handler: () => void) => {
      handlers[event].delete(handler)
    }),
    state: {
      selection: {
        $from: {
          depth: 0,
        },
      },
      doc: {
        descendants: (callback: (node: unknown, pos: number, parent: unknown, index: number) => void) => {
          let position = 1

          jsonContent.forEach((node, index) => {
            if (!node.type || typeof node.type !== 'string') {
              return
            }

            callback({
              type: {
                name: node.type,
              },
              attrs: node.attrs ?? {},
              nodeSize: 8,
            }, position, {}, index)
            position += 8
          })
        },
      },
    },
    view: {
      dom: editorRoot,
    },
    emitEditorEvent(event: keyof EditorEventHandlerMap) {
      handlers[event].forEach(handler => handler())
    },
    setJsonContent(nextContent: JSONContent[]) {
      jsonContent = nextContent
    },
  } as unknown as Editor & {
    emitEditorEvent: (event: keyof EditorEventHandlerMap) => void
    setJsonContent: (content: JSONContent[]) => void
  }

  return {
    chainApi,
    editor,
    targetElement,
  }
}

function mountEditorOutline(editor: Editor, content?: JSONContent[]) {
  const resolvedContent = content ?? (() => {
    const editorJson = editor.getJSON()
    return Array.isArray(editorJson.content) ? editorJson.content : []
  })()

  return mount(EditorOutline, {
    props: {
      editor,
      content: resolvedContent,
    },
    global: {
      stubs: {
        ElInput: ElInputStub,
      },
    },
  })
}

describe('editorOutline view', () => {
  it('只根据外部正文 JSON 生成大纲，不直接读取 editor.getJSON() 作为导航真源', async () => {
    const { editor } = createEditorOutlineStub({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_runtime_only',
            level: 1,
          },
          content: [{ type: 'text', text: '运行时标题' }],
        },
      ],
    })
    const wrapper = mountEditorOutline(editor, [])

    expect(wrapper.find('.editor-outline').exists()).toBe(false)

    await wrapper.setProps({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_snapshot',
            level: 1,
          },
          content: [{ type: 'text', text: '快照标题' }],
        },
      ],
    })
    await nextTick()

    expect(wrapper.find('.editor-outline').exists()).toBe(true)
    expect(wrapper.find('.editor-outline__panel').exists()).toBe(false)

    editor.setJsonContent([
      {
        type: 'heading',
        attrs: {
          id: 'block_runtime_next',
          level: 1,
        },
        content: [{ type: 'text', text: '运行时后续标题' }],
      },
    ])
    editor.emitEditorEvent('transaction')
    await nextTick()

    expect(wrapper.find('.editor-outline').exists()).toBe(true)
    expect(wrapper.find('.editor-outline__panel').exists()).toBe(false)

    await wrapper.get('.editor-outline').trigger('mouseenter')

    expect(wrapper.find('.editor-outline__panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('快照标题')
    expect(wrapper.text()).not.toContain('运行时标题')
    expect(wrapper.text()).not.toContain('运行时后续标题')
  })

  it('点击大纲后把光标落到标题末尾，并对整行做短暂高亮提示', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/workspace/docs/doc-1?tab=editor')

    const { chainApi, editor, targetElement } = createEditorOutlineStub({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_h1',
            level: 1,
          },
          content: [{ type: 'text', text: '第一章' }],
        },
      ],
    })
    const wrapper = mountEditorOutline(editor)

    await wrapper.get('.editor-outline__indicator-link').trigger('click')

    expect(chainApi.focus).toHaveBeenCalledWith(8)
    expect(targetElement.classList.contains('tiptap-block-flash-target')).toBe(true)
    expect(window.location.hash).toBe('#block_h1')

    await vi.advanceTimersByTimeAsync(1700)

    expect(targetElement.classList.contains('tiptap-block-flash-target')).toBe(false)
    vi.useRealTimers()
  })

  it('展开态支持文内搜索，并按 block 结果渲染', async () => {
    const { editor } = createEditorOutlineStub({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_h1',
            level: 1,
          },
          content: [{ type: 'text', text: '第一章' }],
        },
        {
          type: 'heading',
          attrs: {
            id: 'block_h2',
            level: 2,
          },
          content: [{ type: 'text', text: '第二节' }],
        },
        {
          type: 'paragraph',
          attrs: {
            id: 'block_p1',
          },
          content: [{ type: 'text', text: '目标段落' }],
        },
      ],
    })
    const wrapper = mountEditorOutline(editor)

    await wrapper.get('.editor-outline').trigger('mouseenter')
    await wrapper.get('.editor-outline__search-input input').setValue('目标')

    const searchResults = wrapper.findAll('.editor-outline__search-item')

    expect(searchResults).toHaveLength(1)
    expect(searchResults[0]?.text()).toContain('目标段落')
    expect(wrapper.findAll('li.editor-outline__outline-item')).toHaveLength(2)
    expect(wrapper.findAll('li.editor-outline__search-item')).toHaveLength(1)
    expect(wrapper.find('ol.editor-outline__outline-list').exists()).toBe(true)
    expect(wrapper.findAll('li.editor-outline__outline-item')[1]?.attributes('style')).toContain('--editor-outline-indent: 1rem;')
  })

  it('展开态只保留导航入口，不再提供复制块链接按钮', async () => {
    const { editor } = createEditorOutlineStub({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_h1',
            level: 1,
          },
          content: [{ type: 'text', text: '第一章' }],
        },
        {
          type: 'paragraph',
          attrs: {
            id: 'block_p1',
          },
          content: [{ type: 'text', text: '目标段落' }],
        },
      ],
    })
    const wrapper = mountEditorOutline(editor)

    await wrapper.get('.editor-outline').trigger('mouseenter')
    await wrapper.get('.editor-outline__search-input input').setValue('目标')

    expect(wrapper.find('.editor-outline__copy-action').exists()).toBe(false)
  })

  it('搜索输入框内按上下键只切换搜索结果选中项，并可回车定位', async () => {
    const { chainApi, editor } = createEditorOutlineStub({
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'block_h1',
            level: 1,
          },
          content: [{ type: 'text', text: '第一章' }],
        },
        {
          type: 'paragraph',
          attrs: {
            id: 'block_p1',
          },
          content: [{ type: 'text', text: '目标段落一' }],
        },
        {
          type: 'paragraph',
          attrs: {
            id: 'block_p2',
          },
          content: [{ type: 'text', text: '目标段落二' }],
        },
      ],
    })
    const wrapper = mountEditorOutline(editor)

    await wrapper.get('.editor-outline').trigger('mouseenter')
    await wrapper.get('.editor-outline__search-input input').setValue('目标')

    const searchInput = wrapper.get('.editor-outline__search-input input')

    await searchInput.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.findAll('.editor-outline__search-item.is-active')[0]?.text()).toContain('目标段落二')

    await searchInput.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.findAll('.editor-outline__search-item.is-active')[0]?.text()).toContain('目标段落一')

    await searchInput.trigger('keydown', { key: 'Enter' })
    expect(chainApi.focus).toHaveBeenCalledWith(16)
  })
})
