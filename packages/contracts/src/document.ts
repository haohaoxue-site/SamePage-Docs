import { z } from 'zod'
import { TiptapJsonContentPayloadSchema, TiptapSchemaVersionSchema } from './tiptap'

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
  createdBy: z.string().nullable(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
})

export const DocumentRecentSchema = z.object({
  id: z.string(),
  title: z.string(),
  collection: DocumentCollectionIdSchema,
  ancestorTitles: z.string().array(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
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

export const DocumentDetailSchema = DocumentBaseSchema.extend({
  parentId: z.string().nullable(),
  schemaVersion: TiptapSchemaVersionSchema,
  content: TiptapJsonContentPayloadSchema,
  hasChildren: z.boolean(),
  hasContent: z.boolean(),
  scope: DocumentSpaceScopeSchema,
  collection: DocumentCollectionIdSchema,
})

export const CreateDocumentSchema = z.object({
  title: z.string().trim().min(1),
  schemaVersion: TiptapSchemaVersionSchema,
  content: TiptapJsonContentPayloadSchema.optional(),
  parentId: z.string().trim().nullable().optional(),
})

export const UpdateDocumentSchema = z.object({
  title: z.string().trim().min(1),
  schemaVersion: TiptapSchemaVersionSchema,
  content: TiptapJsonContentPayloadSchema,
})
