import type { NotificationSummarySchema } from '@haohaoxue/samepage-contracts'
import type { z } from 'zod'

/**
 * 当前用户的消息提醒聚合。
 */
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>
