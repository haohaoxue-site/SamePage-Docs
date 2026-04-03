<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import SystemAdminUserTable from '../components/SystemAdminUserTable.vue'
import { useAdminUsers } from './composables/useAdminUsers'

const {
  users,
  errorMessage,
  isLoading,
  loadUsers,
  toggleSystemAdmin,
  toggleUserStatus,
  updatingUserId,
} = useAdminUsers()

const summaryCards = computed(() => {
  const activeUsers = users.value.filter(user => user.status === 'ACTIVE').length
  const disabledUsers = users.value.length - activeUsers
  const systemAdmins = users.value.filter(user => user.isSystemAdmin).length

  return [
    {
      label: '用户总数',
      value: users.value.length,
      detail: `正常 ${activeUsers}，禁用 ${disabledUsers}`,
      icon: 'user-group',
      iconCategory: 'ui' as const,
    },
    {
      label: '管理员',
      value: systemAdmins,
      detail: '具备系统后台访问权限',
      icon: 'user-admin',
      iconCategory: 'ui' as const,
    },
    {
      label: '文档交互',
      value: users.value.reduce((sum, user) => sum + user.sharedDocumentCount, 0),
      detail: '全平台共享文档总数',
      icon: 'share',
      iconCategory: 'ui' as const,
    },
  ]
})

onMounted(loadUsers)
</script>

<template>
  <div v-loading="isLoading" class="admin-users">
    <section class="admin-users__metrics">
      <ConsoleMetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :detail="card.detail"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :icon-category="card.iconCategory"
      />
    </section>

    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <template v-else>
      <div class="admin-users__content">
        <SystemAdminUserTable
          :updating-user-id="updatingUserId"
          :users="users"
          @toggle-status="toggleUserStatus"
          @toggle-system-admin="toggleSystemAdmin"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-users {
  padding-block: 1.5rem;

  > * + * {
    margin-top: 1.5rem;
  }

  .admin-users__metrics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .admin-users__content {
    > * + * {
      margin-top: 1.5rem;
    }
  }
}
</style>
