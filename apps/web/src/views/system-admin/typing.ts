import type {
  SystemAdminAuditLogItemDto,
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
} from '@/apis/system-admin'
import type { SvgIconCategory } from '@/components/svg-icon/typing'

export interface AdminAuditLogListProps {
  logs: SystemAdminAuditLogItemDto[]
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
  users: SystemAdminUserItemDto[]
  updatingUserId: string | null
}

export interface SystemAdminUserTableEmits {
  toggleStatus: [user: SystemAdminUserItemDto, nextStatus: SystemAdminUserStatus]
}
