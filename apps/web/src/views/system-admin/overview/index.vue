<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'
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
      iconCategory: SvgIconCategory.UI,
      icon: 'user-group',
    },
    {
      label: '系统管理员',
      value: overview.value.systemAdminCount,
      detail: '拥有系统后台权限',
      iconCategory: SvgIconCategory.UI,
      icon: 'user-admin',
    },
    {
      label: '总文档',
      value: overview.value.totalDocuments,
      detail: `共享 ${overview.value.sharedDocuments}，锁定 ${overview.value.lockedDocuments}`,
      iconCategory: SvgIconCategory.UI,
      icon: 'document-view',
    },
    {
      label: '系统 AI',
      value: overview.value.aiConfigEnabled ? '已启用' : '未启用',
      detail: overview.value.systemAiBaseUrl || '尚未配置 API 地址',
      iconCategory: SvgIconCategory.AI,
      icon: 'ai-spark',
    },
  ]
})

onMounted(loadOverview)
</script>

<template>
  <div v-loading="isLoading" class="admin-overview py-6">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <div v-else-if="overview" class="flex flex-col gap-6">
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ConsoleMetricCard
          v-for="card in metricCards"
          :key="card.label"
          :detail="card.detail"
          :label="card.label"
          :value="card.value"
          :icon-category="card.iconCategory"
          :icon="card.icon"
        />
      </section>
      <section>
        <ElCard shadow="never" body-class="ui-panel__body" class="ui-panel border-border-a80">
          <div class="mb-4 flex items-center gap-2">
            <SvgIcon category="ai" icon="ai-spark" size="1.25rem" />
            <h3 class="ui-panel__title font-bold">
              系统级 AI 配置
            </h3>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-secondary">配置状态</span>
              <ElTag :type="overview.aiConfigEnabled ? 'success' : 'info'" effect="light">
                {{ overview.aiConfigEnabled ? '已启用' : '未启用' }}
              </ElTag>
            </div>
            <div class="admin-overview__snapshot rounded-xl p-4">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">接口地址</span>
                <span class="text-sm font-mono text-main truncate">{{ overview.systemAiBaseUrl || '未设置' }}</span>
              </div>
              <div class="mt-3 flex flex-col gap-1">
                <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">当前状态</span>
                <span class="text-sm text-main">{{ overview.aiConfigEnabled ? '已启用' : '未启用' }}</span>
              </div>
            </div>
          </div>
        </ElCard>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-overview__snapshot {
  background: var(--brand-bg-sidebar);
}
</style>
