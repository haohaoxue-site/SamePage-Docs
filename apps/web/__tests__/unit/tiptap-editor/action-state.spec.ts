import type { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { isBubbleActionActive } from '@/components/tiptap-editor/overlays/catalog/actionState'
import {
  getActiveHighlightColor,
  getActiveTextColor,
} from '@/components/tiptap-editor/overlays/catalog/menuRegistry'

interface TextSegmentMark {
  name: string
  attrs?: Record<string, unknown>
}

interface TextSegment {
  text: string
  marks?: TextSegmentMark[]
}

function createSelectionEditor(segments: TextSegment[], selection: { from: number, to: number }) {
  const positionedSegments = segments.map((segment, index) => {
    const start = segments
      .slice(0, index)
      .reduce((sum, item) => sum + item.text.length, 1)

    return {
      ...segment,
      start,
      end: start + segment.text.length,
    }
  })

  return {
    isEditable: true,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    state: {
      selection: {
        empty: false,
        from: selection.from,
        to: selection.to,
        $from: {
          parent: {
            attrs: {},
          },
        },
      },
      doc: {
        nodesBetween(from: number, to: number, callback: (node: unknown, pos: number) => void | false) {
          for (const segment of positionedSegments) {
            if (segment.end <= from || segment.start >= to) {
              continue
            }

            const result = callback({
              isText: true,
              nodeSize: segment.text.length,
              marks: (segment.marks ?? []).map(mark => ({
                type: {
                  name: mark.name,
                },
                attrs: mark.attrs ?? {},
              })),
            }, segment.start)

            if (result === false) {
              break
            }
          }
        },
      },
    },
    can: vi.fn(() => ({
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          indentBlock: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
          outdentBlock: vi.fn(() => ({
            run: vi.fn(() => true),
          })),
        })),
      })),
    })),
  } as unknown as Editor
}

describe('actionState', () => {
  it('混合 code 和删除线选区不会把单个 mark 误判为激活', () => {
    const editor = createSelectionEditor([
      { text: '安师大' },
      { text: '黑暗', marks: [{ name: 'code' }] },
      { text: '世界', marks: [{ name: 'strike' }] },
      { text: '坎大哈省大家开会' },
    ], {
      from: 4,
      to: 8,
    })

    expect(isBubbleActionActive(editor, 'code')).toBe(false)
    expect(isBubbleActionActive(editor, 'strike')).toBe(false)
  })

  it('只有选区完整命中同一文字颜色类时才回显当前文字颜色', () => {
    const editor = createSelectionEditor([
      {
        text: '黑暗',
        marks: [{ name: 'textStyle', attrs: { textColorClass: 'tiptap-highlight-red-text' } }],
      },
      {
        text: '世界',
        marks: [{ name: 'textStyle', attrs: { textColorClass: 'tiptap-highlight-red-text' } }],
      },
    ], {
      from: 1,
      to: 5,
    })

    expect(getActiveTextColor(editor)).toBe('tiptap-highlight-red-text')
  })

  it('混合背景颜色选区不会错误回显某一个高亮类', () => {
    const editor = createSelectionEditor([
      {
        text: '黑暗',
        marks: [{ name: 'textStyle', attrs: { backgroundColorClass: 'tiptap-highlight-yellow-bg' } }],
      },
      {
        text: '世界',
        marks: [{ name: 'textStyle', attrs: { backgroundColorClass: 'tiptap-highlight-green-bg' } }],
      },
    ], {
      from: 1,
      to: 5,
    })

    expect(getActiveHighlightColor(editor)).toBe('')
  })
})
