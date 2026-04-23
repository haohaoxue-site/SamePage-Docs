import type { DocumentItemProps } from '@/views/docs/typing'
import { DOCUMENT_COLLECTION, WORKSPACE_TYPE } from '@haohaoxue/samepage-contracts'
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useDocumentItem } from '@/views/docs/composables/useDocumentItem'

function createProps(collectionId: DocumentItemProps['collectionId']): DocumentItemProps {
  return {
    item: {
      id: 'doc-1',
      parentId: null,
      title: '测试文档',
      summary: '',
      share: null,
      hasChildren: false,
      hasContent: true,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
      children: [],
    },
    collectionId,
    currentWorkspaceType: WORKSPACE_TYPE.TEAM,
    depth: 0,
    activeDocumentId: 'doc-1',
    expandedDocumentIds: new Set<string>(),
    isActionPending: false,
  }
}

describe('useDocumentItem', () => {
  it('团队分组也视为可管理文档，只有共享分组禁用管理入口', () => {
    const scope = effectScope()
    const personalItem = scope.run(() => useDocumentItem(createProps(DOCUMENT_COLLECTION.PERSONAL), {
      onDeleteDocument: vi.fn(),
      onMoveDocumentToTeam: vi.fn(),
      onOpen: vi.fn(),
      onShareDocument: vi.fn(),
      onToggle: vi.fn(),
    }))
    const teamItem = scope.run(() => useDocumentItem(createProps(DOCUMENT_COLLECTION.TEAM), {
      onDeleteDocument: vi.fn(),
      onMoveDocumentToTeam: vi.fn(),
      onOpen: vi.fn(),
      onShareDocument: vi.fn(),
      onToggle: vi.fn(),
    }))
    const sharedItem = scope.run(() => useDocumentItem(createProps(DOCUMENT_COLLECTION.SHARED), {
      onDeleteDocument: vi.fn(),
      onMoveDocumentToTeam: vi.fn(),
      onOpen: vi.fn(),
      onShareDocument: vi.fn(),
      onToggle: vi.fn(),
    }))

    expect(personalItem?.canManageDocument.value).toBe(true)
    expect(teamItem?.canManageDocument.value).toBe(true)
    expect(sharedItem?.canManageDocument.value).toBe(false)
    expect(personalItem?.canMoveToTeam.value).toBe(true)
    expect(teamItem?.canMoveToTeam.value).toBe(false)
    expect(sharedItem?.canMoveToTeam.value).toBe(false)

    scope.stop()
  })
})
