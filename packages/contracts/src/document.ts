import { z } from 'zod'

export const DOCUMENT_SECTION_ID = {
  PERSONAL: 'personal',
  SHARED: 'shared',
  TEAM: 'team',
} as const

export const DOCUMENT_SECTION_ID_VALUES = [
  DOCUMENT_SECTION_ID.PERSONAL,
  DOCUMENT_SECTION_ID.SHARED,
  DOCUMENT_SECTION_ID.TEAM,
] as const

export const DocumentSpaceScopeSchema = z.enum(['PERSONAL', 'TEAM'])

export const DocumentStatusSchema = z.enum(['ACTIVE', 'LOCKED'])

export const DocumentSectionIdSchema = z.enum(DOCUMENT_SECTION_ID_VALUES)

export const OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE = {
  PERSONAL: DOCUMENT_SECTION_ID.PERSONAL,
  TEAM: DOCUMENT_SECTION_ID.TEAM,
} as const satisfies Record<
  z.infer<typeof DocumentSpaceScopeSchema>,
  Exclude<z.infer<typeof DocumentSectionIdSchema>, typeof DOCUMENT_SECTION_ID.SHARED>
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
  section: DocumentSectionIdSchema,
  ancestorTitles: z.string().array(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const DocumentItemSchema: z.ZodType<DocumentItemRaw> = DocumentBaseSchema.extend({
  parentId: z.string().nullable(),
  hasChildren: z.boolean(),
  hasContent: z.boolean(),
  sharedByDisplayName: z.string().nullable(),
  children: z.lazy(() => DocumentItemSchema.array()),
})

export const DocumentSectionSchema = z.object({
  id: DocumentSectionIdSchema,
  label: z.string(),
  nodes: DocumentItemSchema.array(),
})

export const DocumentDetailSchema = DocumentBaseSchema.extend({
  parentId: z.string().nullable(),
  content: z.string(),
  hasChildren: z.boolean(),
  hasContent: z.boolean(),
  scope: DocumentSpaceScopeSchema,
  section: DocumentSectionIdSchema,
})

export const CreateDocumentSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().optional(),
  parentId: z.string().trim().nullable().optional(),
})

export const UpdateDocumentSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string(),
})

/**
 * 文档树原始节点结构。
 */
interface DocumentItemRaw extends z.infer<typeof DocumentBaseSchema> {
  parentId: string | null
  hasChildren: boolean
  hasContent: boolean
  sharedByDisplayName: string | null
  children: DocumentItemRaw[]
}
