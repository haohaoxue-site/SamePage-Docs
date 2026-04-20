import { describe, expect, it } from 'vitest'
import {
  buildDocumentBlockHash,
  buildDocumentBlockUrl,
  resolveDocumentBlockIdFromHash,
} from '@/utils/documentBlockAnchor'

describe('documentBlockAnchor', () => {
  it('会基于当前文档地址生成块锚点链接', () => {
    expect(buildDocumentBlockHash('block_h2')).toBe('#block_h2')
    expect(buildDocumentBlockUrl('block_h2', 'http://localhost/workspace/docs/doc-1?tab=editor')).toBe(
      'http://localhost/workspace/docs/doc-1?tab=editor#block_h2',
    )
  })

  it('会从路由 hash 中解析 blockId', () => {
    expect(resolveDocumentBlockIdFromHash('#block_h2')).toBe('block_h2')
    expect(resolveDocumentBlockIdFromHash('#block%20h2')).toBe('block h2')
    expect(resolveDocumentBlockIdFromHash('#')).toBeNull()
    expect(resolveDocumentBlockIdFromHash('')).toBeNull()
  })
})
