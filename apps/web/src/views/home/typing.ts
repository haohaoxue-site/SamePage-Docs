import type {
  HomeActivityItem,
  HomeQuickActionItem,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
} from '@/layouts/typing'

/**
 * 首页概览模型。
 */
export interface HomeOverviewModel {
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

export type {
  HomeActivityItem,
  HomeQuickActionItem,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
}
