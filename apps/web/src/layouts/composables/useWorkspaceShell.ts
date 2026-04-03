import type { WorkspaceNavigationItem } from '@/layouts/typing'
import { useLocalStorage } from '@vueuse/core'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'samepage_workspace_sidebar_collapsed'

const navigationItems: WorkspaceNavigationItem[] = [
  {
    id: 'home',
    label: '主页',
    icon: 'home',
    iconCategory: 'nav',
    activeIcon: 'home-active',
    description: '',
    to: '/home',
  },
  {
    id: 'chat',
    label: '聊天助手',
    icon: 'chat',
    iconCategory: 'nav',
    activeIcon: 'chat-active',
    description: '',
    to: '/chat',
  },
  {
    id: 'docs',
    label: '文档',
    icon: 'docs',
    iconCategory: 'nav',
    activeIcon: 'docs-active',
    description: '',
    to: '/docs',
  },
  {
    id: 'knowledge',
    label: '知识库',
    icon: 'knowledge',
    iconCategory: 'nav',
    activeIcon: 'knowledge-active',
    description: '',
    to: '/knowledge',
  },
]

export function useWorkspaceShell() {
  const isSidebarCollapsed = useLocalStorage(SIDEBAR_COLLAPSED_STORAGE_KEY, false)

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  return {
    navigationItems,
    isSidebarCollapsed,
    toggleSidebar,
  }
}
