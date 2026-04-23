import type {
  DocumentCollectionId,
  DocumentItem,
  DocumentPaneState,
  DocumentRecord,
  DocumentRevision,
  DocumentShareProjection,
  DocumentShareRecipientSummary,
  DocumentSnapshot,
  DocumentTreeGroup,
  TiptapJsonContent,
  TiptapSchemaVersion,
  WorkspaceType,
} from '@haohaoxue/samepage-domain'
import type { TiptapEditorCommentRequest } from '@/components/tiptap-editor'

/**
 * 文档页本地编辑态。
 */
export interface ActiveDocumentDetail extends Omit<DocumentRecord, 'latestSnapshotId'> {
  latestSnapshotId: string
  headRevision: DocumentRevision
  schemaVersion: TiptapSchemaVersion
  title: TiptapJsonContent
  body: TiptapJsonContent
}

/**
 * 文档编辑模式。
 */
export type DocumentEditorMode = 'default' | 'history' | 'readonly'

/**
 * 文档页主区视图。
 */
export type DocsSurfaceView = 'document' | 'permissions' | 'trash' | 'pending-shares'

/**
 * 分享收件箱模式。
 */
export type DocumentShareInboxMode = 'pending' | 'active'

/**
 * 文档分享变更事件。
 */
export interface DocumentShareChangedPayload {
  /** 文档 ID */
  documentId: string
  /** 最新分享投影 */
  share: DocumentShareProjection | null
}

/**
 * 文档作者信息。
 */
export interface DocumentEditorUserMeta {
  /** 显示名称 */
  displayName: string
  /** 头像地址 */
  avatarUrl: string | null
  /** 头像回退字母 */
  initial: string
}

/**
 * 文档头部元信息。
 */
export interface DocumentEditorMeta {
  /** 作者信息 */
  user: DocumentEditorUserMeta
  /** 修改时间文案 */
  updatedLabel: string
  /** 创建时间文案 */
  createdLabel: string
}

/**
 * 文档编辑区域属性。
 */
export interface DocumentEditorPaneProps {
  document: ActiveDocumentDetail | null
  metadata: DocumentEditorMeta | null
  mode: DocumentEditorMode
  /** 当前 URL 对应的块 ID */
  activeBlockId?: string | null
  isLoading: boolean
  paneState: DocumentPaneState
  hasFallbackDocument: boolean
}

/**
 * 文档编辑区域事件。
 */
export interface DocumentEditorPaneEmits {
  updateTitle: [title: TiptapJsonContent]
  updateContent: [content: TiptapJsonContent]
  requestComment: [request: TiptapEditorCommentRequest]
  createDocument: []
  openFallbackDocument: []
  retryLoad: []
}

/**
 * 文档编辑区属性。
 */
export interface DocumentEditorProps {
  document: ActiveDocumentDetail
  metadata: DocumentEditorMeta | null
  mode: DocumentEditorMode
  /** 当前 URL 对应的块 ID */
  activeBlockId?: string | null
}

/**
 * 文档编辑区事件。
 */
export interface DocumentEditorEmits {
  updateTitle: [title: TiptapJsonContent]
  updateContent: [content: TiptapJsonContent]
  contentError: [error: Error]
  requestComment: [request: TiptapEditorCommentRequest]
}

/**
 * 文档上下文操作属性。
 */
export interface DocumentContextActionsProps {
  canDeleteDocument: boolean
  canMoveToTeam: boolean
}

/**
 * 文档上下文操作事件。
 */
export interface DocumentContextActionsEmits {
  openHistory: []
  moveDocumentToTeam: []
  deleteDocument: []
}

/**
 * 文档编辑回退态属性。
 */
export interface DocumentEditorFallbackProps {
  paneState: DocumentPaneState
  isLoading: boolean
  hasFallbackDocument: boolean
  contentError: Error | null
}

/**
 * 文档编辑回退态事件。
 */
export interface DocumentEditorFallbackEmits {
  createDocument: []
  openFallbackDocument: []
  retryLoad: []
}

/**
 * 文档历史面板属性。
 */
export interface DocumentHistoryPanelProps {
  document: ActiveDocumentDetail | null
  snapshots: DocumentSnapshot[]
  selectedSnapshotId: string | null
  isLoading: boolean
}

/**
 * 文档历史面板事件。
 */
export interface DocumentHistoryPanelEmits {
  select: [snapshotId: string]
}

/**
 * 文档历史条目。
 */
export interface DocumentHistoryEntry {
  snapshotId: string
  snapshot: DocumentSnapshot
  timeLabel: string
  summary: string | null
  userDisplayName: string
  changeCount: number
  isCurrentSnapshot: boolean
  isCurrentContent: boolean
}

/**
 * 文档历史分组。
 */
export interface DocumentHistoryGroup {
  id: string
  label: string
  entries: DocumentHistoryEntry[]
  collapsible: boolean
  defaultExpanded: boolean
}

/**
 * 文档历史分段。
 */
export interface DocumentHistorySection {
  id: string
  label: string
  groups: DocumentHistoryGroup[]
}

/**
 * 文档树工具栏属性。
 */
export interface DocumentToolbarProps {
  isBusy: boolean
  collectionId: DocumentCollectionId
}

/**
 * 文档树工具栏事件。
 */
export interface DocumentToolbarEmits {
  createRoot: [collectionId: DocumentCollectionId]
}

/**
 * 文档分组面板属性。
 */
export interface DocumentSectionPanelProps {
  group: DocumentTreeGroup
  currentWorkspaceType: WorkspaceType
  activeDocumentId: string | null
  expandedDocumentIds: Set<string>
  isCollapsed: boolean
  isActionPending: boolean
  canCreateRoot?: boolean
}

/**
 * 文档分组面板事件。
 */
export interface DocumentSectionPanelEmits {
  open: [documentId: string]
  toggle: [documentId: string]
  toggleCollapse: [collectionId: DocumentCollectionId]
  createRoot: [collectionId: DocumentCollectionId]
  createChild: [documentId: string]
  moveDocumentToTeam: [documentId: string]
  shareDocument: [documentId: string]
  deleteDocument: [documentId: string]
}

/**
 * 文档树条目属性。
 */
export interface DocumentItemProps {
  item: DocumentItem
  collectionId: DocumentCollectionId
  currentWorkspaceType: WorkspaceType
  depth: number
  activeDocumentId: string | null
  expandedDocumentIds: Set<string>
  isActionPending: boolean
}

/**
 * 文档树条目事件。
 */
export interface DocumentItemEmits {
  open: [documentId: string]
  toggle: [documentId: string]
  createChild: [documentId: string]
  moveDocumentToTeam: [documentId: string]
  shareDocument: [documentId: string]
  deleteDocument: [documentId: string]
}

/**
 * 分享收件箱列表属性。
 */
export interface DocumentShareInboxListProps {
  mode: DocumentShareInboxMode
  items: DocumentShareRecipientSummary[]
  isLoading: boolean
  errorMessage: string
  actionRecipientId: string
}

/**
 * 分享收件箱列表事件。
 */
export interface DocumentShareInboxListEmits {
  reload: []
  open: [recipientId: string]
  accept: [recipientId: string]
  decline: [recipientId: string]
  exit: [recipientId: string]
}
