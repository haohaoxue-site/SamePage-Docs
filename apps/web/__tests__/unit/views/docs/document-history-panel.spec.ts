import type { DocumentSnapshot, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import {
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DocumentHistoryPanel from '@/views/docs/layouts/DocsHistoryPanel.vue'

function createBodyContent(text: string): TiptapJsonContent {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ]
}

function createDocument(overrides: Partial<ActiveDocumentDetail> = {}): ActiveDocumentDetail {
  return {
    id: 'doc-1',
    workspaceId: 'workspace-personal',
    createdBy: 'user-1',
    visibility: 'PRIVATE',
    parentId: null,
    latestSnapshotId: 'snapshot-2',
    order: 0,
    status: 'ACTIVE',
    summary: '测试摘要',
    createdAt: '2026-04-15T15:00:00+08:00',
    updatedAt: '2026-04-15T15:17:00+08:00',
    headRevision: 2,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('当前标题'),
    body: createBodyContent('当前正文'),
    ...overrides,
    share: overrides.share ?? null,
  }
}

function createSnapshot(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  return {
    id: 'snapshot-1',
    documentId: 'doc-1',
    revision: 1,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('历史标题'),
    body: createBodyContent('历史正文'),
    source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
    restoredFromSnapshotId: null,
    createdAt: '2026-04-15T15:00:00+08:00',
    createdBy: 'user-1',
    createdByUser: {
      id: 'user-1',
      displayName: 'shanyuhai123',
      avatarUrl: null,
    },
    ...overrides,
  }
}

describe('documentHistoryPanel', () => {
  it('点击历史条目时只触发选中事件', async () => {
    const wrapper = mount(DocumentHistoryPanel, {
      props: {
        document: createDocument(),
        snapshots: [
          createSnapshot({
            id: 'snapshot-2',
            revision: 2,
            title: createDocumentTitleContent('当前标题'),
            body: createBodyContent('当前正文'),
            createdAt: '2026-04-15T15:17:00+08:00',
          }),
          createSnapshot({
            id: 'snapshot-1',
            revision: 1,
            title: createDocumentTitleContent('历史标题'),
            body: createBodyContent('历史正文'),
            createdAt: '2026-04-15T15:00:00+08:00',
          }),
        ],
        selectedSnapshotId: 'snapshot-2',
        isLoading: false,
      },
    })

    const targetButton = wrapper
      .findAll('.document-history-panel__item-button')
      .at(1)

    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['snapshot-1']])
    expect(wrapper.emitted('restore')).toBeFalsy()
  })

  it('当前内容的旧历史记录仍会显示当前内容标签', async () => {
    const wrapper = mount(DocumentHistoryPanel, {
      props: {
        document: createDocument({
          title: createDocumentTitleContent('你好'),
          body: createBodyContent('历史正文'),
        }),
        snapshots: [
          createSnapshot({
            id: 'snapshot-2',
            revision: 2,
            source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
            restoredFromSnapshotId: 'snapshot-0',
            title: createDocumentTitleContent('你好'),
            body: createBodyContent('历史正文'),
            createdAt: '2026-04-15T15:17:00+08:00',
          }),
          createSnapshot({
            id: 'snapshot-1',
            revision: 1,
            title: createDocumentTitleContent('中间版本'),
            body: createBodyContent('中间正文'),
            createdAt: '2026-04-15T15:08:00+08:00',
          }),
          createSnapshot({
            id: 'snapshot-0',
            revision: 0,
            title: createDocumentTitleContent('你好'),
            body: createBodyContent('历史正文'),
            createdAt: '2026-04-15T15:00:00+08:00',
          }),
        ],
        selectedSnapshotId: 'snapshot-0',
        isLoading: false,
      },
    })

    const targetButton = wrapper
      .findAll('.document-history-panel__item-button')
      .find(button => button.text().includes('4月15日 15:00'))

    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')

    expect(wrapper.text()).toContain('当前内容')
  })
})
