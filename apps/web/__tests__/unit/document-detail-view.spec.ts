import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory } from 'vue-router'
import * as documentApi from '@/apis/document'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useDocumentWorkspace } from '@/views/docs/composables/useDocumentWorkspace'

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

describe('documentWorkspace', () => {
  it('resolves the current node from route params', async () => {
    seedAuthState()
    const router = createAppRouter(createMemoryHistory())

    await router.push('/docs/product-brief')
    await router.isReady()

    const Probe = defineComponent({
      setup() {
        const { currentDocument } = useDocumentWorkspace()

        return {
          currentDocument,
        }
      },
      template: '<div>{{ currentDocument?.title }}</div>',
    })

    const wrapper = mount(Probe, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('产品简报')
    expect((wrapper.vm as { currentDocument: { id: string } }).currentDocument.id).toBe('product-brief')
  })

  it('keeps local content and title state for the current node', async () => {
    seedAuthState()
    const router = createAppRouter(createMemoryHistory())

    await router.push('/docs/welcome')
    await router.isReady()

    const Probe = defineComponent({
      setup() {
        const { currentDocument, updateDocumentContent, updateDocumentTitle } = useDocumentWorkspace()

        return {
          currentDocument,
          updateDocumentContent,
          updateDocumentTitle,
        }
      },
      template: `
        <div>
          <button data-testid="title" @click="updateDocumentTitle('新的标题')">title</button>
          <button data-testid="content" @click="updateDocumentContent('<p>新的正文</p>')">content</button>
          <div>{{ currentDocument?.title }}</div>
          <div>{{ currentDocument?.content }}</div>
        </div>
      `,
    })

    const wrapper = mount(Probe, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()
    await flushPromises()
    await wrapper.get('[data-testid="title"]').trigger('click')
    await wrapper.get('[data-testid="content"]').trigger('click')

    const vm = wrapper.vm as { currentDocument: { title: string, content: string } }
    expect(vm.currentDocument.title).toBe('新的标题')
    expect(vm.currentDocument.content).toBe('<p>新的正文</p>')
  })

  it('auto saves the current draft after editing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T13:00:00.000Z'))
    seedAuthState()
    const router = createAppRouter(createMemoryHistory())

    await router.push('/docs/welcome')
    await router.isReady()

    try {
      const Probe = defineComponent({
        setup() {
          const { currentDocument, saveStateLabel, updateDocumentTitle } = useDocumentWorkspace()

          return {
            currentDocument,
            saveStateLabel,
            updateDocumentTitle,
          }
        },
        template: `
          <div>
            <button data-testid="change" @click="updateDocumentTitle('新的标题')">change</button>
            <div>{{ saveStateLabel }}</div>
            <div>{{ currentDocument?.updatedAt }}</div>
          </div>
        `,
      })

      const wrapper = mount(Probe, {
        global: {
          plugins: [router],
        },
      })

      await flushPromises()
      await flushPromises()

      expect(wrapper.text()).toContain('上次更新于 5 小时前')

      await wrapper.get('[data-testid="change"]').trigger('click')

      expect(wrapper.text()).toContain('保存中')

      await vi.advanceTimersByTimeAsync(1300)
      await flushPromises()

      expect(documentApi.saveDocumentNode).toHaveBeenCalledWith('welcome', {
        title: '新的标题',
        content: expect.stringContaining('欢迎来到 SamePage'),
      })
      expect(wrapper.text()).toContain('已保存到云端')
      expect(wrapper.text()).toContain('2026-03-30T12:00:00.000Z')
    }
    finally {
      vi.useRealTimers()
    }
  })
})
