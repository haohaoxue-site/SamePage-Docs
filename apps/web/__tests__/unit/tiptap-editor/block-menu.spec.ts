import type { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import {
  getBlockMenuModel,
  getEditorBlockMenuContext,
} from '@/components/tiptap-editor/overlays/catalog/menuRegistry'

function createEditorStub(options: {
  blockType?: string
  textContent?: string
  canIndent?: boolean
  canOutdent?: boolean
}) {
  const parent = {
    type: {
      name: options.blockType ?? 'paragraph',
    },
    attrs: {},
    textContent: options.textContent ?? '',
  }

  return {
    isEditable: true,
    isActive: vi.fn(() => false),
    state: {
      selection: {
        empty: true,
        $from: {
          parent,
        },
      },
    },
    can: vi.fn(() => ({
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          indentBlock: vi.fn(() => ({
            run: vi.fn(() => options.canIndent ?? parent.textContent.length > 0),
          })),
          outdentBlock: vi.fn(() => ({
            run: vi.fn(() => options.canOutdent ?? false),
          })),
        })),
      })),
    })),
  } as unknown as Editor
}

describe('blockMenu', () => {
  it('当前块有内容时返回完整块转换入口和块操作入口', () => {
    const editor = createEditorStub({
      textContent: '正文内容',
      canIndent: true,
      canOutdent: false,
    })

    const context = getEditorBlockMenuContext(editor)
    const model = getBlockMenuModel(editor)

    expect(context.isEmptyBlock).toBe(false)
    expect(model.quickItems.map(item => item.label)).toEqual([
      '正文',
      '一级标题',
      '二级标题',
      '三级标题',
      '四级标题',
      '五级标题',
      '无序列表',
      '有序列表',
      '任务列表',
      '代码块',
      '引用',
    ])
    expect(model.menuItems.map(item => item.label)).toEqual([
      '缩进和对齐',
      '颜色',
      '评论',
      '剪切',
      '复制',
      '删除',
    ])

    const alignItem = model.menuItems.find(item => item.label === '缩进和对齐')
    const colorItem = model.menuItems.find(item => item.label === '颜色')

    const alignChildren = alignItem?.kind === 'panel' && alignItem.action === 'align'
      ? alignItem.children
      : []

    expect(alignChildren.map((item) => {
      if (item.kind === 'indent') {
        return `${item.label}:${item.disabled ? 'disabled' : 'enabled'}`
      }

      return `${item.label}:active-${item.isActive ? 'yes' : 'no'}`
    })).toEqual([
      '左对齐:active-yes',
      '居中对齐:active-no',
      '右对齐:active-no',
      '增加缩进:enabled',
      '减少缩进:disabled',
    ])
    expect(colorItem?.kind).toBe('panel')
    expect(colorItem && 'children' in colorItem).toBe(false)
  })

  it('当前块为空时返回空块快捷插入菜单和资源入口', () => {
    const editor = createEditorStub({
      textContent: '',
    })

    const context = getEditorBlockMenuContext(editor)
    const model = getBlockMenuModel(editor)

    expect(context.isEmptyBlock).toBe(true)
    expect(model.quickItems.map(item => item.label)).toEqual([
      '一级标题',
      '二级标题',
      '三级标题',
      '无序列表',
      '有序列表',
      '任务列表',
      '代码块',
      '引用',
      '分割线',
      '链接',
      '图片',
      '视频或文件',
    ])
    expect(model.menuItems).toEqual([])
  })
})
