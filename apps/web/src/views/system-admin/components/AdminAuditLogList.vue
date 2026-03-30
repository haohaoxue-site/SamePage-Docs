<script setup lang="ts">
import type { SystemAdminAuditLogItemDto } from '@/apis/system-admin'

defineProps<{
  logs: SystemAdminAuditLogItemDto[]
}>()

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
  <div class="space-y-4">
    <ElCard
      v-for="log in logs"
      :key="log.id"
      shadow="never"
      body-class="!p-5"
      class="border-border/80 transition-colors hover:bg-sidebar/50"
    >
      <div class="flex items-start justify-between gap-6">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <ElTag effect="plain" size="small">
              {{ log.targetType }}
            </ElTag>
            <h3 class="text-sm font-semibold text-main truncate">
              {{ log.action }}
            </h3>
          </div>

          <p class="text-xs text-secondary leading-relaxed bg-sidebar px-3 py-2 rounded-lg border border-border/50 break-all">
            <span class="font-medium text-main/60 mr-2 italic">Metadata:</span>
            {{ formatMetadata(log.metadata) }}
          </p>
        </div>

        <div class="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
          <div class="flex items-center gap-1.5 text-xs font-medium text-main">
            <div class="i-carbon-user-avatar text-secondary" />
            {{ log.actorDisplayName }}
          </div>
          <div class="text-[10px] text-secondary flex items-center gap-1">
            <div class="i-carbon-time" />
            {{ new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false }) }}
          </div>
          <div v-if="log.targetId" class="text-[9px] font-mono bg-border px-1.5 py-0.5 rounded text-secondary italic">
            ID: {{ log.targetId }}
          </div>
        </div>
      </div>
    </ElCard>

    <ElEmpty v-if="logs.length === 0" description="暂无审计记录" />
  </div>
</template>
