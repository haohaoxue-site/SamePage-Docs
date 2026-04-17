import type {
  TiptapJsonContentPayloadSchema,
  TiptapSchemaVersionSchema,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export type TiptapJsonContent = z.infer<typeof TiptapJsonContentPayloadSchema>
export type TiptapJsonNode = TiptapJsonContent[number]
export type TiptapSchemaVersion = z.infer<typeof TiptapSchemaVersionSchema>
