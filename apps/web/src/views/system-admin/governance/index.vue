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
  <div v-loading="isLoading" class="admin-governance">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else-if="summary">
      <section class="admin-governance__metrics">
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

      <section class="admin-governance__section">
        <ElCard shadow="never" body-class="admin-governance__card-body" class="admin-governance__card">
          <div class="admin-governance__card-header">
            <SvgIcon category="ui" icon="bell" size="1.25rem" class="text-primary" />
            <h3 class="text-lg font-bold text-main">
              当前治理备注
            </h3>
          </div>
          <div class="admin-governance__note">
            "{{ summary.note || '暂无特定的治理政策更新。' }}"
          </div>
        </ElCard>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-governance {
  padding-block: 1.5rem;

  > * + * {
    margin-top: 1.5rem;
  }

  .admin-governance__metrics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .admin-governance__section {
    > * + * {
      margin-top: 1rem;
    }
  }

  .admin-governance__card {
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
  }

  :deep(.admin-governance__card-body) {
    padding: 1.5rem !important;
  }

  .admin-governance__card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .admin-governance__note {
    padding: 1.5rem;
    border-radius: 0.75rem;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
    line-height: 1.625;
    background: var(--brand-bg-sidebar);
  }
}
</style>
