import type {
  DocumentCollectionId,
  DocumentItem,
  DocumentPaneState,
  DocumentRecord,
  DocumentRevision,
  DocumentSnapshot,
  DocumentTreeGroup,
  TiptapJsonContent,
  TiptapSchemaVersion,
} from '@haohaoxue/samepage-domain'

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
 * 文档编辑区域属性。
 */
export interface DocumentEditorPaneProps {
  document: ActiveDocumentDetail | null
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
  createDocument: []
  openFallbackDocument: []
  retryLoad: []
}

/**
 * 文档编辑区属性。
 */
export interface DocumentEditorProps {
  document: ActiveDocumentDetail
}

/**
 * 文档编辑区事件。
 */
export interface DocumentEditorEmits {
  updateTitle: [title: TiptapJsonContent]
  updateContent: [content: TiptapJsonContent]
  contentError: [error: Error]
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
  isLoading: boolean
  isRestoring: boolean
}

/**
 * 文档历史面板事件。
 */
export interface DocumentHistoryPanelEmits {
  restore: [snapshotId: string]
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
}

/**
 * 文档树工具栏事件。
 */
export interface DocumentToolbarEmits {
  createRoot: []
}

/**
 * 文档分组面板属性。
 */
export interface DocumentSectionPanelProps {
  group: DocumentTreeGroup
  activeDocumentId: string | null
  expandedDocumentIds: Set<string>
  isCollapsed: boolean
  isActionPending: boolean
}

/**
 * 文档分组面板事件。
 */
export interface DocumentSectionPanelEmits {
  open: [documentId: string]
  toggle: [documentId: string]
  toggleCollapse: [collectionId: DocumentCollectionId]
  createRoot: []
  createChild: [documentId: string]
  deleteDocument: [documentId: string]
}

/**
 * 文档树条目属性。
 */
export interface DocumentItemProps {
  item: DocumentItem
  collectionId: DocumentCollectionId
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
  deleteDocument: [documentId: string]
}
