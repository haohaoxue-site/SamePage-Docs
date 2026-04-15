import type { SystemAdminAuditLogItemDto } from '@/apis/system-admin'
import { computed, onMounted, shallowRef } from 'vue'
import { getSystemAdminAuditLogs } from '@/apis/system-admin'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAudit() {
  const logs = shallowRef<SystemAdminAuditLogItemDto[]>([])
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const summaryCards = computed(() => [
    {
      label: '最近动作',
      value: logs.value.length,
      detail: '展示最近 50 条关键后台动作',
      iconCategory: SvgIconCategory.UI,
      icon: 'activity',
    },
    {
      label: '权限变更',
      value: logs.value.filter(log => log.targetType === 'user').length,
      detail: '涉及用户状态与管理权限调整',
      iconCategory: SvgIconCategory.UI,
      icon: 'user-admin',
    },
    {
      label: '配置变更',
      value: logs.value.filter(log => log.targetType === 'system_ai_config').length,
      detail: '涉及全局 AI 及系统参数调整',
      iconCategory: SvgIconCategory.UI,
      icon: 'settings-outline',
    },
  ])

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

  onMounted(loadLogs)

  return {
    logs,
    errorMessage,
    isLoading,
    loadLogs,
    summaryCards,
  }
}
