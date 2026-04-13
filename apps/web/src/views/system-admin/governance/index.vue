<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useAdminGovernance } from './composables/useAdminGovernance'

const { summary, errorMessage, isLoading, loadGovernanceSummary } = useAdminGovernance()

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

onMounted(loadGovernanceSummary)
</script>

<template>
  <div v-loading="isLoading" class="admin-governance py-6">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <div v-else-if="summary" class="flex flex-col gap-6">
      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ConsoleMetricCard
          v-for="card in governanceCards"
          :key="card.label"
          :detail="card.detail"
          :label="card.label"
          :value="card.value"
          :icon-category="card.iconCategory"
          :icon="card.icon"
        />
      </section>

      <section>
        <ElCard shadow="never" body-class="p-6" class="border-border-a80">
          <div class="mb-4 flex items-center gap-2">
            <SvgIcon category="ui" icon="bell" size="1.25rem" class="text-primary" />
            <h3 class="text-lg font-bold text-main">
              当前治理备注
            </h3>
          </div>
          <div class="admin-governance__note rounded-xl p-6 text-sm italic leading-6 text-secondary">
            "{{ summary.note || '暂无特定的治理政策更新。' }}"
          </div>
        </ElCard>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-governance__note {
  background: var(--brand-bg-sidebar);
}
</style>
