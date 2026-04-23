import { DOCUMENT_COLLECTION, WORKSPACE_TYPE } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import DocumentSectionPanel from '@/views/docs/components/DocumentSectionPanel.vue'

function createGroup(id: typeof DOCUMENT_COLLECTION[keyof typeof DOCUMENT_COLLECTION]) {
  return {
    id,
    nodes: [],
  }
}

describe('documentSectionPanel', () => {
  it('支持按分组控制根文档新建入口，并根据分组给出默认空态文案', () => {
    const stubs = {
      SvgIcon: defineComponent({
        template: '<span class="svg-icon-stub" />',
      }),
      ElEmpty: defineComponent({
        props: {
          description: {
            type: String,
            default: '',
          },
        },
        template: '<div class="el-empty-stub">{{ description }}</div>',
      }),
      DocumentItem: defineComponent({
        template: '<div class="document-item-stub" />',
      }),
    }

    const privateWrapper = mount(DocumentSectionPanel, {
      props: {
        group: createGroup(DOCUMENT_COLLECTION.PERSONAL),
        currentWorkspaceType: WORKSPACE_TYPE.TEAM,
        activeDocumentId: null,
        expandedDocumentIds: new Set<string>(),
        isCollapsed: false,
        isActionPending: false,
        canCreateRoot: false,
      },
      global: { stubs },
    })
    const sharedWrapper = mount(DocumentSectionPanel, {
      props: {
        group: createGroup(DOCUMENT_COLLECTION.SHARED),
        currentWorkspaceType: WORKSPACE_TYPE.PERSONAL,
        activeDocumentId: null,
        expandedDocumentIds: new Set<string>(),
        isCollapsed: false,
        isActionPending: false,
      },
      global: { stubs },
    })

    expect(privateWrapper.find('.document-tree-section__toolbar').exists()).toBe(false)
    expect(privateWrapper.text()).toContain('暂无文档')
    expect(sharedWrapper.find('.document-tree-section__toolbar').exists()).toBe(false)
    expect(sharedWrapper.text()).toContain('还没有别人分享给你的文档')
    expect(privateWrapper.get('button.document-tree-section__header-button').attributes('aria-expanded')).toBe('true')
  })
})
