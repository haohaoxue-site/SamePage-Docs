import type {
  DocumentHead,
  DocumentPublicShare,
  DocumentShare,
  DocumentShareAccess,
  DocumentShareAccessSource,
  DocumentShareMode,
  DocumentShareRecipient,
  DocumentShareRecipientSummary,
  DocumentSnapshot,
  DocumentSnapshotSource,
  TiptapJsonContent,
  UserCollabIdentity,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_SHARE_ACCESS_SOURCE,
  DOCUMENT_SHARE_MODE,
  DOCUMENT_SHARE_RECIPIENT_STATUS,
} from '@haohaoxue/samepage-contracts'
import {
  buildDocumentSharePath,
  buildDocumentShareRecipientPath,
} from '@haohaoxue/samepage-shared'
import { NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { auditUserSummarySelect, toAuditUserSummary } from '../../utils/audit-user-summary'
import { buildRootDocumentShareProjection } from './document-share-projection'

export const collabUserIdentitySelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  userCode: true,
} satisfies Prisma.UserSelect

export const documentShareSelect = {
  id: true,
  documentId: true,
  mode: true,
  permission: true,
  status: true,
  createdAt: true,
  createdBy: true,
  createdByUser: {
    select: collabUserIdentitySelect,
  },
  updatedAt: true,
  updatedBy: true,
  updatedByUser: {
    select: collabUserIdentitySelect,
  },
} satisfies Prisma.DocumentShareSelect

export const documentShareRecipientSelect = {
  id: true,
  documentShareId: true,
  recipientUserId: true,
  permission: true,
  status: true,
  createdAt: true,
  createdBy: true,
  createdByUser: {
    select: collabUserIdentitySelect,
  },
  updatedAt: true,
  updatedBy: true,
  updatedByUser: {
    select: collabUserIdentitySelect,
  },
} satisfies Prisma.DocumentShareRecipientSelect

export const documentShareProjectionSelect = {
  id: true,
  documentId: true,
  mode: true,
  updatedAt: true,
  updatedBy: true,
  recipients: {
    where: {
      status: {
        not: DOCUMENT_SHARE_RECIPIENT_STATUS.REMOVED,
      },
    },
    select: {
      id: true,
    },
  },
} satisfies Prisma.DocumentShareSelect

export const sharedDocumentPreviewSelect = {
  id: true,
  workspaceId: true,
  title: true,
  trashedAt: true,
  workspace: {
    select: {
      name: true,
      type: true,
    },
  },
} satisfies Prisma.DocumentSelect

export const documentShareTreeNodeSelect = {
  id: true,
  workspaceId: true,
  parentId: true,
  trashedAt: true,
} satisfies Prisma.DocumentSelect

export const documentShareProjectionPathNodeSelect = {
  id: true,
  workspaceId: true,
  parentId: true,
  title: true,
  trashedAt: true,
} satisfies Prisma.DocumentSelect

export const documentShareRecipientRecordSelect = {
  ...documentShareRecipientSelect,
  recipientUser: {
    select: collabUserIdentitySelect,
  },
  documentShare: {
    select: {
      ...documentShareSelect,
      document: {
        select: sharedDocumentPreviewSelect,
      },
    },
  },
} satisfies Prisma.DocumentShareRecipientSelect

export const documentSnapshotSelect = {
  id: true,
  documentId: true,
  revision: true,
  schemaVersion: true,
  title: true,
  body: true,
  source: true,
  restoredFromSnapshotId: true,
  createdAt: true,
  createdBy: true,
  createdByUser: {
    select: auditUserSummarySelect,
  },
} satisfies Prisma.DocumentSnapshotSelect

export const sharedDocumentHeadSelect = {
  id: true,
  workspaceId: true,
  createdBy: true,
  visibility: true,
  parentId: true,
  title: true,
  trashedAt: true,
  latestSnapshotId: true,
  headRevision: true,
  summary: true,
  status: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  latestSnapshot: {
    select: documentSnapshotSelect,
  },
} satisfies Prisma.DocumentSelect

export type PersistedCollabUserIdentity = Prisma.UserGetPayload<{
  select: typeof collabUserIdentitySelect
}>

export type PersistedDocumentShare = Prisma.DocumentShareGetPayload<{
  select: typeof documentShareSelect
}>

export type PersistedDocumentShareRecipient = Prisma.DocumentShareRecipientGetPayload<{
  select: typeof documentShareRecipientSelect
}>

export type PersistedDocumentShareRecipientRecord = Prisma.DocumentShareRecipientGetPayload<{
  select: typeof documentShareRecipientRecordSelect
}>

export type PersistedSharedDocumentPreview = Prisma.DocumentGetPayload<{
  select: typeof sharedDocumentPreviewSelect
}>

export type PersistedDocumentShareTreeNode = Prisma.DocumentGetPayload<{
  select: typeof documentShareTreeNodeSelect
}>

export type PersistedDocumentShareProjectionPathNode = Prisma.DocumentGetPayload<{
  select: typeof documentShareProjectionPathNodeSelect
}>

export type PersistedSharedDocumentHead = Prisma.DocumentGetPayload<{
  select: typeof sharedDocumentHeadSelect
}>

export type PersistedDocumentSnapshot = Prisma.DocumentSnapshotGetPayload<{
  select: typeof documentSnapshotSelect
}>

export function toDocumentShare(share: PersistedDocumentShare): DocumentShare {
  return {
    id: share.id,
    documentId: share.documentId,
    mode: share.mode as DocumentShare['mode'],
    permission: share.permission as DocumentShare['permission'],
    status: share.status as DocumentShare['status'],
    createdAt: share.createdAt.toISOString(),
    createdBy: share.createdBy,
    createdByUser: toAuditUserSummary(share.createdByUser),
    updatedAt: share.updatedAt.toISOString(),
    updatedBy: share.updatedBy,
    updatedByUser: toAuditUserSummary(share.updatedByUser),
  }
}

export function toDocumentPublicShare(share: PersistedDocumentShare): DocumentPublicShare {
  const nextShare = toDocumentShare(share)

  return {
    ...nextShare,
    link: buildDocumentSharePath(nextShare.id),
  }
}

export function toDocumentShareRecipient(recipient: PersistedDocumentShareRecipient): DocumentShareRecipient {
  return {
    id: recipient.id,
    documentShareId: recipient.documentShareId,
    recipientUserId: recipient.recipientUserId,
    permission: recipient.permission as DocumentShareRecipient['permission'],
    status: recipient.status as DocumentShareRecipient['status'],
    createdAt: recipient.createdAt.toISOString(),
    createdBy: recipient.createdBy,
    createdByUser: toAuditUserSummary(recipient.createdByUser),
    updatedAt: recipient.updatedAt.toISOString(),
    updatedBy: recipient.updatedBy,
    updatedByUser: toAuditUserSummary(recipient.updatedByUser),
  }
}

export function toDocumentShareRecipientSummary(
  recipient: PersistedDocumentShareRecipientRecord,
): DocumentShareRecipientSummary {
  const share = toDocumentShare(recipient.documentShare)

  return {
    recipient: toDocumentShareRecipient(recipient),
    recipientUser: toRequiredUserCollabIdentity(recipient.recipientUser),
    sharedByUser: toUserCollabIdentity(recipient.documentShare.createdByUser),
    share,
    documentId: recipient.documentShare.document.id,
    documentTitle: recipient.documentShare.document.title,
    workspaceName: recipient.documentShare.document.workspace.name,
    workspaceType: recipient.documentShare.document.workspace.type as DocumentShareRecipientSummary['workspaceType'],
    link: share.mode === DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN
      ? buildDocumentSharePath(share.id)
      : buildDocumentShareRecipientPath(recipient.id),
  }
}

export function toDocumentShareAccess(input: {
  accessSource?: DocumentShareAccessSource
  authorizationRootDocumentId?: string
  authorizationShareId?: string | null
  authorizationRecipientId?: string | null
  entryShareId?: string | null
  entryRecipientId?: string | null
  canEditTree?: boolean
  share: DocumentShareAccess['share']
  recipient: DocumentShareRecipient | null
  recipientStatus: DocumentShareRecipient['status']
  sharedByUser: UserCollabIdentity | null
  document: PersistedSharedDocumentPreview
}): DocumentShareAccess {
  return {
    accessSource: input.accessSource ?? resolveShareAccessSource(input.share, input.recipient),
    permission: input.recipient?.permission ?? input.share.permission,
    authorizationRootDocumentId: input.authorizationRootDocumentId ?? input.share.documentId,
    authorizationShareId: input.authorizationShareId ?? input.share.id,
    authorizationRecipientId: input.authorizationRecipientId ?? input.recipient?.id ?? null,
    entryShareId: input.entryShareId ?? (input.share.mode === DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN ? input.share.id : null),
    entryRecipientId: input.entryRecipientId ?? (input.share.mode === DOCUMENT_SHARE_MODE.DIRECT_USER ? input.recipient?.id ?? null : null),
    canEditTree: input.canEditTree ?? false,
    share: input.share,
    recipient: input.recipient,
    recipientStatus: input.recipientStatus,
    sharedByUser: input.sharedByUser,
    documentId: input.document.id,
    documentTitle: input.document.title,
    workspaceName: input.document.workspace.name,
    workspaceType: input.document.workspace.type as DocumentShareAccess['workspaceType'],
  }
}

export function toDocumentHead(
  document: PersistedSharedDocumentHead,
  share: DocumentHead['document']['share'],
): DocumentHead {
  if (!document.latestSnapshot) {
    throw new NotFoundException(`Document "${document.id}" head not found`)
  }

  return {
    document: {
      id: document.id,
      summary: document.summary,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      workspaceId: document.workspaceId,
      createdBy: document.createdBy,
      visibility: document.visibility,
      parentId: document.parentId,
      latestSnapshotId: document.latestSnapshotId,
      order: document.order,
      status: document.status,
      share,
    },
    latestSnapshot: toDocumentSnapshot(document.latestSnapshot),
    headRevision: document.headRevision,
  }
}

export function toDocumentSnapshot(snapshot: PersistedDocumentSnapshot): DocumentSnapshot {
  return {
    id: snapshot.id,
    documentId: snapshot.documentId,
    revision: snapshot.revision,
    schemaVersion: snapshot.schemaVersion as DocumentSnapshot['schemaVersion'],
    title: asTiptapJsonContent(snapshot.title),
    body: asTiptapJsonContent(snapshot.body),
    source: snapshot.source as DocumentSnapshotSource,
    restoredFromSnapshotId: snapshot.restoredFromSnapshotId,
    createdAt: snapshot.createdAt.toISOString(),
    createdBy: snapshot.createdBy,
    createdByUser: toAuditUserSummary(snapshot.createdByUser),
  }
}

export function toUserCollabIdentity(user: PersistedCollabUserIdentity | null | undefined): UserCollabIdentity | null {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    userCode: user.userCode,
  }
}

export function toRequiredUserCollabIdentity(user: PersistedCollabUserIdentity): UserCollabIdentity {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    userCode: user.userCode,
  }
}

export function isRetryableSerializableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2034'
  )
}

export function collectDescendantDocumentIds(
  documents: PersistedDocumentShareTreeNode[],
  rootDocumentId: string,
): string[] {
  const childrenByParent = new Map<string | null, string[]>()

  for (const document of documents) {
    const siblings = childrenByParent.get(document.parentId) ?? []
    siblings.push(document.id)
    childrenByParent.set(document.parentId, siblings)
  }

  const descendantDocumentIds: string[] = []
  const pendingDocumentIds = [...(childrenByParent.get(rootDocumentId) ?? [])]

  while (pendingDocumentIds.length > 0) {
    const currentDocumentId = pendingDocumentIds.shift()

    if (!currentDocumentId) {
      continue
    }

    descendantDocumentIds.push(currentDocumentId)
    pendingDocumentIds.push(...(childrenByParent.get(currentDocumentId) ?? []))
  }

  return descendantDocumentIds
}

export function collectAncestorDocumentIds(
  documents: PersistedDocumentShareTreeNode[],
  documentId: string,
): string[] {
  const documentsById = new Map(documents.map(document => [document.id, document]))
  const ancestorDocumentIds: string[] = []
  const currentDocument = documentsById.get(documentId)
  let currentParentId = currentDocument?.parentId ?? null

  while (currentParentId) {
    const parentDocument = documentsById.get(currentParentId)

    if (!parentDocument) {
      break
    }

    ancestorDocumentIds.push(parentDocument.id)
    currentParentId = parentDocument.parentId
  }

  return ancestorDocumentIds
}

export function buildSharedDocumentHead(
  document: PersistedSharedDocumentHead,
  activeShares: PersistedDocumentShare[],
): DocumentHead {
  return toDocumentHead(
    document,
    buildRootDocumentShareProjection(
      document,
      activeShares.map(share => ({
        id: share.id,
        documentId: share.documentId,
        mode: share.mode as DocumentShareMode,
        directUserCount: 0,
        updatedAt: share.updatedAt,
        updatedBy: share.updatedBy,
      })),
    ),
  )
}

function asTiptapJsonContent(value: Prisma.JsonValue): TiptapJsonContent {
  return value as TiptapJsonContent
}

function resolveShareAccessSource(
  share: DocumentShareAccess['share'],
  recipient: DocumentShareRecipient | null,
): DocumentShareAccessSource {
  if (share.mode === DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN) {
    return DOCUMENT_SHARE_ACCESS_SOURCE.PUBLIC_SHARE
  }

  if (recipient) {
    return DOCUMENT_SHARE_ACCESS_SOURCE.DIRECT_SHARE
  }

  return DOCUMENT_SHARE_ACCESS_SOURCE.WORKSPACE_MEMBER
}
