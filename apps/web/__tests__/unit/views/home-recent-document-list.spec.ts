import type { RecentDocumentListProps } from '@/views/home/typing'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import RecentDocumentList from '@/views/home/components/RecentDocumentList.vue'

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => h('a', {
      'href': typeof props.to === 'string' ? props.to : JSON.stringify(props.to),
      'data-to': typeof props.to === 'string' ? props.to : JSON.stringify(props.to),
    }, slots.default?.())
  },
})

describe('recentDocumentList', () => {
  it('共享来源列表项会直接使用后端返回的 link 跳转', () => {
    const props: RecentDocumentListProps = {
      documents: [
        {
          id: 'doc-shared-1',
          title: '共享给我的文档',
          collection: 'shared',
          ancestorTitles: [],
          link: '/shared/recipients/recipient-1',
          share: null,
          createdAt: '2026-04-21T00:00:00.000Z',
          updatedAt: '2026-04-21T00:00:00.000Z',
        },
      ],
    }

    const wrapper = mount(RecentDocumentList, {
      props,
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          SvgIcon: true,
        },
      },
    })

    expect(wrapper.find('a').attributes('data-to')).toBe('/shared/recipients/recipient-1')
    expect(wrapper.text()).toContain('共享')
  })
})
