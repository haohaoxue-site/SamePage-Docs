import type { CreateDocumentResponse, DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import { TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, shallowRef } from 'vue'
import { createDocument, getDocuments } from '@/apis/document'
import { useDocumentTree } from '@/views/docs/composables/useDocumentTree'

vi.mock('@/apis/document', () => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocuments: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

function createDocumentResponse(overrides: Partial<CreateDocumentResponse> = {}): CreateDocumentResponse {
  return {
    id: 'doc-1',
    ...overrides,
  }
}

describe('useDocumentTree', () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('新建根文档时不显式提交空正文，由服务端默认值兜底', async () => {
    const createDocumentMock = vi.mocked(createDocument)
    const getDocumentsMock = vi.mocked(getDocuments)
    const navigateToDocument = vi.fn().mockResolvedValue(true)
    const confirmNavigation = vi.fn().mockResolvedValue(true)

    createDocumentMock.mockResolvedValue(createDocumentResponse())
    getDocumentsMock.mockResolvedValue([] satisfies DocumentTreeGroup[])

    const activeDocumentId = shallowRef<string | null>(null)
    const scope = effectScope()
    const tree = scope.run(() => useDocumentTree({
      activeDocumentId: computed(() => activeDocumentId.value),
      confirmNavigation,
      navigateToDocument,
    }))

    await tree!.createRootDocument()

    expect(createDocumentMock).toHaveBeenCalledWith({
      title: '未命名',
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      parentId: null,
    })
    expect(getDocumentsMock).toHaveBeenCalledTimes(1)
    expect(navigateToDocument).toHaveBeenCalledWith('doc-1', {
      skipConfirm: true,
    })

    scope.stop()
  })
})
