import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'

export const RECENT_DOCUMENT_LIMIT = 8

const tiptapJsonContentApiSchema: SchemaObject = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
  },
}

const auditUserSummaryApiSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'displayName', 'avatarUrl'],
  properties: {
    id: { type: 'string' },
    displayName: { type: 'string' },
    avatarUrl: { type: 'string', nullable: true },
  },
}

export const createDocumentRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string' },
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

export const createDocumentSnapshotRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['baseRevision', 'schemaVersion', 'source', 'title', 'body'],
  properties: {
    baseRevision: { type: 'integer' },
    schemaVersion: { type: 'integer', enum: [1] },
    source: { type: 'string', enum: ['autosave', 'manual-version', 'restore'] },
    title: tiptapJsonContentApiSchema,
    body: tiptapJsonContentApiSchema,
  },
}

export const createDocumentSnapshotResponseApiSchema: SchemaObject = {
  type: 'object',
  required: ['snapshot', 'headRevision'],
  properties: {
    snapshot: {
      type: 'object',
      required: ['id', 'documentId', 'revision', 'schemaVersion', 'source', 'title', 'body', 'restoredFromSnapshotId', 'createdAt', 'createdBy', 'createdByUser'],
      properties: {
        id: { type: 'string' },
        documentId: { type: 'string' },
        revision: { type: 'integer' },
        schemaVersion: { type: 'integer', enum: [1] },
        source: { type: 'string', enum: ['autosave', 'manual-version', 'restore'] },
        title: tiptapJsonContentApiSchema,
        body: tiptapJsonContentApiSchema,
        restoredFromSnapshotId: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
        createdBy: { type: 'string', nullable: true },
        createdByUser: { ...auditUserSummaryApiSchema, nullable: true },
      },
    },
    headRevision: { type: 'integer' },
  },
}

export const patchDocumentMetaRequestApiSchema: SchemaObject = {
  type: 'object',
  properties: {
    parentId: { type: 'string', nullable: true },
    spaceScope: { type: 'string', enum: ['PERSONAL', 'TEAM'] },
  },
}

export const restoreDocumentSnapshotRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['baseRevision', 'snapshotId'],
  properties: {
    baseRevision: { type: 'integer' },
    snapshotId: { type: 'string' },
  },
}

export const documentAssetApiSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'documentId', 'kind', 'status', 'mimeType', 'size', 'fileName', 'width', 'height', 'contentUrl', 'createdAt'],
  properties: {
    id: { type: 'string' },
    documentId: { type: 'string' },
    kind: { type: 'string', enum: ['image', 'file'] },
    status: { type: 'string', enum: ['pending', 'ready', 'deleted'] },
    mimeType: { type: 'string' },
    size: { type: 'integer' },
    fileName: { type: 'string' },
    width: { type: 'integer', nullable: true },
    height: { type: 'integer', nullable: true },
    contentUrl: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
  },
}

export const resolveDocumentAssetsRequestApiSchema: SchemaObject = {
  type: 'object',
  required: ['assetIds'],
  properties: {
    assetIds: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
}

export const resolveDocumentAssetsResponseApiSchema: SchemaObject = {
  type: 'object',
  required: ['assets', 'unresolvedAssetIds'],
  properties: {
    assets: {
      type: 'array',
      items: documentAssetApiSchema,
    },
    unresolvedAssetIds: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
}
