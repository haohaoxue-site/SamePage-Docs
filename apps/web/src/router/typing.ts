import type { WorkspaceModuleId } from '@/layouts/types'
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 公开路由，无需登录即可访问 */
    public?: boolean
    /** 工作区模块标识 */
    workspaceModule?: WorkspaceModuleId
    /** Admin 页面眉批标签 */
    adminEyebrow?: string
    /** Admin 页面标题 */
    adminTitle?: string
    /** Admin 页面描述 */
    adminDescription?: string
  }
}
