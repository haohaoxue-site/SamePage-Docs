import type { Editor, JSONContent } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TiptapEditor from '@/components/tiptap-editor/core/TiptapEditor.vue'
import { createBodyExtensions } from '@/components/tiptap-editor/extensions/createExtensions'
import { waitForMountedEditor } from './testUtils'

interface TurnIntoBlockChain {
  turnIntoBlock?: (target: string) => {
    run: () => boolean
  }
  splitCurrentBlock?: () => {
    run: () => boolean
  }
  mergeBlockBackward?: () => {
    run: () => boolean
  }
  moveBlockUp?: () => {
    run: () => boolean
  }
  moveBlockDown?: () => {
    run: () => boolean
  }
  moveCurrentBlockTo?: (targetBlockId: string, placement: 'before' | 'after') => {
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

const paragraphPairContent = [
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '第一段' }],
  },
  {
    type: 'paragraph',
    content: [{ type: 'text', text: '第二段' }],
  },
] satisfies JSONContent[]

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

function focusTextStart(editor: Editor, text: string) {
  let selectionPosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || typeof node.text !== 'string') {
      return
    }

    const offset = node.text.indexOf(text)

    if (offset < 0) {
      return
    }

    selectionPosition = pos + offset
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

async function triggerKeyDown(
  editor: Editor,
  key: string,
  options?: {
    altKey?: boolean
    shiftKey?: boolean
  },
) {
  const handled = Boolean(editor.view.someProp('handleKeyDown', handler =>
    handler(
      editor.view,
      new KeyboardEvent('keydown', {
        altKey: options?.altKey,
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

function normalizeBlockIds(content: JSONContent[] | undefined) {
  return JSON.parse(JSON.stringify(content ?? []), (_, value) => {
    if (typeof value !== 'string' || !value.startsWith('block_')) {
      return value
    }

    return 'block_normalized'
  }) as JSONContent[]
}

describe('blockCommands', () => {
  it('正文编辑器支持 heading-5 与 textAlign 属性写入', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
    const turnHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .turnIntoBlock?.('heading-5')
      .run()

    await nextTick()

    const alignHandled = (editor.chain().focus() as {
      setTextAlign: (value: string) => { run: () => boolean }
    })
      .setTextAlign('center')
      .run()

    await nextTick()

    expect(turnHandled).toBe(true)
    expect(alignHandled).toBe(true)
    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toEqual([
      {
        type: 'heading',
        attrs: {
          id: expect.any(String),
          level: 5,
          textAlign: 'center',
        },
        content: [{ type: 'text', text: '旧内容' }],
      },
    ])
  })

  it('正文编辑器暴露 turnIntoBlock 命令，并按目标块做确定性转换', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

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

  it('正文编辑器仅允许存在前序同级项的列表项继续增加缩进', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

    focusText(editor, '第一项')
    const firstItemIndentHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .indentBlock?.()
      .run()

    await nextTick()

    expect(firstItemIndentHandled).toBe(false)
    expect(normalizeBlockIds(editor.getJSON().content)).toMatchObject(normalizeBlockIds([
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
      {
        type: 'paragraph',
      },
    ]))

    focusText(editor, '第二项')
    const secondItemIndentHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .indentBlock?.()
      .run()

    await nextTick()

    expect(secondItemIndentHandled).toBe(true)
  })

  it('正文编辑器将 Alt+Shift+ArrowUp / Alt+Shift+ArrowDown 收口到 moveBlockUp / moveBlockDown，保持键盘与命令层一致', async () => {
    const keyboardWrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })
    const commandWrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const keyboardEditor = await waitForMountedEditor(keyboardWrapper)
    const commandEditor = await waitForMountedEditor(commandWrapper)

    focusText(keyboardEditor, '第二项')
    focusText(commandEditor, '第二项')

    const keyboardMoveUpHandled = await triggerKeyDown(keyboardEditor, 'ArrowUp', {
      altKey: true,
      shiftKey: true,
    })
    const commandMoveUpHandled = (commandEditor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveBlockUp?.()
      .run()

    await nextTick()

    expect(keyboardMoveUpHandled).toBe(true)
    expect(commandMoveUpHandled).toBe(true)
    expect(normalizeBlockIds(keyboardWrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined)).toEqual(
      normalizeBlockIds(commandWrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined),
    )

    focusText(keyboardEditor, '第二项')
    focusText(commandEditor, '第二项')

    const keyboardMoveDownHandled = await triggerKeyDown(keyboardEditor, 'ArrowDown', {
      altKey: true,
      shiftKey: true,
    })
    const commandMoveDownHandled = (commandEditor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveBlockDown?.()
      .run()

    await nextTick()

    expect(keyboardMoveDownHandled).toBe(true)
    expect(commandMoveDownHandled).toBe(true)
    expect(normalizeBlockIds(keyboardWrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined)).toEqual(
      normalizeBlockIds(commandWrapper.emitted('update:content')?.at(-1)?.[0] as JSONContent[] | undefined),
    )
  })

  it('正文编辑器将 Tab / Shift+Tab 收口到 indentBlock / outdentBlock，保持列表键盘与命令层一致', async () => {
    const keyboardWrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })
    const commandWrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const keyboardEditor = await waitForMountedEditor(keyboardWrapper)
    const commandEditor = await waitForMountedEditor(commandWrapper)

    focusText(keyboardEditor, '第二项')
    focusText(commandEditor, '第二项')

    const keyboardIndentHandled = await triggerKeyDown(keyboardEditor, 'Tab')
    const commandIndentHandled = (commandEditor.chain().focus() as unknown as TurnIntoBlockChain)
      .indentBlock?.()
      .run()

    await nextTick()

    expect(keyboardIndentHandled).toBe(true)
    expect(commandIndentHandled).toBe(true)
    expect(normalizeBlockIds(keyboardEditor.getJSON().content)).toEqual(
      normalizeBlockIds(commandEditor.getJSON().content),
    )

    focusText(keyboardEditor, '第二项')
    focusText(commandEditor, '第二项')

    const keyboardOutdentHandled = await triggerKeyDown(keyboardEditor, 'Tab', {
      shiftKey: true,
    })
    const commandOutdentHandled = (commandEditor.chain().focus() as unknown as TurnIntoBlockChain)
      .outdentBlock?.()
      .run()

    await nextTick()

    expect(keyboardOutdentHandled).toBe(true)
    expect(commandOutdentHandled).toBe(true)
    expect(normalizeBlockIds(keyboardEditor.getJSON().content)).toEqual(
      normalizeBlockIds(commandEditor.getJSON().content),
    )
  })

  it('正文编辑器将 Enter / Backspace 收口到 splitCurrentBlock / mergeBlockBackward，保持块分裂与合并的键盘和命令一致', async () => {
    const splitKeyboardWrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        initialExtensions: createBodyExtensions(),
      },
    })
    const splitCommandWrapper = mount(TiptapEditor, {
      props: {
        content: initialContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const splitKeyboardEditor = await waitForMountedEditor(splitKeyboardWrapper)
    const splitCommandEditor = await waitForMountedEditor(splitCommandWrapper)

    splitKeyboardEditor.commands.focus('end')

    const keyboardSplitHandled = await triggerKeyDown(splitKeyboardEditor, 'Enter')
    const commandSplitHandled = (splitCommandEditor.chain().focus('end') as unknown as TurnIntoBlockChain)
      .splitCurrentBlock?.()
      .run()

    await nextTick()

    expect(keyboardSplitHandled).toBe(true)
    expect(commandSplitHandled).toBe(true)
    expect(normalizeBlockIds(splitKeyboardEditor.getJSON().content)).toEqual(
      normalizeBlockIds(splitCommandEditor.getJSON().content),
    )

    const mergeKeyboardWrapper = mount(TiptapEditor, {
      props: {
        content: paragraphPairContent,
        initialExtensions: createBodyExtensions(),
      },
    })
    const mergeCommandWrapper = mount(TiptapEditor, {
      props: {
        content: paragraphPairContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const mergeKeyboardEditor = await waitForMountedEditor(mergeKeyboardWrapper)
    const mergeCommandEditor = await waitForMountedEditor(mergeCommandWrapper)

    focusTextStart(mergeKeyboardEditor, '第二段')
    focusTextStart(mergeCommandEditor, '第二段')

    const keyboardMergeHandled = await triggerKeyDown(mergeKeyboardEditor, 'Backspace')
    const commandMergeHandled = (mergeCommandEditor.chain().focus() as unknown as TurnIntoBlockChain)
      .mergeBlockBackward?.()
      .run()

    await nextTick()

    expect(keyboardMergeHandled).toBe(true)
    expect(commandMergeHandled).toBe(true)
    expect(normalizeBlockIds(mergeKeyboardEditor.getJSON().content)).toEqual(
      normalizeBlockIds(mergeCommandEditor.getJSON().content),
    )
    expect(mergeKeyboardEditor.getJSON().content).toMatchObject([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '第一段第二段' }],
      },
    ])
  })

  it('正文编辑器暴露 duplicateBlock 命令，复制当前逻辑块并重新分配新的 blockId', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

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
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

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
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
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

  it('正文编辑器暴露 moveCurrentBlockTo 命令，支持把当前逻辑块拖到目标块前后并保持 blockId 稳定', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: paragraphPairContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)
    await waitForLogicalBlockIds(editor, 'paragraph')
    const initialParagraphs = collectLogicalBlocks(editor, 'paragraph')

    focusText(editor, '第一段')
    const moveHandled = (editor.chain().focus() as unknown as TurnIntoBlockChain)
      .moveCurrentBlockTo?.(initialParagraphs[1].id!, 'after')
      .run()

    await nextTick()

    const movedParagraphs = collectLogicalBlocks(editor, 'paragraph')

    expect(moveHandled).toBe(true)
    expect(movedParagraphs.map(item => item.text)).toEqual(['第二段', '第一段'])
    expect(movedParagraphs.map(item => item.id)).toEqual([initialParagraphs[1].id, initialParagraphs[0].id])
    expect(editor.state.selection.$from.parent.textContent).toBe('第一段')
  })

  it('正文编辑器暴露 deleteBlock 命令，列表内选区删除整个逻辑块', async () => {
    const wrapper = mount(TiptapEditor, {
      props: {
        content: listContent,
        initialExtensions: createBodyExtensions(),
      },
    })

    const editor = await waitForMountedEditor(wrapper)

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
