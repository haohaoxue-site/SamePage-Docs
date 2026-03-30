<script setup lang="ts">
import type { SystemAdminUserItemDto, SystemAdminUserStatus } from '@/apis/system-admin'

defineProps<{
  users: SystemAdminUserItemDto[]
  updatingUserId: string | null
}>()

const emit = defineEmits<{
  toggleStatus: [user: SystemAdminUserItemDto, nextStatus: SystemAdminUserStatus]
  toggleSystemAdmin: [user: SystemAdminUserItemDto, enabled: boolean]
}>()

function resolveNextStatus(status: SystemAdminUserStatus): SystemAdminUserStatus {
  return status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
}

function formatDate(value: string | null) {
  if (!value) {
    return '暂无'
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  })
}
</script>

<template>
  <ElCard shadow="never" body-class="!p-0" class="overflow-hidden border-border/80">
    <ElTable :data="users" class="admin-table">
      <ElTableColumn label="用户信息" min-width="240">
        <template #default="{ row }">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {{ row.displayName.slice(0, 1) }}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-semibold text-main">{{ row.displayName }}</span>
              <span class="text-xs text-secondary">{{ row.email || '未绑定邮箱' }}</span>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="账号状态" width="120">
        <template #default="{ row }">
          <div class="flex items-center gap-1.5">
            <div :class="row.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'" class="w-1.5 h-1.5 rounded-full" />
            <span class="text-xs font-medium" :class="row.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'">
              {{ row.status === 'ACTIVE' ? '正常' : '已禁用' }}
            </span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="数据统计" width="160">
        <template #default="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-main">拥有 {{ row.ownedDocumentCount }} 篇</span>
            <span class="text-[10px] text-secondary">获赠 {{ row.sharedDocumentCount }} 篇</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="最近活跃" width="180">
        <template #default="{ row }">
          <span class="text-xs text-secondary">{{ formatDate(row.lastLoginAt) }}</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="后台权限" width="120">
        <template #default="{ row }">
          <ElTag :type="row.isSystemAdmin ? 'primary' : 'info'" size="small" effect="plain" class="rounded-md">
            {{ row.isSystemAdmin ? '系统管理员' : '普通用户' }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <ElButton
              link
              :type="row.status === 'ACTIVE' ? 'danger' : 'success'"
              :disabled="updatingUserId === row.id"
              @click="emit('toggleStatus', row, resolveNextStatus(row.status))"
            >
              {{ row.status === 'ACTIVE' ? '禁用' : '激活' }}
            </ElButton>
            <div class="w-px h-3 bg-border" />
            <ElButton
              link
              type="primary"
              :disabled="updatingUserId === row.id"
              @click="emit('toggleSystemAdmin', row, !row.isSystemAdmin)"
            >
              {{ row.isSystemAdmin ? '吊销权限' : '授权管理' }}
            </ElButton>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>
</template>

<style lang="scss" scoped>
.admin-table {
  --el-table-header-bg-color: #f9fafb;
  --el-table-header-text-color: #4b5563;
  --el-table-row-hover-bg-color: #f9fafb;

  :deep(.el-table__header) {
    th {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
}
</style>
