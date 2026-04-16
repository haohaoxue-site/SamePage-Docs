import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import DocumentContextActions from '@/views/docs/components/DocumentContextActions.vue'

function mountDocumentContextActions(canDeleteDocument: boolean) {
  return mount(DocumentContextActions, {
    props: {
      canDeleteDocument,
    },
    global: {
      stubs: {
        ElPopover: defineComponent({
          template: '<div class="el-popover-stub"><slot name="reference" /><slot /></div>',
        }),
        ElDropdown: defineComponent({
          template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>',
        }),
        ElDropdownMenu: defineComponent({
          template: '<ul class="el-dropdown-menu-stub"><slot /></ul>',
        }),
        ElDropdownItem: defineComponent({
          template: '<li class="el-dropdown-item-stub"><slot /></li>',
        }),
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
      },
    },
  })
}

describe('documentContextActions', () => {
  it('使用 dropdown 的 ul/li 结构渲染菜单', () => {
    const wrapper = mountDocumentContextActions(true)

    expect(wrapper.find('.el-popover-stub').exists()).toBe(false)
    expect(wrapper.find('.el-dropdown-stub').exists()).toBe(true)
    expect(wrapper.find('ul.document-context-menu').exists()).toBe(true)

    const items = wrapper.findAll('li.document-context-menu__item')

    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('历史记录')
    expect(items[1]?.text()).toContain('删除')
  })
})
