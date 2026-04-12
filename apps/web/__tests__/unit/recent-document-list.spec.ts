import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import RecentDocumentList from '@/views/home/components/RecentDocumentList.vue'
import { seedAuthState } from '../utils/test-helpers'

describe('recentDocumentList', () => {
  it('renders recent document cards', async () => {
    seedAuthState()
    const router = createAppRouter(createMemoryHistory())

    await router.push('/home')
    await router.isReady()

    const wrapper = mount(RecentDocumentList, {
      props: {
        documents: [
          {
            id: 'welcome',
            title: '欢迎来到 SamePage',
            collection: DOCUMENT_COLLECTION.PERSONAL,
            ancestorTitles: [],
            createdAt: '2026-03-29T08:00:00.000Z',
            updatedAt: '2026-03-30T08:00:00.000Z',
          },
          {
            id: 'meeting-notes',
            title: '迭代会议纪要',
            collection: DOCUMENT_COLLECTION.SHARED,
            ancestorTitles: ['产品空间', '项目节奏'],
            createdAt: '2026-03-29T10:00:00.000Z',
            updatedAt: '2026-03-30T10:00:00.000Z',
          },
        ],
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('最近文档')
    expect(wrapper.text()).toContain('2 篇文档')
    expect(wrapper.text()).toContain('私有')
    expect(wrapper.text()).toContain('迭代会议纪要')
    expect(wrapper.text()).toContain('共享/产品空间/项目节奏')
    expect(wrapper.text()).toContain('更新于')
  })
})
