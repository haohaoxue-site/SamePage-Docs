import { zodToJsonSchema } from 'zod-to-json-schema'

export function zodToApiSchema(schema: unknown): Record<string, unknown> {
  return zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0], { target: 'openApi3' }) as Record<string, unknown>
}
