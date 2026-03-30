import type {
  HomeActivityItem,
  HomeQuickActionItem,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
} from '@/layouts/types'

/**
 * 首页概览模型。
 */
export interface HomeOverviewModel {
  eyebrow: string
  title: string
  description: string
  dateLabel: string
}

export type {
  HomeActivityItem,
  HomeQuickActionItem,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
}
