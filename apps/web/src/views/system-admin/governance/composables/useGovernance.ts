import type { GovernanceSummaryDto } from '@/apis/system-admin'
import { computed, onMounted, shallowRef } from 'vue'
import { getGovernanceSummary } from '@/apis/system-admin'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useGovernance() {
  const summary = shallowRef<GovernanceSummaryDto | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const governanceCards = computed(() => {
    if (!summary.value) {
      return []
    }

    return [
      {
        label: '文档总量',
        value: summary.value.totalDocuments,
        detail: '平台文档总量',
        iconCategory: SvgIconCategory.UI,
        icon: 'flow',
      },
      {
        label: '共享文档',
        value: summary.value.sharedDocuments,
        detail: '已共享文档数',
        iconCategory: SvgIconCategory.UI,
        icon: 'share',
      },
      {
        label: '风控锁定',
        value: summary.value.lockedDocuments,
        detail: `当前处于 ${summary.value.lockedStatus} 状态`,
        iconCategory: SvgIconCategory.UI,
        icon: 'lock',
      },
    ]
  })

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

  onMounted(loadGovernanceSummary)

  return {
    summary,
    errorMessage,
    isLoading,
    governanceCards,
    loadGovernanceSummary,
  }
}
