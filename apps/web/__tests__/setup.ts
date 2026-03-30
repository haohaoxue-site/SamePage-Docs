import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, vi } from 'vitest'

interface MockDocumentNode {
  id: string
  title: string
  parentId: string | null
  content: string
  summary: string
  createdAt: string
  updatedAt: string
  hasChildren: boolean
  hasContent: boolean
  section: 'personal' | 'shared' | 'team'
}

interface MockTreeNode {
  id: string
  title: string
  parentId: string | null
  summary: string
  createdAt: string
  updatedAt: string
  hasChildren: boolean
  hasContent: boolean
  sharedByDisplayName: string | null
  children: MockTreeNode[]
}

const initialMockNodes: MockDocumentNode[] = [
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
    section: 'personal',
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
    section: 'personal',
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
    section: 'personal',
  },
]

let mockNodes = initialMockNodes.map(node => ({ ...node }))

function buildTree(section: 'personal' | 'shared' | 'team') {
  const sectionNodes = mockNodes.filter(node => node.section === section)
  const nodeMap = new Map(sectionNodes.map(node => [node.id, {
    ...node,
    sharedByDisplayName: null,
    children: [] as MockTreeNode[],
  }]))

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    }
  }

  return sectionNodes
    .filter(node => !node.parentId || !nodeMap.has(node.parentId))
    .map(node => nodeMap.get(node.id)!)
}

function findNodeById(id: string) {
  return mockNodes.find(node => node.id === id) ?? null
}

function nextNodeId() {
  return `node-${mockNodes.length + 1}`
}

vi.mock('@/apis/document', () => ({
  getDocumentTree: vi.fn(async () => ([
    {
      id: 'personal',
      label: '当前用户',
      nodes: buildTree('personal'),
    },
    {
      id: 'shared',
      label: '分享',
      nodes: buildTree('shared'),
    },
    {
      id: 'team',
      label: '团队',
      nodes: buildTree('team'),
    },
  ])),
  listRecentDocumentNodes: vi.fn(async () =>
    mockNodes
      .filter(node => node.hasContent)
      .map(({ content: _content, parentId: _parentId, hasChildren: _hasChildren, hasContent: _hasContent, section: _section, ...node }) => node)),
  getDocumentNodeById: vi.fn(async (id: string) => {
    const node = findNodeById(id)

    if (!node) {
      throw new Error(`Document node ${id} not found`)
    }

    return {
      ...node,
      scope: 'PERSONAL',
    }
  }),
  createDocumentNode: vi.fn(async (payload: { title: string, content?: string, parentId?: string | null }) => {
    const createdNode: MockDocumentNode = {
      id: nextNodeId(),
      title: payload.title,
      parentId: payload.parentId ?? null,
      content: payload.content ?? '',
      summary: '',
      createdAt: '2026-03-30T11:00:00.000Z',
      updatedAt: '2026-03-30T11:00:00.000Z',
      hasChildren: false,
      hasContent: Boolean((payload.content ?? '').replace(/<[^>]+>/g, '').trim()),
      section: 'personal',
    }

    mockNodes.push(createdNode)

    return {
      ...createdNode,
      scope: 'PERSONAL',
    }
  }),
  saveDocumentNode: vi.fn(async (id: string, payload: { title: string, content: string }) => {
    const nodeIndex = mockNodes.findIndex(node => node.id === id)

    if (nodeIndex < 0) {
      throw new Error(`Document node ${id} not found`)
    }

    mockNodes[nodeIndex] = {
      ...mockNodes[nodeIndex],
      title: payload.title,
      content: payload.content,
      summary: payload.content.replace(/<[^>]+>/g, '').trim() || '暂无摘要',
      updatedAt: '2026-03-30T12:00:00.000Z',
      hasContent: Boolean(payload.content.replace(/<[^>]+>/g, '').trim()),
    }

    return {
      ...mockNodes[nodeIndex],
      scope: 'PERSONAL',
    }
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockNodes = initialMockNodes.map(node => ({ ...node }))
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
