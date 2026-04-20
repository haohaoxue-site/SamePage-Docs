import { describe, expect, it } from 'vitest'
import {
  buildDocumentBlockIndex,
  buildDocumentOutline,
  collectDocumentAssetIds,
  hasUnresolvedDocumentAssets,
  hydrateDocumentAssetAttributes,
  searchDocumentBlocks,
  stripDocumentRuntimeAttributes,
} from '../src/document'

describe('document asset helpers', () => {
  it('collectDocumentAssetIds 会递归提取并去重正文中的 assetId', () => {
    const content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '前言' }],
      },
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
          src: '/runtime/1',
        },
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'image',
            attrs: {
              id: 'block_b',
              assetId: 'asset_1',
              src: '/runtime/1',
            },
          },
          {
            type: 'image',
            attrs: {
              id: 'block_c',
              assetId: 'asset_2',
            },
          },
        ],
      },
    ]

    expect(collectDocumentAssetIds(content)).toEqual(['asset_1', 'asset_2'])
  })

  it('stripDocumentRuntimeAttributes 会移除图片与文件节点的运行时 attrs', () => {
    const content = [
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
          alt: '封面',
          src: '/runtime/1',
        },
      },
      {
        type: 'file',
        attrs: {
          id: 'block_b',
          assetId: 'asset_2',
          fileName: 'spec.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          contentUrl: '/runtime/2',
        },
      },
    ]

    expect(stripDocumentRuntimeAttributes(content)).toEqual([
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
          alt: '封面',
        },
      },
      {
        type: 'file',
        attrs: {
          id: 'block_b',
          assetId: 'asset_2',
        },
      },
    ])
  })

  it('hydrateDocumentAssetAttributes 会按 assetId 回填图片与文件的运行时 attrs', () => {
    const content = [
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
        },
      },
      {
        type: 'image',
        attrs: {
          id: 'block_b',
          assetId: 'asset_2',
        },
      },
      {
        type: 'file',
        attrs: {
          id: 'block_c',
          assetId: 'asset_3',
        },
      },
    ]

    expect(hydrateDocumentAssetAttributes(content, {
      asset_1: {
        id: 'asset_1',
        documentId: 'doc_1',
        kind: 'image',
        status: 'ready',
        mimeType: 'image/png',
        size: 1024,
        fileName: 'cover.png',
        width: 640,
        height: 480,
        contentUrl: '/runtime/1',
        createdAt: '2026-04-15T00:00:00.000Z',
      },
      asset_3: {
        id: 'asset_3',
        documentId: 'doc_1',
        kind: 'file',
        status: 'ready',
        mimeType: 'application/pdf',
        size: 2048,
        fileName: 'spec.pdf',
        width: null,
        height: null,
        contentUrl: '/runtime/3',
        createdAt: '2026-04-15T00:00:00.000Z',
      },
    })).toEqual([
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
          src: '/runtime/1',
        },
      },
      {
        type: 'image',
        attrs: {
          id: 'block_b',
          assetId: 'asset_2',
        },
      },
      {
        type: 'file',
        attrs: {
          id: 'block_c',
          assetId: 'asset_3',
          fileName: 'spec.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          contentUrl: '/runtime/3',
        },
      },
    ])
  })

  it('hasUnresolvedDocumentAssets 会识别缺少 assetId 的资源节点', () => {
    expect(hasUnresolvedDocumentAssets([
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          src: '/runtime/1',
        },
      },
    ])).toBe(true)

    expect(hasUnresolvedDocumentAssets([
      {
        type: 'file',
        attrs: {
          id: 'block_b',
          fileName: 'spec.pdf',
        },
      },
    ])).toBe(true)

    expect(hasUnresolvedDocumentAssets([
      {
        type: 'image',
        attrs: {
          id: 'block_a',
          assetId: 'asset_1',
        },
      },
      {
        type: 'file',
        attrs: {
          id: 'block_b',
          assetId: 'asset_2',
        },
      },
    ])).toBe(false)
  })
})

describe('document block index helpers', () => {
  const bodyContent = [
    {
      type: 'paragraph',
      attrs: {
        id: 'block_intro',
      },
      content: [{ type: 'text', text: '开场介绍' }],
    },
    {
      type: 'heading',
      attrs: {
        id: 'block_heading_1',
        level: 1,
      },
      content: [{ type: 'text', text: '第一章' }],
    },
    {
      type: 'bulletList',
      attrs: {
        id: 'block_list',
      },
      content: [
        {
          type: 'listItem',
          attrs: {
            id: 'block_item_1',
          },
          content: [
            {
              type: 'paragraph',
              attrs: {
                id: 'block_item_1_paragraph',
              },
              content: [{ type: 'text', text: '清单事项一' }],
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: {
        id: 'block_heading_2',
        level: 2,
      },
      content: [{ type: 'text', text: '第二章' }],
    },
    {
      type: 'blockquote',
      attrs: {
        id: 'block_quote',
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            id: 'block_quote_paragraph',
          },
          content: [{ type: 'text', text: '引用内容' }],
        },
      ],
    },
    {
      type: 'horizontalRule',
      attrs: {
        id: 'block_divider',
      },
    },
  ]

  it('buildDocumentBlockIndex 会从 snapshot 正文派生出包含层级和 heading 信息的 block_index', () => {
    expect(buildDocumentBlockIndex(bodyContent)).toEqual([
      {
        blockId: 'block_intro',
        parentBlockId: null,
        depth: 0,
        nodeType: 'paragraph',
        plainText: '开场介绍',
        headingLevel: null,
      },
      {
        blockId: 'block_heading_1',
        parentBlockId: null,
        depth: 0,
        nodeType: 'heading',
        plainText: '第一章',
        headingLevel: 1,
      },
      {
        blockId: 'block_list',
        parentBlockId: null,
        depth: 0,
        nodeType: 'bulletList',
        plainText: '清单事项一',
        headingLevel: null,
      },
      {
        blockId: 'block_item_1',
        parentBlockId: 'block_list',
        depth: 1,
        nodeType: 'listItem',
        plainText: '清单事项一',
        headingLevel: null,
      },
      {
        blockId: 'block_item_1_paragraph',
        parentBlockId: 'block_item_1',
        depth: 2,
        nodeType: 'paragraph',
        plainText: '清单事项一',
        headingLevel: null,
      },
      {
        blockId: 'block_heading_2',
        parentBlockId: null,
        depth: 0,
        nodeType: 'heading',
        plainText: '第二章',
        headingLevel: 2,
      },
      {
        blockId: 'block_quote',
        parentBlockId: null,
        depth: 0,
        nodeType: 'blockquote',
        plainText: '引用内容',
        headingLevel: null,
      },
      {
        blockId: 'block_quote_paragraph',
        parentBlockId: 'block_quote',
        depth: 1,
        nodeType: 'paragraph',
        plainText: '引用内容',
        headingLevel: null,
      },
      {
        blockId: 'block_divider',
        parentBlockId: null,
        depth: 0,
        nodeType: 'horizontalRule',
        plainText: '',
        headingLevel: null,
      },
    ])
  })

  it('buildDocumentOutline 与 searchDocumentBlocks 复用同一份 block_index，保证导航顺序稳定', () => {
    const blockIndex = buildDocumentBlockIndex(bodyContent)

    expect(buildDocumentOutline(blockIndex)).toEqual([
      {
        blockId: 'block_heading_1',
        plainText: '第一章',
        headingLevel: 1,
      },
      {
        blockId: 'block_heading_2',
        plainText: '第二章',
        headingLevel: 2,
      },
    ])

    expect(searchDocumentBlocks(blockIndex, '章')).toEqual([
      blockIndex[1],
      blockIndex[5],
    ])
    expect(searchDocumentBlocks(blockIndex, '清单')).toEqual([
      blockIndex[2],
      blockIndex[3],
      blockIndex[4],
    ])
    expect(searchDocumentBlocks(blockIndex, '   ')).toEqual([])
  })
})
