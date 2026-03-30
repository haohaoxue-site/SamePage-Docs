import type { AdminNavigationItem, AdminPageHeader } from '@/layouts/types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const navigationItems: AdminNavigationItem[] = [
  {
    id: 'overview',
    label: '概览',
    routeName: 'admin-overview',
    description: '系统指标与当前配置',
  },
  {
    id: 'users',
    label: '用户',
    routeName: 'admin-users',
    description: '用户状态与系统管理员',
  },
  {
    id: 'governance',
    label: '平台治理',
    routeName: 'admin-governance',
    description: '文档流转与风控',
  },
  {
    id: 'ai-config',
    label: 'AI 配置',
    routeName: 'admin-ai-config',
    description: '系统级 AI 配置',
  },
  {
    id: 'audit',
    label: '审计',
    routeName: 'admin-audit',
    description: '后台操作记录',
  },
]

export function useAdminShell() {
  const route = useRoute()

  const pageHeader = computed<AdminPageHeader>(() => ({
    eyebrow: route.meta.adminEyebrow ?? '系统后台',
    title: route.meta.adminTitle ?? '系统管理',
    description: route.meta.adminDescription ?? '系统管理控制台。',
  }))

  return {
    navigationItems,
    pageHeader,
  }
}
