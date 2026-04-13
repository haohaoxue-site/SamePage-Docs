<script setup lang="ts">
import type {
  SystemAdminUserTableEmits,
  SystemAdminUserTableProps,
} from '../typing'
import type { SystemAdminUserStatus } from '@/apis/system-admin'
import { formatAuthMethod } from '@haohaoxue/samepage-shared'
import { formatDateTime } from '@/utils/dayjs'

defineProps<SystemAdminUserTableProps>()

const emits = defineEmits<SystemAdminUserTableEmits>()

function resolveNextStatus(status: SystemAdminUserStatus): SystemAdminUserStatus {
  return status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
}

function formatDate(value: string | null) {
  if (!value) {
    return '暂无'
  }

  return formatDateTime(value)
}

function getStatusStateClass(status: SystemAdminUserStatus) {
  return status === 'ACTIVE' ? 'active' : 'disabled'
}
</script>

<template>
  <ElCard shadow="never" body-class="!p-0" class="overflow-hidden border-border-a80">
    <ElTable :data="users" class="admin-table admin-user-table">
      <ElTableColumn label="用户信息" min-width="240">
        <template #default="{ row }">
          <div class="admin-user-table__identity">
            <div class="admin-user-table__avatar">
              {{ row.displayName.slice(0, 1) }}
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-semibold text-main">{{ row.displayName }}</span>
              <span class="truncate text-xs text-secondary">{{ row.email || '未绑定邮箱' }}</span>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="账号状态" width="120">
        <template #default="{ row }">
          <div class="admin-user-table__status">
            <div class="admin-user-table__status-dot" :class="getStatusStateClass(row.status)" />
            <span class="admin-user-table__status-label" :class="getStatusStateClass(row.status)">
              {{ row.status === 'ACTIVE' ? '正常' : '已禁用' }}
            </span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="数据统计" width="160">
        <template #default="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-main">拥有 {{ row.ownedDocumentCount }} 篇</span>
            <span class="text-xs text-secondary">获赠 {{ row.sharedDocumentCount }} 篇</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="最近活跃" width="180">
        <template #default="{ row }">
          <span class="text-xs text-secondary">{{ formatDate(row.lastLoginAt) }}</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="后台权限" width="180">
        <template #default="{ row }">
          <ElTag :type="row.isSystemAdmin ? 'primary' : 'info'" size="small" effect="plain" class="rounded-md">
            {{ row.isSystemAdmin ? '系统管理员' : '普通用户' }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="登录方式" min-width="120">
        <template #default="{ row }">
          <div class="admin-user-table__auth-methods">
            <ElTag
              v-for="method in row.authMethods"
              :key="method"
              size="small"
              effect="plain"
              class="rounded-md"
            >
              {{ formatAuthMethod(method) }}
            </ElTag>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <div class="admin-user-table__actions">
            <ElButton
              link
              :type="row.status === 'ACTIVE' ? 'danger' : 'success'"
              :disabled="updatingUserId === row.id || row.isSystemAdmin"
              @click="emits('toggleStatus', row, resolveNextStatus(row.status))"
            >
              {{ row.isSystemAdmin ? '系统管理员' : row.status === 'ACTIVE' ? '禁用' : '激活' }}
            </ElButton>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>
</template>

<style lang="scss" scoped>
.admin-table {
  --el-table-header-bg-color: var(--brand-fill-lighter);
  --el-table-header-text-color: var(--brand-text-regular);
  --el-table-row-hover-bg-color: var(--brand-fill-lighter);

  :deep(.el-table__header) {
    th {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
}

.admin-user-table {
  &__identity {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__avatar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    min-width: 2.5rem;
    height: 2.5rem;
    min-height: 2.5rem;
    border-radius: 9999px;
    color: var(--brand-primary);
    font-weight: 700;
    background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__status-dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 9999px;

    &.active {
      background: var(--brand-success);
    }

    &.disabled {
      background: var(--brand-error);
    }
  }

  &__status-label {
    font-size: 0.75rem;
    font-weight: 500;

    &.active {
      color: var(--brand-success);
    }

    &.disabled {
      color: var(--brand-error);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__auth-methods {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
}
</style>
