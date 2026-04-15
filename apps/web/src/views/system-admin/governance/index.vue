<script setup lang="ts">
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useGovernance } from './composables/useGovernance'

const { summary, errorMessage, governanceCards, isLoading } = useGovernance()
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
