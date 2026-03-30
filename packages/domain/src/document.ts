/**
 * 文档空间范围。
 */
export type DocumentSpaceScope = 'PERSONAL' | 'TEAM'

/**
 * 文档节点状态。
 */
export type DocumentNodeStatus = 'ACTIVE' | 'LOCKED'

/**
 * 文档树分组。
 */
export type DocumentTreeSectionId = 'personal' | 'shared' | 'team'

/**
 * 文档基础模型。
 */
export interface DocumentBase {
  id: string
  title: string
  summary: string
  createdAt: string
  updatedAt: string
}

/**
 * 文档树节点模型。
 */
export interface DocumentTreeNode extends DocumentBase {
  parentId: string | null
  hasChildren: boolean
  hasContent: boolean
  sharedByDisplayName: string | null
  children: DocumentTreeNode[]
}

/**
 * 文档树分组模型。
 */
export interface DocumentTreeSection {
  id: DocumentTreeSectionId
  label: string
  nodes: DocumentTreeNode[]
}

/**
 * 文档详情模型。
 */
export interface DocumentNodeDetail extends DocumentBase {
  parentId: string | null
  content: string
  hasChildren: boolean
  hasContent: boolean
  scope: DocumentSpaceScope
  section: DocumentTreeSectionId
}

/**
 * 创建文档节点载荷。
 */
export interface CreateDocumentNodeRequest {
  title: string
  content?: string
  parentId?: string | null
}

/**
 * 更新文档载荷。
 */
export interface UpdateDocumentNodeRequest {
  title: string
  content: string
}
