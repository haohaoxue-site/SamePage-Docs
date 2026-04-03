import type { Router } from 'vue-router'
import { loadAdminRoutes, resetAdminRoutes } from '@/router'
import { useAuthStore } from '@/stores/auth'

export default async function setupAuth(router: Router) {
  const authStore = useAuthStore()

  if (!authStore.accessToken) {
    if (authStore.user) {
      authStore.clearSession()
    }
    return
  }

  try {
    await authStore.refreshToken()
  }
  catch {
  }
  if (authStore.isSystemAdmin) {
    loadAdminRoutes(router)
    return
  }

  resetAdminRoutes(router)
}
