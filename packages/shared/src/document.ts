import type {
  DocumentCollectionId,
  DocumentSaveState,
  DocumentSpaceScope,
  DocumentTitleContent,
  OwnedDocumentCollectionId,
  TiptapJsonContent,
  TiptapJsonNode,
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

export function createDocumentTitleContent(title: string): DocumentTitleContent {
  const normalizedTitle = normalizeDocumentTitleText(title)

  if (!normalizedTitle) {
    return []
  }

  return [
    {
      type: 'text',
      text: normalizedTitle,
    },
  ]
}

export function getDocumentTitlePlainText(content: DocumentTitleContent): string {
  return normalizeDocumentTitleText(content.map(node => node.text).join(''))
}

export function serializeDocumentContent(content: TiptapJsonContent): string {
  return JSON.stringify(content)
}

export function deserializeDocumentContent(content: string): TiptapJsonContent {
  if (!content.trim()) {
    return []
  }

  return JSON.parse(content) as TiptapJsonContent
}

export function getDocumentPlainText(content: TiptapJsonContent): string {
  const textParts: string[] = []

  for (const node of content) {
    walkTiptapNode(node, textParts)
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

export function summarizeDocumentContent(
  content: TiptapJsonContent,
  maxLength = 120,
  fallback = '暂无摘要',
): string {
  const plainText = getDocumentPlainText(content)

  return plainText.slice(0, maxLength) || fallback
}

export function hasDocumentContent(content: TiptapJsonContent): boolean {
  return getDocumentPlainText(content).length > 0
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

function walkTiptapNode(node: TiptapJsonNode | undefined, textParts: string[]) {
  if (!node) {
    return
  }

  if (typeof node.text === 'string' && node.text.trim()) {
    textParts.push(node.text)
  }

  const childNodes = node.content

  if (!Array.isArray(childNodes)) {
    return
  }

  for (const child of childNodes) {
    if (isTiptapJsonNode(child)) {
      walkTiptapNode(child, textParts)
    }
  }
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeDocumentTitleText(title: string) {
  return title.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
}
