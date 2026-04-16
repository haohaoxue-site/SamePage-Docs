import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  CreateDocumentSnapshotRequest,
  CreateDocumentSnapshotResponse,
  DocumentBase,
  DocumentCollectionId,
  DocumentHead,
  DocumentItem,
  DocumentRecent,
  DocumentRecord,
  DocumentSnapshot,
  DocumentSnapshotSource,
  DocumentSpaceScope,
  DocumentTreeGroup,
  PatchDocumentMetaRequest,
  RestoreDocumentSnapshotRequest,
  TiptapJsonContent,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_COLLECTION,
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import {
  collectDocumentAssetIds,
  createDocumentTitleContent,
  getDocumentTitlePlainText,
  hasUnresolvedDocumentAssets,
  isSameDocumentSnapshotContent,
  resolveOwnedDocumentCollectionId,
  summarizeDocumentContent,
} from '@haohaoxue/samepage-shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  DocumentMemberRole,
  DocumentStatus,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { auditUserSummarySelect, toAuditUserSummary } from '../../utils/audit-user-summary'
import { DocumentAssetsService } from './document-assets.service'
import { RECENT_DOCUMENT_LIMIT } from './documents.constants'

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

const documentSelect = {
  id: true,
  ownerId: true,
  parentId: true,
  spaceScope: true,
  title: true,
  latestSnapshotId: true,
  headRevision: true,
  summary: true,
  status: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect

const documentHeadSelect = {
  ...documentSelect,
  latestSnapshot: {
    select: documentSnapshotSelect,
  },
} satisfies Prisma.DocumentSelect

type PersistedDocument = Prisma.DocumentGetPayload<{
  select: typeof documentSelect
}>

type PersistedDocumentHead = Prisma.DocumentGetPayload<{
  select: typeof documentHeadSelect
}>

type PersistedDocumentSnapshot = Prisma.DocumentSnapshotGetPayload<{
  select: typeof documentSnapshotSelect
}>

/**
 * 文档树构建上下文。
 */
interface TreeContext {
  documents: PersistedDocument[]
  documentsById: Map<string, PersistedDocument>
  childrenByParent: Map<string | null, PersistedDocument[]>
  sharedRootIds: Set<string>
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentAssetsService: DocumentAssetsService,
  ) {}

  async createDocument(userId: string, payload: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const normalizedParentId = payload.parentId ?? null
    let scope: DocumentSpaceScope = 'PERSONAL'

    if (normalizedParentId) {
      const context = await this.loadDocumentContext(userId)
      const resolvedParent = this.resolveAccessibleDocument(context, userId, normalizedParentId)

      if (resolvedParent.document.ownerId !== userId) {
        throw new ForbiddenException('当前用户无权在共享文档下创建子文档')
      }

      scope = resolvedParent.document.spaceScope
    }

    const lastSibling = await this.prisma.document.findFirst({
      where: {
        ownerId: userId,
        parentId: normalizedParentId,
        spaceScope: scope,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    })

    const title = createDocumentTitleContent(payload.title)
    const body: TiptapJsonContent = []

    const document = await this.prisma.$transaction(async (tx) => {
      const createdDocument = await tx.document.create({
        data: {
          ownerId: userId,
          parentId: normalizedParentId,
          spaceScope: scope,
          title: getDocumentTitlePlainText(title),
          summary: summarizeDocumentContent(body, 120, ''),
          order: (lastSibling?.order ?? -1) + 1,
        },
        select: {
          id: true,
        },
      })

      const snapshot = await tx.documentSnapshot.create({
        data: {
          documentId: createdDocument.id,
          revision: 1,
          schemaVersion: TIPTAP_SCHEMA_VERSION,
          title: toPrismaJsonValue(title),
          body: toPrismaJsonValue(body),
          source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
          createdBy: userId,
        },
        select: {
          id: true,
        },
      })

      await tx.document.update({
        where: {
          id: createdDocument.id,
        },
        data: {
          latestSnapshotId: snapshot.id,
          headRevision: 1,
        },
      })

      return createdDocument
    })

    return {
      id: document.id,
    }
  }

  async getDocumentTree(userId: string): Promise<DocumentTreeGroup[]> {
    const context = await this.loadDocumentContext(userId)

    return [
      {
        id: DOCUMENT_COLLECTION.PERSONAL,
        nodes: this.buildOwnedGroup(context, userId, 'PERSONAL'),
      },
      {
        id: DOCUMENT_COLLECTION.SHARED,
        nodes: this.buildSharedGroup(context),
      },
      {
        id: DOCUMENT_COLLECTION.TEAM,
        nodes: this.buildOwnedGroup(context, userId, 'TEAM'),
      },
    ]
  }

  async getRecentDocuments(userId: string): Promise<DocumentRecent[]> {
    const context = await this.loadDocumentContext(userId)
    const visibleDocumentIds = new Set<string>()

    for (const document of context.documents) {
      if (document.ownerId === userId) {
        visibleDocumentIds.add(document.id)
      }
    }

    for (const sharedRootId of context.sharedRootIds) {
      this.collectDescendantDocumentIds(sharedRootId, context, visibleDocumentIds)
    }

    return Array.from(visibleDocumentIds)
      .map(id => context.documentsById.get(id))
      .filter((document): document is PersistedDocument => Boolean(document))
      .filter(document => document.summary.length > 0)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, RECENT_DOCUMENT_LIMIT)
      .map(document => toDocumentRecent(document, context, userId))
  }

  async getDocumentHead(userId: string, id: string): Promise<DocumentHead> {
    const context = await this.loadDocumentContext(userId)
    this.resolveAccessibleDocument(context, userId, id)

    const document = await this.prisma.document.findUnique({
      where: { id },
      select: documentHeadSelect,
    })

    if (!document?.latestSnapshot) {
      throw new NotFoundException(`Document "${id}" head not found`)
    }

    return toDocumentHead(document)
  }

  async createDocumentSnapshot(
    userId: string,
    id: string,
    payload: CreateDocumentSnapshotRequest,
  ): Promise<CreateDocumentSnapshotResponse> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)
    this.ensureDocumentOwner(resolvedDocument.document, userId)
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
    const context = await this.loadDocumentContext(userId)
    this.resolveAccessibleDocument(context, userId, id)

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
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)
    this.ensureDocumentOwner(resolvedDocument.document, userId)

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

  async patchDocumentMeta(
    userId: string,
    id: string,
    payload: PatchDocumentMetaRequest,
  ): Promise<DocumentHead> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)
    this.ensureDocumentOwner(resolvedDocument.document, userId)

    let nextParentId = resolvedDocument.document.parentId
    let nextSpaceScope = resolvedDocument.document.spaceScope

    if (payload.parentId !== undefined) {
      nextParentId = payload.parentId

      if (payload.parentId) {
        const resolvedParent = this.resolveAccessibleDocument(context, userId, payload.parentId)
        this.ensureDocumentOwner(resolvedParent.document, userId)
        nextSpaceScope = resolvedParent.document.spaceScope
      }
    }

    if (payload.spaceScope !== undefined && payload.parentId === undefined) {
      nextSpaceScope = payload.spaceScope
    }

    await this.prisma.document.update({
      where: { id },
      data: {
        parentId: nextParentId,
        spaceScope: nextSpaceScope,
      },
    })

    return await this.getDocumentHead(userId, id)
  }

  async deleteDocument(userId: string, id: string): Promise<void> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)
    this.ensureDocumentOwner(resolvedDocument.document, userId)

    const removableDocumentIds = new Set<string>()
    this.collectDescendantDocumentIds(id, context, removableDocumentIds)

    await this.prisma.document.deleteMany({
      where: {
        id: {
          in: Array.from(removableDocumentIds),
        },
      },
    })
  }

  private async loadDocumentContext(userId: string): Promise<TreeContext> {
    const [documents, sharedMemberships] = await Promise.all([
      this.prisma.document.findMany({
        where: { status: { in: [DocumentStatus.ACTIVE, DocumentStatus.LOCKED] } },
        select: documentSelect,
        orderBy: [
          { order: 'asc' },
          { updatedAt: 'desc' },
        ],
      }),
      this.prisma.documentMember.findMany({
        where: {
          userId,
          role: DocumentMemberRole.VIEWER,
        },
        select: {
          documentId: true,
        },
      }),
    ])

    const documentsById = new Map(documents.map(document => [document.id, document]))
    const childrenByParent = new Map<string | null, PersistedDocument[]>()

    for (const document of documents) {
      const siblings = childrenByParent.get(document.parentId) ?? []
      siblings.push(document)
      childrenByParent.set(document.parentId, siblings)
    }

    const membershipIds = sharedMemberships
      .map(item => item.documentId)
      .filter(documentId => documentsById.has(documentId))

    const membershipSet = new Set(membershipIds)
    const sharedRootIds = new Set(
      membershipIds.filter((documentId) => {
        let currentDocument = documentsById.get(documentId)

        while (currentDocument?.parentId) {
          if (membershipSet.has(currentDocument.parentId)) {
            return false
          }

          currentDocument = documentsById.get(currentDocument.parentId)
        }

        return true
      }),
    )

    return {
      documents,
      documentsById,
      childrenByParent,
      sharedRootIds,
    }
  }

  private buildOwnedGroup(
    context: TreeContext,
    userId: string,
    scope: DocumentSpaceScope,
  ): DocumentItem[] {
    const ownedDocuments = context.documents.filter(document => document.ownerId === userId && document.spaceScope === scope)
    const visibleDocumentIds = new Set(ownedDocuments.map(document => document.id))
    const roots = ownedDocuments.filter(document => !document.parentId || !visibleDocumentIds.has(document.parentId))

    return roots.map(document =>
      this.buildGroupBranch(document, context, {
        visibleDocumentIds,
      }),
    )
  }

  private buildSharedGroup(context: TreeContext): DocumentItem[] {
    return Array.from(context.sharedRootIds)
      .map(rootId => context.documentsById.get(rootId))
      .filter((document): document is PersistedDocument => Boolean(document))
      .map(document => this.buildGroupBranch(document, context, {}))
  }

  private buildGroupBranch(
    document: PersistedDocument,
    context: TreeContext,
    options: {
      visibleDocumentIds?: Set<string>
    },
  ): DocumentItem {
    const nextChildren = (context.childrenByParent.get(document.id) ?? [])
      .filter(child => !options.visibleDocumentIds || options.visibleDocumentIds.has(child.id))
      .map(child => this.buildGroupBranch(child, context, {
        visibleDocumentIds: options.visibleDocumentIds,
      }))

    return {
      ...toDocumentBase(document),
      parentId: document.parentId,
      hasChildren: nextChildren.length > 0,
      hasContent: Boolean(document.latestSnapshotId) && document.summary.length > 0,
      children: nextChildren,
    }
  }

  private resolveAccessibleDocument(
    context: TreeContext,
    userId: string,
    id: string,
  ): {
    document: PersistedDocument
    collection: DocumentCollectionId
  } {
    const document = context.documentsById.get(id)

    if (!document) {
      throw new NotFoundException(`Document "${id}" not found`)
    }

    if (document.ownerId === userId) {
      return {
        document,
        collection: resolveOwnedDocumentCollectionId(document.spaceScope),
      }
    }

    let currentDocument: PersistedDocument | undefined = document

    while (currentDocument) {
      if (context.sharedRootIds.has(currentDocument.id)) {
        return {
          document,
          collection: DOCUMENT_COLLECTION.SHARED,
        }
      }

      currentDocument = currentDocument.parentId
        ? context.documentsById.get(currentDocument.parentId)
        : undefined
    }

    throw new NotFoundException(`Document "${id}" not found`)
  }

  private collectDescendantDocumentIds(
    rootId: string,
    context: TreeContext,
    visibleDocumentIds: Set<string>,
  ) {
    if (visibleDocumentIds.has(rootId)) {
      return
    }

    visibleDocumentIds.add(rootId)

    for (const child of context.childrenByParent.get(rootId) ?? []) {
      this.collectDescendantDocumentIds(child.id, context, visibleDocumentIds)
    }
  }

  private ensureDocumentOwner(document: Pick<PersistedDocument, 'ownerId'>, userId: string) {
    if (document.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权编辑该文档')
    }
  }

  private assertPersistableDocumentAssets(body: TiptapJsonContent) {
    if (hasUnresolvedDocumentAssets(body)) {
      throw new BadRequestException('正文中存在未上传完成的资源，请稍后重试')
    }
  }
}

function toDocumentBase(document: PersistedDocument): DocumentBase {
  return {
    id: document.id,
    title: document.title,
    summary: document.summary,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

function toDocumentRecord(document: PersistedDocumentHead): DocumentRecord {
  const { title: _title, ...base } = toDocumentBase(document)

  return {
    ...base,
    ownerId: document.ownerId,
    parentId: document.parentId,
    latestSnapshotId: document.latestSnapshotId,
    order: document.order,
    spaceScope: document.spaceScope,
    status: document.status,
  }
}

function toDocumentRecent(
  document: PersistedDocument,
  context: TreeContext,
  userId: string,
): DocumentRecent {
  return {
    id: document.id,
    title: document.title,
    collection: resolveRecentDocumentCollection(document, userId),
    ancestorTitles: collectRecentAncestorTitles(document, context, userId),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

function resolveRecentDocumentCollection(
  document: PersistedDocument,
  userId: string,
): DocumentCollectionId {
  if (document.ownerId !== userId) {
    return DOCUMENT_COLLECTION.SHARED
  }

  return resolveOwnedDocumentCollectionId(document.spaceScope)
}

function collectRecentAncestorTitles(
  document: PersistedDocument,
  context: TreeContext,
  userId: string,
) {
  if (document.ownerId === userId) {
    return collectOwnedAncestorTitles(document, context, userId)
  }

  const sharedRootId = findSharedRootId(document, context)

  if (!sharedRootId || sharedRootId === document.id) {
    return []
  }

  const ancestorTitles: string[] = []
  let currentDocument = document.parentId
    ? context.documentsById.get(document.parentId)
    : undefined

  while (currentDocument) {
    ancestorTitles.push(currentDocument.title)

    if (currentDocument.id === sharedRootId) {
      return ancestorTitles.reverse()
    }

    currentDocument = currentDocument.parentId
      ? context.documentsById.get(currentDocument.parentId)
      : undefined
  }

  return []
}

function collectOwnedAncestorTitles(
  document: PersistedDocument,
  context: TreeContext,
  userId: string,
) {
  const ancestorTitles: string[] = []
  let currentDocument = document.parentId
    ? context.documentsById.get(document.parentId)
    : undefined

  while (currentDocument?.ownerId === userId) {
    ancestorTitles.push(currentDocument.title)
    currentDocument = currentDocument.parentId
      ? context.documentsById.get(currentDocument.parentId)
      : undefined
  }

  return ancestorTitles.reverse()
}

function findSharedRootId(document: PersistedDocument, context: TreeContext) {
  let currentDocument: PersistedDocument | undefined = document

  while (currentDocument) {
    if (context.sharedRootIds.has(currentDocument.id)) {
      return currentDocument.id
    }

    currentDocument = currentDocument.parentId
      ? context.documentsById.get(currentDocument.parentId)
      : undefined
  }

  return null
}

function toDocumentHead(document: PersistedDocumentHead): DocumentHead {
  if (!document.latestSnapshot) {
    throw new NotFoundException(`Document "${document.id}" head not found`)
  }

  return {
    document: toDocumentRecord(document),
    latestSnapshot: toDocumentSnapshot(document.latestSnapshot),
    headRevision: document.headRevision,
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
