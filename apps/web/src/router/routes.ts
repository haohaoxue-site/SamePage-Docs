import type { RouteRecordRaw } from 'vue-router'
import AdminShellContainer from '@/layouts/containers/admin-shell.vue'
import WorkspaceContainer from '@/layouts/containers/workspace.vue'
import AuthCallbackView from '@/views/auth/callback/index.vue'
import LoginView from '@/views/auth/login/index.vue'
import ChatView from '@/views/chat/index.vue'
import DocsView from '@/views/docs/index.vue'
import HomeView from '@/views/home/index.vue'
import KnowledgeView from '@/views/knowledge/index.vue'
import AdminAiConfigView from '@/views/system-admin/ai-config/index.vue'
import AdminAuditView from '@/views/system-admin/audit/index.vue'
import AdminGovernanceView from '@/views/system-admin/governance/index.vue'
import AdminOverviewView from '@/views/system-admin/overview/index.vue'
import AdminUsersView from '@/views/system-admin/users/index.vue'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: AuthCallbackView,
    meta: { public: true },
  },
]

export const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: WorkspaceContainer,
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        name: 'home',
        component: HomeView,
        meta: {
          workspaceModule: 'home',
        },
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatView,
        meta: {
          workspaceModule: 'chat',
        },
      },
      {
        path: 'docs/:id?',
        name: 'docs',
        component: DocsView,
        meta: {
          workspaceModule: 'docs',
        },
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: KnowledgeView,
        meta: {
          workspaceModule: 'knowledge',
        },
      },
    ],
  },
]

export const adminRoute: RouteRecordRaw = {
  path: '/admin',
  name: 'admin',
  component: AdminShellContainer,
  children: [
    {
      path: '',
      name: 'admin-overview',
      component: AdminOverviewView,
      meta: {
        adminEyebrow: 'System Snapshot',
        adminTitle: '系统概览',
        adminDescription: '查看平台整体运行状态与关键指标。',
      },
    },
    {
      path: 'users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: {
        adminEyebrow: 'User Control',
        adminTitle: '用户管理',
        adminDescription: '管理用户账号状态与系统权限。',
      },
    },
    {
      path: 'governance',
      name: 'admin-governance',
      component: AdminGovernanceView,
      meta: {
        adminEyebrow: 'Governance',
        adminTitle: '平台治理',
        adminDescription: '查看文档流转态势与风控状态。',
      },
    },
    {
      path: 'ai-config',
      name: 'admin-ai-config',
      component: AdminAiConfigView,
      meta: {
        adminEyebrow: 'System AI',
        adminTitle: 'AI 配置',
        adminDescription: '维护系统级 AI 接口地址、密钥与默认模型。',
      },
    },
    {
      path: 'audit',
      name: 'admin-audit',
      component: AdminAuditView,
      meta: {
        adminEyebrow: 'Audit Trail',
        adminTitle: '审计日志',
        adminDescription: '查看关键后台操作的审计记录。',
      },
    },
  ],
}
