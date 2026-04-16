import type { DocumentSnapshot, TiptapJsonContent } from '@haohaoxue/samepage-domain'
import type { ActiveDocumentDetail } from '@/views/docs/typing'
import {
  DOCUMENT_SNAPSHOT_SOURCE,
  TIPTAP_SCHEMA_VERSION,
} from '@haohaoxue/samepage-contracts'
import { createDocumentTitleContent } from '@haohaoxue/samepage-shared'
import { describe, expect, it } from 'vitest'
import dayjs from '@/utils/dayjs'
import {
  buildDocumentHistorySections,
  getDocumentHistoryEntryDetail,
} from '@/views/docs/utils/documentHistory'

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
    latestSnapshotId: 'snapshot-5',
    order: 0,
    spaceScope: 'PERSONAL',
    status: 'ACTIVE',
    summary: '测试摘要',
    createdAt: '2026-04-07T19:50:00+08:00',
    updatedAt: '2026-04-15T15:37:40+08:00',
    headRevision: 5,
    schemaVersion: TIPTAP_SCHEMA_VERSION,
    title: createDocumentTitleContent('没有标题33'),
    body: createBodyContent('最新正文'),
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
    body: createBodyContent('原始正文'),
    source: DOCUMENT_SNAPSHOT_SOURCE.AUTOSAVE,
    restoredFromSnapshotId: null,
    createdAt: '2026-04-15T15:37:40+08:00',
    createdBy: 'user-1',
    createdByUser: {
      id: 'user-1',
      displayName: 'shanyuhai123',
      avatarUrl: null,
    },
    ...overrides,
  }
}

describe('history', () => {
  it('按分钟聚合今天的编辑记录，并生成 restore 与命名文案', () => {
    const sections = buildDocumentHistorySections({
      document: createDocument(),
      snapshots: [
        createSnapshot({
          id: 'snapshot-5',
          revision: 5,
          title: createDocumentTitleContent('没有标题33'),
          body: createBodyContent('最新正文'),
          createdAt: '2026-04-15T15:37:40+08:00',
        }),
        createSnapshot({
          id: 'snapshot-4',
          revision: 4,
          title: createDocumentTitleContent('没有标题33'),
          body: createBodyContent('最新正文，分钟内第二次编辑'),
          createdAt: '2026-04-15T15:37:08+08:00',
        }),
        createSnapshot({
          id: 'snapshot-3',
          revision: 3,
          title: createDocumentTitleContent('老标题'),
          body: createBodyContent('上一分钟正文'),
          createdAt: '2026-04-15T15:36:20+08:00',
        }),
        createSnapshot({
          id: 'snapshot-2',
          revision: 2,
          source: DOCUMENT_SNAPSHOT_SOURCE.RESTORE,
          restoredFromSnapshotId: 'snapshot-0',
          title: createDocumentTitleContent('你好'),
          body: createBodyContent('还原后的正文'),
          createdAt: '2026-04-15T15:17:00+08:00',
        }),
        createSnapshot({
          id: 'snapshot-1',
          title: createDocumentTitleContent('昨天的标题'),
          body: createBodyContent('昨天的正文'),
          createdAt: '2026-04-14T23:59:00+08:00',
        }),
        createSnapshot({
          id: 'snapshot-0',
          revision: 0,
          title: createDocumentTitleContent('你好'),
          body: createBodyContent('4 月 7 日正文'),
          createdAt: '2026-04-07T19:50:00+08:00',
        }),
      ],
      now: dayjs('2026-04-15T16:00:00+08:00'),
    })

    expect(sections.map(section => section.label)).toEqual(['今天', '昨天', '4月'])
    expect(sections[0].groups[0].label).toBe('最近更新')
    expect(sections[0].groups[0].entries).toHaveLength(2)
    expect(sections[0].groups[0].entries[0].changeCount).toBe(2)
    expect(getDocumentHistoryEntryDetail(sections[0].groups[0].entries[0])).toBe('文档命名为没有标题33')
    expect(sections[0].groups[1].entries[0].summary).toBe('还原自 4月7日 19:50 的版本')
    expect(sections[1].groups[0].label).toBe('4月14日 23点')
    expect(sections[2].groups[0].label).toBe('4月7日')
  })

  it('把内容等价的旧 snapshot 标记为当前内容', () => {
    const sections = buildDocumentHistorySections({
      document: createDocument({
        latestSnapshotId: 'snapshot-2',
        headRevision: 2,
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
      now: dayjs('2026-04-15T16:00:00+08:00'),
    })

    const originalEntry = sections[0].groups[0].entries.find(entry => entry.snapshotId === 'snapshot-0')

    expect(originalEntry?.isCurrentContent).toBe(true)
    expect(originalEntry?.isCurrentSnapshot).toBe(false)
  })
})
