<script setup lang="ts">
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import { useOverview } from './composables/useOverview'

const { overview, errorMessage, isLoading, metricCards } = useOverview()
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
            <ElDescriptions :column="1" direction="vertical" size="small" class="admin-overview__snapshot">
              <ElDescriptionsItem label="接口地址">
                <span class="admin-overview__snapshot-value admin-overview__snapshot-value--mono">
                  {{ overview.systemAiBaseUrl || '未设置' }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="当前状态">
                <span class="admin-overview__snapshot-value">
                  {{ overview.aiConfigEnabled ? '已启用' : '未启用' }}
                </span>
              </ElDescriptionsItem>
            </ElDescriptions>
          </div>
        </ElCard>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-overview__snapshot {
  background: var(--brand-bg-sidebar);
  border-radius: 0.75rem;

  :deep(.el-descriptions__body) {
    background: transparent;
  }

  :deep(.el-descriptions__table) {
    width: 100%;
  }

  :deep(.el-descriptions__cell) {
    padding: 1rem;
  }

  :deep(.el-descriptions__cell + .el-descriptions__cell) {
    border-top: 1px solid color-mix(in srgb, var(--brand-border-base) 82%, transparent);
  }

  :deep(.el-descriptions__label) {
    margin-bottom: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
}

.admin-overview__snapshot-value {
  display: block;
  color: var(--brand-text-primary);
  font-size: 0.875rem;
  line-height: 1.6;
}

.admin-overview__snapshot-value--mono {
  overflow: hidden;
  font-family: var(--font-family-mono, monospace);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
