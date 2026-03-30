import type { WorkspaceNavigationItem } from '@/layouts/types'
import { useLocalStorage } from '@vueuse/core'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'samepage_workspace_sidebar_collapsed'

const navigationItems: WorkspaceNavigationItem[] = [
  {
    id: 'home',
    label: '主页',
    icon: 'i-carbon-home',
    description: '',
    to: '/home',
  },
  {
    id: 'chat',
    label: '聊天助手',
    icon: 'i-carbon-chat-bot',
    description: '',
    to: '/chat',
  },
  {
    id: 'docs',
    label: '文档',
    icon: 'i-carbon-document-multiple-01',
    description: '',
    to: '/docs',
  },
  {
    id: 'knowledge',
    label: '知识库',
    icon: 'i-carbon-data-base',
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
