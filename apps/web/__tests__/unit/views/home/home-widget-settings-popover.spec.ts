import type { HomeWidgetId } from '@/views/home/typing'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import HomeWidgetSettingsPopover from '@/views/home/components/HomeWidgetSettingsPopover.vue'

function mountHomeWidgetSettingsPopover() {
  return mount(HomeWidgetSettingsPopover, {
    props: {
      widgets: [
        {
          id: 'welcome',
          title: '欢迎语',
          description: '工作区摘要与当日状态。',
        },
        {
          id: 'recent-documents',
          title: '最近文档',
          description: '继续上次编辑上下文。',
        },
      ],
      visibleWidgetSet: new Set<HomeWidgetId>(['welcome']),
    },
    global: {
      stubs: {
        ElPopover: defineComponent({
          template: '<div class="el-popover-stub"><div class="el-popover-stub__reference"><slot name="reference" /></div><div class="el-popover-stub__content"><slot /></div></div>',
        }),
        ElButton: defineComponent({
          template: '<button><slot /></button>',
        }),
        ElSwitch: defineComponent({
          emits: ['change'],
          template: '<button class="el-switch-stub" @click="$emit(\'change\', true)">switch</button>',
        }),
        SvgIcon: defineComponent({
          template: '<span class="svg-icon-stub" />',
        }),
      },
    },
  })
}

describe('homeWidgetSettingsPopover', () => {
  it('使用列表语义渲染模块项，并透传开关动作', async () => {
    const wrapper = mountHomeWidgetSettingsPopover()

    expect(wrapper.find('ul.home-widget-settings__list').exists()).toBe(true)
    expect(wrapper.findAll('li.home-widget-settings__item')).toHaveLength(2)
    expect(wrapper.text()).toContain('欢迎语')
    expect(wrapper.text()).toContain('最近文档')

    const switches = wrapper.findAll('.el-switch-stub')

    await switches[0].trigger('click')
    await switches[1].trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([
      ['welcome'],
      ['recent-documents'],
    ])
  })
})
