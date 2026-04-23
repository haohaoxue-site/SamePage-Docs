import type {
  DocumentShareMode,
  DocumentShareModeIconName,
  DocumentShareProjection,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_SHARE_MODE,
  DOCUMENT_SHARE_MODE_ICON_NAMES,
  DOCUMENT_SHARE_MODE_LABELS,
  DOCUMENT_SHARE_ROUTE_PREFIX,
} from '@haohaoxue/samepage-contracts'

export function buildDocumentSharePath(shareId: string): string {
  return `${DOCUMENT_SHARE_ROUTE_PREFIX}/${shareId}`
}

export function buildDocumentShareRecipientPath(recipientId: string): string {
  return `${DOCUMENT_SHARE_ROUTE_PREFIX}/recipients/${recipientId}`
}

export function getDocumentShareModeLabel(mode: DocumentShareMode | null | undefined): string {
  return DOCUMENT_SHARE_MODE_LABELS[normalizeDocumentShareMode(mode)]
}

export function getDocumentShareModeIconName(
  mode: DocumentShareMode | null | undefined,
): DocumentShareModeIconName {
  return DOCUMENT_SHARE_MODE_ICON_NAMES[normalizeDocumentShareMode(mode)]
}

export function getDocumentShareProjectionMode(
  share: DocumentShareProjection | null | undefined,
): DocumentShareMode {
  return share?.effectivePolicy?.mode ?? DOCUMENT_SHARE_MODE.NONE
}

export function getDocumentShareProjectionModeLabel(
  share: DocumentShareProjection | null | undefined,
): string {
  return getDocumentShareModeLabel(getDocumentShareProjectionMode(share))
}

export function getDocumentShareProjectionIconName(
  share: DocumentShareProjection | null | undefined,
): DocumentShareModeIconName {
  return getDocumentShareModeIconName(getDocumentShareProjectionMode(share))
}

function normalizeDocumentShareMode(mode: DocumentShareMode | null | undefined): DocumentShareMode {
  return mode ?? DOCUMENT_SHARE_MODE.NONE
}
