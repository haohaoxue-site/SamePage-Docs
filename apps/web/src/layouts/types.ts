import type { DocumentBase } from '@haohaoxue/samepage-domain'

/**
 * 工作区主导航模块。
 */
export type WorkspaceModuleId = 'home' | 'chat' | 'docs' | 'knowledge'

/**
 * 工作区导航项。
 */
export interface WorkspaceNavigationItem {
  /**
   * 标识
   * @description 当前导航项的稳定标识。
   */
  id: WorkspaceModuleId
  /**
   * 标题
   * @description 左侧主导航展示名称。
   */
  label: string
  /**
   * 图标
   * @description UnoCSS 图标类名。
   */
  icon: string
  /**
   * 描述
   * @description 展开状态下辅助文案。
   */
  description: string
  /**
   * 目标路径
   * @description 点击后跳转的工作区路径。
   */
  to: string
}

/**
 * ContextBar 用户展示模型。
 */
export interface WorkspaceContextUser {
  /**
   * 展示名
   * @description 当前登录用户名称。
   */
  displayName: string
  /**
   * 邮箱
   * @description 用户主邮箱。
   */
  email: string
  /**
   * 头像
   * @description 用户头像地址。
   */
  avatarUrl: string | null
  /**
   * 首字母
   * @description 无头像时显示的字符。
   */
  initial: string
}

/**
 * 首页模块标识。
 */
export type HomeWidgetId = 'welcome' | 'quick-actions' | 'recent-documents' | 'recent-activity' | 'schedule'

/**
 * 首页模块定义。
 */
export interface HomeWidgetDefinition {
  /**
   * 标识
   * @description 首页模块稳定 ID。
   */
  id: HomeWidgetId
  /**
   * 标题
   * @description 模块名称。
   */
  title: string
  /**
   * 描述
   * @description 模块用途说明。
   */
  description: string
}

/**
 * 快速操作项。
 */
export interface HomeQuickActionItem {
  /**
   * 标识
   * @description 操作稳定 ID。
   */
  id: string
  /**
   * 标题
   * @description 操作名称。
   */
  title: string
  /**
   * 描述
   * @description 操作辅助说明。
   */
  description: string
  /**
   * 图标
   * @description UnoCSS 图标类名。
   */
  icon: string
  /**
   * 路径
   * @description 点击后跳转的目标路径。
   */
  to: string
}

/**
 * 最近活动项。
 */
export interface HomeActivityItem {
  /**
   * 标识
   * @description 活动稳定 ID。
   */
  id: string
  /**
   * 标题
   * @description 活动主文案。
   */
  title: string
  /**
   * 描述
   * @description 活动详情。
   */
  description: string
  /**
   * 时间
   * @description 活动展示时间。
   */
  timeLabel: string
}

/**
 * 日程项。
 */
export interface HomeScheduleItem {
  /**
   * 标识
   * @description 日程稳定 ID。
   */
  id: string
  /**
   * 时间
   * @description 日程时间标签。
   */
  timeLabel: string
  /**
   * 标题
   * @description 日程主题。
   */
  title: string
  /**
   * 描述
   * @description 日程补充说明。
   */
  description: string
}

/**
 * 首页最近文档卡片。
 */
export type HomeRecentDocument = DocumentBase

/**
 * 系统后台导航项。
 */
export interface AdminNavigationItem {
  /**
   * 标识
   * @description 当前导航项的稳定标识。
   */
  id: string
  /**
   * 标题
   * @description 导航中展示的名称。
   */
  label: string
  /**
   * 路由名
   * @description 点击后跳转的目标路由。
   */
  routeName:
    | 'admin-overview'
    | 'admin-users'
    | 'admin-governance'
    | 'admin-ai-config'
    | 'admin-audit'
  /**
   * 说明
   * @description 导航项的简短辅助文案。
   */
  description: string
}

/**
 * 系统后台页面头部模型。
 */
export interface AdminPageHeader {
  /**
   * 标签
   * @description 头部上方的辅助说明。
   */
  eyebrow: string
  /**
   * 标题
   * @description 当前页面的主标题。
   */
  title: string
  /**
   * 描述
   * @description 当前页面的概述信息。
   */
  description: string
}
