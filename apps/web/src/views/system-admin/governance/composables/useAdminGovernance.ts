import type { GovernanceSummaryDto } from '@/apis/system-admin'
import { shallowRef } from 'vue'
import { getGovernanceSummary } from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAdminGovernance() {
  const summary = shallowRef<GovernanceSummaryDto | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)

  async function loadGovernanceSummary() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      summary.value = await getGovernanceSummary()
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载平台治理摘要失败')
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    summary,
    errorMessage,
    isLoading,
    loadGovernanceSummary,
  }
}
