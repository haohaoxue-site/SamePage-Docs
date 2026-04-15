import type {
  CreateDocumentSchema,
  CreateDocumentSnapshotResponseSchema,
  CreateDocumentSnapshotSchema,
  DOCUMENT_PANE_STATE,
  DOCUMENT_SAVE_STATE,
  DocumentBaseSchema,
  DocumentCollectionIdSchema,
  DocumentHeadSchema,
  DocumentItemSchema,
  DocumentRecentSchema,
  DocumentRecordSchema,
  DocumentRevisionSchema,
  DocumentSnapshotSchema,
  DocumentSnapshotSourceSchema,
  DocumentSpaceScopeSchema,
  DocumentStatusSchema,
  DocumentTreeGroupSchema,
  PatchDocumentMetaSchema,
  RestoreDocumentSnapshotSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

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
export type DocumentRevision = z.infer<typeof DocumentRevisionSchema>
export type DocumentSnapshotSource = z.infer<typeof DocumentSnapshotSourceSchema>
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>
export type DocumentSnapshot = z.infer<typeof DocumentSnapshotSchema>
export type DocumentHead = z.infer<typeof DocumentHeadSchema>

/**
 * 创建文档响应。
 */
export interface CreateDocumentResponse {
  id: string
}

export type CreateDocumentRequest = z.infer<typeof CreateDocumentSchema>
export type CreateDocumentSnapshotRequest = z.infer<typeof CreateDocumentSnapshotSchema>
export type CreateDocumentSnapshotResponse = z.infer<typeof CreateDocumentSnapshotResponseSchema>
export type RestoreDocumentSnapshotRequest = z.infer<typeof RestoreDocumentSnapshotSchema>
export type PatchDocumentMetaRequest = z.infer<typeof PatchDocumentMetaSchema>
