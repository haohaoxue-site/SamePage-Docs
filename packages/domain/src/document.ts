import type {
  CreateDocumentSchema,
  CreateDocumentSnapshotResponseSchema,
  CreateDocumentSnapshotSchema,
  DOCUMENT_PANE_STATE,
  DOCUMENT_SAVE_STATE,
  DocumentAssetKindSchema,
  DocumentAssetSchema,
  DocumentAssetStatusSchema,
  DocumentBaseSchema,
  DocumentCollectionIdSchema,
  DocumentHeadSchema,
  DocumentItemSchema,
  DocumentRecentSchema,
  DocumentRecordSchema,
  DocumentRevisionSchema,
  DocumentShareEffectivePolicySchema,
  DocumentShareLocalPolicySchema,
  DocumentShareProjectionSchema,
  DocumentSnapshotSchema,
  DocumentSnapshotSourceSchema,
  DocumentStatusSchema,
  DocumentTrashItemSchema,
  DocumentTreeGroupSchema,
  DocumentVisibilitySchema,
  PatchDocumentMetaSchema,
  ResolveDocumentAssetsResponseSchema,
  ResolveDocumentAssetsSchema,
  RestoreDocumentSnapshotSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export type DocumentVisibility = z.infer<typeof DocumentVisibilitySchema>
export type DocumentAssetKind = z.infer<typeof DocumentAssetKindSchema>
export type DocumentAssetStatus = z.infer<typeof DocumentAssetStatusSchema>
export type DocumentCollectionId = z.infer<typeof DocumentCollectionIdSchema>
export type OwnedDocumentCollectionId = Exclude<DocumentCollectionId, 'shared'>
export type DocumentPaneState = (typeof DOCUMENT_PANE_STATE)[keyof typeof DOCUMENT_PANE_STATE]
export type DocumentSaveState = (typeof DOCUMENT_SAVE_STATE)[keyof typeof DOCUMENT_SAVE_STATE]
export type DocumentShareLocalPolicy = z.infer<typeof DocumentShareLocalPolicySchema>
export type DocumentShareEffectivePolicy = z.infer<typeof DocumentShareEffectivePolicySchema>
export type DocumentBase = z.infer<typeof DocumentBaseSchema>
export type DocumentRecent = z.infer<typeof DocumentRecentSchema>
export type DocumentTrashItem = z.infer<typeof DocumentTrashItemSchema>
export type DocumentItem = z.infer<typeof DocumentItemSchema>
export type DocumentTreeGroup = z.infer<typeof DocumentTreeGroupSchema>
export type DocumentRevision = z.infer<typeof DocumentRevisionSchema>
export type DocumentShareProjection = z.infer<typeof DocumentShareProjectionSchema>
export type DocumentSnapshotSource = z.infer<typeof DocumentSnapshotSourceSchema>
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>
export type DocumentSnapshot = z.infer<typeof DocumentSnapshotSchema>
export type DocumentHead = z.infer<typeof DocumentHeadSchema>
export type DocumentAsset = z.infer<typeof DocumentAssetSchema>
export type DocumentBlockHeadingLevel = 1 | 2 | 3 | 4 | 5

/**
 * 文档块索引条目。
 */
export interface DocumentBlockIndexEntry {
  /** 块 ID */
  blockId: string
  /** 父块 ID */
  parentBlockId: string | null
  /** 嵌套深度 */
  depth: number
  /** 节点类型 */
  nodeType: string
  /** 纯文本投影 */
  plainText: string
  /** 标题层级 */
  headingLevel: DocumentBlockHeadingLevel | null
}

/**
 * 文档大纲条目。
 */
export interface DocumentOutlineItem {
  /** 块 ID */
  blockId: string
  /** 标题文本 */
  plainText: string
  /** 标题层级 */
  headingLevel: DocumentBlockHeadingLevel
}

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
export type ResolveDocumentAssetsRequest = z.infer<typeof ResolveDocumentAssetsSchema>
export type ResolveDocumentAssetsResponse = z.infer<typeof ResolveDocumentAssetsResponseSchema>
