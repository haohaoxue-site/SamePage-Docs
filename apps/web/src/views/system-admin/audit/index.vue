<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AdminAuditLogList from '../components/AdminAuditLogList.vue'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useAdminAuditLogs } from './composables/useAdminAuditLogs'

const { logs, errorMessage, isLoading, loadLogs } = useAdminAuditLogs()

const summaryCards = computed(() => [
  {
    label: '最近动作',
    value: logs.value.length,
    detail: '展示最近 50 条关键后台动作',
    icon: 'i-carbon-activity',
  },
  {
    label: '权限变更',
    value: logs.value.filter(log => log.targetType === 'user').length,
    detail: '涉及用户状态与管理权限调整',
    icon: 'i-carbon-user-access',
  },
  {
    label: '配置变更',
    value: logs.value.filter(log => log.targetType === 'system_ai_config').length,
    detail: '涉及全局 AI 及系统参数调整',
    icon: 'i-carbon-settings',
  },
])

onMounted(loadLogs)
</script>

<template>
  <div v-loading="isLoading" class="space-y-6 py-6">
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ConsoleMetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :detail="card.detail"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
      />
    </section>

    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else>
      <div class="space-y-6">
        <AdminAuditLogList :logs="logs" />
      </div>
    </template>
  </div>
</template>
