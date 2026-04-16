import { describe, expect, it } from 'vitest'
import {
  collectDocumentAssetIds,
  hasUnresolvedDocumentAssets,
  hydrateDocumentAssetAttributes,
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
