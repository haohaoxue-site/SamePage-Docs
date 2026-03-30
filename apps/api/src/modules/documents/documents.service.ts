import type { DocumentSpaceScope, DocumentTreeNode } from '@haohaoxue/samepage-domain'
import type { CreateDocumentNodeDto, UpdateDocumentNodeDto } from './documents.dto'
import type {
  DocumentBaseEntity,
  DocumentNodeEntity,
  DocumentTreeSectionEntity,
} from './documents.interface'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import {
  DocumentNodeMemberRole,
  DocumentNodeStatus,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { stripHtmlTags, summarizeHtml } from '../../utils/html'

const RECENT_DOCUMENT_LIMIT = 8

const documentNodeSelect = {
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
} satisfies Prisma.DocumentNodeSelect

type PersistedDocumentNode = Prisma.DocumentNodeGetPayload<{
  select: typeof documentNodeSelect
}>

interface TreeContext {
  nodes: PersistedDocumentNode[]
  nodesById: Map<string, PersistedDocumentNode>
  childrenByParent: Map<string | null, PersistedDocumentNode[]>
  sharedRootIds: Set<string>
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, payload: CreateDocumentNodeDto): Promise<DocumentNodeEntity> {
    const normalizedParentId = payload.parentId ?? null
    const normalizedContent = payload.content ?? ''
    let scope: DocumentSpaceScope = 'PERSONAL'

    if (normalizedParentId) {
      const context = await this.loadTreeContext(userId)
      const resolvedParent = this.resolveAccessibleNode(context, userId, normalizedParentId)

      if (resolvedParent.node.ownerId !== userId) {
        throw new ForbiddenException('当前用户无权在共享文档下创建子文档')
      }

      scope = resolvedParent.node.spaceScope
    }

    const lastSibling = await this.prisma.documentNode.findFirst({
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

    const node = await this.prisma.documentNode.create({
      data: {
        ownerId: userId,
        parentId: normalizedParentId,
        spaceScope: scope,
        title: payload.title,
        content: normalizedContent,
        summary: summarizeHtml(normalizedContent),
        order: (lastSibling?.order ?? -1) + 1,
      },
      select: documentNodeSelect,
    })

    return toDocumentNodeEntity(
      node,
      scope === 'TEAM' ? 'team' : 'personal',
      false,
    )
  }

  async findTree(userId: string): Promise<DocumentTreeSectionEntity[]> {
    const context = await this.loadTreeContext(userId)

    return [
      {
        id: 'personal',
        label: '当前用户',
        nodes: this.buildOwnedSection(context, userId, 'PERSONAL'),
      },
      {
        id: 'shared',
        label: '分享',
        nodes: this.buildSharedSection(context),
      },
      {
        id: 'team',
        label: '团队',
        nodes: this.buildOwnedSection(context, userId, 'TEAM'),
      },
    ]
  }

  async findRecent(userId: string): Promise<DocumentBaseEntity[]> {
    const context = await this.loadTreeContext(userId)
    const visibleNodeIds = new Set<string>()

    for (const node of context.nodes) {
      if (node.ownerId === userId) {
        visibleNodeIds.add(node.id)
      }
    }

    for (const sharedRootId of context.sharedRootIds) {
      this.collectDescendantIds(sharedRootId, context, visibleNodeIds)
    }

    return Array.from(visibleNodeIds)
      .map(id => context.nodesById.get(id))
      .filter((node): node is PersistedDocumentNode => Boolean(node))
      .filter(node => hasNodeContent(node.content))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, RECENT_DOCUMENT_LIMIT)
      .map(node => toDocumentBaseEntity(node))
  }

  async findOne(userId: string, id: string): Promise<DocumentNodeEntity> {
    const context = await this.loadTreeContext(userId)
    const resolvedNode = this.resolveAccessibleNode(context, userId, id)

    return toDocumentNodeEntity(
      resolvedNode.node,
      resolvedNode.section,
      this.hasChildren(id, context),
    )
  }

  async update(
    userId: string,
    id: string,
    payload: UpdateDocumentNodeDto,
  ): Promise<DocumentNodeEntity> {
    const context = await this.loadTreeContext(userId)
    const resolvedNode = this.resolveAccessibleNode(context, userId, id)

    if (resolvedNode.node.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权编辑该文档')
    }

    const node = await this.prisma.documentNode.update({
      where: { id },
      data: {
        title: payload.title,
        content: payload.content,
        summary: summarizeHtml(payload.content),
      },
      select: documentNodeSelect,
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document node "${id}" not found`)
      }
      throw error
    })

    return toDocumentNodeEntity(
      node,
      resolvedNode.section,
      this.hasChildren(id, context),
    )
  }

  async remove(userId: string, id: string): Promise<void> {
    const context = await this.loadTreeContext(userId)
    const resolvedNode = this.resolveAccessibleNode(context, userId, id)

    if (resolvedNode.node.ownerId !== userId) {
      throw new ForbiddenException('当前用户无权删除该文档')
    }

    const removableNodeIds = new Set<string>()
    this.collectDescendantIds(id, context, removableNodeIds)

    await this.prisma.documentNode.deleteMany({
      where: {
        id: {
          in: Array.from(removableNodeIds),
        },
      },
    })
  }

  private async loadTreeContext(userId: string): Promise<TreeContext> {
    const [nodes, sharedMemberships] = await Promise.all([
      this.prisma.documentNode.findMany({
        where: { status: { in: [DocumentNodeStatus.ACTIVE, DocumentNodeStatus.LOCKED] } },
        select: documentNodeSelect,
        orderBy: [
          { order: 'asc' },
          { updatedAt: 'desc' },
        ],
      }),
      this.prisma.documentNodeMember.findMany({
        where: {
          userId,
          role: DocumentNodeMemberRole.VIEWER,
        },
        select: {
          nodeId: true,
        },
      }),
    ])

    const nodesById = new Map(nodes.map(node => [node.id, node]))
    const childrenByParent = new Map<string | null, PersistedDocumentNode[]>()

    for (const node of nodes) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }

    const membershipIds = sharedMemberships
      .map(item => item.nodeId)
      .filter(nodeId => nodesById.has(nodeId))

    const membershipSet = new Set(membershipIds)
    const sharedRootIds = new Set(
      membershipIds.filter((nodeId) => {
        let currentNode = nodesById.get(nodeId)

        while (currentNode?.parentId) {
          if (membershipSet.has(currentNode.parentId)) {
            return false
          }

          currentNode = nodesById.get(currentNode.parentId)
        }

        return true
      }),
    )

    return {
      nodes,
      nodesById,
      childrenByParent,
      sharedRootIds,
    }
  }

  private buildOwnedSection(
    context: TreeContext,
    userId: string,
    scope: DocumentSpaceScope,
  ): DocumentTreeNode[] {
    const sectionNodes = context.nodes.filter(node => node.ownerId === userId && node.spaceScope === scope)
    const sectionNodeIds = new Set(sectionNodes.map(node => node.id))
    const roots = sectionNodes.filter(node => !node.parentId || !sectionNodeIds.has(node.parentId))

    return roots.map(node =>
      this.buildSectionBranch(node, context, {
        sectionNodeIds,
        sharedByDisplayName: null,
      }),
    )
  }

  private buildSharedSection(context: TreeContext): DocumentTreeNode[] {
    return Array.from(context.sharedRootIds)
      .map(rootId => context.nodesById.get(rootId))
      .filter((node): node is PersistedDocumentNode => Boolean(node))
      .map(node =>
        this.buildSectionBranch(node, context, {
          sharedByDisplayName: node.owner.displayName,
        }),
      )
  }

  private buildSectionBranch(
    node: PersistedDocumentNode,
    context: TreeContext,
    options: {
      sectionNodeIds?: Set<string>
      sharedByDisplayName: string | null
    },
  ): DocumentTreeNode {
    const nextChildren = (context.childrenByParent.get(node.id) ?? [])
      .filter(child => !options.sectionNodeIds || options.sectionNodeIds.has(child.id))
      .map(child => this.buildSectionBranch(child, context, {
        sectionNodeIds: options.sectionNodeIds,
        sharedByDisplayName: null,
      }))

    return {
      ...toDocumentBaseEntity(node),
      parentId: node.parentId,
      hasChildren: nextChildren.length > 0,
      hasContent: hasNodeContent(node.content),
      sharedByDisplayName: options.sharedByDisplayName,
      children: nextChildren,
    }
  }

  private resolveAccessibleNode(
    context: TreeContext,
    userId: string,
    id: string,
  ): {
    node: PersistedDocumentNode
    section: 'personal' | 'shared' | 'team'
  } {
    const node = context.nodesById.get(id)

    if (!node) {
      throw new NotFoundException(`Document node "${id}" not found`)
    }

    if (node.ownerId === userId) {
      return {
        node,
        section: node.spaceScope === 'TEAM' ? 'team' : 'personal',
      }
    }

    let currentNode: PersistedDocumentNode | undefined = node

    while (currentNode) {
      if (context.sharedRootIds.has(currentNode.id)) {
        return {
          node,
          section: 'shared',
        }
      }

      currentNode = currentNode.parentId
        ? context.nodesById.get(currentNode.parentId)
        : undefined
    }

    throw new NotFoundException(`Document node "${id}" not found`)
  }

  private collectDescendantIds(
    rootId: string,
    context: TreeContext,
    visibleNodeIds: Set<string>,
  ) {
    if (visibleNodeIds.has(rootId)) {
      return
    }

    visibleNodeIds.add(rootId)

    for (const child of context.childrenByParent.get(rootId) ?? []) {
      this.collectDescendantIds(child.id, context, visibleNodeIds)
    }
  }

  private hasChildren(nodeId: string, context: TreeContext) {
    return (context.childrenByParent.get(nodeId)?.length ?? 0) > 0
  }
}

function toDocumentBaseEntity(node: PersistedDocumentNode): DocumentBaseEntity {
  return {
    id: node.id,
    title: node.title,
    summary: node.summary,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  }
}

function toDocumentNodeEntity(
  node: PersistedDocumentNode,
  section: 'personal' | 'shared' | 'team',
  hasChildren: boolean,
): DocumentNodeEntity {
  return {
    ...toDocumentBaseEntity(node),
    parentId: node.parentId,
    content: node.content,
    hasChildren,
    hasContent: hasNodeContent(node.content),
    scope: node.spaceScope,
    section,
  }
}

function hasNodeContent(content: string) {
  return stripHtmlTags(content).trim().length > 0
}
