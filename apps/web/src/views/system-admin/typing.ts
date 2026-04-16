import type {
  SystemAdminAuditLogItem,
  SystemAdminUserItem,
  SystemAdminUserStatus,
} from '@/apis/system-admin'
import type { SvgIconCategory } from '@/components/svg-icon/typing'

export interface AdminAuditLogListProps {
  logs: SystemAdminAuditLogItem[]
}

export interface ConsoleMetricCardProps {
  label: string
  value: string | number
  detail: string
  /**
   * 图标分类
   * @description 图标所在的 sprite 分类。
   */
  iconCategory?: SvgIconCategory
  /**
   * 图标
   * @description SVG symbol 名称。
   */
  icon?: string
}

export interface SystemAdminUserTableProps {
  users: SystemAdminUserItem[]
  updatingUserId: string | null
}

export interface SystemAdminUserTableEmits {
  toggleStatus: [user: SystemAdminUserItem, nextStatus: SystemAdminUserStatus]
}
