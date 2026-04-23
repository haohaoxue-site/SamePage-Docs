import type { SystemAdminUserStatus } from '@/apis/system-admin'
import { USER_STATUS } from '@haohaoxue/samepage-contracts'
import { formatAuthMethod } from '@haohaoxue/samepage-shared'
import { formatDateTime } from '@/utils/dayjs'

export function useSystemAdminUserTable() {
  function resolveNextStatus(status: SystemAdminUserStatus): SystemAdminUserStatus {
    return status === USER_STATUS.ACTIVE
      ? USER_STATUS.DISABLED
      : USER_STATUS.ACTIVE
  }

  function formatDate(value: string | null) {
    if (!value) {
      return '暂无'
    }

    return formatDateTime(value)
  }

  function getStatusStateClass(status: SystemAdminUserStatus) {
    return status === USER_STATUS.ACTIVE ? 'active' : 'disabled'
  }

  return {
    formatAuthMethod,
    formatDate,
    getStatusStateClass,
    resolveNextStatus,
  }
}
