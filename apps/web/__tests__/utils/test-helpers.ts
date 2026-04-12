import type { Router } from 'vue-router'
import type { AuthUserDto } from '@/apis/auth'
import { AUTH_METHOD } from '@haohaoxue/samepage-contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

export function createMockUser(overrides: Partial<AuthUserDto> = {}): AuthUserDto {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    avatarUrl: null,
    roles: [],
    permissions: [],
    authMethods: [AUTH_METHOD.PASSWORD],
    mustChangePassword: false,
    emailVerified: true,
    ...overrides,
  }
}

export function createMockTokenExchangeResponse(overrides: Partial<AuthUserDto> = {}) {
  return {
    accessToken: 'test-access-token',
    expiresIn: 900,
    user: createMockUser(overrides),
  }
}

export function seedAuthState(overrides: Partial<AuthUserDto> = {}) {
  const authStore = useAuthStore()
  const userStore = useUserStore()
  authStore.accessToken = 'test-access-token'
  userStore.setCurrentUser(createMockUser(overrides))
}

export async function mountAt(path: string): Promise<{ wrapper: ReturnType<typeof mount>, router: Router }> {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  await flushPromises()

  return { wrapper, router }
}
