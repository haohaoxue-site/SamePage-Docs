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
  }
}
