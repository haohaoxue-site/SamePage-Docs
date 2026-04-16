import { z } from 'zod'
import { TiptapJsonContentPayloadSchema, TiptapSchemaVersionSchema } from './tiptap'
import { AuditUserSummarySchema } from './user'

export const DOCUMENT_COLLECTION = {
  PERSONAL: 'personal',
  SHARED: 'shared',
  TEAM: 'team',
} as const

export const DOCUMENT_COLLECTION_VALUES = [
  DOCUMENT_COLLECTION.PERSONAL,
  DOCUMENT_COLLECTION.SHARED,
  DOCUMENT_COLLECTION.TEAM,
] as const

export const DOCUMENT_COLLECTION_LABELS = {
  [DOCUMENT_COLLECTION.PERSONAL]: '私有',
  [DOCUMENT_COLLECTION.SHARED]: '共享',
  [DOCUMENT_COLLECTION.TEAM]: '团队',
} as const satisfies Record<(typeof DOCUMENT_COLLECTION_VALUES)[number], string>

export const DOCUMENT_SAVE_STATE = {
  IDLE: 'idle',
  DIRTY: 'dirty',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
} as const

export const DOCUMENT_PANE_STATE = {
  READY: 'ready',
  LOADING: 'loading',
  EMPTY: 'empty',
  UNSELECTED: 'unselected',
  UNSUPPORTED_SCHEMA: 'unsupported-schema',
  NOT_FOUND: 'not-found',
  FORBIDDEN: 'forbidden',
  ERROR: 'error',
} as const

export const DocumentSpaceScopeSchema = z.enum(['PERSONAL', 'TEAM'])

export const DocumentStatusSchema = z.enum(['ACTIVE', 'LOCKED'])

export const DocumentCollectionIdSchema = z.enum(DOCUMENT_COLLECTION_VALUES)

export const OWNED_DOCUMENT_COLLECTION_BY_SPACE_SCOPE = {
  PERSONAL: DOCUMENT_COLLECTION.PERSONAL,
  TEAM: DOCUMENT_COLLECTION.TEAM,
} as const satisfies Record<
  z.infer<typeof DocumentSpaceScopeSchema>,
  Exclude<z.infer<typeof DocumentCollectionIdSchema>, typeof DOCUMENT_COLLECTION.SHARED>
>

export const DocumentBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const DocumentRecentSchema = z.object({
  id: z.string(),
  title: z.string(),
  collection: DocumentCollectionIdSchema,
  ancestorTitles: z.string().array(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const DocumentItemSchema = DocumentBaseSchema.extend({
  parentId: z.string().nullable(),
  hasChildren: z.boolean(),
  hasContent: z.boolean(),
  get children() {
    return z.array(DocumentItemSchema)
  },
})

export const DocumentTreeGroupSchema = z.object({
  id: DocumentCollectionIdSchema,
  nodes: DocumentItemSchema.array(),
})

export const DocumentRevisionSchema = z.number().int().min(0)

export const DOCUMENT_SNAPSHOT_SOURCE = {
  AUTOSAVE: 'autosave',
  MANUAL_VERSION: 'manual-version',
  RESTORE: 'restore',
} as const

export const DOCUMENT_SNAPSHOT_SOURCE_VALUES = [
  DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
  DOCUMENT_SNAPSHOT_SOURCE.MANUAL_VERSION,
  DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
] as const

export const DocumentSnapshotSourceSchema = z.enum(DOCUMENT_SNAPSHOT_SOURCE_VALUES)

export const DocumentAssetKindSchema = z.enum(['image', 'file'])

export const DocumentAssetStatusSchema = z.enum(['pending', 'ready', 'deleted'])

export const DocumentRecordSchema = DocumentBaseSchema.omit({
  title: true,
}).extend({
  ownerId: z.string(),
  parentId: z.string().nullable(),
  latestSnapshotId: z.string().nullable(),
  order: z.number().int(),
  spaceScope: DocumentSpaceScopeSchema,
  status: DocumentStatusSchema,
}).strict()

export const DocumentSnapshotSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  revision: DocumentRevisionSchema,
  schemaVersion: TiptapSchemaVersionSchema,
  title: TiptapJsonContentPayloadSchema,
  body: TiptapJsonContentPayloadSchema,
  source: DocumentSnapshotSourceSchema,
  restoredFromSnapshotId: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  createdByUser: AuditUserSummarySchema.nullable(),
}).strict()

export const DocumentHeadSchema = z.object({
  document: DocumentRecordSchema,
  latestSnapshot: DocumentSnapshotSchema,
  headRevision: DocumentRevisionSchema,
}).strict()

export const DocumentAssetSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  kind: DocumentAssetKindSchema,
  status: DocumentAssetStatusSchema,
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  fileName: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  contentUrl: z.string().nullable(),
  createdAt: z.string(),
}).strict()

export const CreateDocumentSchema = z.object({
  title: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
}).strict()

export const CreateDocumentSnapshotSchema = z.object({
  baseRevision: DocumentRevisionSchema,
  schemaVersion: TiptapSchemaVersionSchema,
  source: DocumentSnapshotSourceSchema,
  title: TiptapJsonContentPayloadSchema,
  body: TiptapJsonContentPayloadSchema,
}).strict()

export const CreateDocumentSnapshotResponseSchema = z.object({
  snapshot: DocumentSnapshotSchema,
  headRevision: DocumentRevisionSchema,
}).strict()

export const ResolveDocumentAssetsSchema = z.object({
  assetIds: z.string().array(),
}).strict()

export const ResolveDocumentAssetsResponseSchema = z.object({
  assets: DocumentAssetSchema.array(),
  unresolvedAssetIds: z.string().array(),
}).strict()

export const RestoreDocumentSnapshotSchema = z.object({
  baseRevision: DocumentRevisionSchema,
  snapshotId: z.string().trim().min(1),
}).strict()

export const PatchDocumentMetaSchema = z.object({
  parentId: z.string().trim().nullable().optional(),
  spaceScope: DocumentSpaceScopeSchema.optional(),
}).strict().refine(
  input => input.parentId !== undefined || input.spaceScope !== undefined,
  {
    message: '至少更新一个元数据字段',
  },
)
