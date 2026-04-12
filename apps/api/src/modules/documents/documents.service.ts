import type {
  CreateDocumentRequest,
  DocumentBase,
  DocumentCollectionId,
  DocumentDetail,
  DocumentItem,
  DocumentRecent,
  DocumentSpaceScope,
  DocumentTreeGroup,
  UpdateDocumentRequest,
} from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { resolveOwnedDocumentCollectionId } from '@haohaoxue/samepage-shared'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import {
  DocumentMemberRole,
  DocumentStatus,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { stripHtmlTags, summarizeHtml } from '../../utils/html'

const RECENT_DOCUMENT_LIMIT = 8

const documentSelect = {
  id: true,
  ownerId: true,
  parentId: true,
  spaceScope: true,
  title: true,
  content: true,
  summary: true,
  status: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      displayName: true,
    },
  },
} satisfies Prisma.DocumentSelect

type PersistedDocument = Prisma.DocumentGetPayload<{
  select: typeof documentSelect
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
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(userId: string, payload: CreateDocumentRequest): Promise<DocumentDetail> {
    const normalizedParentId = payload.parentId ?? null
    const normalizedContent = payload.content ?? ''
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

    const document = await this.prisma.document.create({
      data: {
        ownerId: userId,
        parentId: normalizedParentId,
        spaceScope: scope,
        title: payload.title,
        content: normalizedContent,
        summary: summarizeHtml(normalizedContent),
        order: (lastSibling?.order ?? -1) + 1,
      },
      select: documentSelect,
    })

    return toDocumentDetail(
      document,
      resolveOwnedDocumentCollectionId(scope),
      false,
    )
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
      .filter(document => hasDocumentContent(document.content))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, RECENT_DOCUMENT_LIMIT)
      .map(document => toDocumentRecent(document, context, userId))
  }

  async getDocumentById(userId: string, id: string): Promise<DocumentDetail> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)

    return toDocumentDetail(
      resolvedDocument.document,
      resolvedDocument.collection,
      this.hasChildren(id, context),
    )
  }

  async updateDocument(
    userId: string,
    id: string,
    payload: UpdateDocumentRequest,
  ): Promise<DocumentDetail> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)

    if (resolvedDocument.document.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权编辑该文档')
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        title: payload.title,
        content: payload.content,
        summary: summarizeHtml(payload.content),
      },
      select: documentSelect,
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document "${id}" not found`)
      }
      throw error
    })

    return toDocumentDetail(
      document,
      resolvedDocument.collection,
      this.hasChildren(id, context),
    )
  }

  async deleteDocument(userId: string, id: string): Promise<void> {
    const context = await this.loadDocumentContext(userId)
    const resolvedDocument = this.resolveAccessibleDocument(context, userId, id)

    if (resolvedDocument.document.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权删除该文档')
    }

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
        sharedByDisplayName: null,
      }),
    )
  }

  private buildSharedGroup(context: TreeContext): DocumentItem[] {
    return Array.from(context.sharedRootIds)
      .map(rootId => context.documentsById.get(rootId))
      .filter((document): document is PersistedDocument => Boolean(document))
      .map(document =>
        this.buildGroupBranch(document, context, {
          sharedByDisplayName: document.owner.displayName,
        }),
      )
  }

  private buildGroupBranch(
    document: PersistedDocument,
    context: TreeContext,
    options: {
      visibleDocumentIds?: Set<string>
      sharedByDisplayName: string | null
    },
  ): DocumentItem {
    const nextChildren = (context.childrenByParent.get(document.id) ?? [])
      .filter(child => !options.visibleDocumentIds || options.visibleDocumentIds.has(child.id))
      .map(child => this.buildGroupBranch(child, context, {
        visibleDocumentIds: options.visibleDocumentIds,
        sharedByDisplayName: null,
      }))

    return {
      ...toDocumentBase(document),
      parentId: document.parentId,
      hasChildren: nextChildren.length > 0,
      hasContent: hasDocumentContent(document.content),
      sharedByDisplayName: options.sharedByDisplayName,
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

  private hasChildren(documentId: string, context: TreeContext) {
    return (context.childrenByParent.get(documentId)?.length ?? 0) > 0
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

function toDocumentDetail(
  document: PersistedDocument,
  collection: DocumentCollectionId,
  hasChildren: boolean,
): DocumentDetail {
  return {
    ...toDocumentBase(document),
    parentId: document.parentId,
    content: document.content,
    hasChildren,
    hasContent: hasDocumentContent(document.content),
    scope: document.spaceScope,
    collection,
  }
}

function hasDocumentContent(content: string) {
  return stripHtmlTags(content).trim().length > 0
}
