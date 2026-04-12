import type { WorkspaceNavigationMeta } from '@/router/typing'
import 'axios'
import 'vue-router'

declare module 'axios' {
  interface AxiosRequestConfig {
    withCookieAuth?: boolean
  }

  interface InternalAxiosRequestConfig {
    withCookieAuth?: boolean
    _retry?: boolean
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    /** 公开路由，无需登录即可访问 */
    public?: boolean
    /** 密码强制修改期间仍允许访问 */
    allowWhenPasswordChangeRequired?: boolean
    /** 工作区侧栏导航元数据 */
    workspaceNav?: WorkspaceNavigationMeta
  }
}
