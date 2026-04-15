import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createBodyExtensions } from '@/components/tiptap-editor/helpers/createExtensions'
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue'

interface TiptapEditorExposed {
  editor: Editor | null
}

interface TurnIntoBlockChain {
  turnIntoBlock?: (target: string) => {
    run: () => boolean
  }
  moveBlockUp?: () => {
    run: () => boolean
  }
  moveBlockDown?: () => {
    run: () => boolean
  }
  insertBlock?: () => {
    run: () => boolean
  }
  deleteBlock?: () => {
    run: () => boolean
  }
  duplicateBlock?: () => {
    run: () => boolean
  }
  indentBlock?: () => {
    run: () => boolean
  }
  outdentBlock?: () => {
    run: () => boolean
  }
}

const initialContent = [
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '旧内容' }],
  },
] satisfies JSONContent[]

const listContent = [
  {
    type: 'bulletList',
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '第一项' }],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '第二项' }],
          },
        ],
      },
    ],
  },
] satisfies JSONContent[]

async function getEditor(wrapper: ReturnType<typeof mount>) {
  await vi.waitFor(() => {
    expect((wrapper.vm as unknown as TiptapEditorExposed).editor).toBeTruthy()
  })

  return (wrapper.vm as unknown as TiptapEditorExposed).editor!
}

function focusText(editor: Editor, text: string) {
  let selectionPosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || typeof node.text !== 'string') {
      return
    }

    const offset = node.text.indexOf(text)

    if (offset < 0) {
      return
    }

    selectionPosition = pos + offset + 1
  })

  expect(selectionPosition).not.toBeNull()
  editor.commands.setTextSelection(selectionPosition!)
}

function collectLogicalBlocks(editor: Editor, type: 'listItem' | 'taskItem' | 'paragraph') {
  const blocks: Array<{ id: string | null, text: string }> = []

  editor.state.doc.descendants((node) => {
    if (node.type.name !== type) {
      return
    }

    blocks.push({
      id: typeof node.attrs.id === 'string' ? node.attrs.id : null,
      text: node.textContent,
    })
  })

  return blocks
}

async function waitForLogicalBlockIds(editor: Editor, type: 'listItem' | 'taskItem' | 'paragraph') {
  await vi.waitFor(() => {
    const blocks = collectLogicalBlocks(editor, type)

    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks.every(block => typeof block.id === 'string' && block.id.length > 0)).toBe(true)
  })
}

describe('blockCommands', () => {
  it('正文编辑器暴露 turnIntoBlock 命令，并按目标块做确定性转换', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    const firstTurnHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .turnIntoBlock?.('heading-2')
      .run()

    await nextTick()

    const secondTurnHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .turnIntoBlock?.('heading-2')
      .run()

    await nextTick()

    const dividerHandled = (editor.chain().focus('end') as unknown as TurnIntoBlockChain)
      .turnIntoBlock?.('divider')
      .run()

    await nextTick()

    expect(firstTurnHandled).toBe(true)
    expect(secondTurnHandled).toBe(true)
    expect(dividerHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'heading',
        attrs: {
          id: expect.any(String),
          level: 2,
        },
        content: [{ type: 'text', text: '旧内容' }],
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

  it('正文编辑器暴露 indentBlock / outdentBlock 命令，并统一收口列表层级调整', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)

    focusText(editor, '第二项')
    const indentHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .indentBlock?.()
      .run()

    await nextTick()

    const contentAfterIndent = wrapper.emitted('update:content')?.at(-1)?.[0]

    focusText(editor, '第二项')
    const outdentHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .outdentBlock?.()
      .run()

    await nextTick()

    expect(indentHandled).toBe(true)
    expect(outdentHandled).toBe(true)
    expect(contentAfterIndent).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
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
                content: [{ type: 'text', text: '第一项' }],
              },
              {
                type: 'bulletList',
                attrs: {
                  id: expect.any(String),
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
                        content: [{ type: 'text', text: '第二项' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
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
                content: [{ type: 'text', text: '第一项' }],
              },
            ],
          },
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
                content: [{ type: 'text', text: '第二项' }],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })

  it('正文编辑器暴露 duplicateBlock 命令，复制当前逻辑块并重新分配新的 blockId', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)

    focusText(editor, '第一项')
    const duplicateHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .duplicateBlock?.()
      .run()

    await nextTick()

    expect(duplicateHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
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
                content: [{ type: 'text', text: '第一项' }],
              },
            ],
          },
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
                content: [{ type: 'text', text: '第一项' }],
              },
            ],
          },
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
                content: [{ type: 'text', text: '第二项' }],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
  })

  it('正文编辑器暴露 insertBlock 命令，在列表内插入同层级空 block', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)

    focusText(editor, '第一项')
    const insertHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .insertBlock?.()
      .run()

    await nextTick()

    expect(insertHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
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
                content: [{ type: 'text', text: '第一项' }],
              },
            ],
          },
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
              },
            ],
          },
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
                content: [{ type: 'text', text: '第二项' }],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          id: expect.any(String),
        },
      },
    ])
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph')
    expect(editor.state.selection.$from.parent.textContent).toBe('')
    expect(editor.state.selection.$from.node(editor.state.selection.$from.depth - 1)?.type.name).toBe('listItem')
  })

  it('正文编辑器暴露 moveBlockUp / moveBlockDown 命令，在同父级逻辑块间交换顺序并保持 blockId 稳定', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)
    await waitForLogicalBlockIds(editor, 'listItem')
    const initialListItems = collectLogicalBlocks(editor, 'listItem')

    focusText(editor, '第二项')
    const moveUpHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveBlockUp?.()
      .run()

    await nextTick()

    const movedUpListItems = collectLogicalBlocks(editor, 'listItem')

    const moveDownHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveBlockDown?.()
      .run()

    await nextTick()

    const restoredListItems = collectLogicalBlocks(editor, 'listItem')
    const moveDownAtBoundaryHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveBlockDown?.()
      .run()

    expect(moveUpHandled).toBe(true)
    expect(movedUpListItems.map(item => item.text)).toEqual(['第二项', '第一项'])
    expect(movedUpListItems.map(item => item.id)).toEqual([initialListItems[1].id, initialListItems[0].id])
    expect(editor.state.selection.$from.parent.textContent).toBe('第二项')
    expect(moveDownHandled).toBe(true)
    expect(restoredListItems).toEqual(initialListItems)
    expect(moveDownAtBoundaryHandled).toBe(false)
  })

  it('正文编辑器暴露 deleteBlock 命令，列表内选区删除整个逻辑块', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        extensions: createBodyExtensions(),
      },
    })

    const editor = await getEditor(wrapper)

    focusText(editor, '第一项')
    const deleteHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .deleteBlock?.()
      .run()

    await nextTick()

    expect(deleteHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'bulletList',
        attrs: {
          id: expect.any(String),
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
                content: [{ type: 'text', text: '第二项' }],
              },
            ],
          },
        ],
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
