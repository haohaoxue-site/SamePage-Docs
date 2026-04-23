import { describe, expect, it } from 'vitest'
import { buildDocumentShareProjectionMap } from '../document-share-projection'

describe('documentShareProjection', () => {
  it('无本地策略的子页面继承最近祖先策略但不返回 inherited 字段', () => {
    const projections = buildDocumentShareProjectionMap({
      documents: [
        { id: 'doc-parent', parentId: null, title: '父页面' },
        { id: 'doc-child', parentId: 'doc-parent', title: '子页面' },
      ],
      shares: [
        {
          id: 'share-parent',
          documentId: 'doc-parent',
          mode: 'PUBLIC_TO_LOGGED_IN',
          directUserCount: 0,
          updatedAt: new Date('2026-04-23T01:00:00.000Z'),
          updatedBy: 'owner-1',
        } as never,
      ],
    })

    expect(projections.get('doc-child')).toEqual({
      localPolicy: null,
      effectivePolicy: {
        mode: 'PUBLIC_TO_LOGGED_IN',
        shareId: 'share-parent',
        rootDocumentId: 'doc-parent',
        rootDocumentTitle: '父页面',
        updatedAt: '2026-04-23T01:00:00.000Z',
        updatedBy: 'owner-1',
      },
    })
    expect(projections.get('doc-child')).not.toHaveProperty('isInherited')
    expect(projections.get('doc-child')).not.toHaveProperty('state')
  })

  it('子页面显式 NONE 会阻断祖先策略并成为自己的有效策略', () => {
    const projections = buildDocumentShareProjectionMap({
      documents: [
        { id: 'doc-parent', parentId: null, title: '父页面' },
        { id: 'doc-child', parentId: 'doc-parent', title: '子页面' },
      ],
      shares: [
        {
          id: 'share-parent',
          documentId: 'doc-parent',
          mode: 'PUBLIC_TO_LOGGED_IN',
          directUserCount: 0,
          updatedAt: new Date('2026-04-23T01:00:00.000Z'),
          updatedBy: 'owner-1',
        } as never,
        {
          id: 'share-child-none',
          documentId: 'doc-child',
          mode: 'NONE',
          directUserCount: 0,
          updatedAt: new Date('2026-04-23T02:00:00.000Z'),
          updatedBy: 'owner-2',
        } as never,
      ],
    })

    expect(projections.get('doc-child')).toEqual({
      localPolicy: {
        mode: 'NONE',
        shareId: 'share-child-none',
        directUserCount: 0,
        updatedAt: '2026-04-23T02:00:00.000Z',
        updatedBy: 'owner-2',
      },
      effectivePolicy: {
        mode: 'NONE',
        shareId: 'share-child-none',
        rootDocumentId: 'doc-child',
        rootDocumentTitle: '子页面',
        updatedAt: '2026-04-23T02:00:00.000Z',
        updatedBy: 'owner-2',
      },
    })
  })

  it('子页面本地指定分享覆盖父级公开分享', () => {
    const projections = buildDocumentShareProjectionMap({
      documents: [
        { id: 'doc-parent', parentId: null, title: '父页面' },
        { id: 'doc-child', parentId: 'doc-parent', title: '子页面' },
      ],
      shares: [
        {
          id: 'share-parent',
          documentId: 'doc-parent',
          mode: 'PUBLIC_TO_LOGGED_IN',
          directUserCount: 0,
          updatedAt: new Date('2026-04-23T01:00:00.000Z'),
          updatedBy: 'owner-1',
        } as never,
        {
          id: 'share-child-direct',
          documentId: 'doc-child',
          mode: 'DIRECT_USER',
          directUserCount: 2,
          updatedAt: new Date('2026-04-23T02:00:00.000Z'),
          updatedBy: 'owner-2',
        } as never,
      ],
    })

    expect(projections.get('doc-child')).toEqual({
      localPolicy: {
        mode: 'DIRECT_USER',
        shareId: 'share-child-direct',
        directUserCount: 2,
        updatedAt: '2026-04-23T02:00:00.000Z',
        updatedBy: 'owner-2',
      },
      effectivePolicy: {
        mode: 'DIRECT_USER',
        shareId: 'share-child-direct',
        rootDocumentId: 'doc-child',
        rootDocumentTitle: '子页面',
        updatedAt: '2026-04-23T02:00:00.000Z',
        updatedBy: 'owner-2',
      },
    })
  })

  it('没有本地策略且没有祖先策略时不生成投影', () => {
    const projections = buildDocumentShareProjectionMap({
      documents: [
        { id: 'doc-alone', parentId: null, title: '独立页面' },
      ],
      shares: [],
    })

    expect(projections.has('doc-alone')).toBe(false)
  })
})
