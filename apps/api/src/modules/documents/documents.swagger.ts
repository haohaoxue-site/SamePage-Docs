import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'

const tiptapJsonContentApiSchema: SchemaObject = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
  },
}

export const createDocumentRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['title', 'schemaVersion'],
  properties: {
    title: { type: 'string' },
    schemaVersion: { type: 'integer', enum: [1] },
    content: tiptapJsonContentApiSchema,
    parentId: { type: 'string', nullable: true },
  },
}

export const createDocumentResponseApiSchema: SchemaObject = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
}

export const updateDocumentRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['title', 'schemaVersion', 'content'],
  properties: {
    title: { type: 'string' },
    schemaVersion: { type: 'integer', enum: [1] },
    content: tiptapJsonContentApiSchema,
  },
}
