import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import RecentDocumentList from '@/views/home/components/RecentDocumentList.vue'

function seedAuthState() {
  const authStore = useAuthStore()
  authStore.accessToken = 'test-access-token'
  authStore.user = {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    avatarUrl: null,
    roles: [],
    permissions: [],
  }
}

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
            summary: '这是产品的第一篇引导文档，用来说明当前 MVP 的定位与目标。',
            createdAt: '2026-03-29T08:00:00.000Z',
            updatedAt: '2026-03-30T08:00:00.000Z',
          },
          {
            id: 'meeting-notes',
            title: '迭代会议纪要',
            summary: '记录首阶段重点：工程基线、页面壳子、编辑器 MVP。',
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
    expect(wrapper.text()).toContain('迭代会议纪要')
    expect(wrapper.text()).toContain('更新于')
  })
})
