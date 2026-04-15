import type { DocumentDetail, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import { DOCUMENT_SAVE_STATE, TIPTAP_BLOCK_ID_PREFIX, TIPTAP_SCHEMA_VERSION } from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, shallowRef } from 'vue'
import { getDocumentById, updateDocument } from '@/apis/document'
import { useActiveDocument } from '@/views/docs/composables/useActiveDocument'

vi.mock('@/apis/document', () => ({
  getDocumentById: vi.fn(),
  updateDocument: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout

function createBodyContent(text: string): TiptapJsonContent {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ]
}

function createDocument(overrides: Partial<DocumentDetail> = {}): DocumentDetail {
  return {
    id: 'doc-1',
    title: '原始标题',
    summary: '测试摘要',
    createdAt: '2026-04-14T00:00:00.000Z',
    createdBy: null,
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: null,
    parentId: null,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    content: createBodyContent('初始正文'),
    hasChildren: false,
    hasContent: true,
    scope: 'PERSONAL',
    collection: 'personal',
    ...overrides,
  }
}

describe('useActiveDocument', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  })

  it('把文档页 owner state 收口为 title: DocumentTitleContent + body: JSONContent，并在保存时把标题映射回纯文本', async () => {
    vi.useFakeTimers()

    const getDocumentByIdMock = vi.mocked(getDocumentById)
    const updateDocumentMock = vi.mocked(updateDocument)
    const initialBody = createBodyContent('初始正文')
    const nextBody = createBodyContent('保存后的正文')
    const nextTitle = createDocumentTitleContent('新的标题')

    getDocumentByIdMock.mockResolvedValue(createDocument({
      title: '原始标题',
      content: initialBody,
    }))
    updateDocumentMock.mockImplementation(async (_, payload) => createDocument({
      title: payload.title,
      content: payload.content,
      updatedAt: '2026-04-14T00:00:01.000Z',
    }))

    const activeDocumentId = shallowRef('doc-1')
    const patchDocumentItem = vi.fn()
    const rememberLastOpenedDocument = vi.fn()
    const ensureExpandedPath = vi.fn()
    const scope = effectScope()
    const activeDocument = scope.run(() => useActiveDocument({
      activeDocumentId: computed(() => activeDocumentId.value),
      ensureExpandedPath,
      patchDocumentItem,
      rememberLastOpenedDocument,
    }))

    expect(activeDocument).toBeTruthy()

    const documentState = activeDocument!

    await vi.waitFor(() => {
      expect(documentState.currentDocument.value).not.toBeNull()
    })

    expect(documentState.currentDocument.value?.title).toEqual(createDocumentTitleContent('原始标题'))
    expectDocumentBody(documentState.currentDocument.value?.body, '初始正文')

    documentState.updateDocumentTitle(nextTitle)
    documentState.updateDocumentContent(nextBody)

    expect(patchDocumentItem).toHaveBeenLastCalledWith('doc-1', {
      title: '新的标题',
    })
    expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.DIRTY)

    await vi.advanceTimersByTimeAsync(1200)

    await vi.waitFor(() => {
      expect(updateDocumentMock).toHaveBeenCalledWith('doc-1', {
        title: '新的标题',
        schemaVersion: TIPTAP_SCHEMA_VERSION,
        content: [
          expect.objectContaining({
            type: 'paragraph',
            attrs: expect.objectContaining({
              id: expect.stringMatching(new RegExp(`^${TIPTAP_BLOCK_ID_PREFIX}`)),
            }),
            content: [{ type: 'text', text: '保存后的正文' }],
          }),
        ],
      })
    })

    await vi.waitFor(() => {
      expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.SAVED)
    })

    expect(documentState.currentDocument.value?.title).toEqual(nextTitle)
    expectDocumentBody(documentState.currentDocument.value?.body, '保存后的正文')

    scope.stop()
  })
})

function expectDocumentBody(body: TiptapJsonContent | undefined, text: string) {
  expect(body).toEqual([
    {
      type: 'paragraph',
      attrs: {
        id: expect.stringMatching(new RegExp(`^${TIPTAP_BLOCK_ID_PREFIX}`)),
      },
      content: [{ type: 'text', text }],
    },
  ])
}
