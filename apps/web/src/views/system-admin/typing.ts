import type {
  SystemAdminAuditLogItemDto,
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
} from '@/apis/system-admin'
import type { SvgIconCategory } from '@/components/svg-icon/typing'

/**
 * 后台审计日志列表属性。
 */
export interface AdminAuditLogListProps {
  logs: SystemAdminAuditLogItemDto[]
}

/**
 * 后台概览指标卡属性。
 */
export interface ConsoleMetricCardProps {
  label: string
  value: string | number
  detail: string
  /**
   * 图标
   * @description SVG symbol 名称。
   */
  icon?: string
  /**
   * 图标分类
   * @description 图标所在的 sprite 分类。
   */
  iconCategory?: SvgIconCategory
}

/**
 * 后台用户表格属性。
 */
export interface SystemAdminUserTableProps {
  users: SystemAdminUserItemDto[]
  updatingUserId: string | null
}

/**
 * 后台用户表格事件。
 */
export interface SystemAdminUserTableEmits {
  toggleStatus: [user: SystemAdminUserItemDto, nextStatus: SystemAdminUserStatus]
}
