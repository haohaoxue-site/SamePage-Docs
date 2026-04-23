import { DOCUMENT_SHARE_MODE } from '@haohaoxue/samepage-contracts'
import { describe, expect, it } from 'vitest'
import {
  getDocumentShareModeIconName,
  getDocumentShareModeLabel,
  getDocumentShareProjectionIconName,
  getDocumentShareProjectionMode,
  getDocumentShareProjectionModeLabel,
} from '../src/document-share'

describe('document share helpers', () => {
  it('按后端分享模式返回统一文案', () => {
    expect(getDocumentShareModeLabel(DOCUMENT_SHARE_MODE.NONE)).toBe('不分享')
    expect(getDocumentShareModeLabel(DOCUMENT_SHARE_MODE.DIRECT_USER)).toBe('指定成员')
    expect(getDocumentShareModeLabel(DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN)).toBe('互联网公开')
    expect(getDocumentShareModeLabel(null)).toBe('不分享')
  })

  it('按后端分享模式返回统一图标', () => {
    expect(getDocumentShareModeIconName(DOCUMENT_SHARE_MODE.NONE)).toBe('share-none')
    expect(getDocumentShareModeIconName(DOCUMENT_SHARE_MODE.DIRECT_USER)).toBe('share-direct')
    expect(getDocumentShareModeIconName(DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN)).toBe('share-public')
    expect(getDocumentShareModeIconName(undefined)).toBe('share-none')
  })

  it('从分享投影解析最终生效模式、文案和图标', () => {
    const projection = {
      localPolicy: null,
      effectivePolicy: {
        mode: DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN,
        shareId: 'share-parent-1',
        rootDocumentId: 'doc-parent-1',
        rootDocumentTitle: '父级文档',
        updatedAt: '2026-04-21T00:00:00.000Z',
        updatedBy: 'user-1',
      },
    }

    expect(getDocumentShareProjectionMode(projection)).toBe(DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN)
    expect(getDocumentShareProjectionModeLabel(projection)).toBe('互联网公开')
    expect(getDocumentShareProjectionIconName(projection)).toBe('share-public')
    expect(getDocumentShareProjectionMode(null)).toBe(DOCUMENT_SHARE_MODE.NONE)
  })
})
