<script setup lang="ts">
import type { AdminAuditLogListProps } from '../typing'

defineProps<AdminAuditLogListProps>()

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return '无附加信息'
  }

  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' / ')
}
</script>

<template>
  <div class="admin-audit-log-list">
    <ElCard
      v-for="log in logs"
      :key="log.id"
      shadow="never"
      body-class="admin-audit-log-list__card-body"
      class="admin-audit-log-list__card"
    >
      <div class="admin-audit-log-list__card-layout">
        <div class="admin-audit-log-list__content">
          <div class="admin-audit-log-list__headline">
            <ElTag effect="plain" size="small">
              {{ log.targetType }}
            </ElTag>
            <h3 class="admin-audit-log-list__title">
              {{ log.action }}
            </h3>
          </div>

          <p class="admin-audit-log-list__metadata">
            <span class="admin-audit-log-list__metadata-label">Metadata:</span>
            {{ formatMetadata(log.metadata) }}
          </p>
        </div>

        <div class="admin-audit-log-list__meta">
          <div class="admin-audit-log-list__actor">
            <SvgIcon category="ui" icon="user" size="0.875rem" class="text-secondary" />
            {{ log.actorDisplayName }}
          </div>
          <div class="admin-audit-log-list__timestamp">
            <SvgIcon category="ui" icon="time" size="0.75rem" />
            {{ new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false }) }}
          </div>
          <div v-if="log.targetId" class="admin-audit-log-list__target-id">
            ID: {{ log.targetId }}
          </div>
        </div>
      </div>
    </ElCard>

    <ElEmpty v-if="logs.length === 0" description="暂无审计记录" />
  </div>
</template>

<style scoped lang="scss">
.admin-audit-log-list {
  > * + * {
    margin-top: 1rem;
  }

  .admin-audit-log-list__card {
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    transition: background-color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--brand-bg-sidebar) 50%, transparent);
    }
  }

  :deep(.admin-audit-log-list__card-body) {
    padding: 1.25rem !important;
  }

  .admin-audit-log-list__card-layout {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .admin-audit-log-list__content {
    flex: 1 1 0%;
    min-width: 0;
  }

  .admin-audit-log-list__headline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .admin-audit-log-list__title {
    overflow: hidden;
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .admin-audit-log-list__metadata {
    padding: 0.5rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 50%, transparent);
    border-radius: 0.5rem;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.625;
    word-break: break-all;
    background: var(--brand-bg-sidebar);
  }

  .admin-audit-log-list__metadata-label {
    margin-right: 0.5rem;
    color: color-mix(in srgb, var(--brand-text-primary) 60%, transparent);
    font-style: italic;
    font-weight: 500;
  }

  .admin-audit-log-list__meta {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.375rem;
    text-align: right;
  }

  .admin-audit-log-list__actor {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--brand-text-primary);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .admin-audit-log-list__timestamp {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 10px;
  }

  .admin-audit-log-list__target-id {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: var(--brand-text-secondary);
    font-size: 9px;
    font-family: var(--el-font-family);
    font-style: italic;
    background: var(--brand-border-base);
  }
}
</style>
