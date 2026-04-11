import type { Router } from 'vue-router'
import type { useAuthStore } from '@/stores/auth'
import { loadAdminRoutes, resetAdminRoutes } from '@/router'

export async function completeAuthNavigation(router: Router, authStore: ReturnType<typeof useAuthStore>) {
  if (authStore.isSystemAdmin) {
    loadAdminRoutes(router)
  }
  else {
    resetAdminRoutes(router)
  }

  if (authStore.requiresPasswordChange) {
    await router.replace({ name: 'change-password' })
    return
  }

  const saved = authStore.consumeRedirect()
  await router.replace(saved || { name: authStore.defaultRouteName })
}

export function syncPendingRedirect(redirect: unknown, authStore: ReturnType<typeof useAuthStore>) {
  if (typeof redirect !== 'string') {
    return
  }

  const normalizedRedirect = redirect.trim()

  if (!normalizedRedirect.length) {
    return
  }

  authStore.savePendingRedirect(normalizedRedirect)
}
