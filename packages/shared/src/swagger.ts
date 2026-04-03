import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

export function zodToApiSchema(schema: ZodSchema): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
}
