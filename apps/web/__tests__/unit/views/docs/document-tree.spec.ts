import type { DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { computed, effectScope, shallowRef } from 'vue'
import { useDocumentTreeState } from '@/views/docs/composables/useDocumentTree'

function createTreeGroups(): DocumentTreeGroup[] {
  return [
    {
      id: DOCUMENT_COLLECTION.PERSONAL,
      nodes: [
        {
          id: 'doc-1',
          parentId: null,
          title: '根文档',
          summary: '根摘要',
          hasChildren: true,
          hasContent: true,
          createdAt: '2026-04-15T10:00:00.000Z',
          updatedAt: '2026-04-15T10:00:00.000Z',
          children: [
            {
              id: 'doc-1-1',
              parentId: 'doc-1',
              title: '子文档',
              summary: '子摘要',
              hasChildren: false,
              hasContent: true,
              createdAt: '2026-04-15T10:10:00.000Z',
              updatedAt: '2026-04-15T10:10:00.000Z',
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: DOCUMENT_COLLECTION.TEAM,
      nodes: [
        {
          id: 'doc-2',
          parentId: null,
          title: '团队文档',
          summary: '',
          hasChildren: false,
          hasContent: false,
          createdAt: '2026-04-15T11:00:00.000Z',
          updatedAt: '2026-04-15T11:00:00.000Z',
          children: [],
        },
      ],
    },
  ]
}

describe('documentTree', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('加载树后根据当前文档生成展开态、面包屑和默认文档', () => {
    const activeDocumentId = shallowRef<string | null>('doc-1-1')
    const scope = effectScope()
    const treeState = scope.run(() => useDocumentTreeState({
      activeDocumentId: computed(() => activeDocumentId.value),
    }))

    expect(treeState).toBeTruthy()

    const tree = treeState!
    tree.applyLoadedTree(createTreeGroups())

    expect(Array.from(tree.expandedDocumentIdSet.value)).toEqual(['doc-1', 'doc-1-1'])
    expect(tree.activeCollectionId.value).toBe(DOCUMENT_COLLECTION.PERSONAL)
    expect(tree.breadcrumbLabels.value).toEqual(['私有', '根文档', '子文档'])
    expect(tree.defaultDocumentId.value).toBe('doc-1')
    expect(tree.hasFallbackDocument.value).toBe(true)

    scope.stop()
  })

  it('记住上次打开文档后，优先使用它作为默认文档，并支持 patch 嵌套节点', () => {
    const activeDocumentId = shallowRef<string | null>(null)
    const scope = effectScope()
    const treeState = scope.run(() => useDocumentTreeState({
      activeDocumentId: computed(() => activeDocumentId.value),
    }))

    expect(treeState).toBeTruthy()

    const tree = treeState!
    tree.applyLoadedTree(createTreeGroups())
    tree.rememberLastOpenedDocument('doc-2')
    tree.patchDocumentItem('doc-1-1', {
      title: '新的子文档标题',
      summary: '新的摘要',
    })

    expect(tree.defaultDocumentId.value).toBe('doc-2')
    expect(tree.treeGroups.value[0].nodes[0].children[0]).toEqual(expect.objectContaining({
      id: 'doc-1-1',
      title: '新的子文档标题',
      summary: '新的摘要',
    }))

    scope.stop()
  })
})
