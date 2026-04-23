import type { DocumentShareProjection } from '@haohaoxue/samepage-domain'

/**
 * 共享聚合投影所需的文档节点。
 */
export interface DocumentShareProjectionNode {
  id: string
  parentId: string | null
  title: string
}

/**
 * 共享聚合投影所需的分享源。
 */
export interface DocumentShareProjectionSource {
  id: string
  documentId: string
  mode: NonNullable<DocumentShareProjection['localPolicy']>['mode']
  directUserCount: number
  updatedAt: Date
  updatedBy: string | null
}

export function buildDocumentShareProjectionMap(input: {
  documents: DocumentShareProjectionNode[]
  shares: DocumentShareProjectionSource[]
}): Map<string, DocumentShareProjection> {
  if (input.documents.length === 0 || input.shares.length === 0) {
    return new Map()
  }

  const documentsById = new Map(input.documents.map(document => [document.id, document]))
  const shareByDocumentId = new Map(input.shares.map(share => [share.documentId, share]))
  const projectionByDocumentId = new Map<string, DocumentShareProjection>()

  for (const document of input.documents) {
    const localShare = shareByDocumentId.get(document.id) ?? null
    const rootDocument = resolveProjectionRootDocument(document, documentsById, shareByDocumentId)

    if (!rootDocument) {
      continue
    }

    const effectiveShare = shareByDocumentId.get(rootDocument.id)

    if (!effectiveShare) {
      continue
    }

    projectionByDocumentId.set(document.id, {
      localPolicy: localShare
        ? toLocalPolicy(localShare)
        : null,
      effectivePolicy: toEffectivePolicy(rootDocument, effectiveShare),
    })
  }

  return projectionByDocumentId
}

export function buildRootDocumentShareProjection(
  rootDocument: Pick<DocumentShareProjectionNode, 'id' | 'title'>,
  shares: DocumentShareProjectionSource[],
): DocumentShareProjection | null {
  if (shares.length === 0) {
    return null
  }

  const share = shares[0]

  return {
    localPolicy: toLocalPolicy(share),
    effectivePolicy: toEffectivePolicy(rootDocument, share),
  }
}

function resolveProjectionRootDocument(
  document: DocumentShareProjectionNode,
  documentsById: ReadonlyMap<string, DocumentShareProjectionNode>,
  shareByDocumentId: ReadonlyMap<string, DocumentShareProjectionSource>,
): DocumentShareProjectionNode | null {
  let currentDocument: DocumentShareProjectionNode | undefined = document

  while (currentDocument) {
    if (shareByDocumentId.has(currentDocument.id)) {
      return currentDocument
    }

    currentDocument = currentDocument.parentId
      ? documentsById.get(currentDocument.parentId)
      : undefined
  }

  return null
}

function toLocalPolicy(
  share: DocumentShareProjectionSource,
): NonNullable<DocumentShareProjection['localPolicy']> {
  return {
    mode: share.mode,
    shareId: share.id,
    directUserCount: share.directUserCount,
    updatedAt: share.updatedAt.toISOString(),
    updatedBy: share.updatedBy,
  }
}

function toEffectivePolicy(
  rootDocument: Pick<DocumentShareProjectionNode, 'id' | 'title'>,
  share: DocumentShareProjectionSource,
): NonNullable<DocumentShareProjection['effectivePolicy']> {
  return {
    mode: share.mode,
    shareId: share.id,
    rootDocumentId: rootDocument.id,
    rootDocumentTitle: rootDocument.title,
    updatedAt: share.updatedAt.toISOString(),
    updatedBy: share.updatedBy,
  }
}
