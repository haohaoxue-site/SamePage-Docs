import type { DocumentShareAccess } from '@haohaoxue/samepage-domain'
import type { ActiveDocumentDetail, DocumentEditorMeta } from '@/views/docs/typing'

/**
 * 分享阅读页主区状态。
 */
export type SharedDocsSurfaceState = 'loading' | 'confirm' | 'reader' | 'invalid' | 'error'

/**
 * 分享确认页属性。
 */
export interface SharedDocumentAccessPageProps {
  access: DocumentShareAccess
  isActionPending: boolean
}

/**
 * 分享确认页事件。
 */
export interface SharedDocumentAccessPageEmits {
  accept: []
  decline: []
}

/**
 * 分享阅读页属性。
 */
export interface SharedDocumentReaderPageProps {
  access: DocumentShareAccess
  document: ActiveDocumentDetail
  metadata: DocumentEditorMeta | null
}
