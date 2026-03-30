import type { SystemAdminOverviewDto } from '@/apis/system-admin'
import { shallowRef } from 'vue'
import { getSystemAdminOverview } from '@/apis/system-admin'

export function useAdminOverview() {
  const overview = shallowRef<SystemAdminOverviewDto | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)

  async function loadOverview() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      overview.value = await getSystemAdminOverview()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载系统概览失败'
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    overview,
    errorMessage,
    isLoading,
    loadOverview,
  }
}
