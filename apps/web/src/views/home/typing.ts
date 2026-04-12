import type { DocumentRecent } from '@haohaoxue/samepage-domain'
import type { SvgIconCategory } from '@/components/svg-icon/typing'

export type HomeWidgetId = 'welcome' | 'recent-documents' | 'schedule'

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
   * 图标分类
   * @description 快捷操作图标所在的 sprite 分类。
   */
  iconCategory: SvgIconCategory
  /**
   * 图标
   * @description SVG symbol 名称。
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

export type HomeRecentDocument = DocumentRecent

/**
 * 首页概览模型。
 */
export interface HomeOverviewModel {
  eyebrow: string
  title: string
  description: string
  dateLabel: string
}

/**
 * 首页欢迎面板属性。
 */
export interface HomeWelcomePanelProps {
  overview: HomeOverviewModel
}

/**
 * 首页快捷操作面板属性。
 */
export interface HomeQuickActionsPanelProps {
  actions: HomeQuickActionItem[]
}

/**
 * 首页最近活动面板属性。
 */
export interface HomeRecentActivityPanelProps {
  activities: HomeActivityItem[]
}

/**
 * 首页日程面板属性。
 */
export interface HomeSchedulePanelProps {
  schedules: HomeScheduleItem[]
}

/**
 * 首页组件设置浮层属性。
 */
export interface HomeWidgetSettingsPopoverProps {
  widgets: HomeWidgetDefinition[]
  visibleWidgetSet: Set<HomeWidgetId>
}

/**
 * 首页组件设置浮层事件。
 */
export interface HomeWidgetSettingsPopoverEmits {
  toggle: [widgetId: HomeWidgetId]
}

/**
 * 首页最近文档列表属性。
 */
export interface RecentDocumentListProps {
  documents: HomeRecentDocument[]
}
