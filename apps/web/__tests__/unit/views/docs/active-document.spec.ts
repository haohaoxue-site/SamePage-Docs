import type { TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type {
  CreateDocumentSnapshotResponse,
  DocumentHead,
  DocumentSnapshot,
} from '@/apis/document'
import {
  DOCUMENT_SAVE_STATE,
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import {
  toActiveDocument,
  useActiveDocumentState,
} from '@/views/docs/composables/useActiveDocument'

function createBodyContent(text: string): TiptapJsonContent {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ]
}

function createDocumentHead(overrides: Partial<DocumentHead> = {}): DocumentHead {
  return {
    document: {
      id: 'doc-1',
      workspaceId: 'workspace-personal',
      createdBy: 'user-1',
      visibility: 'PRIVATE',
      parentId: null,
      latestSnapshotId: 'snapshot-1',
      order: 0,
      status: 'ACTIVE',
      share: null,
      summary: '测试摘要',
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    },
    latestSnapshot: {
      id: 'snapshot-1',
      documentId: 'doc-1',
      revision: 1,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      title: createDocumentTitleContent('原始标题'),
      body: createBodyContent('初始正文'),
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      restoredFromSnapshotId: null,
      createdAt: '2026-04-14T00:00:00.000Z',
      createdBy: null,
      createdByUser: null,
    },
    headRevision: 1,
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  return {
    id: 'snapshot-1',
    documentId: 'doc-1',
    revision: 1,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('原始标题'),
    body: createBodyContent('初始正文'),
    source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
    restoredFromSnapshotId: null,
    createdAt: '2026-04-14T00:00:00.000Z',
    createdBy: null,
    createdByUser: null,
    ...overrides,
  }
}

function createSnapshotResponse(
  overrides: Partial<CreateDocumentSnapshotResponse> = {},
): CreateDocumentSnapshotResponse {
  return {
    snapshot: {
      id: 'snapshot-2',
      documentId: 'doc-1',
      revision: 2,
      schemaVersion: TIPTAP_SCHEMA_VERSION,
      title: createDocumentTitleContent('新的标题'),
      body: createBodyContent('保存后的正文'),
      source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
      restoredFromSnapshotId: null,
      createdAt: '2026-04-14T00:00:01.000Z',
      createdBy: null,
      createdByUser: null,
    },
    headRevision: 2,
    ...overrides,
  }
}

describe('activeDocument', () => {
  it('编辑标题和正文时收口为单一 owner state，并同步树节点标题', () => {
    const patchDocumentItem = vi.fn()
    const scope = effectScope()
    const state = scope.run(() => useActiveDocumentState({
      patchDocumentItem,
    }))

    expect(state).toBeTruthy()

    const documentState = state!
    const activeDocument = toActiveDocument(createDocumentHead())

    documentState.applyLoadedDocument(activeDocument, [createSnapshot()])

    const nextTitle = createDocumentTitleContent('新的标题')
    const nextBody = createBodyContent('保存后的正文')

    documentState.updateDocumentTitle(nextTitle)
    documentState.updateDocumentContent(nextBody)

    expect(documentState.currentDocument.value?.title).toEqual(nextTitle)
    expect(documentState.currentDocument.value?.body).toEqual(nextBody)
    expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.DIRTY)
    expect(patchDocumentItem).toHaveBeenLastCalledWith('doc-1', {
      title: '新的标题',
    })

    scope.stop()
  })

  it('保存成功后推进 headRevision、快照列表和保存状态', () => {
    const patchDocumentItem = vi.fn()
    const scope = effectScope()
    const state = scope.run(() => useActiveDocumentState({
      patchDocumentItem,
    }))

    expect(state).toBeTruthy()

    const documentState = state!
    const activeDocument = toActiveDocument(createDocumentHead())
    const nextTitle = createDocumentTitleContent('新的标题')
    const nextBody = createBodyContent('保存后的正文')

    documentState.applyLoadedDocument(activeDocument, [createSnapshot()])
    documentState.updateDocumentTitle(nextTitle)
    documentState.updateDocumentContent(nextBody)

    const draftDocument = documentState.currentDocument.value!
    const requestSignature = documentState.createDraftSignature(draftDocument)

    documentState.applyPersistedSnapshot({
      draftDocument,
      requestSignature,
      snapshotResponse: createSnapshotResponse(),
    })

    expect(documentState.currentDocument.value?.latestSnapshotId).toBe('snapshot-2')
    expect(documentState.currentDocument.value?.headRevision).toBe(2)
    expect(documentState.snapshots.value.map(snapshot => snapshot.id)).toEqual(['snapshot-2', 'snapshot-1'])
    expect(documentState.saveState.value).toBe(DOCUMENT_SAVE_STATE.SAVED)
    expect(patchDocumentItem).toHaveBeenLastCalledWith('doc-1', expect.objectContaining({
      title: '新的标题',
    }))

    scope.stop()
  })
})
