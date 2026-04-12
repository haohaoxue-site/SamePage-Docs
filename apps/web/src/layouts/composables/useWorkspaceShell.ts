import { useLocalStorage } from '@vueuse/core'
import { workspaceNavigationItems } from '@/router/routes'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'samepage_workspace_sidebar_collapsed'

export function useWorkspaceShell() {
  const isSidebarCollapsed = useLocalStorage(SIDEBAR_COLLAPSED_STORAGE_KEY, false)

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  return {
    navigationItems: workspaceNavigationItems,
    isSidebarCollapsed,
    toggleSidebar,
  }
}
