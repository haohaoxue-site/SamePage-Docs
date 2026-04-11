import type { RouteRecordRaw } from 'vue-router'
import { AUTH_CALLBACK_PATH } from '@haohaoxue/samepage-contracts'
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
import AdminGovernanceView from '@/views/system-admin/governance/index.vue'
import AdminOverviewView from '@/views/system-admin/overview/index.vue'
import AdminUsersView from '@/views/system-admin/users/index.vue'
import { adminNavigationItems } from './navigation'

const adminRouteComponents = {
  'admin-overview': AdminOverviewView,
  'admin-users': AdminUsersView,
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
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        name: 'home',
        component: HomeView,
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatView,
      },
      {
        path: 'docs/:id?',
        name: 'docs',
        component: DocsView,
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: KnowledgeView,
      },
    ],
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
