import type { DocumentSnapshot, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import {
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DocumentHistoryPanel from '@/views/docs/components/DocumentHistoryPanel.vue'

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
    ownerId: 'user-1',
    parentId: null,
    latestSnapshotId: 'snapshot-2',
    order: 0,
    spaceScope: 'PERSONAL',
    status: 'ACTIVE',
    summary: '测试摘要',
    createdAt: '2026-04-15T15:00:00+08:00',
    updatedAt: '2026-04-15T15:17:00+08:00',
    headRevision: 2,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('当前标题'),
    body: createBodyContent('当前正文'),
    ...overrides,
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
  it('点击历史条目只切换选中态，点击还原按钮才触发 restore', async () => {
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
        isLoading: false,
        isRestoring: false,
      },
    })

    const targetButton = wrapper
      .findAll('.document-history-panel__item-button')
      .find(button => button.text().includes('4月15日 15:00'))

    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')

    expect(wrapper.emitted('restore')).toBeFalsy()
    expect(wrapper.text()).toContain('还原此历史记录')

    await wrapper.get('.document-history-panel__restore-button').trigger('click')

    expect(wrapper.emitted('restore')).toEqual([['snapshot-1']])
  })

  it('当前内容的旧历史记录不可再次还原', async () => {
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
        isLoading: false,
        isRestoring: false,
      },
    })

    const targetButton = wrapper
      .findAll('.document-history-panel__item-button')
      .find(button => button.text().includes('4月15日 15:00'))

    expect(targetButton).toBeDefined()

    await targetButton!.trigger('click')

    expect(wrapper.text()).toContain('该历史记录已是当前内容')
    expect(wrapper.find('.document-history-panel__restore-button').exists()).toBe(false)
    expect(wrapper.emitted('restore')).toBeFalsy()
  })
})
