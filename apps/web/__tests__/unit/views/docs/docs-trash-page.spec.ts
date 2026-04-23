import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide, shallowRef } from 'vue'
import DocsTrashPage from '@/views/docs/pages/DocsTrashPage.vue'

const tableRowsKey = Symbol('docs-trash-table-rows')

const composableState = {
  items: shallowRef([
    {
      id: 'trash-1',
      title: '已删除文档',
      collection: 'PERSONAL',
      ancestorTitles: ['父级目录'],
      trashedAt: '2026-04-22T10:00:00.000Z',
    },
  ]),
  isLoading: shallowRef(false),
  errorMessage: shallowRef(''),
  actionItemId: shallowRef(''),
  loadItems: vi.fn(),
  restoreItem: vi.fn(),
  permanentlyDeleteItem: vi.fn(),
}

vi.mock('@/views/docs/composables/useDocsTrashPage', () => ({
  useDocsTrashPage: () => composableState,
}))

function mountDocsTrashPage() {
  return mount(DocsTrashPage, {
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
          template: '<button><slot /></button>',
        }),
        ElEmpty: defineComponent({
          props: {
            description: {
              type: String,
              default: '',
            },
          },
          template: '<div class="el-empty-stub"><span>{{ description }}</span><slot /></div>',
        }),
        ElTable: defineComponent({
          props: {
            data: {
              type: Array,
              default: () => [],
            },
          },
          setup(props, { slots }) {
            provide(tableRowsKey, computed(() => props.data))

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
          },
          setup(props, { slots }) {
            const rows = inject(tableRowsKey, computed(() => [] as Array<Record<string, unknown>>))

            return () => h('section', {
              'class': 'el-table-column-stub',
              'data-label': props.label,
            }, [
              h('header', props.label),
              ...rows.value.flatMap((row, index) =>
                h('div', {
                  'class': 'el-table-column-stub__cell',
                  'data-row-id': String(row.id ?? index),
                }, slots.default?.({
                  row,
                  $index: index,
                }) ?? (props.prop ? [String(row[props.prop] ?? '')] : []))),
            ])
          },
        }),
      },
    },
  })
}

describe('docsTrashPage', () => {
  it('使用 ElTable 渲染回收站列表并透传行操作', async () => {
    composableState.items.value = [
      {
        id: 'trash-1',
        title: '已删除文档',
        collection: 'PERSONAL',
        ancestorTitles: ['父级目录'],
        trashedAt: '2026-04-22T10:00:00.000Z',
      },
    ]
    composableState.isLoading.value = false
    composableState.errorMessage.value = ''
    composableState.actionItemId.value = ''
    composableState.restoreItem.mockReset()
    composableState.permanentlyDeleteItem.mockReset()

    const wrapper = mountDocsTrashPage()

    expect(wrapper.find('.el-table-stub').exists()).toBe(true)
    expect(wrapper.find('.el-table-stub').attributes('data-row-count')).toBe('1')
    expect(wrapper.findAll('.el-table-column-stub').map(node => node.attributes('data-label'))).toEqual(['标题', '原位置', '删除时间', '操作'])
    expect(wrapper.text()).toContain('已删除文档')
    expect(wrapper.text()).toContain('父级目录')

    const buttons = wrapper.findAll('button')

    expect(buttons.map(node => node.text())).toEqual(['恢复', '彻底删除'])

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(composableState.restoreItem).toHaveBeenCalledWith('trash-1')
    expect(composableState.permanentlyDeleteItem).toHaveBeenCalledWith('trash-1')
  })

  it('空数据时通过 empty slot 展示错误并允许重新加载', async () => {
    composableState.items.value = []
    composableState.isLoading.value = true
    composableState.errorMessage.value = '回收站加载失败'
    composableState.actionItemId.value = ''
    composableState.loadItems.mockReset()

    const wrapper = mountDocsTrashPage()

    expect(wrapper.find('.el-table-stub').attributes('data-row-count')).toBe('0')
    expect(wrapper.text()).toContain('回收站加载失败')

    const reloadButton = wrapper.find('button')

    expect(reloadButton.text()).toBe('重新加载')

    await reloadButton.trigger('click')

    expect(composableState.loadItems).toHaveBeenCalledTimes(1)
  })
})
