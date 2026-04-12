import type {
  CreateDocumentSchema,
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

export type DocumentSpaceScope = z.infer<typeof DocumentSpaceScopeSchema>
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export type DocumentCollectionId = z.infer<typeof DocumentCollectionIdSchema>
export type OwnedDocumentCollectionId = Exclude<DocumentCollectionId, 'shared'>
export type DocumentSaveState = (typeof DOCUMENT_SAVE_STATE)[keyof typeof DOCUMENT_SAVE_STATE]
export type DocumentBase = z.infer<typeof DocumentBaseSchema>
export type DocumentRecent = z.infer<typeof DocumentRecentSchema>
export type DocumentItem = z.infer<typeof DocumentItemSchema>
export type DocumentTreeGroup = z.infer<typeof DocumentTreeGroupSchema>
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>
export type CreateDocumentRequest = z.infer<typeof CreateDocumentSchema>
export type UpdateDocumentRequest = z.infer<typeof UpdateDocumentSchema>
