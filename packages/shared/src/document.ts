import type {
  DocumentCollectionId,
  DocumentSaveState,
  DocumentSpaceScope,
  OwnedDocumentCollectionId,
} from '@haohaoxue/samepage-domain'
import {
  DOCUMENT_COLLECTION_LABELS,
  DOCUMENT_COLLECTION_VALUES,
  DOCUMENT_SAVE_STATE,
  OWNED_DOCUMENT_COLLECTION_BY_SPACE_SCOPE,
} from '@haohaoxue/samepage-contracts'

export function isDocumentCollectionId(value: string): value is DocumentCollectionId {
  return DOCUMENT_COLLECTION_VALUES.includes(value as DocumentCollectionId)
}

export function resolveOwnedDocumentCollectionId(scope: DocumentSpaceScope): OwnedDocumentCollectionId {
  return OWNED_DOCUMENT_COLLECTION_BY_SPACE_SCOPE[scope]
}

export function formatDocumentCollectionLabel(collectionId: DocumentCollectionId): string {
  return DOCUMENT_COLLECTION_LABELS[collectionId]
}

export function formatDocumentLocation(collectionId: DocumentCollectionId, ancestorTitles: string[]): string {
  return [formatDocumentCollectionLabel(collectionId), ...ancestorTitles].join('/')
}

export function getDocumentSaveStateLabel(options: {
  hasDocument: boolean
  saveState: DocumentSaveState
  lastUpdatedFromNow?: string | null
}): string {
  if (!options.hasDocument) {
    return '未选择文档'
  }

  if (options.saveState === DOCUMENT_SAVE_STATE.DIRTY) {
    return '未保存'
  }

  if (options.saveState === DOCUMENT_SAVE_STATE.SAVING) {
    return '保存中'
  }

  if (options.saveState === DOCUMENT_SAVE_STATE.SAVED) {
    return '已保存到云端'
  }

  if (options.saveState === DOCUMENT_SAVE_STATE.ERROR) {
    return '保存失败，内容未保存'
  }

  if (!options.lastUpdatedFromNow) {
    return '暂无更新记录'
  }

  return `上次更新于 ${options.lastUpdatedFromNow}`
}
