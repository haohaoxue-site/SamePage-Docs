import type { Router, RouterHistory } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { rememberWorkspaceEntryPath } from '@/layouts/utils/workspace-entry'
import { useAuthStore } from '@/stores/auth'

import { adminRoute, protectedRoutes, publicRoutes } from './routes'

export function loadAdminRoutes(router: Router) {
  if (router.hasRoute('admin'))
    return
  router.addRoute(adminRoute)
}

export function resetAdminRoutes(router: Router) {
  if (!router.hasRoute('admin'))
    return
  router.removeRoute('admin')
}

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [...publicRoutes, ...protectedRoutes],
  })

  if (useAuthStore().isSystemAdmin) {
    loadAdminRoutes(router)
  }

  router.beforeEach((to) => {
    const authStore = useAuthStore()

    if (to.meta.public) {
      if (authStore.isAuthenticated) {
        return { name: authStore.defaultRouteName }
      }
      return true
    }

    if (!authStore.isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (to.path.startsWith('/admin') && !authStore.isSystemAdmin) {
      return { name: 'home' }
    }

    if (authStore.isSystemAdmin && !router.hasRoute('admin')) {
      loadAdminRoutes(router)
      return to.fullPath
    }

    return true
  })

  router.afterEach((to) => {
    if (to.meta.public || to.path.startsWith('/admin')) {
      return
    }

    rememberWorkspaceEntryPath(to.fullPath)
  })

  return router
}
