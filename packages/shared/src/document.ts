import type {
  DocumentAsset,
  DocumentCollectionId,
  DocumentSaveState,
  DocumentSnapshot,
  DocumentSpaceScope,
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

export function createDocumentTitleContent(title: string): TiptapJsonContent {
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

export function getDocumentTitlePlainText(content: TiptapJsonContent): string {
  return normalizeDocumentTitleText(content.map(node => node.text).join(''))
}

export function getDocumentSnapshotTitlePlainText(snapshot: Pick<DocumentSnapshot, 'title'>): string {
  return getDocumentTitlePlainText(snapshot.title)
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

export function getDocumentSnapshotSummary(
  snapshot: Pick<DocumentSnapshot, 'body'>,
  maxLength = 120,
  fallback = '暂无摘要',
): string {
  return summarizeDocumentContent(snapshot.body, maxLength, fallback)
}

export function hasDocumentContent(content: TiptapJsonContent): boolean {
  return getDocumentPlainText(content).length > 0
}

export function collectDocumentAssetIds(content: TiptapJsonContent): string[] {
  const assetIds = new Set<string>()

  for (const node of content) {
    collectNodeAssetIds(node, assetIds)
  }

  return Array.from(assetIds)
}

export function stripDocumentRuntimeAttributes(content: TiptapJsonContent): TiptapJsonContent {
  return content.map(node => stripNodeRuntimeAttributes(node))
}

export function hydrateDocumentAssetAttributes(
  content: TiptapJsonContent,
  assetsById: Record<string, DocumentAsset>,
): TiptapJsonContent {
  return content.map(node => hydrateNodeAssetAttributes(node, assetsById))
}

export function hasUnresolvedDocumentAssets(content: TiptapJsonContent): boolean {
  return content.some(node => hasNodeWithMissingAssetId(node))
}

export function isSameDocumentSnapshotContent(
  left: Pick<DocumentSnapshot, 'schemaVersion' | 'title' | 'body'>,
  right: Pick<DocumentSnapshot, 'schemaVersion' | 'title' | 'body'>,
): boolean {
  return left.schemaVersion === right.schemaVersion
    && JSON.stringify(left.title) === JSON.stringify(right.title)
    && JSON.stringify(left.body) === JSON.stringify(right.body)
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

function collectNodeAssetIds(node: TiptapJsonNode | undefined, assetIds: Set<string>) {
  if (!node) {
    return
  }

  const assetId = readAssetId(node)

  if (assetId) {
    assetIds.add(assetId)
  }

  const childNodes = node.content

  if (!Array.isArray(childNodes)) {
    return
  }

  for (const child of childNodes) {
    if (isTiptapJsonNode(child)) {
      collectNodeAssetIds(child, assetIds)
    }
  }
}

function stripNodeRuntimeAttributes(node: TiptapJsonNode): TiptapJsonNode {
  const nextNode: TiptapJsonNode = {
    ...node,
  }

  if (node.attrs && typeof node.attrs === 'object') {
    const nextAttrs = {
      ...node.attrs,
    }

    if (node.type === 'image') {
      delete nextAttrs.src
    }
    else if (node.type === 'file') {
      delete nextAttrs.fileName
      delete nextAttrs.mimeType
      delete nextAttrs.size
      delete nextAttrs.contentUrl
    }

    nextNode.attrs = Object.keys(nextAttrs).length ? nextAttrs : undefined
  }

  if (Array.isArray(node.content)) {
    nextNode.content = node.content
      .filter(isTiptapJsonNode)
      .map(child => stripNodeRuntimeAttributes(child))
  }

  return nextNode
}

function hydrateNodeAssetAttributes(
  node: TiptapJsonNode,
  assetsById: Record<string, DocumentAsset>,
): TiptapJsonNode {
  const nextNode: TiptapJsonNode = {
    ...node,
  }

  if (node.attrs && typeof node.attrs === 'object') {
    const nextAttrs = {
      ...node.attrs,
    }
    const assetId = readAssetId(node)
    const asset = assetId ? assetsById[assetId] : undefined

    if (node.type === 'image' && asset?.kind === 'image' && asset.contentUrl) {
      nextAttrs.src = asset.contentUrl
    }
    else if (node.type === 'file' && asset?.kind === 'file') {
      nextAttrs.fileName = asset.fileName
      nextAttrs.mimeType = asset.mimeType
      nextAttrs.size = asset.size
      nextAttrs.contentUrl = asset.contentUrl
    }

    nextNode.attrs = nextAttrs
  }

  if (Array.isArray(node.content)) {
    nextNode.content = node.content
      .filter(isTiptapJsonNode)
      .map(child => hydrateNodeAssetAttributes(child, assetsById))
  }

  return nextNode
}

function readAssetId(node: TiptapJsonNode): string | null {
  const assetId = node.attrs?.assetId

  return typeof assetId === 'string' && assetId.length ? assetId : null
}

function hasNodeWithMissingAssetId(node: TiptapJsonNode): boolean {
  if ((node.type === 'image' || node.type === 'file') && !readAssetId(node)) {
    return true
  }

  const childNodes = node.content

  if (!Array.isArray(childNodes)) {
    return false
  }

  return childNodes
    .filter(isTiptapJsonNode)
    .some(child => hasNodeWithMissingAssetId(child))
}

function normalizeDocumentTitleText(title: string) {
  return title.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
}
