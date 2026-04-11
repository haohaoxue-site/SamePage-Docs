import type { SystemAdminAuditLogItemDto } from '@/apis/system-admin'
import { shallowRef } from 'vue'
import { getSystemAdminAuditLogs } from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAdminAuditLogs() {
  const logs = shallowRef<SystemAdminAuditLogItemDto[]>([])
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)

  async function loadLogs() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      logs.value = await getSystemAdminAuditLogs()
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载审计日志失败')
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    logs,
    errorMessage,
    isLoading,
    loadLogs,
  }
}
