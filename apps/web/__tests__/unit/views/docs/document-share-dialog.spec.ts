import type { DocumentShareMode, DocumentShareProjection } from '@haohaoxue/samepage-domain'
import { DOCUMENT_SHARE_MODE } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject, provide, shallowRef } from 'vue'
import DocumentShareDialog from '@/views/docs/components/DocumentShareDialog.vue'

const dropdownCommandKey = Symbol('dropdownCommand')
const tableRowKey = Symbol('tableRow')
let lastComposableOptions: Record<string, unknown> | null = null

const ElTableRowStub = defineComponent({
  props: {
    row: {
      type: Object,
      required: true,
    },
  },
  setup(props, { slots }) {
    provide(tableRowKey, props.row)

    return () => h('div', { class: 'el-table-row-stub' }, slots.default?.())
  },
})

function createDirectShareItem(overrides: Partial<{
  id: string
  displayName: string
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXITED'
}> = {}) {
  return {
    recipient: {
      id: overrides.id ?? 'recipient-1',
      status: overrides.status ?? 'ACTIVE',
    },
    recipientUser: {
      id: 'viewer-1',
      displayName: overrides.displayName ?? '目标用户',
      avatarUrl: null,
      email: 'viewer@example.com',
      userCode: 'SP-VIEWER1',
    },
    workspaceType: 'PERSONAL' as const,
    workspaceName: '我的空间',
    link: '/shared/recipients/recipient-1',
  }
}

const composableState = {
  currentDocumentId: shallowRef('doc-1'),
  currentDocumentTitle: shallowRef('产品路线图'),
  directShareItems: shallowRef<ReturnType<typeof createDirectShareItem>[]>([]),
  directShareUserCode: shallowRef(''),
  fullShareLink: shallowRef('http://localhost:3000/shared/share-1'),
  selectedShareMode: shallowRef<DocumentShareMode>(DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN),
  hasPublicShare: shallowRef(true),
  hasDirectShare: shallowRef(false),
  hasLocalSharePolicy: shallowRef(true),
  canRestoreInheritance: shallowRef(false),
  isInheritingSharePolicy: shallowRef(false),
  isRootDocument: shallowRef(true),
  localPolicy: shallowRef<null | {
    mode: 'NONE' | 'DIRECT_USER' | 'PUBLIC_TO_LOGGED_IN'
  }>({
    mode: 'PUBLIC_TO_LOGGED_IN',
  }),
  effectivePolicy: shallowRef<null | {
    mode: 'NONE' | 'DIRECT_USER' | 'PUBLIC_TO_LOGGED_IN'
    rootDocumentTitle?: string
  }>(null),
  isLoading: shallowRef(false),
  isLoadingDirectShares: shallowRef(false),
  isSubmitting: shallowRef(false),
  isCreatingDirectShare: shallowRef(false),
  directShareActionRecipientId: shallowRef(''),
  selectedDirectShareUser: shallowRef<null | {
    id: string
    displayName: string
    userCode: string
  }>(null),
  setSelectedShareMode: vi.fn(),
  enablePublicShare: vi.fn(),
  revokePublicShare: vi.fn(),
  setNoShare: vi.fn(),
  restoreInheritance: vi.fn(),
  copyPublicShareLink: vi.fn(),
  handleDirectShareResolved: vi.fn(),
  handleDirectShareCleared: vi.fn(),
  createDirectShare: vi.fn(),
  copyDirectShareLink: vi.fn(),
  revokeDirectShare: vi.fn(),
}

vi.mock('@/views/docs/composables/useDocsPermissionsPage', () => ({
  useDocsPermissionsPage: (options: Record<string, unknown>) => {
    lastComposableOptions = options
    return composableState
  },
}))

function createShareProjection(): DocumentShareProjection {
  return {
    localPolicy: {
      mode: DOCUMENT_SHARE_MODE.NONE,
      shareId: 'share-none-1',
      directUserCount: 0,
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
    effectivePolicy: {
      mode: DOCUMENT_SHARE_MODE.NONE,
      shareId: 'share-none-1',
      rootDocumentId: 'doc-1',
      rootDocumentTitle: '产品路线图',
      updatedAt: '2026-04-23T08:00:00.000Z',
      updatedBy: 'user-1',
    },
  }
}

function resetComposableState() {
  lastComposableOptions = null
  composableState.currentDocumentId.value = 'doc-1'
  composableState.currentDocumentTitle.value = '产品路线图'
  composableState.directShareItems.value = []
  composableState.directShareUserCode.value = ''
  composableState.fullShareLink.value = 'http://localhost:3000/shared/share-1'
  composableState.selectedShareMode.value = DOCUMENT_SHARE_MODE.PUBLIC_TO_LOGGED_IN
  composableState.hasPublicShare.value = true
  composableState.hasDirectShare.value = false
  composableState.hasLocalSharePolicy.value = true
  composableState.canRestoreInheritance.value = false
  composableState.isInheritingSharePolicy.value = false
  composableState.isRootDocument.value = true
  composableState.localPolicy.value = {
    mode: 'PUBLIC_TO_LOGGED_IN',
  }
  composableState.effectivePolicy.value = null
  composableState.isLoading.value = false
  composableState.isLoadingDirectShares.value = false
  composableState.isSubmitting.value = false
  composableState.isCreatingDirectShare.value = false
  composableState.directShareActionRecipientId.value = ''
  composableState.selectedDirectShareUser.value = null
  composableState.setSelectedShareMode.mockReset()
  composableState.enablePublicShare.mockReset()
  composableState.revokePublicShare.mockReset()
  composableState.setNoShare.mockReset()
  composableState.restoreInheritance.mockReset()
  composableState.copyPublicShareLink.mockReset()
  composableState.handleDirectShareResolved.mockReset()
  composableState.handleDirectShareCleared.mockReset()
  composableState.createDirectShare.mockReset()
  composableState.copyDirectShareLink.mockReset()
  composableState.revokeDirectShare.mockReset()
}

function mountDocumentShareDialog() {
  return mount(DocumentShareDialog, {
    props: {
      modelValue: true,
      documentId: 'doc-1',
    },
    global: {
      stubs: {
        ElDialog: defineComponent({
          props: {
            modelValue: {
              type: Boolean,
              default: false,
            },
          },
          emits: ['update:modelValue'],
          template: '<section v-if="modelValue" class="el-dialog-stub"><slot /></section>',
        }),
        ElButton: defineComponent({
          props: {
            disabled: {
              type: Boolean,
              default: false,
            },
          },
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        }),
        ElAlert: defineComponent({
          props: {
            title: {
              type: String,
              default: '',
            },
          },
          template: '<div class="el-alert-stub"><strong>{{ title }}</strong><div><slot /></div></div>',
        }),
        ElDescriptions: defineComponent({
          template: '<div class="el-descriptions-stub"><slot /></div>',
        }),
        ElDescriptionsItem: defineComponent({
          props: {
            label: {
              type: String,
              default: '',
            },
          },
          template: '<section class="el-descriptions-item-stub"><header>{{ label }}</header><div><slot /></div></section>',
        }),
        ElDropdown: defineComponent({
          name: 'ElDropdown',
          emits: ['command'],
          setup(_, { emit, slots }) {
            provide(dropdownCommandKey, (value: string | number | boolean) => {
              emit('command', value)
            })

            return () => h('div', { class: 'el-dropdown-stub' }, [
              slots.default?.(),
              slots.dropdown?.(),
            ])
          },
        }),
        ElDropdownMenu: defineComponent({
          name: 'ElDropdownMenu',
          setup(_, { slots }) {
            return () => h('div', { class: 'el-dropdown-menu-stub' }, slots.default?.())
          },
        }),
        ElDropdownItem: defineComponent({
          name: 'ElDropdownItem',
          props: {
            command: {
              type: [String, Number, Boolean],
              default: '',
            },
            disabled: {
              type: Boolean,
              default: false,
            },
          },
          setup(props, { slots }) {
            const runCommand = inject<(value: string | number | boolean) => void>(dropdownCommandKey)

            return () => h('button', {
              class: 'el-dropdown-item-stub',
              disabled: props.disabled,
              onClick: () => runCommand?.(props.command),
            }, slots.default?.())
          },
        }),
        ElTag: defineComponent({
          template: '<span class="el-tag-stub"><slot /></span>',
        }),
        ElSkeleton: defineComponent({
          template: '<div class="el-skeleton-stub" />',
        }),
        ElTable: defineComponent({
          props: {
            data: {
              type: Array,
              default: () => [],
            },
          },
          setup(props, { attrs, slots }) {
            return () => h('div', {
              ...attrs,
              class: ['el-table-stub', attrs.class],
            }, props.data.map((row, index) =>
              h(ElTableRowStub, { key: index, row: row as Record<string, unknown> }, {
                default: () => slots.default?.(),
              }),
            ))
          },
        }),
        ElTableColumn: defineComponent({
          setup(_, { slots }) {
            const row = inject(tableRowKey)

            return () => h('div', { class: 'el-table-column-stub' }, slots.default?.({ row }))
          },
        }),
        CollabUserLookupField: defineComponent({
          props: {
            code: {
              type: String,
              default: '',
            },
          },
          template: '<div class="collab-user-lookup-field-stub">{{ code }}</div>',
        }),
        CollabIdentityItem: defineComponent({
          props: {
            identity: {
              type: Object,
              default: null,
            },
          },
          template: '<div class="collab-identity-item-stub">{{ identity?.displayName }}</div>',
        }),
      },
    },
  })
}

describe('documentShareDialog', () => {
  it('不保留未选中文档空态分支', () => {
    resetComposableState()
    composableState.currentDocumentId.value = ''

    const wrapper = mountDocumentShareDialog()

    expect(wrapper.find('.el-empty-stub').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__empty').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__content').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('先选中一篇文档，再开始设置分享方式。')
  })

  it('会把分享变更从 composable 透传给页面 owner', () => {
    resetComposableState()
    const wrapper = mountDocumentShareDialog()
    const share = createShareProjection()
    const onShareChanged = lastComposableOptions?.onShareChanged as ((payload: {
      documentId: string
      share: DocumentShareProjection | null
    }) => void) | undefined

    onShareChanged?.({
      documentId: 'doc-1',
      share,
    })

    expect(wrapper.emitted('shareChanged')).toEqual([
      [
        {
          documentId: 'doc-1',
          share,
        },
      ],
    ])
  })

  it('使用无边框分享摘要，下拉左侧显示访问范围，右侧显示权限操作', async () => {
    resetComposableState()

    const wrapper = mountDocumentShareDialog()

    expect(wrapper.find('.document-share-panel__summary-copy').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('产品路线图')
    expect(wrapper.text()).not.toContain('访问链接')
    expect(wrapper.text()).toContain('互联网公开')
    expect(wrapper.find('.document-share-panel__mode-trigger').text()).toBe('互联网公开')
    expect(wrapper.find('.document-share-panel__mode-description').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('当前页面不对外分享')
    expect(wrapper.text()).not.toContain('只邀请明确的协作者')
    expect(wrapper.text()).not.toContain('登录后拿到链接即可查看')
    expect(wrapper.find('.document-share-panel__mode-trigger use[href="/icon-ui.svg#share-public"]').exists()).toBe(true)
    expect(wrapper.find('.document-share-panel__mode-icon--public').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__mode-trigger-icon').exists()).toBe(true)
    expect(wrapper.findAll('.el-dropdown-menu-stub .document-share-panel__mode-option')).toHaveLength(3)
    expect(wrapper.find('.el-dropdown-menu-stub .document-share-panel__mode-option-icon').exists()).toBe(true)
    expect(wrapper.find('.el-dropdown-menu-stub .document-share-panel__mode-option-title').exists()).toBe(true)
    expect(wrapper.find('.el-dropdown-menu-stub .document-share-panel__mode-icon').exists()).toBe(false)
    expect(wrapper.find('.el-dropdown-menu-stub .document-share-panel__mode-title').exists()).toBe(false)
    expect(wrapper.find('span.document-share-panel__dropdown-caret').exists()).toBe(false)
    expect(wrapper.findAll('use[href="/icon-ui.svg#chevron-down"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('可查看')
    expect(wrapper.text()).toContain('可评论')
    expect(wrapper.findAll('.document-share-panel__permission-item')[1]?.attributes('aria-disabled')).toBe('true')
    expect(wrapper.find('.document-share-panel__copy-strip').exists()).toBe(true)
    expect(wrapper.find('.document-share-panel__card').exists()).toBe(false)

    expect(wrapper.find('.document-share-panel__copy-button use[href="/icon-ui.svg#global-link-outlined"]').exists()).toBe(true)
    expect(wrapper.find('[data-icon="GlobalLinkOutlined"]').exists()).toBe(false)

    const noShareOption = wrapper.findAll('.el-dropdown-item-stub').find(node => node.text().includes('不分享'))

    await noShareOption?.trigger('click')

    expect(composableState.setNoShare).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').some(node => node.text() === '恢复继承父级权限')).toBe(false)
  })

  it('子文档有本地策略时展示恢复继承动作', async () => {
    resetComposableState()
    composableState.canRestoreInheritance.value = true
    composableState.isRootDocument.value = false

    const wrapper = mountDocumentShareDialog()
    const inheritOption = wrapper.findAll('.el-dropdown-item-stub').find(node => node.text().includes('继承父级'))

    await inheritOption?.trigger('click')

    expect(composableState.restoreInheritance).toHaveBeenCalledTimes(1)
  })

  it('根节点默认不分享时不显示摘要补充文案，并透传设为不分享动作', async () => {
    resetComposableState()
    composableState.selectedShareMode.value = DOCUMENT_SHARE_MODE.NONE
    composableState.hasPublicShare.value = false
    composableState.localPolicy.value = null
    composableState.hasLocalSharePolicy.value = false

    const wrapper = mountDocumentShareDialog()

    expect(wrapper.text()).toContain('不分享')
    expect(wrapper.text()).not.toContain('默认不分享')
    expect(wrapper.find('.document-share-panel__mode-description').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__mode-trigger use[href="/icon-ui.svg#share-none"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('阻断父级共享设置')
    expect(wrapper.find('.document-share-panel__card').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__copy-button').text()).toBe('复制链接')
    expect(wrapper.find('.document-share-panel__copy-button').attributes('disabled')).toBeDefined()

    const noShareButton = wrapper.findAll('.el-dropdown-item-stub').find(node => node.text().includes('不分享'))

    await noShareButton?.trigger('click')

    expect(composableState.setNoShare).toHaveBeenCalledTimes(1)
  })

  it('指定成员模式下展示协作者列表并透传列表动作', async () => {
    resetComposableState()
    composableState.selectedShareMode.value = DOCUMENT_SHARE_MODE.DIRECT_USER
    composableState.hasPublicShare.value = false
    composableState.hasDirectShare.value = true
    composableState.directShareItems.value = [createDirectShareItem()]
    composableState.localPolicy.value = {
      mode: 'DIRECT_USER',
    }
    composableState.selectedDirectShareUser.value = {
      id: 'viewer-1',
      displayName: '目标用户',
      userCode: 'SP-VIEWER1',
    }

    const wrapper = mountDocumentShareDialog()

    expect(wrapper.text()).toContain('添加协作者')
    expect(wrapper.text()).toContain('目标用户')
    expect(wrapper.find('.document-share-panel__mode-trigger use[href="/icon-ui.svg#share-direct"]').exists()).toBe(true)
    expect(wrapper.find('.document-share-panel__mode-icon--direct').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__share-table').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('尚未添加')
    expect(wrapper.text()).not.toContain('适合小范围协作')
    expect(wrapper.text()).not.toContain('还没有添加协作者')

    const contentChildren = [...wrapper.get('.document-share-panel__content').element.children]
    expect(contentChildren.at(-1)?.classList.contains('document-share-panel__copy-strip')).toBe(true)

    const createButton = wrapper.findAll('button').find(node => node.text() === '添加协作者')
    const copyButton = wrapper.findAll('button').find(node => node.text() === '复制链接')
    const revokeButton = wrapper.findAll('button').find(node => node.text() === '移除协作者')

    await createButton?.trigger('click')
    await copyButton?.trigger('click')
    await revokeButton?.trigger('click')

    expect(composableState.createDirectShare).toHaveBeenCalledTimes(1)
    expect(composableState.copyDirectShareLink).toHaveBeenCalledWith(composableState.directShareItems.value[0])
    expect(composableState.revokeDirectShare).toHaveBeenCalledWith(composableState.directShareItems.value[0])
  })

  it('继承父级分享状态时摘要显示父级权限提示', () => {
    resetComposableState()
    composableState.hasLocalSharePolicy.value = false
    composableState.isInheritingSharePolicy.value = true
    composableState.isRootDocument.value = false
    composableState.localPolicy.value = null
    composableState.effectivePolicy.value = {
      mode: 'PUBLIC_TO_LOGGED_IN',
      rootDocumentTitle: '父级文档',
    }

    const wrapper = mountDocumentShareDialog()

    expect(wrapper.text()).toContain('继承父级')
    expect(wrapper.get('.document-share-panel__mode-trigger .document-share-panel__mode-description').text()).toBe('当前父级权限：互联网公开（来自 父级文档）')
    expect(wrapper.find('.el-dropdown-menu-stub .document-share-panel__mode-description').exists()).toBe(false)
    expect(wrapper.find('.document-share-panel__mode-trigger use[href="/icon-ui.svg#share-inherit"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('当前父级权限：互联网公开（来自 父级文档）')
    expect(wrapper.text()).not.toContain('当前正在继承父级共享设置')
    expect(wrapper.findAll('button').some(node => node.text() === '恢复继承父级权限')).toBe(false)
  })
})
