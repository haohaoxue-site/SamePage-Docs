import { zodToJsonSchema } from 'zod-to-json-schema'

export function zodToApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
}
