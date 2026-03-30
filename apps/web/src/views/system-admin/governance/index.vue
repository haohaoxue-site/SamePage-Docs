<script setup lang="ts">
import { computed, onMounted } from 'vue'
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
      icon: 'i-carbon-flow-data',
    },
    {
      label: '共享文档',
      value: summary.value.sharedDocuments,
      detail: '已共享文档数',
      icon: 'i-carbon-share-knowledge',
    },
    {
      label: '风控锁定',
      value: summary.value.lockedDocuments,
      detail: `当前处于 ${summary.value.lockedStatus} 状态`,
      icon: 'i-carbon-locked',
    },
  ]
})

onMounted(loadGovernanceSummary)
</script>

<template>
  <div v-loading="isLoading" class="space-y-6 py-6">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else-if="summary">
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ConsoleMetricCard
          v-for="card in governanceCards"
          :key="card.label"
          :detail="card.detail"
          :label="card.label"
          :value="card.value"
          :icon="card.icon"
        />
      </section>

      <section>
        <ElCard shadow="never" body-class="!p-6" class="border-border/80">
          <div class="flex items-center gap-2 mb-4">
            <div class="i-carbon-notification text-primary text-xl" />
            <h3 class="text-lg font-bold text-main">
              当前治理备注
            </h3>
          </div>
          <div class="bg-sidebar rounded-xl p-6 text-sm text-secondary italic leading-relaxed">
            "{{ summary.note || '暂无特定的治理政策更新。' }}"
          </div>
        </ElCard>
      </section>
    </template>
  </div>
</template>
