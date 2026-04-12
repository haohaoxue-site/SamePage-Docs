import type { DocumentCollectionId } from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, vi } from 'vitest'

/**
 * 文档测试夹具。
 */
interface MockDocument {
  id: string
  title: string
  parentId: string | null
  content: string
  summary: string
  createdAt: string
  updatedAt: string
  hasChildren: boolean
  hasContent: boolean
  collection: DocumentCollectionId
}

/**
 * 文档树测试节点。
 */
interface MockDocumentItem {
  id: string
  title: string
  parentId: string | null
  summary: string
  createdAt: string
  updatedAt: string
  hasChildren: boolean
  hasContent: boolean
  sharedByDisplayName: string | null
  children: MockDocumentItem[]
}

const initialMockDocuments: MockDocument[] = [
  {
    id: 'welcome',
    title: '欢迎来到 SamePage',
    parentId: null,
    content: `
      <h1>欢迎来到 SamePage</h1>
      <p>这是第一篇文档。</p>
      <p>我们会先完成 Web 工作台和基础编辑能力，再逐步接入 API、协作与 AI。</p>
    `,
    summary: '这是产品的第一篇引导文档，用来说明当前 MVP 的定位与目标。',
    createdAt: '2026-03-29T08:00:00.000Z',
    updatedAt: '2026-03-30T08:00:00.000Z',
    hasChildren: true,
    hasContent: true,
    collection: DOCUMENT_COLLECTION.PERSONAL,
  },
  {
    id: 'product-brief',
    title: '产品简报',
    parentId: 'welcome',
    content: `
      <h1>产品简报</h1>
      <p>SamePage 的目标是构建一个中文优先的协作文档平台。</p>
    `,
    summary: '明确产品愿景、阶段目标和用户价值，作为团队对齐的起点。',
    createdAt: '2026-03-29T09:00:00.000Z',
    updatedAt: '2026-03-30T09:00:00.000Z',
    hasChildren: false,
    hasContent: true,
    collection: DOCUMENT_COLLECTION.PERSONAL,
  },
  {
    id: 'meeting-notes',
    title: '迭代会议纪要',
    parentId: null,
    content: `
      <h1>迭代会议纪要</h1>
      <p>本周重点包括路由布局、样式基线和编辑器工具栏。</p>
    `,
    summary: '记录首阶段重点：工程基线、页面壳子、编辑器 MVP。',
    createdAt: '2026-03-29T10:00:00.000Z',
    updatedAt: '2026-03-30T10:00:00.000Z',
    hasChildren: false,
    hasContent: true,
    collection: DOCUMENT_COLLECTION.PERSONAL,
  },
]

let mockDocuments = initialMockDocuments.map(document => ({ ...document }))

function buildTree(collection: DocumentCollectionId) {
  const collectionDocuments = mockDocuments.filter(document => document.collection === collection)
  const documentMap = new Map(collectionDocuments.map(document => [document.id, {
    ...document,
    sharedByDisplayName: null,
    children: [] as MockDocumentItem[],
  }]))

  for (const document of documentMap.values()) {
    if (document.parentId && documentMap.has(document.parentId)) {
      documentMap.get(document.parentId)!.children.push(document)
    }
  }

  return collectionDocuments
    .filter(document => !document.parentId || !documentMap.has(document.parentId))
    .map(document => documentMap.get(document.id)!)
}

function findDocumentById(id: string) {
  return mockDocuments.find(document => document.id === id) ?? null
}

function nextDocumentId() {
  return `document-${mockDocuments.length + 1}`
}

function buildRecentAncestorTitles(document: MockDocument) {
  const ancestorTitles: string[] = []
  let currentDocument = document.parentId
    ? findDocumentById(document.parentId)
    : null

  while (currentDocument && currentDocument.collection === document.collection) {
    ancestorTitles.unshift(currentDocument.title)
    currentDocument = currentDocument.parentId
      ? findDocumentById(currentDocument.parentId)
      : null
  }

  return ancestorTitles
}

vi.mock('@/apis/document', () => ({
  getDocuments: vi.fn(async () => ([
    {
      id: DOCUMENT_COLLECTION.PERSONAL,
      nodes: buildTree(DOCUMENT_COLLECTION.PERSONAL),
    },
    {
      id: DOCUMENT_COLLECTION.SHARED,
      nodes: buildTree(DOCUMENT_COLLECTION.SHARED),
    },
    {
      id: DOCUMENT_COLLECTION.TEAM,
      nodes: buildTree(DOCUMENT_COLLECTION.TEAM),
    },
  ])),
  getRecentDocuments: vi.fn(async () =>
    mockDocuments
      .filter(document => document.hasContent)
      .map(document => ({
        id: document.id,
        title: document.title,
        collection: document.collection,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        ancestorTitles: buildRecentAncestorTitles(document),
      }))),
  getDocumentById: vi.fn(async (id: string) => {
    const document = findDocumentById(id)

    if (!document) {
      const error = new Error(`Document ${id} not found`) as Error & { status?: number }
      error.status = 404
      throw error
    }

    return {
      ...document,
      scope: 'PERSONAL',
    }
  }),
  createDocument: vi.fn(async (payload: { title: string, content?: string, parentId?: string | null }) => {
    const createdDocument: MockDocument = {
      id: nextDocumentId(),
      title: payload.title,
      parentId: payload.parentId ?? null,
      content: payload.content ?? '',
      summary: '',
      createdAt: '2026-03-30T11:00:00.000Z',
      updatedAt: '2026-03-30T11:00:00.000Z',
      hasChildren: false,
      hasContent: Boolean((payload.content ?? '').replace(/<[^>]+>/g, '').trim()),
      collection: DOCUMENT_COLLECTION.PERSONAL,
    }

    mockDocuments.push(createdDocument)

    return {
      ...createdDocument,
      scope: 'PERSONAL',
    }
  }),
  updateDocument: vi.fn(async (id: string, payload: { title: string, content: string }) => {
    const documentIndex = mockDocuments.findIndex(document => document.id === id)

    if (documentIndex < 0) {
      throw new Error(`Document ${id} not found`)
    }

    mockDocuments[documentIndex] = {
      ...mockDocuments[documentIndex],
      title: payload.title,
      content: payload.content,
      summary: payload.content.replace(/<[^>]+>/g, '').trim() || '暂无摘要',
      updatedAt: '2026-03-30T12:00:00.000Z',
      hasContent: Boolean(payload.content.replace(/<[^>]+>/g, '').trim()),
    }

    return {
      ...mockDocuments[documentIndex],
      scope: 'PERSONAL',
    }
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockDocuments = initialMockDocuments.map(document => ({ ...document }))
  window.localStorage.clear()
  window.sessionStorage.clear()

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  setActivePinia(pinia)
  config.global.plugins = [pinia] as any
})

config.global.stubs = {
  transition: false,
  teleport: true,
}
