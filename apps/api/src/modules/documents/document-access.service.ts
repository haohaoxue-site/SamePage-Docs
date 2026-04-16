import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DocumentMemberRole, DocumentStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type PersistedDocument = Prisma.DocumentGetPayload<{
  select: typeof documentAccessSelect
}>

/**
 * 文档访问上下文。
 */
interface DocumentAccessContext {
  documentsById: Map<string, PersistedDocument>
  sharedRootIds: Set<string>
}

const documentAccessSelect = {
  id: true,
  ownerId: true,
  parentId: true,
  spaceScope: true,
} satisfies Prisma.DocumentSelect

@Injectable()
export class DocumentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanReadDocument(userId: string, documentId: string): Promise<PersistedDocument> {
    const context = await this.loadContext(userId)
    return this.resolveReadableDocument(context, userId, documentId)
  }

  async assertCanEditDocument(userId: string, documentId: string): Promise<PersistedDocument> {
    const document = await this.assertCanReadDocument(userId, documentId)

    if (document.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权编辑该文档')
    }

    return document
  }

  private async loadContext(userId: string): Promise<DocumentAccessContext> {
    const [documents, sharedMemberships] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          status: {
            in: [DocumentStatus.ACTIVE, DocumentStatus.LOCKED],
          },
        },
        select: documentAccessSelect,
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
      documentsById,
      sharedRootIds,
    }
  }

  private resolveReadableDocument(
    context: DocumentAccessContext,
    userId: string,
    documentId: string,
  ): PersistedDocument {
    const document = context.documentsById.get(documentId)

    if (!document) {
      throw new NotFoundException(`Document "${documentId}" not found`)
    }

    if (document.ownerId === userId) {
      return document
    }

    let currentDocument: PersistedDocument | undefined = document

    while (currentDocument) {
      if (context.sharedRootIds.has(currentDocument.id)) {
        return document
      }

      currentDocument = currentDocument.parentId
        ? context.documentsById.get(currentDocument.parentId)
        : undefined
    }

    throw new NotFoundException(`Document "${documentId}" not found`)
  }
}
