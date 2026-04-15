import type { SystemAdminUserStatus } from '@/apis/system-admin'
import { formatAuthMethod } from '@haohaoxue/samepage-shared'
import { formatDateTime } from '@/utils/dayjs'

export function useSystemAdminUserTable() {
  function resolveNextStatus(status: SystemAdminUserStatus): SystemAdminUserStatus {
    return status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  }

  function formatDate(value: string | null) {
    if (!value) {
      return '暂无'
    }

    return formatDateTime(value)
  }

  function getStatusStateClass(status: SystemAdminUserStatus) {
    return status === 'ACTIVE' ? 'active' : 'disabled'
  }

  return {
    formatAuthMethod,
    formatDate,
    getStatusStateClass,
    resolveNextStatus,
  }
}
