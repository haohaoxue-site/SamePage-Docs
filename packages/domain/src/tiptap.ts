import type {
  TiptapJsonContentPayloadSchema,
  TiptapSchemaVersionSchema,
  TURN_INTO_BLOCK_TYPES,
} from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

export type TiptapJsonContent = z.infer<typeof TiptapJsonContentPayloadSchema>
export type TiptapJsonNode = TiptapJsonContent[number]
export type TiptapSchemaVersion = z.infer<typeof TiptapSchemaVersionSchema>
export type TurnIntoBlockType = (typeof TURN_INTO_BLOCK_TYPES)[number]
