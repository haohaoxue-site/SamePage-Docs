import type { RouteRecordRaw } from 'vue-router'
import type { WorkspaceNavigationItem, WorkspaceNavigationMeta } from './typing'
import { AUTH_CALLBACK_PATH } from '@haohaoxue/samepage-contracts'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import AdminShellContainer from '@/layouts/containers/admin-shell.vue'
import WorkspaceContainer from '@/layouts/containers/workspace.vue'
import AuthCallbackView from '@/views/auth/callback/index.vue'
import ChangePasswordView from '@/views/auth/change-password/index.vue'
import LoginView from '@/views/auth/login/index.vue'
import PasswordRegisterVerifyView from '@/views/auth/register-verify/index.vue'
import PasswordRegisterRequestView from '@/views/auth/register/index.vue'
import ChatView from '@/views/chat/index.vue'
import DocsView from '@/views/docs/index.vue'
import HomeView from '@/views/home/index.vue'
import KnowledgeView from '@/views/knowledge/index.vue'
import AdminAiConfigView from '@/views/system-admin/ai-config/index.vue'
import AdminAuditView from '@/views/system-admin/audit/index.vue'
import AdminEmailView from '@/views/system-admin/email/index.vue'
import AdminGovernanceView from '@/views/system-admin/governance/index.vue'
import AdminOverviewView from '@/views/system-admin/overview/index.vue'
import AdminUsersView from '@/views/system-admin/users/index.vue'
import UserSettingsView from '@/views/user/index.vue'
import { adminNavigationItems } from './navigation'

const adminRouteComponents = {
  'admin-overview': AdminOverviewView,
  'admin-users': AdminUsersView,
  'admin-email': AdminEmailView,
  'admin-governance': AdminGovernanceView,
  'admin-ai-config': AdminAiConfigView,
  'admin-audit': AdminAuditView,
} as const

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: AUTH_CALLBACK_PATH,
    name: 'auth-callback',
    component: AuthCallbackView,
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: PasswordRegisterRequestView,
    meta: { public: true },
  },
  {
    path: '/register/verify',
    name: 'register-verify',
    component: PasswordRegisterVerifyView,
    meta: { public: true },
  },
]

const workspaceRouteChildren = [
  {
    path: '',
    redirect: '/home',
  },
  {
    path: 'home',
    name: 'home',
    component: HomeView,
    meta: {
      workspaceNav: defineWorkspaceNavigationMeta({
        label: '主页',
        iconCategory: SvgIconCategory.NAV,
        icon: 'home',
        activeIcon: 'home-active',
      }),
    },
  },
  {
    path: 'chat',
    name: 'chat',
    component: ChatView,
    meta: {
      workspaceNav: defineWorkspaceNavigationMeta({
        label: '聊天助手',
        iconCategory: SvgIconCategory.NAV,
        icon: 'chat',
        activeIcon: 'chat-active',
      }),
    },
  },
  {
    path: 'docs/:id?',
    name: 'docs',
    component: DocsView,
    meta: {
      workspaceNav: defineWorkspaceNavigationMeta({
        label: '文档',
        iconCategory: SvgIconCategory.NAV,
        icon: 'docs',
        activeIcon: 'docs-active',
      }),
    },
  },
  {
    path: 'knowledge',
    name: 'knowledge',
    component: KnowledgeView,
    meta: {
      workspaceNav: defineWorkspaceNavigationMeta({
        label: '知识库',
        iconCategory: SvgIconCategory.NAV,
        icon: 'knowledge',
        activeIcon: 'knowledge-active',
      }),
    },
  },
  {
    path: 'user',
    name: 'user',
    component: UserSettingsView,
    meta: {
      workspaceNav: defineWorkspaceNavigationMeta({
        label: '个人设置',
        iconCategory: SvgIconCategory.NAV,
        icon: 'user-settings',
        activeIcon: 'user-settings-active',
      }),
    },
  },
] satisfies RouteRecordRaw[]

export const workspaceNavigationItems: WorkspaceNavigationItem[] = workspaceRouteChildren.flatMap((route) => {
  const workspaceNav = route.meta?.workspaceNav

  if (!workspaceNav || !route.name) {
    return []
  }

  return [{
    id: String(route.name),
    label: workspaceNav.label,
    iconCategory: workspaceNav.iconCategory,
    icon: workspaceNav.icon,
    activeIcon: workspaceNav.activeIcon,
    to: normalizeWorkspaceNavigationPath(route.path),
  }]
})

export const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '/auth/change-password',
    name: 'change-password',
    component: ChangePasswordView,
    meta: { allowWhenPasswordChangeRequired: true },
  },
  {
    path: '/',
    component: WorkspaceContainer,
    children: workspaceRouteChildren,
  },
]

export const adminRoute: RouteRecordRaw = {
  path: '/admin',
  name: 'admin',
  component: AdminShellContainer,
  redirect: '/admin/overview',
  children: [
    ...adminNavigationItems.map(item => ({
      path: item.path.replace('/admin/', ''),
      name: item.routeName,
      component: adminRouteComponents[item.routeName],
    })),
  ],
}

function normalizeWorkspaceNavigationPath(path: string) {
  const [staticPath] = path.split('/:')
  const normalizedPath = staticPath || ''

  return normalizedPath.startsWith('/')
    ? normalizedPath || '/'
    : `/${normalizedPath}`
}

function defineWorkspaceNavigationMeta(meta: WorkspaceNavigationMeta) {
  return meta
}
