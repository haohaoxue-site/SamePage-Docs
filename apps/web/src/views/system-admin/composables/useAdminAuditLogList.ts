import { formatDateTime } from '@/utils/dayjs'

export function useAdminAuditLogList() {
  function formatMetadata(metadata: Record<string, unknown> | null) {
    if (!metadata) {
      return '无附加信息'
    }

    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' / ')
  }

  return {
    formatDateTime,
    formatMetadata,
  }
}
