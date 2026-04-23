import type { DocumentCollectionId, DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION, WORKSPACE_TYPE } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import DocsSidebarLayout from '@/views/docs/layouts/DocsSidebarLayout.vue'

function createTreeGroups(): DocumentTreeGroup[] {
  return [
    {
      id: DOCUMENT_COLLECTION.PERSONAL,
      nodes: [
        {
          id: 'doc-1',
          parentId: null,
          title: '个人文档',
          summary: '',
          hasChildren: false,
          hasContent: true,
          createdAt: '2026-04-21T00:00:00.000Z',
          updatedAt: '2026-04-22T10:00:00.000Z',
          children: [],
          share: null,
        },
      ],
    },
    {
      id: DOCUMENT_COLLECTION.SHARED,
      nodes: [],
    },
  ]
}

const sidebarStubs = {
  DocumentSectionPanel: defineComponent({
    props: {
      group: {
        type: Object,
        required: true,
      },
    },
    emits: [
      'open',
      'toggle',
      'toggleCollapse',
      'createRoot',
      'createChild',
      'moveDocumentToTeam',
      'shareDocument',
      'deleteDocument',
    ],
    template: [
      '<section class="section-panel-stub" :data-group-id="group.id">',
      '<button class="section-open" @click="$emit(\'open\', group.nodes[0]?.id || group.id)">打开</button>',
      '<button class="section-create-root" @click="$emit(\'createRoot\', group.id)">新建</button>',
      '<slot name="headerAction" :group="group" />',
      '</section>',
    ].join(''),
  }),
  ElBadge: defineComponent({
    props: {
      value: {
        type: Number,
        default: 0,
      },
    },
    template: '<span class="badge-stub" :data-value="String(value)"><slot />{{ value }}</span>',
  }),
  ElButton: defineComponent({
    emits: ['click'],
    template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
  }),
  ElTooltip: defineComponent({
    props: {
      content: {
        type: String,
        default: '',
      },
    },
    template: '<span class="tooltip-stub" :data-content="content"><slot /></span>',
  }),
  RouterLink: defineComponent({
    props: {
      to: {
        type: Object,
        required: true,
      },
    },
    template: '<a class="router-link-stub" :data-route-name="to.name"><slot /></a>',
  }),
  SvgIcon: defineComponent({
    props: {
      icon: {
        type: String,
        required: true,
      },
    },
    template: '<i class="svg-icon-stub" :data-icon="icon" />',
  }),
}

function mountSidebar() {
  return mount(DocsSidebarLayout, {
    props: {
      treeGroups: createTreeGroups(),
      currentWorkspaceType: WORKSPACE_TYPE.PERSONAL,
      activeDocumentId: 'doc-1',
      expandedDocumentIds: new Set<string>(),
      collapsedGroupIds: new Set<DocumentCollectionId>(),
      isDocumentLoading: false,
      isMutatingTree: false,
      currentSurface: 'document',
      pendingShareCount: 3,
      hasPendingShares: true,
    },
    global: {
      stubs: sidebarStubs,
    },
  })
}

describe('docsSidebarLayout', () => {
  it('渲染文档树、待接收分享入口，并透传树事件', async () => {
    const wrapper = mountSidebar()

    expect(wrapper.find('[role="tree"]').exists()).toBe(true)
    expect(wrapper.findAll('.section-panel-stub')).toHaveLength(2)
    expect(wrapper.find('.router-link-stub').attributes('data-route-name')).toBe('docs-pending-shares')
    expect(wrapper.find('.badge-stub').attributes('data-value')).toBe('3')

    await wrapper.find('.section-open').trigger('click')
    await wrapper.find('.section-create-root').trigger('click')

    expect(wrapper.emitted('openDocument')).toEqual([['doc-1']])
    expect(wrapper.emitted('createRootDocument')).toEqual([[DOCUMENT_COLLECTION.PERSONAL]])
  })

  it('底部权限管理和回收站按钮向上抛出布局事件', async () => {
    const wrapper = mountSidebar()
    const footerItems = wrapper.findAll('.docs-view__sidebar-footer-item')

    expect(footerItems).toHaveLength(2)
    expect(footerItems.map(item => item.find('.tooltip-stub').attributes('data-content'))).toEqual(['权限管理', '回收站'])
    expect(footerItems[1].classes()).toContain('has-divider')

    await footerItems[0].find('button').trigger('click')
    await footerItems[1].find('button').trigger('click')

    expect(wrapper.emitted('openPermissionsOverview')).toEqual([[]])
    expect(wrapper.emitted('openTrashPage')).toEqual([[]])
  })
})
