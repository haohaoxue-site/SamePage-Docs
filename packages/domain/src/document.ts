import type {
  CreateDocumentSchema,
  DOCUMENT_PANE_STATE,
  DOCUMENT_SAVE_STATE,
  DocumentBaseSchema,
  DocumentCollectionIdSchema,
  DocumentDetailSchema,
  DocumentItemSchema,
  DocumentRecentSchema,
  DocumentSpaceScopeSchema,
  DocumentStatusSchema,
  DocumentTreeGroupSchema,
  UpdateDocumentSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'
import type { TiptapJsonContent } from './tiptap'

export type DocumentSpaceScope = z.infer<typeof DocumentSpaceScopeSchema>
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export type DocumentCollectionId = z.infer<typeof DocumentCollectionIdSchema>
export type OwnedDocumentCollectionId = Exclude<DocumentCollectionId, 'shared'>
export type DocumentPaneState = (typeof DOCUMENT_PANE_STATE)[keyof typeof DOCUMENT_PANE_STATE]
export type DocumentSaveState = (typeof DOCUMENT_SAVE_STATE)[keyof typeof DOCUMENT_SAVE_STATE]
export type DocumentBase = z.infer<typeof DocumentBaseSchema>
export type DocumentRecent = z.infer<typeof DocumentRecentSchema>
export type DocumentItem = z.infer<typeof DocumentItemSchema>
export type DocumentTreeGroup = z.infer<typeof DocumentTreeGroupSchema>

/**
 * 标题文本节点。
 */
export interface DocumentTitleTextNode {
  type: 'text'
  text: string
}

export type DocumentTitleContent = DocumentTitleTextNode[]

export type DocumentDetail = Omit<z.infer<typeof DocumentDetailSchema>, 'content'> & {
  content: TiptapJsonContent
}

/**
 * 创建文档响应。
 */
export interface CreateDocumentResponse {
  id: string
}

export type CreateDocumentRequest = Omit<z.infer<typeof CreateDocumentSchema>, 'content'> & {
  content?: TiptapJsonContent
}
export type UpdateDocumentRequest = Omit<z.infer<typeof UpdateDocumentSchema>, 'content'> & {
  content: TiptapJsonContent
}
