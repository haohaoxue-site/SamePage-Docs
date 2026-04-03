<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useAdminOverview } from './composables/useAdminOverview'

const { overview, errorMessage, isLoading, loadOverview } = useAdminOverview()

const metricCards = computed(() => {
  if (!overview.value) {
    return []
  }

  return [
    {
      label: '总用户',
      value: overview.value.totalUsers,
      detail: `活跃 ${overview.value.activeUsers}，禁用 ${overview.value.disabledUsers}`,
      icon: 'user-group',
      iconCategory: 'ui' as const,
    },
    {
      label: '系统管理员',
      value: overview.value.systemAdminCount,
      detail: '拥有系统后台权限',
      icon: 'user-admin',
      iconCategory: 'ui' as const,
    },
    {
      label: '总文档',
      value: overview.value.totalDocuments,
      detail: `共享 ${overview.value.sharedDocuments}，锁定 ${overview.value.lockedDocuments}`,
      icon: 'document-view',
      iconCategory: 'ui' as const,
    },
    {
      label: '系统 AI',
      value: overview.value.aiConfigEnabled ? '已启用' : '未启用',
      detail: overview.value.systemAiDefaultModel || '尚未配置默认模型',
      icon: 'ai-spark',
      iconCategory: 'ai' as const,
    },
  ]
})

onMounted(loadOverview)
</script>

<template>
  <div v-loading="isLoading" class="admin-overview">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-if="!isLoading && !errorMessage && overview">
      <section class="admin-overview__metrics">
        <ConsoleMetricCard
          v-for="card in metricCards"
          :key="card.label"
          :detail="card.detail"
          :label="card.label"
          :value="card.value"
          :icon="card.icon"
          :icon-category="card.iconCategory"
        />
      </section>
      <section class="admin-overview__section">
        <ElCard shadow="never" body-class="ui-panel__body" class="ui-panel admin-overview__card">
          <div class="admin-overview__card-header">
            <SvgIcon category="ai" icon="ai-spark" size="1.25rem" />
            <h3 class="ui-panel__title font-bold">
              系统级 AI 配置
            </h3>
          </div>
          <div class="admin-overview__status-list">
            <div class="admin-overview__status-row">
              <span class="text-sm text-secondary">配置状态</span>
              <ElTag :type="overview.aiConfigEnabled ? 'success' : 'info'" effect="light">
                {{ overview.aiConfigEnabled ? '已启用' : '未启用' }}
              </ElTag>
            </div>
            <div class="admin-overview__snapshot">
              <div class="admin-overview__snapshot-item">
                <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">默认接口地址</span>
                <span class="text-sm font-mono text-main truncate">{{ overview.systemAiBaseUrl || '未设置' }}</span>
              </div>
              <div class="admin-overview__snapshot-item">
                <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">默认模型名称</span>
                <span class="text-sm font-mono text-main">{{ overview.systemAiDefaultModel || '未设置' }}</span>
              </div>
            </div>
          </div>
        </ElCard>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-overview {
  padding-block: 1.5rem;

  > * + * {
    margin-top: 1.5rem;
  }

  .admin-overview__metrics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .admin-overview__section {
    > * + * {
      margin-top: 1rem;
    }
  }

  .admin-overview__card {
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
  }

  .admin-overview__card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .admin-overview__status-list {
    > * + * {
      margin-top: 1rem;
    }
  }

  .admin-overview__status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .admin-overview__snapshot {
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--brand-bg-sidebar);

    > * + * {
      margin-top: 0.75rem;
    }
  }

  .admin-overview__snapshot-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
