<script setup lang="ts">
import AdminAuditLogList from '../components/AdminAuditLogList.vue'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useAudit } from './composables/useAudit'

const { logs, errorMessage, isLoading, summaryCards } = useAudit()
</script>

<template>
  <div v-loading="isLoading" class="admin-audit-view flex flex-col gap-6 py-6">
    <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <ConsoleMetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :detail="card.detail"
        :label="card.label"
        :value="card.value"
        :icon-category="card.iconCategory"
        :icon="card.icon"
      />
    </section>

    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <AdminAuditLogList v-else :logs="logs" />
  </div>
</template>
