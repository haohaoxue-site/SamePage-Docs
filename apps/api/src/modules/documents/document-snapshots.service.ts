import type {
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentHead,
  DocumentShareProjection,
  DocumentSnapshot,
  DocumentSnapshotSource,
  RestoreDocumentSnapshotRequest,
  TiptapJsonContent,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_SNAPSHOT_SOURCE,
} from '@haohaoxue/samepage-contracts'
import {
  collectDocumentAssetIds,
  getDocumentTitlePlainText,
  hasUnresolvedDocumentAssets,
  isSameDocumentSnapshotContent,
  summarizeDocumentContent,
} from '@haohaoxue/samepage-shared'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { auditUserSummarySelect, toAuditUserSummary } from '../../utils/audit-user-summary'
import { DocumentAccessService } from './document-access.service'
import { DocumentAssetsService } from './document-assets.service'
import { RECENT_DOCUMENT_ROUTE_KIND, upsertRecentDocumentVisit } from './document-recent-visit'
import { DocumentSharesService } from './document-shares.service'

const documentSnapshotSelect = {
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

const documentHeadSelect = {
  id: true,
  workspaceId: true,
  createdBy: true,
  visibility: true,
  parentId: true,
  title: true,
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

type PersistedDocumentHead = Prisma.DocumentGetPayload<{
  select: typeof documentHeadSelect
}>

type PersistedDocumentSnapshot = Prisma.DocumentSnapshotGetPayload<{
  select: typeof documentSnapshotSelect
}>

/** 读取文档头选项 */
interface GetDocumentHeadOptions {
  recordVisit?: boolean
}

@Injectable()
export class DocumentSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentAssetsService: DocumentAssetsService,
    private readonly documentAccessService: DocumentAccessService,
    private readonly documentSharesService: DocumentSharesService,
  ) {}

  async getDocumentHead(
    userId: string,
    id: string,
    options: GetDocumentHeadOptions = {},
  ): Promise<DocumentHead> {
    const document = await this.loadReadableDocumentHead(userId, id)
    const head = await this.buildDocumentHead(document)

    if (options.recordVisit) {
      await this.recordDocumentHeadVisit(userId, id)
    }

    return head
  }

  async createDocumentSnapshot(
    userId: string,
    id: string,
    payload: CreateDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    await this.documentAccessService.assertCanEditDocument(userId, id)
    this.assertPersistableDocumentAssets(payload.body)
    await this.documentAssetsService.assertAssetsBelongToDocument({
      documentId: id,
      assetIds: collectDocumentAssetIds(payload.body),
    })

    return await this.prisma.$transaction(async (tx) => {
      const currentDocument = await tx.document.findUnique({
        where: { id },
        select: {
          id: true,
          headRevision: true,
        },
      })

      if (!currentDocument) {
        throw new NotFoundException(`Document "${id}" not found`)
      }

      if (currentDocument.headRevision !== payload.baseRevision) {
        throw new ConflictException('文档版本已变化，请刷新后重试')
      }

      const nextRevision = currentDocument.headRevision + 1
      const snapshot = await tx.documentSnapshot.create({
        data: {
          documentId: id,
          revision: nextRevision,
          schemaVersion: payload.schemaVersion,
          title: toPrismaJsonValue(payload.title),
          body: toPrismaJsonValue(payload.body),
          source: payload.source,
          createdBy: userId,
        },
        select: documentSnapshotSelect,
      })

      await tx.document.update({
        where: { id },
        data: {
          latestSnapshotId: snapshot.id,
          headRevision: nextRevision,
          title: getDocumentTitlePlainText(payload.title),
          summary: summarizeDocumentContent(payload.body, 120, ''),
        },
      })

      return {
        snapshot: toDocumentSnapshot(snapshot),
        headRevision: nextRevision,
      }
    })
  }

  async getDocumentSnapshots(userId: string, id: string): Promise<DocumentSnapshot[]> {
    await this.documentAccessService.assertCanReadDocument(userId, id)

    const snapshots = await this.prisma.documentSnapshot.findMany({
      where: {
        documentId: id,
      },
      select: documentSnapshotSelect,
      orderBy: {
        revision: 'desc',
      },
    })

    return snapshots.map(toDocumentSnapshot)
  }

  async restoreDocumentSnapshot(
    userId: string,
    id: string,
    payload: RestoreDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    await this.documentAccessService.assertCanEditDocument(userId, id)

    return await this.prisma.$transaction(async (tx) => {
      const [currentDocument, targetSnapshot] = await Promise.all([
        tx.document.findUnique({
          where: { id },
          select: {
            headRevision: true,
            latestSnapshot: {
              select: documentSnapshotSelect,
            },
          },
        }),
        tx.documentSnapshot.findFirst({
          where: {
            documentId: id,
            id: payload.snapshotId,
          },
          select: documentSnapshotSelect,
        }),
      ])

      if (!currentDocument) {
        throw new NotFoundException(`Document "${id}" not found`)
      }

      if (!currentDocument.latestSnapshot) {
        throw new NotFoundException(`Document "${id}" head not found`)
      }

      if (!targetSnapshot) {
        throw new NotFoundException(`Snapshot "${payload.snapshotId}" not found`)
      }

      if (currentDocument.headRevision !== payload.baseRevision) {
        throw new ConflictException('文档版本已变化，请刷新后重试')
      }

      const currentHeadSnapshot = toDocumentSnapshot(currentDocument.latestSnapshot)
      const targetDocumentSnapshot = toDocumentSnapshot(targetSnapshot)

      if (isSameDocumentSnapshotContent(currentHeadSnapshot, targetDocumentSnapshot)) {
        return {
          snapshot: currentHeadSnapshot,
          headRevision: currentDocument.headRevision,
        }
      }

      const nextRevision = currentDocument.headRevision + 1
      const snapshot = await tx.documentSnapshot.create({
        data: {
          documentId: id,
          revision: nextRevision,
          schemaVersion: targetSnapshot.schemaVersion,
          title: toPrismaJsonValue(targetSnapshot.title),
          body: toPrismaJsonValue(targetSnapshot.body),
          source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
          restoredFromSnapshotId: targetSnapshot.id,
          createdBy: userId,
        },
        select: documentSnapshotSelect,
      })

      const nextSnapshot = toDocumentSnapshot(snapshot)

      await tx.document.update({
        where: { id },
        data: {
          latestSnapshotId: snapshot.id,
          headRevision: nextRevision,
          title: getDocumentTitlePlainText(nextSnapshot.title),
          summary: summarizeDocumentContent(nextSnapshot.body, 120, ''),
        },
      })

      return {
        snapshot: nextSnapshot,
        headRevision: nextRevision,
      }
    })
  }

  private async loadReadableDocumentHead(userId: string, documentId: string): Promise<PersistedDocumentHead> {
    await this.documentAccessService.assertCanReadDocument(userId, documentId)
    return this.loadDocumentHeadRecord(documentId)
  }

  private async loadDocumentHeadRecord(documentId: string): Promise<PersistedDocumentHead> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: documentHeadSelect,
    })

    if (!document?.latestSnapshot) {
      throw new NotFoundException(`Document "${documentId}" head not found`)
    }

    return document
  }

  private async buildDocumentHead(document: PersistedDocumentHead): Promise<DocumentHead> {
    const shareProjection = await this.documentSharesService.resolveDocumentShareProjectionForDocument(document)
    return toDocumentHead(document, shareProjection)
  }

  private async recordDocumentHeadVisit(userId: string, documentId: string): Promise<void> {
    await upsertRecentDocumentVisit(this.prisma, {
      documentId,
      userId,
      routeKind: RECENT_DOCUMENT_ROUTE_KIND.DOCUMENT,
      routeEntryId: null,
    })
  }

  private assertPersistableDocumentAssets(body: TiptapJsonContent) {
    if (hasUnresolvedDocumentAssets(body)) {
      throw new BadRequestException('正文中存在未上传完成的资源，请稍后重试')
    }
  }
}

function toDocumentHead(
  document: PersistedDocumentHead,
  share: DocumentShareProjection | null,
): DocumentHead {
  if (!document.latestSnapshot) {
    throw new NotFoundException(`Document "${document.id}" head not found`)
  }

  return {
    document: toDocumentRecord(document, share),
    latestSnapshot: toDocumentSnapshot(document.latestSnapshot),
    headRevision: document.headRevision,
  }
}

function toDocumentBase(document: PersistedDocumentHead) {
  return {
    id: document.id,
    summary: document.summary,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

function toDocumentRecord(
  document: PersistedDocumentHead,
  share: DocumentShareProjection | null,
) {
  return {
    ...toDocumentBase(document),
    workspaceId: document.workspaceId,
    createdBy: document.createdBy,
    visibility: document.visibility,
    parentId: document.parentId,
    latestSnapshotId: document.latestSnapshotId,
    order: document.order,
    status: document.status,
    share,
  }
}

function toDocumentSnapshot(snapshot: PersistedDocumentSnapshot): DocumentSnapshot {
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

function asTiptapJsonContent(value: Prisma.JsonValue): TiptapJsonContent {
  return (Array.isArray(value) ? value : []) as unknown as TiptapJsonContent
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}
