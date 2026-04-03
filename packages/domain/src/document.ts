import type {
  CreateDocumentSchema,
  DOCUMENT_SECTION_ID,
  DocumentBaseSchema,
  DocumentDetailSchema,
  DocumentItemSchema,
  DocumentRecentSchema,
  DocumentSectionIdSchema,
  DocumentSectionSchema,
  DocumentSpaceScopeSchema,
  DocumentStatusSchema,
  UpdateDocumentSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export {
  DOCUMENT_SECTION_ID,
  DOCUMENT_SECTION_ID_VALUES,
  DocumentSectionIdSchema,
  DocumentSpaceScopeSchema,
  DocumentStatusSchema,
  OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE,
} from '@haohaoxue/samepage-contracts'

export type DocumentSpaceScope = z.infer<typeof DocumentSpaceScopeSchema>
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export type DocumentSectionId = z.infer<typeof DocumentSectionIdSchema>
export type OwnedDocumentSectionId = Exclude<DocumentSectionId, typeof DOCUMENT_SECTION_ID.SHARED>
export type DocumentBase = z.infer<typeof DocumentBaseSchema>
export type DocumentRecent = z.infer<typeof DocumentRecentSchema>
export type DocumentItem = z.infer<typeof DocumentItemSchema>
export type DocumentSection = z.infer<typeof DocumentSectionSchema>
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>
export type CreateDocumentRequest = z.infer<typeof CreateDocumentSchema>
export type UpdateDocumentRequest = z.infer<typeof UpdateDocumentSchema>
