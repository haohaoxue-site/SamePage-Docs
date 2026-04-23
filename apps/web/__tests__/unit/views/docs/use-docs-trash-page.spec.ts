import type { DocumentTrashItem } from '@haohaoxue/samepage-domain'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocsTrashPage } from '@/views/docs/composables/useDocsTrashPage'

const apiMocks = vi.hoisted(() => ({
  getTrashDocuments: vi.fn(),
  restoreDocumentFromTrash: vi.fn(),
  permanentlyDeleteDocument: vi.fn(),
}))

vi.mock('@/apis/document', () => ({
  getTrashDocuments: apiMocks.getTrashDocuments,
  restoreDocumentFromTrash: apiMocks.restoreDocumentFromTrash,
  permanentlyDeleteDocument: apiMocks.permanentlyDeleteDocument,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')

  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  }
})

function createTrashItem(overrides: Partial<DocumentTrashItem> = {}): DocumentTrashItem {
  return {
    id: 'doc-trash-1',
    title: '已删除文档',
    collection: 'personal',
    ancestorTitles: [],
    trashedAt: '2026-04-21T08:00:00.000Z',
    ...overrides,
  }
}

async function flushTrashPage() {
  await Promise.resolve()
  await nextTick()
}

describe('useDocsTrashPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.getTrashDocuments.mockReset()
    apiMocks.restoreDocumentFromTrash.mockReset()
    apiMocks.permanentlyDeleteDocument.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()

    const workspaceStore = useWorkspaceStore()
    workspaceStore.setPersonalWorkspace({
      id: 'workspace-personal-1',
      type: 'PERSONAL',
      name: 'Personal SP-ABC2345',
      description: null,
      iconUrl: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    workspaceStore.selectPersonalWorkspace()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('初始化时会按当前 workspace 加载回收站列表', async () => {
    apiMocks.getTrashDocuments.mockResolvedValue([createTrashItem()])

    const scope = effectScope()
    const page = scope.run(() => useDocsTrashPage())

    await flushTrashPage()

    expect(apiMocks.getTrashDocuments).toHaveBeenCalledWith('workspace-personal-1')
    expect(page?.items.value.map(item => item.id)).toEqual(['doc-trash-1'])

    scope.stop()
  })

  it('restoreItem 成功后会把文档从回收站列表移除', async () => {
    apiMocks.getTrashDocuments.mockResolvedValue([createTrashItem()])
    apiMocks.restoreDocumentFromTrash.mockResolvedValue(null)

    const scope = effectScope()
    const page = scope.run(() => useDocsTrashPage())

    await flushTrashPage()
    await page?.restoreItem('doc-trash-1')

    expect(apiMocks.restoreDocumentFromTrash).toHaveBeenCalledWith('doc-trash-1')
    expect(page?.items.value).toEqual([])
    expect(ElMessage.success).toHaveBeenCalledWith('已恢复文档')

    scope.stop()
  })

  it('permanentlyDeleteItem 确认后会彻底删除并移出列表', async () => {
    apiMocks.getTrashDocuments.mockResolvedValue([createTrashItem()])
    apiMocks.permanentlyDeleteDocument.mockResolvedValue(null)
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as never)

    const scope = effectScope()
    const page = scope.run(() => useDocsTrashPage())

    await flushTrashPage()
    await page?.permanentlyDeleteItem('doc-trash-1')

    expect(apiMocks.permanentlyDeleteDocument).toHaveBeenCalledWith('doc-trash-1')
    expect(page?.items.value).toEqual([])
    expect(ElMessage.success).toHaveBeenCalledWith('已彻底删除文档')

    scope.stop()
  })
})
