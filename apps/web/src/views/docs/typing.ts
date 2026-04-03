import type {
  DocumentDetail,
  DocumentItem,
  DocumentSection,
  DocumentSectionId,
} from '@haohaoxue/samepage-domain'

export type DocumentPaneState = 'ready' | 'loading' | 'empty' | 'unselected' | 'not-found' | 'forbidden' | 'error'

/**
 * 文档编辑区域属性。
 */
export interface DocumentEditorPaneProps {
  document: DocumentDetail | null
  isLoading: boolean
  paneState: DocumentPaneState
  hasFallbackDocument: boolean
}

/**
 * 文档编辑区域事件。
 */
export interface DocumentEditorPaneEmits {
  updateTitle: [title: string]
  updateContent: [content: string]
  createDocument: []
  openFallbackDocument: []
  retryLoad: []
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
  section: DocumentSection
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
  toggleCollapse: [sectionId: DocumentSectionId]
  createRoot: []
  createChild: [documentId: string]
  deleteDocument: [documentId: string]
}

/**
 * 文档树条目属性。
 */
export interface DocumentItemProps {
  item: DocumentItem
  sectionId: DocumentSectionId
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
