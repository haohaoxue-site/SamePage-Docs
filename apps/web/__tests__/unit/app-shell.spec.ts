import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'

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

describe('workspace shell', () => {
  it('renders the home workspace with context bar and navigation', async () => {
    seedAuthState()

    const router = createAppRouter(createMemoryHistory())
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('主页')
    expect(wrapper.text()).toContain('SamePage')
    expect(wrapper.text()).toContain('最近文档')
    expect(wrapper.find('[data-testid="workspace-brand"]').exists()).toBe(true)
    expect(wrapper.find('.workspace-avatar-trigger').exists()).toBe(true)
  })

  it('renders the docs workspace and current node', async () => {
    seedAuthState()

    const router = createAppRouter(createMemoryHistory())
    await router.push('/docs/welcome')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('欢迎来到 SamePage')
    expect(wrapper.text()).toContain('产品简报')
    expect(wrapper.text()).toContain('上次更新于')
  })

  it('navigates to another node from the tree', async () => {
    seedAuthState()

    const router = createAppRouter(createMemoryHistory())
    await router.push('/docs/welcome')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()
    await flushPromises()
    await wrapper.get('[data-testid="document-tree-node-product-brief"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.params.id).toBe('product-brief')
    expect(wrapper.text()).toContain('产品简报')
  })
})
