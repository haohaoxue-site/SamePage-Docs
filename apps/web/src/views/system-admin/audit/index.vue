<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import AdminAuditLogList from '../components/AdminAuditLogList.vue'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useAdminAuditLogs } from './composables/useAdminAuditLogs'

const { logs, errorMessage, isLoading, loadLogs } = useAdminAuditLogs()

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

onMounted(loadLogs)
</script>

<template>
  <div v-loading="isLoading" class="admin-audit-view">
    <section class="admin-audit-view__metrics">
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

    <template v-else>
      <div class="admin-audit-view__content">
        <AdminAuditLogList :logs="logs" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-audit-view {
  padding-block: 1.5rem;

  > * + * {
    margin-top: 1.5rem;
  }

  .admin-audit-view__metrics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .admin-audit-view__content {
    > * + * {
      margin-top: 1.5rem;
    }
  }
}
</style>
