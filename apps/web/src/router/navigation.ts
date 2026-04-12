import type { AdminNavigationItem } from './typing'

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    label: '概览',
    title: '系统概览',
    routeName: 'admin-overview',
    path: '/admin/overview',
    description: '查看平台整体运行状态与关键指标。',
  },
  {
    label: '用户',
    title: '用户管理',
    routeName: 'admin-users',
    path: '/admin/users',
    description: '管理用户账号状态与系统权限。',
  },
  {
    label: '邮件',
    title: '发件配置',
    routeName: 'admin-email',
    path: '/admin/email',
    description: '配置平台发件账号。',
  },
  {
    label: '平台治理',
    title: '平台治理',
    routeName: 'admin-governance',
    path: '/admin/governance',
    description: '查看文档流转态势与风控状态。',
  },
  {
    label: 'AI 配置',
    title: 'AI 配置',
    routeName: 'admin-ai-config',
    path: '/admin/ai-config',
    description: '维护系统级 AI 接口。',
  },
  {
    label: '审计',
    title: '审计日志',
    routeName: 'admin-audit',
    path: '/admin/audit',
    description: '查看关键后台操作的审计记录。',
  },
]

export const DEFAULT_ADMIN_NAVIGATION_ITEM = adminNavigationItems[0]
