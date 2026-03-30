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
      icon: 'i-carbon-user',
    },
    {
      label: '系统管理员',
      value: overview.value.systemAdminCount,
      detail: '拥有系统后台权限',
      icon: 'i-carbon-user-admin',
    },
    {
      label: '总文档',
      value: overview.value.totalDocuments,
      detail: `共享 ${overview.value.sharedDocuments}，锁定 ${overview.value.lockedDocuments}`,
      icon: 'i-carbon-document',
    },
    {
      label: '系统 AI',
      value: overview.value.aiConfigEnabled ? '已启用' : '未启用',
      detail: overview.value.systemAiDefaultModel || '尚未配置默认模型',
      icon: 'i-carbon-bot',
    },
  ]
})

onMounted(loadOverview)
</script>

<template>
  <div v-loading="isLoading" class="space-y-6 py-6">
    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-if="!isLoading && !errorMessage && overview">
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ConsoleMetricCard
          v-for="card in metricCards"
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
            <div class="i-carbon-bot text-primary text-xl" />
            <h3 class="text-lg font-bold text-main">
              系统级 AI 配置
            </h3>
          </div>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-secondary">配置状态</span>
              <ElTag :type="overview.aiConfigEnabled ? 'success' : 'info'" effect="light">
                {{ overview.aiConfigEnabled ? '已启用' : '未启用' }}
              </ElTag>
            </div>
            <div class="p-4 bg-sidebar rounded-xl space-y-3">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">默认接口地址</span>
                <span class="text-sm font-mono text-main truncate">{{ overview.systemAiBaseUrl || '未设置' }}</span>
              </div>
              <div class="flex flex-col gap-1">
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
