import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import SessionAppearancePanel from '@/layouts/components/session-user-menu/SessionAppearancePanel.vue'

function mountSessionAppearancePanel(isSaving = false) {
  return mount(SessionAppearancePanel, {
    props: {
      currentAppearance: 'dark',
      isSaving,
      options: [
        {
          label: '浅色',
          value: 'light',
        },
        {
          label: '深色',
          value: 'dark',
        },
      ],
    },
    global: {
      stubs: {
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
      },
    },
  })
}

describe('sessionAppearancePanel', () => {
  it('使用列表项包裹真实按钮，并透传外观切换事件', async () => {
    const wrapper = mountSessionAppearancePanel()

    expect(wrapper.find('ul.session-appearance-list').exists()).toBe(true)
    expect(wrapper.findAll('li.session-appearance-option')).toHaveLength(2)
    expect(wrapper.findAll('.session-appearance-option__button')).toHaveLength(2)
    expect(wrapper.find('.session-appearance-option.is-active').text()).toContain('深色')

    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('select')).toEqual([
      ['light'],
      ['dark'],
    ])
  })

  it('保存中时禁用所有外观选项按钮', () => {
    const wrapper = mountSessionAppearancePanel(true)

    expect(wrapper.findAll('button').every(node => node.attributes('disabled') !== undefined)).toBe(true)
  })
})
