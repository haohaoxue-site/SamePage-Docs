import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import DocumentShareStatusEntry from '@/views/docs/components/DocumentShareStatusEntry.vue'

describe('documentShareStatusEntry', () => {
  it('当前节点已分享时会显示分享方式，并请求打开当前文档分享弹窗', async () => {
    const wrapper = mount(DocumentShareStatusEntry, {
      props: {
        documentId: 'doc-root-1',
        share: {
          localPolicy: {
            mode: 'DIRECT_USER',
            shareId: 'share-root-1',
            directUserCount: 1,
            updatedAt: '2026-04-21T00:00:00.000Z',
            updatedBy: 'user-1',
          },
          effectivePolicy: {
            mode: 'DIRECT_USER',
            shareId: 'share-root-1',
            rootDocumentId: 'doc-root-1',
            rootDocumentTitle: '共享根文档',
            updatedAt: '2026-04-21T00:00:00.000Z',
            updatedBy: 'user-1',
          },
        },
      },
      global: {
        stubs: {
          ElButton: defineComponent({
            emits: ['click'],
            template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    expect(wrapper.text()).toContain('指定成员')
    expect(wrapper.find('use[href="/icon-ui.svg#share-direct"]').exists()).toBe(true)

    await wrapper.get('.el-button-stub').trigger('click')

    expect(wrapper.emitted('openShare')).toEqual([['doc-root-1']])
  })

  it('继承分享时会显示继承状态，但仍打开当前文档分享弹窗', async () => {
    const wrapper = mount(DocumentShareStatusEntry, {
      props: {
        documentId: 'doc-child-1',
        share: {
          localPolicy: null,
          effectivePolicy: {
            mode: 'PUBLIC_TO_LOGGED_IN',
            shareId: 'share-root-1',
            rootDocumentId: 'doc-root-1',
            rootDocumentTitle: '共享根文档',
            updatedAt: '2026-04-21T00:00:00.000Z',
            updatedBy: 'user-1',
          },
        },
      },
      global: {
        stubs: {
          ElButton: defineComponent({
            emits: ['click'],
            template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    expect(wrapper.text()).toContain('互联网公开')
    expect(wrapper.find('use[href="/icon-ui.svg#share-public"]').exists()).toBe(true)

    await wrapper.get('.el-button-stub').trigger('click')

    expect(wrapper.emitted('openShare')).toEqual([['doc-child-1']])
  })

  it('没有分享投影时显示不分享和不分享图标', () => {
    const wrapper = mount(DocumentShareStatusEntry, {
      props: {
        documentId: 'doc-empty-1',
        share: null,
      },
      global: {
        stubs: {
          ElButton: defineComponent({
            emits: ['click'],
            template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    expect(wrapper.text()).toContain('不分享')
    expect(wrapper.find('use[href="/icon-ui.svg#share-none"]').exists()).toBe(true)
  })
})
