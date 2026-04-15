import type { TiptapSchemaVersionSchema, TURN_INTO_BLOCK_TYPES } from '@haohaoxue/samepage-contracts'
import type { JSONContent } from '@tiptap/core'
import type { z } from 'zod'

export type TiptapJsonNode = JSONContent
export type TiptapJsonContent = TiptapJsonNode[]
export type TiptapSchemaVersion = z.infer<typeof TiptapSchemaVersionSchema>
export type TurnIntoBlockType = (typeof TURN_INTO_BLOCK_TYPES)[number]
