import type { DocumentTreeGroup } from '@haohaoxue/samepage-domain'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h, inject, provide } from 'vue'
import DocsPermissionsPage from '@/views/docs/pages/DocsPermissionsPage.vue'

const tableRowsKey = Symbol('docs-permissions-table-rows')

function createTreeGroups(): DocumentTreeGroup[] {
  return [
    {
      id: DOCUMENT_COLLECTION.PERSONAL,
      nodes: [
        {
          id: 'doc-1',
          parentId: null,
          title: '产品路线图',
          summary: '',
          hasChildren: false,
          hasContent: true,
          createdAt: '2026-04-21T00:00:00.000Z',
          updatedAt: '2026-04-22T10:00:00.000Z',
          children: [],
          share: {
            localPolicy: {
              mode: 'DIRECT_USER',
              shareId: 'share-1',
              directUserCount: 2,
              updatedAt: '2026-04-22T10:00:00.000Z',
              updatedBy: 'user-1',
            },
            effectivePolicy: {
              mode: 'DIRECT_USER',
              shareId: 'share-1',
              rootDocumentId: 'doc-1',
              rootDocumentTitle: '产品路线图',
              updatedAt: '2026-04-22T10:00:00.000Z',
              updatedBy: 'user-1',
            },
          },
        },
      ],
    },
  ]
}

function mountDocsPermissionsPage() {
  return mount(DocsPermissionsPage, {
    props: {
      treeGroups: createTreeGroups(),
      isLoading: false,
    },
    global: {
      directives: {
        loading: {
          mounted(el, binding) {
            el.setAttribute('data-loading', String(binding.value))
          },
          updated(el, binding) {
            el.setAttribute('data-loading', String(binding.value))
          },
        },
      },
      stubs: {
        ElButton: defineComponent({
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        }),
        ElTag: defineComponent({
          template: '<span class="el-tag-stub"><slot /></span>',
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
        ElTable: defineComponent({
          props: {
            data: {
              type: Array,
              default: () => [],
            },
          },
          setup(props, { slots }) {
            provide(tableRowsKey, computed(() => props.data as Array<Record<string, unknown>>))

            return () => h('div', {
              'class': 'el-table-stub',
              'data-row-count': String(props.data.length),
            }, [
              slots.default?.(),
              props.data.length ? null : slots.empty?.(),
            ])
          },
        }),
        ElTableColumn: defineComponent({
          props: {
            label: {
              type: String,
              default: '',
            },
            prop: {
              type: String,
              default: '',
            },
            formatter: {
              type: Function,
              default: null,
            },
          },
          setup(props, { slots }) {
            const rows = inject(tableRowsKey, computed(() => [] as Array<Record<string, unknown>>))

            return () => h('section', {
              'class': 'el-table-column-stub',
              'data-label': props.label,
            }, [
              h('header', props.label),
              ...rows.value.map((row, index) => {
                const cellContent = slots.default?.({
                  row,
                  $index: index,
                }) ?? [
                  props.formatter
                    ? String(props.formatter(row, null, row[props.prop], index))
                    : String(row[props.prop] ?? ''),
                ]

                return h('div', {
                  'class': 'el-table-column-stub__cell',
                  'data-row-id': String(row.documentId ?? index),
                }, cellContent)
              }),
            ])
          },
        }),
      },
    },
  })
}

describe('docsPermissionsPage', () => {
  it('使用标准表格列渲染权限总览，并在管理时请求打开分享弹窗', async () => {
    const wrapper = mountDocsPermissionsPage()

    expect(wrapper.find('.el-table-stub').attributes('data-row-count')).toBe('1')
    expect(wrapper.findAll('.el-table-column-stub').map(node => node.attributes('data-label'))).toEqual([
      '文档标题',
      '所在位置',
      '分组',
      '分享方式',
      '最近更新',
      '操作',
    ])
    expect(wrapper.text()).toContain('产品路线图')
    expect(wrapper.text()).toContain('根目录')
    expect(wrapper.text()).toContain('指定成员 2 人')

    const manageButton = wrapper.find('button')

    expect(manageButton.text()).toBe('管理')

    await manageButton.trigger('click')

    expect(wrapper.emitted('openShare')).toEqual([['doc-1']])
  })

  it('空数据时通过 empty slot 展示空态', () => {
    const wrapper = mount(DocsPermissionsPage, {
      props: {
        treeGroups: [],
        isLoading: true,
      },
      global: {
        directives: {
          loading: {
            mounted(el, binding) {
              el.setAttribute('data-loading', String(binding.value))
            },
            updated(el, binding) {
              el.setAttribute('data-loading', String(binding.value))
            },
          },
        },
        stubs: {
          ElButton: defineComponent({
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          }),
          ElTag: defineComponent({
            template: '<span class="el-tag-stub"><slot /></span>',
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
          ElTable: defineComponent({
            props: {
              data: {
                type: Array,
                default: () => [],
              },
            },
            setup(props, { slots }) {
              return () => h('div', {
                'class': 'el-table-stub',
                'data-row-count': String(props.data.length),
              }, [
                slots.default?.(),
                props.data.length ? null : slots.empty?.(),
              ])
            },
          }),
          ElTableColumn: defineComponent({
            template: '<div class="el-table-column-stub" />',
          }),
        },
      },
    })

    expect(wrapper.find('.el-empty-stub').text()).toContain('当前空间还没有已开启分享的文档。')
  })
})
